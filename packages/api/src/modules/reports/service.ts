import { prisma } from '../../config/database';
import { config } from '../../config/env';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import { resolve } from 'path';
import questionBank from '../../data/question-bank.json';

const OCAI = questionBank.modules.M1_OCAI;

const MODULE_LABELS: Record<string, string> = {
  M1_OCAI: 'OCAI — Kultur Profili',
  M2_QCI: 'QCI — Kalite Kulturu',
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
