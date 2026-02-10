import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { config } from '../../config/env';
import crypto from 'crypto';
import { ANONYMITY, SURVEY } from '@cvf-qa/shared';
import { validateIpsativeAnswer, validateLikertAnswer } from '@cvf-qa/shared';

class SurveyService {
  // ── Token Doğrulama + Session Başlatma ──
  async startSurvey(rawToken: string, ip: string, fingerprint?: string) {
    const tokenHash = crypto
      .createHmac('sha256', config.ENCRYPTION_KEY)
      .update(rawToken)
      .digest('hex');

    const token = await prisma.surveyToken.findUnique({
      where: { tokenHash },
      include: { campaign: { include: { organization: true } } },
    });

    if (!token) return { success: false, error: 'Geçersiz anket linki' };
    if (token.expiresAt < new Date()) return { success: false, error: 'Anket linkinizin süresi dolmuş' };
    if (token.usedCount >= token.maxUses) {
      // Session aktif mi kontrol et (yarıda bırakma durumu)
      const existingSession = await redis.get(`session:${token.id}`);
      if (!existingSession) return { success: false, error: 'Bu anket linki daha önce kullanılmış' };
    }
    if (token.campaign.status !== 'ACTIVE') return { success: false, error: 'Bu anket kampanyası aktif değil' };

    // Fingerprint kontrolü (opsiyonel)
    if (token.fingerprintHash && fingerprint) {
      const fpHash = crypto.createHash('sha256').update(fingerprint).digest('hex');
      if (fpHash !== token.fingerprintHash) return { success: false, error: 'Cihaz doğrulaması başarısız' };
    }

    // Mevcut yanıt var mı? (devam etme)
    const existingResponse = await prisma.surveyResponse.findFirst({
      where: { campaignId: token.campaignId, anonymousParticipantId: `anon_${token.id}` },
      include: { answers: true },
    });

    if (existingResponse && existingResponse.status === 'COMPLETED') {
      return { success: false, error: 'Bu anket zaten tamamlanmış' };
    }

    // Anonim katılımcı ID üret (token ID'den türetilir ama geri döndürülemez)
    const anonymousId = existingResponse?.anonymousParticipantId ?? `anon_${crypto.createHash('sha256').update(token.id + config.ENCRYPTION_KEY).digest('hex').substring(0, 16)}`;

    // Session oluştur/yenile (Redis — 60 dk timeout)
    const sessionId = existingResponse?.id ?? crypto.randomUUID();
    await redis.set(`session:${token.id}`, sessionId, 'EX', SURVEY.SESSION_TIMEOUT_MINUTES * 60);

    // Yanıt kaydı oluştur veya güncelle
    let response = existingResponse;
    if (!response) {
      // İlk kez — token kullanımını artır
      await prisma.surveyToken.update({ where: { id: token.id }, data: { usedCount: { increment: 1 }, ipHash: crypto.createHash('sha256').update(ip).digest('hex') } });

      response = await prisma.surveyResponse.create({
        data: {
          id: sessionId,
          campaignId: token.campaignId,
          anonymousParticipantId: anonymousId,
          stakeholderGroup: 'ACADEMIC', // Token'dan alınacak
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          consentIp: ip,
        },
        include: { answers: true },
      });
    }

    // Mevcut yanıtları dönüştür (devam etme için)
    const savedAnswers: Record<string, any> = {};
    if (response.answers) {
      for (const a of response.answers) {
        savedAnswers[a.questionId] = a.answerJson;
      }
    }

    return {
      success: true,
      sessionId: response.id,
      campaign: {
        name: token.campaign.name,
        orgName: token.campaign.organization.name,
        modules: token.moduleSet,
      },
      savedAnswers,
    };
  }

  // ── Otomatik Kaydetme (Auto-save) ──
  async saveProgress(sessionId: string, answers: Record<string, any>, moduleIndex: number, questionIndex: number) {
    // Session doğrula
    const response = await prisma.surveyResponse.findUnique({ where: { id: sessionId } });
    if (!response || response.status === 'COMPLETED') {
      return { success: false, error: 'Geçersiz oturum' };
    }

    // Yanıtları batch upsert (tek transaction)
    const operations = Object.entries(answers).map(([questionId, answerData]) =>
      prisma.surveyAnswer.upsert({
        where: { responseId_questionId: { responseId: sessionId, questionId } },
        create: { responseId: sessionId, moduleCode: (answerData as any).moduleCode ?? 'UNKNOWN', questionId, answerJson: answerData },
        update: { answerJson: answerData },
      })
    );

    await prisma.$transaction(operations);

    // Son kayıt zamanını güncelle
    await prisma.surveyResponse.update({
      where: { id: sessionId },
      data: { lastSavedAt: new Date() },
    });

    // Redis session timeout'u yenile
    const tokenKey = await redis.keys(`session:*`); // Simplified — gerçek implementasyonda sessionId→tokenId mapping
    // await redis.expire(tokenKey, SURVEY.SESSION_TIMEOUT_MINUTES * 60);

    return { success: true, savedAt: new Date().toISOString(), answersCount: Object.keys(answers).length };
  }

  // ── Anket Tamamlama ──
  async submit(sessionId: string) {
    const response = await prisma.surveyResponse.findUnique({
      where: { id: sessionId },
      include: { answers: true, campaign: true },
    });

    if (!response) return { success: false, error: 'Oturum bulunamadı' };
    if (response.status === 'COMPLETED') return { success: false, error: 'Bu anket zaten gönderilmiş' };

    // Modüller ve soru sayısı kontrolü
    const modules = response.campaign.moduleConfigJson as string[];
    const answeredCount = response.answers.length;
    // TODO: Her modül için minimum yanıt kontrolü

    // Durumu güncelle
    await prisma.surveyResponse.update({
      where: { id: sessionId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    // Session'ı temizle
    await redis.del(`session:${sessionId}`);

    // Audit log
    await prisma.auditLog.create({
      data: {
        orgId: response.campaign.orgId,
        action: 'survey.complete',
        resourceType: 'response',
        resourceId: sessionId,
        detailsJson: { answersCount: answeredCount, completionTime: response.startedAt ? Date.now() - response.startedAt.getTime() : null },
      },
    });

    return { success: true, message: 'Anketiniz başarıyla gönderildi. Teşekkürler!' };
  }
}

export const surveyService = new SurveyService();
