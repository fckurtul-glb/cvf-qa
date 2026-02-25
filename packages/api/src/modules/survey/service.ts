import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { config } from '../../config/env';
import crypto from 'crypto';
import questionBank from '../../data/question-bank.json';

const OCAI = questionBank.modules.M1_OCAI;
const VALID_DIMENSIONS = OCAI.dimensions.map((d) => d.id);
const VALID_PERSPECTIVES = OCAI.perspectives;
const VALID_ALTERNATIVES = ['A', 'B', 'C', 'D'];

// Redis key TTL for survey resume: 14 days
const RESUME_KEY_TTL = 86400 * 14;

class SurveyService {
  // ── Token Doğrulama ──
  async validateToken(rawToken: string) {
    const tokenHash = crypto
      .createHmac('sha256', config.ENCRYPTION_KEY)
      .update(rawToken)
      .digest('hex');

    const token = await prisma.surveyToken.findUnique({
      where: { tokenHash },
      include: { campaign: true },
    });

    if (!token) return { success: false, error: 'Geçersiz veya süresi dolmuş token' };
    if (token.expiresAt < new Date()) return { success: false, error: 'Token süresi dolmuş' };
    if (token.usedCount >= token.maxUses) return { success: false, error: 'Bu token zaten kullanılmış' };
    if (token.campaign.status !== 'ACTIVE') return { success: false, error: 'Kampanya aktif değil' };

    // FIX C: Resume lookup via Redis instead of anonymousParticipantId prefix (prevents identity leak)
    let existingResponse = null;
    const resumeResponseId = await redis.get(`survey:resume:${tokenHash}`);
    if (resumeResponseId) {
      existingResponse = await prisma.surveyResponse.findUnique({
        where: { id: resumeResponseId },
        include: { answers: true },
      });
      // Discard if response is already completed or belongs to a different campaign
      if (
        existingResponse &&
        (existingResponse.status === 'COMPLETED' || existingResponse.campaignId !== token.campaignId)
      ) {
        existingResponse = null;
      }
    }

    return {
      success: true,
      data: {
        tokenHash,
        campaignId: token.campaignId,
        campaignName: token.campaign.name,
        modules: token.moduleSet as string[],
        existingResponseId: existingResponse?.id || null,
        existingAnswers: existingResponse?.answers?.reduce((acc, a) => {
          const json = a.answerJson as any;
          if (json?.questionId && json?.value !== undefined) {
            acc[a.moduleCode] = acc[a.moduleCode] || {};
            acc[a.moduleCode][json.questionId] = json.value;
          }
          return acc;
        }, {} as Record<string, Record<string, number>>) || {},
      },
    };
  }

  // ── KVKK Onayı + Demografik Bilgi ──
  async recordConsent(
    tokenHash: string,
    demographic?: { seniorityRange?: string; ageRange?: string },
    ip?: string,
    userAgent?: string,
  ) {
    const token = await prisma.surveyToken.findUnique({
      where: { tokenHash },
      include: { campaign: true },
    });

    if (!token) return { success: false, error: 'Geçersiz token' };

    // FIX C: Fully random anonymous ID — no connection to tokenHash (prevents identity leak)
    const anonymousId = crypto.randomBytes(18).toString('hex');

    // SurveyResponse oluştur
    const response = await prisma.surveyResponse.create({
      data: {
        campaignId: token.campaignId,
        anonymousParticipantId: anonymousId,
        stakeholderGroup: 'ACADEMIC', // Token'dan alınabilir gelecekte
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        consentGivenAt: new Date(),
        consentIp: ip,
        demographicJson: demographic || {},
      },
    });

    // FIX C: Store responseId in Redis keyed by tokenHash for resume lookups
    await redis.setex(`survey:resume:${tokenHash}`, RESUME_KEY_TTL, response.id);

    // ConsentLog kaydet
    await prisma.consentLog.create({
      data: {
        responseId: response.id,
        consentType: 'kvkk_aydinlatma',
        consentText: 'KVKK Aydınlatma Metni onaylanmıştır. Kişisel verileriniz anonim olarak işlenecektir.',
        ipAddress: ip || 'unknown',
        userAgent: userAgent || 'unknown',
      },
    });

    // Token kullanım sayısını artır
    await prisma.surveyToken.update({
      where: { id: token.id },
      data: { usedCount: { increment: 1 } },
    });

    return {
      success: true,
      data: {
        responseId: response.id,
        modules: token.moduleSet as string[],
        campaignName: token.campaign.name,
      },
    };
  }

