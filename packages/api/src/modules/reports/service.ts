import { prisma } from '../../config/database';
import { config } from '../../config/env';
import crypto from 'crypto';
import { aiInsightService } from '../ai/service';
import { ANONYMITY } from '@cvf-qa/shared';

interface ReportGenInput {
  campaignId: string;
  orgId: string;
  reportType: 'INSTITUTIONAL' | 'DEPARTMENT' | 'INDIVIDUAL_360' | 'YOKAK_EVIDENCE';
  scope?: string; // departmentId for DEPARTMENT, userId for 360
  generatedBy: string;
}

class ReportService {
  // ── Rapor Üretimi Orchestrator ──
  async generate(input: ReportGenInput) {
    const campaign = await prisma.surveyCampaign.findUnique({
      where: { id: input.campaignId },
      include: { organization: true },
    });
    if (!campaign) throw new Error('Kampanya bulunamadı');

    // Yanıtları topla
    const responses = await prisma.surveyResponse.findMany({
      where: { campaignId: input.campaignId, status: 'COMPLETED' },
      include: { answers: true },
    });

    if (responses.length === 0) throw new Error('Tamamlanmış yanıt bulunamadı');

    // Birim bazlı rapor: min 5 kişi kuralı
    if (input.reportType === 'DEPARTMENT' && input.scope) {
      const deptResponses = responses.filter((r) => r.departmentCode === input.scope);
      if (deptResponses.length < ANONYMITY.MIN_GROUP_SIZE) {
        throw new Error(`Bu birimde yalnızca ${deptResponses.length} yanıt var. Anonimlik garantisi için minimum ${ANONYMITY.MIN_GROUP_SIZE} yanıt gereklidir.`);
      }
    }

    // Veri analizi
    const analysisResult = await this.analyzeResponses(responses, campaign.moduleConfigJson as string[]);

    // AI yorumu üret
    const insights = await aiInsightService.generateInsights({
      orgName: campaign.organization.name,
      campaignName: campaign.name,
      cultureProfile: analysisResult.cultureProfile,
      gapAnalysis: analysisResult.gapAnalysis,
      moduleScores: analysisResult.moduleScores,
      responseRate: Math.round((responses.length / (await prisma.surveyToken.count({ where: { campaignId: input.campaignId } }))) * 100),
    });

    // PDF üret (TODO: Puppeteer ile HTML→PDF)
    const pdfPath = await this.generatePDF(input, analysisResult, insights);

    // Rapor kaydı oluştur
    const accessToken = crypto.randomBytes(32).toString('hex');
    const report = await prisma.report.create({
      data: {
        campaignId: input.campaignId,
        orgId: input.orgId,
        reportType: input.reportType,
        scope: input.scope ?? 'institutional',
        filePathEncrypted: this.encrypt(pdfPath),
        accessTokenHash: crypto.createHmac('sha256', config.ENCRYPTION_KEY).update(accessToken).digest('hex'),
        expiresAt: new Date(Date.now() + 90 * 24 * 3600 * 1000), // 90 gün
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        orgId: input.orgId,
        userId: input.generatedBy,
        action: 'report.generate',
        resourceType: 'report',
        resourceId: report.id,
        detailsJson: { reportType: input.reportType, responseCount: responses.length },
      },
    });

    return {
      reportId: report.id,
      accessToken,
      generatedAt: report.generatedAt,
      analysis: analysisResult,
      insights,
    };
  }

