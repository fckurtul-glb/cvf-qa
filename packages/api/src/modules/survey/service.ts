import { prisma } from '../../config/database';
import { config } from '../../config/env';
import crypto from 'crypto';
import questionBank from '../../data/question-bank.json';

const OCAI = questionBank.modules.M1_OCAI;
const VALID_DIMENSIONS = OCAI.dimensions.map((d) => d.id);
const VALID_PERSPECTIVES = OCAI.perspectives;
const VALID_ALTERNATIVES = ['A', 'B', 'C', 'D'];

class SurveyService {
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
