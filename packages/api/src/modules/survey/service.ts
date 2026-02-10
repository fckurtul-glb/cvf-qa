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