  // ── Otomatik Kaydetme ──
  async autoSave(responseId: string, moduleCode: string, answers: Record<string, number>) {
    const response = await prisma.surveyResponse.findUnique({
      where: { id: responseId },
    });

    if (!response) return { success: false, error: 'Yanıt bulunamadı' };
    if (response.status === 'COMPLETED') return { success: false, error: 'Anket zaten tamamlanmış' };

    // Mevcut yanıtları sil ve yenileriyle değiştir (upsert)
    const modules = questionBank.modules as Record<string, any>;
    const mod = modules[moduleCode];
    if (!mod) return { success: false, error: `Geçersiz modül: ${moduleCode}` };

    const allItems: { id: string; subdimension: string }[] = [];
    if (mod.subdimensions) {
      for (const sub of mod.subdimensions) {
        for (const item of sub.items) {
          allItems.push({ id: item.id, subdimension: sub.id });
        }
      }
    } else if (mod.items) {
      for (const item of mod.items) {
        allItems.push({ id: item.id, subdimension: `${moduleCode}_general` });
      }
    }

    // Sadece cevaplanmış soruları kaydet
    for (const [questionId, value] of Object.entries(answers)) {
      const item = allItems.find((i) => i.id === questionId);
      if (!item) continue;

      await prisma.surveyAnswer.upsert({
        where: { responseId_questionId: { responseId, questionId } },
        create: {
          responseId,
          moduleCode,
          questionId,
          answerJson: { questionId, subdimension: item.subdimension, value },
        },
        update: {
          answerJson: { questionId, subdimension: item.subdimension, value },
        },
      });
    }

    // lastSavedAt güncelle
    await prisma.surveyResponse.update({
      where: { id: responseId },
      data: { lastSavedAt: new Date() },
    });

    return { success: true, savedCount: Object.keys(answers).length };
  }