  // ── Yanıt Analizi ──
  private async analyzeResponses(responses: any[], modules: string[]) {
    const cultureProfile = { current: { clan: 0, adhocracy: 0, market: 0, hierarchy: 0 }, preferred: { clan: 0, adhocracy: 0, market: 0, hierarchy: 0 } };
    const moduleScores: Record<string, Record<string, { mean: number; sd: number; values: number[] }>> = {};

    for (const response of responses) {
      for (const answer of response.answers) {
        const data = answer.answerJson as any;

        // OCAI (M1) — İpsatif skorlama
        if (answer.moduleCode === 'M1_OCAI' && data.distribution) {
          const perspective = data.perspective ?? 'current';
          const profile = perspective === 'preferred' ? cultureProfile.preferred : cultureProfile.current;
          profile.clan += data.distribution.A;
          profile.adhocracy += data.distribution.B;
          profile.market += data.distribution.C;
          profile.hierarchy += data.distribution.D;
        }

        // Likert modüller — boyut bazlı skor toplama
        if (data.value !== undefined && data.dimension) {
          if (!moduleScores[answer.moduleCode]) moduleScores[answer.moduleCode] = {};
          if (!moduleScores[answer.moduleCode][data.dimension]) {
            moduleScores[answer.moduleCode][data.dimension] = { mean: 0, sd: 0, values: [] };
          }
          moduleScores[answer.moduleCode][data.dimension].values.push(data.value);
        }
      }
    }

    // OCAI ortalamaları
    const ocaiCount = responses.filter((r) => r.answers.some((a: any) => a.moduleCode === 'M1_OCAI')).length || 1;
    for (const key of ['clan', 'adhocracy', 'market', 'hierarchy'] as const) {
      cultureProfile.current[key] = Math.round((cultureProfile.current[key] / ocaiCount) * 10) / 10;
      cultureProfile.preferred[key] = Math.round((cultureProfile.preferred[key] / ocaiCount) * 10) / 10;
    }

    // Likert betimsel istatistik
    for (const mod of Object.keys(moduleScores)) {
      for (const dim of Object.keys(moduleScores[mod])) {
        const vals = moduleScores[mod][dim].values;
        const n = vals.length || 1;
        const mean = vals.reduce((s, v) => s + v, 0) / n;
        const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1 || 1);
        moduleScores[mod][dim] = { mean: Math.round(mean * 100) / 100, sd: Math.round(Math.sqrt(variance) * 100) / 100, values: [] };
      }
    }

    // Gap analizi
    const gapAnalysis = (['clan', 'adhocracy', 'market', 'hierarchy'] as const).map((type) => ({
      type,
      current: cultureProfile.current[type],
      preferred: cultureProfile.preferred[type],
      gap: Math.round((cultureProfile.preferred[type] - cultureProfile.current[type]) * 10) / 10,
    })).sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));

    return { cultureProfile, gapAnalysis, moduleScores, responseCount: responses.length };
  }

  // ── YÖKAK Kanıt Dosyası ──
  async generateYokakEvidence(campaignId: string, orgId: string) {
    const report = await this.generate({
      campaignId,
      orgId,
      reportType: 'YOKAK_EVIDENCE',
      generatedBy: 'system',
    });

    // YÖKAK ölçüt eşleştirmesi
    const evidenceMap = [
      { criterion: 'A.1.4', source: 'M2_QCI', title: 'İç kalite güvencesi mekanizmaları', data: report.analysis.moduleScores['M2_QCI'] },
      { criterion: 'A.2.3', source: 'M3_MSAI', title: 'Performans yönetimi', data: report.analysis.moduleScores['M3_MSAI'] },
      { criterion: 'A.3', source: 'M1_OCAI', title: 'Kalite güvencesi — kültür profili', data: report.analysis.cultureProfile },
      { criterion: 'A.4.1', source: 'M5_PKE', title: 'İç ve dış paydaş katılımı', data: report.analysis.moduleScores['M5_PKE'] },
      { criterion: 'A.5', source: 'M4_UWES', title: 'İnsan kaynakları yönetimi', data: report.analysis.moduleScores['M4_UWES'] },
      { criterion: 'A.6', source: 'M6_SPU', title: 'Stratejik planlama', data: report.analysis.moduleScores['M6_SPU'] },
    ];

    return { ...report, yokakEvidenceMap: evidenceMap };
  }

  // ── PDF Üretimi (Puppeteer placeholder) ──
  private async generatePDF(input: ReportGenInput, analysis: any, insights: any): Promise<string> {
    // TODO: Puppeteer ile HTML şablonundan PDF üret
    const fileName = `report_${input.campaignId}_${input.reportType}_${Date.now()}.pdf`;
    const path = `reports/${input.orgId}/${fileName}`;
    // S3'e yükle...
    return path;
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(config.ENCRYPTION_KEY, 'hex').subarray(0, 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    return iv.toString('hex') + ':' + Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]).toString('hex');
  }
}

export const reportService = new ReportService();
