import { prisma } from '../../config/database';
import { config } from '../../config/env';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import { resolve } from 'path';
import questionBank from '../../data/question-bank.json';

const OCAI = questionBank.modules.M1_OCAI;

const MSAI = (questionBank.modules as any).M3_MSAI;

const MODULE_LABELS: Record<string, string> = {
  M1_OCAI: 'OCAI — Kultur Profili',
  M2_QCI: 'QCI — Kalite Kulturu',
  M3_MSAI: 'MSAI — Yonetici Degerlendirme',
  M4_UWES: 'UWES — Ise Baglilik',
  M5_PKE: 'PKE — Paydas Katilim',
  M6_SPU: 'SPU — Stratejik Plan Uyumu',
};

const CULTURE_LABELS: Record<string, string> = {
  A: 'Klan',
  B: 'Adhokrasi',
  C: 'Pazar',
  D: 'Hiyerarsi',
};

const apiRoot = resolve(__dirname, '..', '..', '..');
const FONT_REGULAR = resolve(apiRoot, 'fonts', 'Roboto-Regular.ttf');
const FONT_ITALIC = resolve(apiRoot, 'fonts', 'Roboto-Italic.ttf');

class ReportService {
  // ── Rapor Olustur ──
  async generateReport(campaignId: string, orgId: string, userId: string) {
    const campaign = await prisma.surveyCampaign.findFirst({
      where: { id: campaignId, orgId },
      include: {
        organization: true,
        responses: {
          where: { status: 'COMPLETED' },
          include: { answers: true },
        },
        _count: { select: { tokens: true, responses: true } },
      },
    });

    if (!campaign) return { success: false, error: 'Kampanya bulunamadi' };
    if (campaign.responses.length === 0) return { success: false, error: 'Henuz tamamlanmis yanit yok' };

    const modules = (campaign.moduleConfigJson as string[]) || [];
    const orgName = campaign.organization.name;
    const responseCount = campaign.responses.length;

    const ocaiData = modules.includes('M1_OCAI') ? this.aggregateOCAI(campaign.responses) : null;
    const likertData: Record<string, any> = {};
    for (const mod of ['M2_QCI', 'M4_UWES', 'M5_PKE', 'M6_SPU']) {
      if (modules.includes(mod)) {
        likertData[mod] = this.aggregateLikert(campaign.responses, mod);
      }
    }

    const demographics = this.aggregateDemographics(campaign.responses);

    const pdfBuffer = await this.buildPdf({
      orgName,
      campaignName: campaign.name,
      responseCount,
      tokenCount: campaign._count.tokens,
      generatedAt: new Date(),
      modules,
      ocaiData,
      likertData,
      demographics,
    });

    const accessToken = crypto.randomBytes(32).toString('hex');
    const accessTokenHash = crypto
      .createHmac('sha256', config.ENCRYPTION_KEY)
      .update(accessToken)
      .digest('hex');

    const filePathEncrypted = this.encrypt(pdfBuffer.toString('base64'));

    const report = await prisma.report.create({
      data: {
        campaignId,
        orgId,
        reportType: 'INSTITUTIONAL',
        scope: 'institutional',
        filePathEncrypted,
        accessTokenHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.auditLog.create({
      data: {
        orgId,
        userId,
        action: 'report.generate',
        resourceType: 'report',
        resourceId: report.id,
        detailsJson: { campaignId, reportType: 'INSTITUTIONAL', responseCount },
      },
    });

    return {
      success: true,
      data: {
        reportId: report.id,
        accessToken,
        generatedAt: report.generatedAt,
      },
    };
  }

  // ── Rapor Indir ──
  async downloadReport(reportId: string, orgId: string) {
    const report = await prisma.report.findFirst({
      where: { id: reportId, orgId },
      include: { campaign: true },
    });

    if (!report) return { success: false, error: 'Rapor bulunamadi' };
    if (report.expiresAt && report.expiresAt < new Date()) {
      return { success: false, error: 'Rapor suresi dolmus' };
    }

    const pdfBase64 = this.decrypt(report.filePathEncrypted);
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const safeName = report.campaign.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = report.generatedAt.toISOString().split('T')[0];

    return {
      success: true,
      data: {
        buffer: pdfBuffer,
        filename: `CVF-QA_Rapor_${safeName}_${dateStr}.pdf`,
      },
    };
  }

  // ── Rapor Listesi ──
  async listReports(orgId: string) {
    const reports = await prisma.report.findMany({
      where: { orgId },
      orderBy: { generatedAt: 'desc' },
      include: { campaign: { select: { name: true } } },
    });

    return {
      success: true,
      data: reports.map((r) => ({
        id: r.id,
        campaignName: r.campaign.name,
        reportType: r.reportType,
        scope: r.scope,
        generatedAt: r.generatedAt,
        expired: r.expiresAt ? r.expiresAt < new Date() : false,
      })),
    };
  }

  // ── 360° Rapor PDF Üret ──
  async generate360Report(configId: string, orgId: string, userId: string) {
    const { assessment360Service } = await import('../assessment360/service');
    const reportResult = await assessment360Service.getReport(configId, orgId);

    if (!reportResult.success) return reportResult;

    const config360 = await prisma.assessment360Config.findUnique({
      where: { id: configId },
      include: {
        campaign: { include: { organization: true } },
        manager: { select: { name: true, email: true } },
      },
    });

    if (!config360) return { success: false, error: 'Konfigurasyon bulunamadi' };

    const reportData = reportResult.data as any;
    const managerName = config360.manager.name || config360.manager.email;
    const orgName = config360.campaign.organization.name;

    const pdfBuffer = await this.build360Pdf({
      orgName,
      campaignName: config360.campaign.name,
      managerName,
      generatedAt: new Date(),
      perspectives: reportData.perspectives,
      blindSpots: reportData.blindSpots,
      strengths: reportData.strengths,
      developmentAreas: reportData.developmentAreas,
    });

    const accessToken = crypto.randomBytes(32).toString('hex');
    const accessTokenHash = crypto
      .createHmac('sha256', config.ENCRYPTION_KEY)
      .update(accessToken)
      .digest('hex');

    const filePathEncrypted = this.encrypt(pdfBuffer.toString('base64'));

    const report = await prisma.report.create({
      data: {
        campaignId: config360.campaignId,
        orgId,
        reportType: '360_INDIVIDUAL',
        scope: `360_${configId}`,
        filePathEncrypted,
        accessTokenHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.auditLog.create({
      data: {
        orgId,
        userId,
        action: 'report.generate360',
        resourceType: 'report',
        resourceId: report.id,
        detailsJson: { configId, managerName },
      },
    });

    return {
      success: true,
      data: {
        reportId: report.id,
        accessToken,
        generatedAt: report.generatedAt,
      },
    };
  }

  // ═══════════════════════════════════════
  // PDF BUILDER (PDFKit)
  // ═══════════════════════════════════════

  private async buildPdf(data: {
    orgName: string;
    campaignName: string;
    responseCount: number;
    tokenCount: number;
    generatedAt: Date;
    modules: string[];
    ocaiData: any;
    likertData: Record<string, any>;
    demographics: any;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        bufferPages: true,
        font: FONT_REGULAR,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const dateStr = data.generatedAt.toLocaleDateString('tr-TR', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
      const responseRate = data.tokenCount > 0 ? Math.round((data.responseCount / data.tokenCount) * 100) : 0;

      // ── COVER PAGE ──
      doc.moveDown(6);
      doc.font(FONT_REGULAR).fontSize(36).fillColor('#2E86AB').text('CVF-QA', { align: 'center' });
      doc.fontSize(18).fillColor('#0F1D2F').text('Kurumsal Kultur Degerlendirme Raporu', { align: 'center' });
      doc.moveDown(0.5);
      doc.moveTo(180, doc.y).lineTo(415, doc.y).strokeColor('#2E86AB').lineWidth(2).stroke();
      doc.moveDown(2);
      doc.fontSize(20).fillColor('#0F1D2F').text(data.orgName, { align: 'center' });
      doc.fontSize(14).fillColor('#666666').text(data.campaignName, { align: 'center' });
      doc.moveDown(2);
      doc.fontSize(13).fillColor('#888888').text(dateStr, { align: 'center' });
      doc.fontSize(11).text(`Toplam Yanit: ${data.responseCount} / ${data.tokenCount} davet`, { align: 'center' });

      // ── EXECUTIVE SUMMARY ──
      doc.addPage();
      this.sectionTitle(doc, 'Yonetici Ozeti');
      this.paragraph(doc, `Bu rapor, ${data.orgName} kurumuna ait "${data.campaignName}" kampanyasinin sonuclarini icermektedir. Toplam ${data.responseCount} katilimcidan alinan yanitlar analiz edilmistir.`);
      doc.moveDown(0.5);

      const moduleList = data.modules.map((m) => MODULE_LABELS[m] || m).join(', ');
      this.paragraph(doc, `Degerlendirilen Moduller: ${moduleList}`);
      doc.font(FONT_REGULAR).fontSize(11).fillColor('#0F1D2F').text(`Yanitlanma Orani: %${responseRate}`);

      if (data.ocaiData) {
        doc.moveDown(1);
        this.subTitle(doc, 'OCAI Kultur Profili Ozeti');
        const dom = data.ocaiData.dominant;
        this.paragraph(doc, `Baskin mevcut kultur: ${CULTURE_LABELS[dom.mevcut] || dom.mevcut} (${data.ocaiData.scores[dom.mevcut]?.mevcut || '-'} puan)`);
        this.paragraph(doc, `Baskin tercih edilen kultur: ${CULTURE_LABELS[dom.tercih] || dom.tercih} (${data.ocaiData.scores[dom.tercih]?.tercih_edilen || '-'} puan)`);
      }

      // ── OCAI SECTION ──
      if (data.ocaiData) {
        doc.addPage();
        this.sectionTitle(doc, 'OCAI Kultur Profili');
        this.paragraph(doc, 'Mevcut ve tercih edilen kultur tipi skorlari:');
        doc.moveDown(0.5);

        // OCAI score table
        this.tableHeader(doc, ['Kultur Tipi', 'Mevcut', 'Tercih Edilen', 'Gap']);
        for (const alt of ['A', 'B', 'C', 'D']) {
          const m = data.ocaiData.scores[alt]?.mevcut || 0;
          const t = data.ocaiData.scores[alt]?.tercih_edilen || 0;
          const gap = Math.round((t - m) * 10) / 10;
          const gapStr = `${gap > 0 ? '+' : ''}${gap.toFixed(1)}`;
          this.tableRow(doc, [`${CULTURE_LABELS[alt]} (${alt})`, m.toFixed(1), t.toFixed(1), gapStr]);
        }

        // Dimension detail
        if (data.ocaiData.dimensionDetail && Object.keys(data.ocaiData.dimensionDetail).length > 0) {
          doc.moveDown(1.5);
          this.subTitle(doc, 'Boyut Bazli Detay (Mevcut)');
          this.tableHeader(doc, ['Boyut', 'Klan', 'Adhokrasi', 'Pazar', 'Hiyerarsi']);
          for (const dim of OCAI.dimensions) {
            const d = data.ocaiData.dimensionDetail[dim.id];
            if (!d) continue;
            this.tableRow(doc, [dim.title, d.A?.toFixed(1) || '-', d.B?.toFixed(1) || '-', d.C?.toFixed(1) || '-', d.D?.toFixed(1) || '-']);
          }
        }
      }

      // ── LIKERT MODULE SECTIONS ──
      for (const moduleCode of ['M2_QCI', 'M4_UWES', 'M5_PKE', 'M6_SPU']) {
        const ld = data.likertData[moduleCode];
        if (!ld) continue;

        const scaleMax = moduleCode === 'M4_UWES' ? 6 : 5;

        doc.addPage();
        this.sectionTitle(doc, MODULE_LABELS[moduleCode] || moduleCode);
        doc.font(FONT_REGULAR).fontSize(13).fillColor('#2E86AB')
          .text(`Genel Ortalama: ${ld.overallMean.toFixed(2)} / ${scaleMax}`);
        doc.fontSize(11).fillColor('#333333')
          .text(`Toplam Yanit Sayisi: ${ld.responseCount}`);
        doc.moveDown(1);

        if (ld.subdimensions && ld.subdimensions.length > 0) {
          this.subTitle(doc, 'Alt Boyut Skorlari');
          this.tableHeader(doc, ['Alt Boyut', 'Ort.', 'Std.', 'Min', 'Max', 'N']);
          for (const sub of ld.subdimensions) {
            this.tableRow(doc, [sub.title, sub.mean.toFixed(2), sub.std.toFixed(2), String(sub.min), String(sub.max), String(sub.count)]);
          }

          // Bar chart
          doc.moveDown(1);
          this.subTitle(doc, 'Skor Dagilimi');
          for (const sub of ld.subdimensions) {
            const y = doc.y;
            if (y > 700) { doc.addPage(); }
            const barWidth = Math.max((sub.mean / scaleMax) * 250, 2);
            doc.font(FONT_REGULAR).fontSize(9).fillColor('#0F1D2F')
              .text(sub.title, 50, doc.y, { width: 170, continued: false });
            const barY = doc.y - 12;
            doc.rect(225, barY, barWidth, 10).fill('#2E86AB');
            doc.rect(225 + barWidth, barY, 250 - barWidth, 10).fill('#E8E8E8');
            doc.font(FONT_REGULAR).fontSize(9).fillColor('#0F1D2F')
              .text(sub.mean.toFixed(2), 485, barY, { width: 40 });
            doc.y = barY + 18;
          }
        }
      }

      // ── DEMOGRAPHICS ──
      doc.addPage();
      this.sectionTitle(doc, 'Demografik Dagilim');

      const ages = data.demographics.ageRanges;
      const seniority = data.demographics.seniorityRanges;

      if (Object.keys(ages).length > 0) {
        this.subTitle(doc, 'Yas Araligi');
        const total = Object.values(ages as Record<string, number>).reduce((s, v) => s + v, 0);
        this.tableHeader(doc, ['Aralik', 'Sayi', 'Oran']);
        for (const [range, count] of Object.entries(ages as Record<string, number>)) {
          this.tableRow(doc, [range || 'Belirtilmemis', String(count), `%${total > 0 ? Math.round((count / total) * 100) : 0}`]);
        }
        doc.moveDown(1);
      }

      if (Object.keys(seniority).length > 0) {
        this.subTitle(doc, 'Kidem Yili');
        const total = Object.values(seniority as Record<string, number>).reduce((s, v) => s + v, 0);
        this.tableHeader(doc, ['Aralik', 'Sayi', 'Oran']);
        for (const [range, count] of Object.entries(seniority as Record<string, number>)) {
          this.tableRow(doc, [range || 'Belirtilmemis', String(count), `%${total > 0 ? Math.round((count / total) * 100) : 0}`]);
        }
      }

      if (Object.keys(ages).length === 0 && Object.keys(seniority).length === 0) {
        doc.font(FONT_ITALIC).fontSize(11).fillColor('#888888')
          .text('Demografik bilgi girilmemistir.');
      }

      // ── PAGE NUMBERS (footer) ──
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.font(FONT_REGULAR).fontSize(8).fillColor('#aaaaaa');
        doc.text('CVF-QA Kurumsal Kultur Degerlendirme', 50, 780, { width: 250 });
        doc.text(`Sayfa ${i + 1} / ${range.count}`, 300, 780, { width: 200, align: 'right' });
      }

      doc.end();
    });
  }

  // ── YÖKAK Kanıt Dosyası Üret ──
  async generateYokakReport(campaignId: string, orgId: string, userId: string) {
    const campaign = await prisma.surveyCampaign.findFirst({
      where: { id: campaignId, orgId },
      include: {
        organization: true,
        responses: {
          where: { status: 'COMPLETED' },
          include: { answers: true },
        },
        _count: { select: { tokens: true, responses: true } },
      },
    });

    if (!campaign) return { success: false, error: 'Kampanya bulunamadi' };
    if (campaign.responses.length === 0) return { success: false, error: 'Henuz tamamlanmis yanit yok' };

    const modules = (campaign.moduleConfigJson as string[]) || [];
    const orgName = campaign.organization.name;

    // Modül skorlarını hesapla
    const moduleScores: Record<string, { overallMean: number; responseCount: number; subdimensions: any[] }> = {};
    for (const mod of modules) {
      if (mod === 'M1_OCAI') continue; // OCAI ayrı format
      const ld = this.aggregateLikert(campaign.responses, mod);
      if (ld) moduleScores[mod] = ld;
    }

    const ocaiData = modules.includes('M1_OCAI') ? this.aggregateOCAI(campaign.responses) : null;

    // YÖKAK ölçüt-modül eşleştirmesi
    const YOKAK_MAP: { criterion: string; title: string; modules: string[]; description: string }[] = [
      { criterion: 'A.1.4', title: 'Ic Kalite Guvencesi Mekanizmalari', modules: ['M2_QCI'], description: 'QCI olcegi ile ic kalite guvencesi mekanizmalarinin etkinligi olculmustur.' },
      { criterion: 'A.2.1', title: 'Misyon, Vizyon ve Politikalar', modules: ['M1_OCAI'], description: 'OCAI kultur profili ile kurumsal kimlik ve stratejik yonelim degerlendirilmistir.' },
      { criterion: 'A.2.3', title: 'Performans Yonetimi', modules: ['M3_MSAI'], description: 'MSAI-YO 360 derece degerlendirme ile yonetici performansi olculmustur.' },
      { criterion: 'A.3.1', title: 'Bilgi Yonetim Sistemi', modules: ['M2_QCI'], description: 'Kalite kulturu olcegi ile bilgi yonetim sureclerinin etkinligi degerlendirilmistir.' },
      { criterion: 'A.3.4', title: 'Surec Yonetimi', modules: ['M2_QCI', 'M6_SPU'], description: 'QCI ve SPU olcekleri ile surec yonetimi etkinligi degerlendirilmistir.' },
      { criterion: 'A.4.1', title: 'Ic ve Dis Paydas Katilimi', modules: ['M5_PKE'], description: 'PKE olcegi ile paydas katilim etkinligi olculmustur.' },
      { criterion: 'A.5', title: 'Insan Kaynaklari Yonetimi', modules: ['M4_UWES'], description: 'UWES olcegi ile calisanlarin ise bagliligi ve motivasyonu degerlendirilmistir.' },
      { criterion: 'A.6', title: 'Stratejik Planlama', modules: ['M6_SPU'], description: 'SPU olcegi ile stratejik plan uyumu degerlendirilmistir.' },
    ];

    const pdfBuffer = await this.buildYokakPdf({
      orgName,
      campaignName: campaign.name,
      responseCount: campaign.responses.length,
      tokenCount: campaign._count.tokens,
      generatedAt: new Date(),
      yokakMap: YOKAK_MAP,
      moduleScores,
      ocaiData,
      modules,
    });

    const accessToken = crypto.randomBytes(32).toString('hex');
    const accessTokenHash = crypto
      .createHmac('sha256', config.ENCRYPTION_KEY)
      .update(accessToken)
      .digest('hex');

    const filePathEncrypted = this.encrypt(pdfBuffer.toString('base64'));

    const report = await prisma.report.create({
      data: {
        campaignId,
        orgId,
        reportType: 'YOKAK_EVIDENCE',
        scope: 'yokak',
        filePathEncrypted,
        accessTokenHash,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.auditLog.create({
      data: {
        orgId,
        userId,
        action: 'report.yokak',
        resourceType: 'report',
        resourceId: report.id,
        detailsJson: { campaignId, reportType: 'YOKAK_EVIDENCE' },
      },
    });

    return {
      success: true,
      data: { reportId: report.id, accessToken, generatedAt: report.generatedAt },
    };
  }

  // ═══════════════════════════════════════
  // 360° PDF BUILDER
  // ═══════════════════════════════════════

  private async build360Pdf(data: {
    orgName: string;
    campaignName: string;
    managerName: string;
    generatedAt: Date;
    perspectives: Record<string, { subdimensions: any[]; overallMean: number }>;
    blindSpots: any[];
    strengths: any[];
    developmentAreas: any[];
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        bufferPages: true,
        font: FONT_REGULAR,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const dateStr = data.generatedAt.toLocaleDateString('tr-TR', {
        year: 'numeric', month: 'long', day: 'numeric',
      });

      const PERSPECTIVE_LABELS: Record<string, string> = {
        SELF: 'Oz Degerlendirme',
        SUBORDINATE: 'Ast',
        PEER: 'Esduzey',
        SUPERIOR: 'Ust',
      };

      // ── COVER PAGE ──
      doc.moveDown(6);
      doc.font(FONT_REGULAR).fontSize(36).fillColor('#2E86AB').text('CVF-QA', { align: 'center' });
      doc.fontSize(18).fillColor('#0F1D2F').text('360° Yonetici Degerlendirme Raporu', { align: 'center' });
      doc.moveDown(0.5);
      doc.moveTo(150, doc.y).lineTo(445, doc.y).strokeColor('#2E86AB').lineWidth(2).stroke();
      doc.moveDown(2);
      doc.fontSize(22).fillColor('#0F1D2F').text(data.managerName, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(14).fillColor('#666666').text(data.orgName, { align: 'center' });
      doc.fontSize(12).text(data.campaignName, { align: 'center' });
      doc.moveDown(2);
      doc.fontSize(13).fillColor('#888888').text(dateStr, { align: 'center' });

      // ── ÖZET ──
      doc.addPage();
      this.sectionTitle(doc, 'Yonetici Ozeti');

      // Perspektif ortalama tablosu
      this.subTitle(doc, 'Perspektif Bazli Genel Ortalamalar');
      this.tableHeader(doc, ['Perspektif', 'Ortalama', 'Boyut Sayisi']);
      for (const [key, pData] of Object.entries(data.perspectives)) {
        this.tableRow(doc, [
          PERSPECTIVE_LABELS[key] || key,
          pData.overallMean.toFixed(2),
          String(pData.subdimensions.length),
        ]);
      }

      // ── GÜÇLÜ YÖNLER ──
      if (data.strengths.length > 0) {
        doc.moveDown(1.5);
        this.subTitle(doc, 'Guclu Yonler (Diger Perspektifler Bazinda)');
        this.tableHeader(doc, ['Sira', 'Boyut', 'Ortalama']);
        data.strengths.forEach((s, i) => {
          this.tableRow(doc, [String(i + 1), s.title, s.mean.toFixed(2)]);
        });
      }

      // ── GELİŞİM ALANLARI ──
      if (data.developmentAreas.length > 0) {
        doc.moveDown(1.5);
        this.subTitle(doc, 'Gelisim Alanlari');
        this.tableHeader(doc, ['Sira', 'Boyut', 'Ortalama']);
        data.developmentAreas.forEach((s, i) => {
          this.tableRow(doc, [String(i + 1), s.title, s.mean.toFixed(2)]);
        });
      }

      // ── KÖR NOKTALAR ──
      if (data.blindSpots.length > 0) {
        doc.addPage();
        this.sectionTitle(doc, 'Kor Nokta Analizi');
        this.paragraph(doc, 'Oz degerlendirme ile diger perspektiflerin ortalamasi arasinda 0.5 ve uzerinde fark bulunan boyutlar:');
        doc.moveDown(0.5);

        this.tableHeader(doc, ['Boyut', 'Oz Skor', 'Digerleri', 'Fark']);
        for (const bs of data.blindSpots) {
          const gapStr = `${bs.gap > 0 ? '+' : ''}${bs.gap.toFixed(2)}`;
          this.tableRow(doc, [bs.title, bs.selfScore.toFixed(2), bs.othersScore.toFixed(2), gapStr]);
        }

        doc.moveDown(1);
        this.paragraph(doc, 'Pozitif fark: Yonetici kendisini baskalarina gore daha yuksek degerlendirmistir.');
        this.paragraph(doc, 'Negatif fark: Yonetici kendisini baskalarina gore daha dusuk degerlendirmistir.');
      }

      // ── PERSPEKTİF DETAY ──
      for (const [key, pData] of Object.entries(data.perspectives)) {
        doc.addPage();
        this.sectionTitle(doc, `${PERSPECTIVE_LABELS[key] || key} Perspektifi`);
        doc.font(FONT_REGULAR).fontSize(13).fillColor('#2E86AB')
          .text(`Genel Ortalama: ${pData.overallMean.toFixed(2)} / 5`);
        doc.moveDown(1);

        if (pData.subdimensions.length > 0) {
          this.tableHeader(doc, ['Alt Boyut', 'Ortalama', 'Yanit Sayisi']);
          for (const sub of pData.subdimensions) {
            this.tableRow(doc, [sub.title, sub.mean.toFixed(2), String(sub.count)]);
          }

          // Bar chart
          doc.moveDown(1);
          this.subTitle(doc, 'Skor Dagilimi');
          for (const sub of pData.subdimensions) {
            if (doc.y > 700) doc.addPage();
            const barWidth = Math.max((sub.mean / 5) * 250, 2);
            doc.font(FONT_REGULAR).fontSize(9).fillColor('#0F1D2F')
              .text(sub.title, 50, doc.y, { width: 170, continued: false });
            const barY = doc.y - 12;
            doc.rect(225, barY, barWidth, 10).fill('#2E86AB');
            doc.rect(225 + barWidth, barY, 250 - barWidth, 10).fill('#E8E8E8');
            doc.font(FONT_REGULAR).fontSize(9).fillColor('#0F1D2F')
              .text(sub.mean.toFixed(2), 485, barY, { width: 40 });
            doc.y = barY + 18;
          }
        }
      }

      // ── PAGE NUMBERS ──
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.font(FONT_REGULAR).fontSize(8).fillColor('#aaaaaa');
        doc.text('CVF-QA 360° Yonetici Degerlendirme', 50, 780, { width: 250 });
        doc.text(`Sayfa ${i + 1} / ${range.count}`, 300, 780, { width: 200, align: 'right' });
      }

      doc.end();
    });
  }

  // ═══════════════════════════════════════
  // YÖKAK PDF BUILDER
  // ═══════════════════════════════════════

  private async buildYokakPdf(data: {
    orgName: string;
    campaignName: string;
    responseCount: number;
    tokenCount: number;
    generatedAt: Date;
    yokakMap: { criterion: string; title: string; modules: string[]; description: string }[];
    moduleScores: Record<string, { overallMean: number; responseCount: number; subdimensions: any[] }>;
    ocaiData: any;
    modules: string[];
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        bufferPages: true,
        font: FONT_REGULAR,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const dateStr = data.generatedAt.toLocaleDateString('tr-TR', {
        year: 'numeric', month: 'long', day: 'numeric',
      });

      // ── COVER ──
      doc.moveDown(6);
      doc.font(FONT_REGULAR).fontSize(36).fillColor('#7B2D8E').text('YOKAK', { align: 'center' });
      doc.fontSize(18).fillColor('#0F1D2F').text('Kanit Dosyasi', { align: 'center' });
      doc.moveDown(0.5);
      doc.moveTo(180, doc.y).lineTo(415, doc.y).strokeColor('#7B2D8E').lineWidth(2).stroke();
      doc.moveDown(2);
      doc.fontSize(20).fillColor('#0F1D2F').text(data.orgName, { align: 'center' });
      doc.fontSize(14).fillColor('#666666').text(data.campaignName, { align: 'center' });
      doc.moveDown(2);
      doc.fontSize(13).fillColor('#888888').text(dateStr, { align: 'center' });
      doc.fontSize(11).text(`Orneklem: ${data.responseCount} / ${data.tokenCount} davet`, { align: 'center' });

      // ── METHODOLOGY ──
      doc.addPage();
      this.sectionTitle(doc, 'Yontem');
      this.paragraph(doc, `Bu kanit dosyasi, ${data.orgName} kurumunda yurutulen "${data.campaignName}" kampanyasinin sonuclarini YOKAK kurumsal dis degerlendirme olcutleri ile eslestirmektedir.`);
      doc.moveDown(0.5);

      const moduleList = data.modules.map((m) => MODULE_LABELS[m] || m).join(', ');
      this.paragraph(doc, `Kullanilan olcekler: ${moduleList}`);
      this.paragraph(doc, `Toplam katilimci: ${data.responseCount}`);
      const rate = data.tokenCount > 0 ? Math.round((data.responseCount / data.tokenCount) * 100) : 0;
      this.paragraph(doc, `Yanitlanma orani: %${rate}`);

      // ── CRITERION MAPPING ──
      doc.addPage();
      this.sectionTitle(doc, 'YOKAK Olcut Eslestirme Tablosu');

      for (const item of data.yokakMap) {
        if (doc.y > 650) doc.addPage();

        // Check if modules are available
        const hasData = item.modules.some((m) => data.modules.includes(m));

        doc.moveDown(0.5);
        doc.font(FONT_REGULAR).fontSize(14).fillColor('#7B2D8E')
          .text(`${item.criterion} — ${item.title}`);
        doc.moveDown(0.3);

        if (!hasData) {
          doc.font(FONT_ITALIC).fontSize(11).fillColor('#999999')
            .text('Bu olcut icin ilgili olcek kampanyada kullanilmamistir.');
          continue;
        }

        doc.font(FONT_REGULAR).fontSize(11).fillColor('#333333').text(item.description);
        doc.moveDown(0.3);

        // Show scores for each module
        for (const mod of item.modules) {
          if (mod === 'M1_OCAI' && data.ocaiData) {
            doc.font(FONT_REGULAR).fontSize(11).fillColor('#2E86AB')
              .text(`OCAI Kultur Profili:`);
            doc.font(FONT_REGULAR).fontSize(10).fillColor('#333333');
            for (const alt of ['A', 'B', 'C', 'D']) {
              const score = data.ocaiData.scores[alt];
              doc.text(`  ${CULTURE_LABELS[alt]}: Mevcut ${score?.mevcut?.toFixed(1) || '-'}, Tercih ${score?.tercih_edilen?.toFixed(1) || '-'}`);
            }
          } else if (data.moduleScores[mod]) {
            const ms = data.moduleScores[mod];
            doc.font(FONT_REGULAR).fontSize(11).fillColor('#2E86AB')
              .text(`${MODULE_LABELS[mod] || mod}: Genel Ortalama ${ms.overallMean.toFixed(2)} (N=${ms.responseCount})`);

            // Top 3 subdimensions
            if (ms.subdimensions.length > 0) {
              const sorted = [...ms.subdimensions].sort((a, b) => b.mean - a.mean);
              doc.font(FONT_REGULAR).fontSize(10).fillColor('#333333');
              for (const sub of sorted.slice(0, 3)) {
                doc.text(`  ${sub.title}: ${sub.mean.toFixed(2)}`);
              }
            }
          }
        }

        // Quality indicator
        const scores = item.modules
          .filter((m) => data.moduleScores[m])
          .map((m) => data.moduleScores[m].overallMean);

        if (scores.length > 0) {
          const avgScore = scores.reduce((s, v) => s + v, 0) / scores.length;
          let level = 'Yetersiz';
          let color = '#E74C3C';
          if (avgScore >= 4) { level = 'Iyi'; color = '#27AE60'; }
          else if (avgScore >= 3) { level = 'Yeterli'; color = '#E67E22'; }

          doc.moveDown(0.3);
          doc.font(FONT_REGULAR).fontSize(11).fillColor(color)
            .text(`Degerlendirme Duzeyi: ${level} (${avgScore.toFixed(2)}/5)`);
        }
      }

      // ── PAGE NUMBERS ──
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.font(FONT_REGULAR).fontSize(8).fillColor('#aaaaaa');
        doc.text('CVF-QA YOKAK Kanit Dosyasi', 50, 780, { width: 250 });
        doc.text(`Sayfa ${i + 1} / ${range.count}`, 300, 780, { width: 200, align: 'right' });
      }

      doc.end();
    });
  }

  // ── PDF Helpers ──

  private sectionTitle(doc: PDFKit.PDFDocument, text: string) {
    doc.font(FONT_REGULAR).fontSize(20).fillColor('#0F1D2F').text(text);
    doc.moveDown(0.5);
  }

  private subTitle(doc: PDFKit.PDFDocument, text: string) {
    doc.font(FONT_REGULAR).fontSize(14).fillColor('#2E86AB').text(text);
    doc.moveDown(0.3);
  }

  private paragraph(doc: PDFKit.PDFDocument, text: string) {
    doc.font(FONT_REGULAR).fontSize(11).fillColor('#333333').text(text, { lineGap: 4 });
  }

  private tableHeader(doc: PDFKit.PDFDocument, headers: string[]) {
    const y = doc.y;
    const pageW = 495;
    const colW = pageW / headers.length;

    doc.rect(50, y - 2, pageW, 18).fill('#f5f5f5');
    doc.font(FONT_REGULAR).fontSize(9).fillColor('#0F1D2F');
    headers.forEach((h, i) => {
      doc.text(h, 54 + i * colW, y, { width: colW - 8, align: i === 0 ? 'left' : 'center' });
    });
    doc.y = y + 20;
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e0e0e0').lineWidth(0.5).stroke();
    doc.y += 2;
  }

  private tableRow(doc: PDFKit.PDFDocument, cells: string[]) {
    const y = doc.y;
    const pageW = 495;
    const colW = pageW / cells.length;

    doc.font(FONT_REGULAR).fontSize(10).fillColor('#333333');
    cells.forEach((c, i) => {
      doc.text(c, 54 + i * colW, y, { width: colW - 8, align: i === 0 ? 'left' : 'center' });
    });
    doc.y = y + 16;
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#f0f0f0').lineWidth(0.3).stroke();
    doc.y += 2;
  }

  // ═══════════════════════════════════════
  // DATA AGGREGATION
  // ═══════════════════════════════════════

  private aggregateOCAI(responses: any[]) {
    const ocaiResponses = responses.filter((r) =>
      r.answers.some((a: any) => a.moduleCode === 'M1_OCAI'),
    );
    if (ocaiResponses.length === 0) return null;

    const totals: Record<string, { mevcut: number[]; tercih_edilen: number[] }> = {
      A: { mevcut: [], tercih_edilen: [] },
      B: { mevcut: [], tercih_edilen: [] },
      C: { mevcut: [], tercih_edilen: [] },
      D: { mevcut: [], tercih_edilen: [] },
    };

    const dimensionDetail: Record<string, Record<string, number>> = {};

    for (const resp of ocaiResponses) {
      const byPerspective: Record<string, Record<string, number>[]> = { mevcut: [], tercih_edilen: [] };

      for (const answer of resp.answers) {
        if (answer.moduleCode !== 'M1_OCAI') continue;
        const data = answer.answerJson as { dimension: string; perspective: string; values: Record<string, number> };
        if (data.perspective && data.values) {
          byPerspective[data.perspective]?.push(data.values);

          if (data.perspective === 'mevcut' && data.dimension) {
            if (!dimensionDetail[data.dimension]) dimensionDetail[data.dimension] = { A: 0, B: 0, C: 0, D: 0, _count: 0 };
            for (const alt of ['A', 'B', 'C', 'D']) {
              dimensionDetail[data.dimension][alt] += data.values[alt] || 0;
            }
            dimensionDetail[data.dimension]._count++;
          }
        }
      }

      for (const alt of ['A', 'B', 'C', 'D']) {
        const mSum = byPerspective.mevcut.reduce((s, v) => s + (v[alt] || 0), 0);
        const tSum = byPerspective.tercih_edilen.reduce((s, v) => s + (v[alt] || 0), 0);
        const mCount = byPerspective.mevcut.length || 1;
        const tCount = byPerspective.tercih_edilen.length || 1;
        totals[alt].mevcut.push(mSum / mCount);
        totals[alt].tercih_edilen.push(tSum / tCount);
      }
    }

    const scores: Record<string, { mevcut: number; tercih_edilen: number }> = {};
    for (const alt of ['A', 'B', 'C', 'D']) {
      const mArr = totals[alt].mevcut;
      const tArr = totals[alt].tercih_edilen;
      scores[alt] = {
        mevcut: Math.round((mArr.reduce((s, v) => s + v, 0) / mArr.length) * 10) / 10,
        tercih_edilen: Math.round((tArr.reduce((s, v) => s + v, 0) / tArr.length) * 10) / 10,
      };
    }

    for (const dimId of Object.keys(dimensionDetail)) {
      const cnt = dimensionDetail[dimId]._count || 1;
      for (const alt of ['A', 'B', 'C', 'D']) {
        dimensionDetail[dimId][alt] = Math.round((dimensionDetail[dimId][alt] / cnt) * 10) / 10;
      }
      delete dimensionDetail[dimId]._count;
    }

    const dominantM = Object.entries(scores).sort((a, b) => b[1].mevcut - a[1].mevcut)[0][0];
    const dominantT = Object.entries(scores).sort((a, b) => b[1].tercih_edilen - a[1].tercih_edilen)[0][0];

    return { scores, dominant: { mevcut: dominantM, tercih: dominantT }, dimensionDetail };
  }

  private aggregateLikert(responses: any[], moduleCode: string) {
    const modules = questionBank.modules as Record<string, any>;
    const mod = modules[moduleCode];
    if (!mod) return null;

    const subdimensionValues: Record<string, { values: number[]; title: string }> = {};

    for (const resp of responses) {
      for (const answer of resp.answers) {
        if (answer.moduleCode !== moduleCode) continue;
        const data = answer.answerJson as { subdimension: string; value: number };
        if (!data.subdimension || data.value === undefined) continue;

        if (!subdimensionValues[data.subdimension]) {
          const sub = mod.subdimensions?.find((s: any) => s.id === data.subdimension);
          subdimensionValues[data.subdimension] = {
            values: [],
            title: sub?.title || data.subdimension,
          };
        }
        subdimensionValues[data.subdimension].values.push(data.value);
      }
    }

    const subdimensions = Object.entries(subdimensionValues).map(([id, { values, title }]) => {
      const mean = values.reduce((s, v) => s + v, 0) / values.length;
      const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
      return {
        id, title,
        mean: Math.round(mean * 100) / 100,
        std: Math.round(Math.sqrt(variance) * 100) / 100,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length,
      };
    });

    const allVals = Object.values(subdimensionValues).flatMap((s) => s.values);
    const overallMean = allVals.length > 0 ? allVals.reduce((s, v) => s + v, 0) / allVals.length : 0;

    return {
      overallMean: Math.round(overallMean * 100) / 100,
      responseCount: responses.filter((r) => r.answers.some((a: any) => a.moduleCode === moduleCode)).length,
      subdimensions,
    };
  }

  private aggregateDemographics(responses: any[]) {
    const ageRanges: Record<string, number> = {};
    const seniorityRanges: Record<string, number> = {};

    for (const resp of responses) {
      const demo = resp.demographicJson as any;
      if (demo?.ageRange) {
        ageRanges[demo.ageRange] = (ageRanges[demo.ageRange] || 0) + 1;
      }
      if (demo?.seniorityRange) {
        seniorityRanges[demo.seniorityRange] = (seniorityRanges[demo.seniorityRange] || 0) + 1;
      }
    }

    return { ageRanges, seniorityRanges };
  }

  // ═══════════════════════════════════════
  // ENCRYPTION HELPERS
  // ═══════════════════════════════════════

  private encrypt(text: string): string {
    const key = Buffer.from(config.ENCRYPTION_KEY.substring(0, 32), 'utf-8');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    const key = Buffer.from(config.ENCRYPTION_KEY.substring(0, 32), 'utf-8');
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

export const reportService = new ReportService();