  // ── OCAI Yanıtlarını Doğrula ve Kaydet ──
  async submitOCAI(
    orgId: string,
    userId: string,
    answers: Record<string, Record<string, Record<string, number>>>,
  ) {
    // Validasyon: 6 boyut × 2 perspektif = 12 set, her biri toplam 100
    for (const dimId of VALID_DIMENSIONS) {
      if (!answers[dimId]) {
        return { success: false, error: `Eksik boyut: ${dimId}` };
      }

      for (const perspective of VALID_PERSPECTIVES) {
        if (!answers[dimId][perspective]) {
          return { success: false, error: `Eksik perspektif: ${dimId} — ${perspective}` };
        }

        const values = answers[dimId][perspective];
        let total = 0;

        for (const alt of VALID_ALTERNATIVES) {
          const val = values[alt];
          if (val === undefined || val === null || typeof val !== 'number') {
            return { success: false, error: `Eksik alternatif: ${dimId}/${perspective}/${alt}` };
          }
          if (val < 0 || val > 100 || !Number.isInteger(val)) {
            return { success: false, error: `Geçersiz puan (0-100 arası tam sayı): ${dimId}/${perspective}/${alt} = ${val}` };
          }
          total += val;
        }

        if (total !== 100) {
          return { success: false, error: `Toplam 100 olmalıdır: ${dimId}/${perspective} = ${total}` };
        }
      }
    }

    // Anonim katılımcı ID üret
    const anonymousId = crypto
      .createHash('sha256')
      .update(userId + config.ENCRYPTION_KEY + Date.now().toString())
      .digest('hex')
      .substring(0, 24);

    // Kampanya: var mı kontrol et, yoksa varsayılan oluştur (MVP)
    let campaign = await prisma.surveyCampaign.findFirst({
      where: { orgId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!campaign) {
      campaign = await prisma.surveyCampaign.create({
        data: {
          orgId,
          name: 'OCAI Değerlendirmesi',
          status: 'ACTIVE',
          moduleConfigJson: ['M1_OCAI'],
          targetGroups: ['ACADEMIC', 'ADMINISTRATIVE'],
          createdBy: userId,
          startedAt: new Date(),
        },
      });
    }

    // SurveyResponse + SurveyAnswer transaction
    const response = await prisma.surveyResponse.create({
      data: {
        campaignId: campaign.id,
        anonymousParticipantId: anonymousId,
        stakeholderGroup: 'ACADEMIC',
        status: 'COMPLETED',
        startedAt: new Date(),
        completedAt: new Date(),
        consentGivenAt: new Date(),
        answers: {
          create: this.flattenAnswers(answers),
        },
      },
      include: { answers: true },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        orgId,
        action: 'survey.ocai_submit',
        resourceType: 'survey_response',
        resourceId: response.id,
        detailsJson: { answersCount: response.answers.length },
      },
    });

    return {
      success: true,
      responseId: response.id,
      answersCount: response.answers.length,
      message: 'OCAI anketiniz başarıyla kaydedildi. Teşekkürler!',
    };
  }

  // ── OCAI Sonuçlarını Hesapla ──
  async getResult(responseId: string) {
    const response = await prisma.surveyResponse.findUnique({
      where: { id: responseId },
      include: { answers: { where: { moduleCode: 'M1_OCAI' } } },
    });

    if (!response) return { success: false, error: 'Yanıt bulunamadı' };
    if (response.status !== 'COMPLETED') return { success: false, error: 'Anket henüz tamamlanmamış' };

    // Yanıtları perspektif bazında grupla
    const byPerspective: Record<string, Record<string, number>[]> = {
      mevcut: [],
      tercih_edilen: [],
    };

    for (const answer of response.answers) {
      const data = answer.answerJson as { dimension: string; perspective: string; values: Record<string, number> };
      if (data.perspective && data.values) {
        byPerspective[data.perspective]?.push(data.values);
      }
    }

    // Her kültür tipi için ortalama hesapla (6 boyutun ortalaması)
    const scores: Record<string, { mevcut: number; tercih_edilen: number }> = {};

    for (const alt of VALID_ALTERNATIVES) {
      const mevcutSum = byPerspective.mevcut.reduce((s, v) => s + (v[alt] || 0), 0);
      const tercihSum = byPerspective.tercih_edilen.reduce((s, v) => s + (v[alt] || 0), 0);
      const mevcutCount = byPerspective.mevcut.length || 1;
      const tercihCount = byPerspective.tercih_edilen.length || 1;

      scores[alt] = {
        mevcut: Math.round((mevcutSum / mevcutCount) * 10) / 10,
        tercih_edilen: Math.round((tercihSum / tercihCount) * 10) / 10,
      };
    }

    // Baskın kültür tipi belirle
    const dominantMevcut = Object.entries(scores).sort((a, b) => b[1].mevcut - a[1].mevcut)[0][0];
    const dominantTercih = Object.entries(scores).sort((a, b) => b[1].tercih_edilen - a[1].tercih_edilen)[0][0];

    // Boyut bazlı detay
    const dimensions: Record<string, Record<string, Record<string, number>>> = {};
    for (const answer of response.answers) {
      const data = answer.answerJson as { dimension: string; perspective: string; values: Record<string, number> };
      if (!dimensions[data.dimension]) dimensions[data.dimension] = {};
      dimensions[data.dimension][data.perspective] = data.values;
    }

    return {
      success: true,
      data: {
        responseId: response.id,
        completedAt: response.completedAt,
        cultureTypes: OCAI.cultureTypes,
        scores,
        dominant: {
          mevcut: { type: dominantMevcut, name: (OCAI.cultureTypes as Record<string, string>)[dominantMevcut] },
          tercih_edilen: { type: dominantTercih, name: (OCAI.cultureTypes as Record<string, string>)[dominantTercih] },
        },
        dimensions,
        dimensionLabels: OCAI.dimensions.map((d) => ({ id: d.id, title: d.title })),
      },
    };
  }

  // ── Likert Sonuçlarını Hesapla (QCI / UWES / PKE / SPU) ──
  async getLikertResult(responseId: string, moduleCode: string) {
    const response = await prisma.surveyResponse.findUnique({
      where: { id: responseId },
      include: { answers: { where: { moduleCode } } },
    });

    if (!response) return { success: false, error: 'Yanıt bulunamadı' };
    if (response.status !== 'COMPLETED') return { success: false, error: 'Anket henüz tamamlanmamış' };

    // Alt boyut bazlı skorlar hesapla
    const subdimensionScores: Record<string, { values: number[]; title: string }> = {};

    for (const answer of response.answers) {
      const data = answer.answerJson as { questionId: string; subdimension: string; value: number };
      if (!subdimensionScores[data.subdimension]) {
        // Alt boyut başlığını question bank'ten al
        const mod = (questionBank.modules as Record<string, any>)[moduleCode];
        const sub = mod?.subdimensions?.find((s: any) => s.id === data.subdimension);
        subdimensionScores[data.subdimension] = {
          values: [],
          title: sub?.title || data.subdimension,
        };
      }
      subdimensionScores[data.subdimension].values.push(data.value);
    }

    // Ortalama ve standart sapma hesapla
    const subdimensions = Object.entries(subdimensionScores).map(([id, { values, title }]) => {
      const mean = values.reduce((s, v) => s + v, 0) / values.length;
      const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
      const std = Math.sqrt(variance);

      return {
        id,
        title,
        mean: Math.round(mean * 100) / 100,
        std: Math.round(std * 100) / 100,
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
      };
    });

    // Genel ortalama
    const allValues = Object.values(subdimensionScores).flatMap((s) => s.values);
    const overallMean = allValues.reduce((s, v) => s + v, 0) / allValues.length;

    return {
      success: true,
      data: {
        responseId: response.id,
        moduleCode,
        completedAt: response.completedAt,
        overallMean: Math.round(overallMean * 100) / 100,
        totalAnswers: allValues.length,
        subdimensions,
      },
    };
  }

  // ── Likert Yanıtlarını Doğrula ve Kaydet (QCI / UWES / PKE / SPU) ──
  async submitLikert(
    orgId: string,
    userId: string,
    moduleCode: 'M2_QCI' | 'M4_UWES' | 'M5_PKE' | 'M6_SPU' | 'M3_MSAI',
    answers: Record<string, number>,
  ) {
    const modules = questionBank.modules as Record<string, any>;
    const moduleData = modules[moduleCode];

    const allItems: { id: string; subdimension: string }[] = [];

    if (moduleData.subdimensions) {
      // QCI, UWES, PKE — subdimensions ile yapılandırılmış
      for (const sub of moduleData.subdimensions) {
        for (const item of sub.items) {
          allItems.push({ id: item.id, subdimension: sub.id });
        }
      }
    } else if (moduleData.items) {
      // SPU — düz items listesi
      for (const item of moduleData.items) {
        allItems.push({ id: item.id, subdimension: 'SPU_general' });
      }
    }

    const scaleMin = moduleCode === 'M4_UWES' ? 0 : 1;
    const scaleMax = moduleCode === 'M4_UWES' ? 6 : 5;

    // Validasyon
    for (const item of allItems) {
      const val = answers[item.id];
      if (val === undefined || val === null) {
        return { success: false, error: `Eksik yanıt: ${item.id}` };
      }
      if (typeof val !== 'number' || !Number.isInteger(val) || val < scaleMin || val > scaleMax) {
        return { success: false, error: `Geçersiz değer (${scaleMin}-${scaleMax}): ${item.id} = ${val}` };
      }
    }

    // Anonim katılımcı ID üret
    const anonymousId = crypto
      .createHash('sha256')
      .update(userId + config.ENCRYPTION_KEY + Date.now().toString())
      .digest('hex')
      .substring(0, 24);

    // Kampanya bul veya oluştur
    let campaign = await prisma.surveyCampaign.findFirst({
      where: { orgId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!campaign) {
      const moduleName = moduleCode === 'M2_QCI' ? 'QCI-TR Değerlendirmesi' : 'UWES-TR Değerlendirmesi';
      campaign = await prisma.surveyCampaign.create({
        data: {
          orgId,
          name: moduleName,
          status: 'ACTIVE',
          moduleConfigJson: [moduleCode],
          targetGroups: ['ACADEMIC', 'ADMINISTRATIVE'],
          createdBy: userId,
          startedAt: new Date(),
        },
      });
    }

    // SurveyResponse + SurveyAnswer transaction
    const flatAnswers = allItems.map((item) => ({
      moduleCode,
      questionId: item.id,
      answerJson: {
        questionId: item.id,
        subdimension: item.subdimension,
        value: answers[item.id],
      },
    }));

    const response = await prisma.surveyResponse.create({
      data: {
        campaignId: campaign.id,
        anonymousParticipantId: anonymousId,
        stakeholderGroup: 'ACADEMIC',
        status: 'COMPLETED',
        startedAt: new Date(),
        completedAt: new Date(),
        consentGivenAt: new Date(),
        answers: {
          create: flatAnswers,
        },
      },
      include: { answers: true },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        orgId,
        action: `survey.${moduleCode.toLowerCase()}_submit`,
        resourceType: 'survey_response',
        resourceId: response.id,
        detailsJson: { answersCount: response.answers.length, moduleCode },
      },
    });

    return {
      success: true,
      responseId: response.id,
      answersCount: response.answers.length,
      message: `${moduleData.name} anketiniz başarıyla kaydedildi. Teşekkürler!`,
    };
  }

  private flattenAnswers(answers: Record<string, Record<string, Record<string, number>>>) {
    const flat: { moduleCode: string; questionId: string; answerJson: any }[] = [];

    for (const dimId of Object.keys(answers)) {
      for (const perspective of Object.keys(answers[dimId])) {
        flat.push({
          moduleCode: 'M1_OCAI',
          questionId: `${dimId}_${perspective}`,
          answerJson: {
            dimension: dimId,
            perspective,
            values: answers[dimId][perspective],
          },
        });
      }
    }

    return flat;
  }
}

export const surveyService = new SurveyService();
