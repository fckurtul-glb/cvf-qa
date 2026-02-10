import { Resend } from 'resend';
import { config } from '../../config/env';
import { prisma } from '../../config/database';

// ── E-posta Servisi (Resend) ──
const resend = config.RESEND_API_KEY ? new Resend(config.RESEND_API_KEY) : null;

interface EmailPayload {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

const EMAIL_TEMPLATES: Record<string, (data: any) => { html: string; text: string }> = {
  'survey-invitation': (data) => ({
    html: `
      <div style="font-family:'DM Sans',system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px">
        <div style="text-align:center;margin-bottom:24px">
          <div style="display:inline-block;background:linear-gradient(135deg,#2E86AB,#3A9BC5);color:white;font-weight:bold;padding:8px 16px;border-radius:12px;font-size:14px">CVF-QA</div>
        </div>
        <h1 style="color:#0F1D2F;font-size:22px;margin-bottom:8px">Anket Davetiyesi</h1>
        <p style="color:#0F1D2F99;font-size:14px;line-height:1.6">
          <strong>${data.orgName}</strong> bünyesinde gerçekleştirilen 
          <strong>${data.campaignName}</strong> değerlendirmesine katılmanız beklenmektedir.
        </p>
        <div style="background:#F8F6F1;border-radius:12px;padding:20px;margin:24px 0;text-align:center">
          <p style="color:#0F1D2F80;font-size:12px;margin:0 0 12px">Bu link yalnızca size özeldir ve tek kullanımlıktır.</p>
          <a href="${data.surveyUrl}" style="display:inline-block;background:linear-gradient(135deg,#2E86AB,#3A9BC5);color:white;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:600;font-size:16px">
            Anketi Başlat →
          </a>
        </div>
        <div style="border-top:1px solid #E5E3DE;padding-top:16px;margin-top:24px">
          <p style="color:#0F1D2F50;font-size:12px;line-height:1.6">
            ${data.expiresAt ? `Son katılım tarihi: ${new Date(data.expiresAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
            <br>Yanıtlarınız anonim olarak toplanır. Kimliğiniz kurumunuzla paylaşılmaz.
            <br>Bu linki başkalarıyla paylaşmayın.
          </p>
        </div>
      </div>
    `,
    text: `${data.campaignName} — Anket Davetiyesi\n\n${data.orgName} bünyesinde gerçekleştirilen değerlendirmeye katılmanız beklenmektedir.\n\nAnketi başlatmak için: ${data.surveyUrl}\n\nBu link yalnızca size özeldir ve tek kullanımlıktır.`,
  }),

  'survey-reminder': (data) => ({
    html: `
      <div style="font-family:'DM Sans',system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px">
        <div style="text-align:center;margin-bottom:24px">
          <div style="display:inline-block;background:linear-gradient(135deg,#E8A838,#F4C566);color:#0F1D2F;font-weight:bold;padding:8px 16px;border-radius:12px;font-size:14px">⏰ Hatırlatma</div>
        </div>
        <h1 style="color:#0F1D2F;font-size:20px">Anketinizi Tamamlamayı Unutmayın</h1>
        <p style="color:#0F1D2F80;font-size:14px">Henüz tamamlanmamış bir anketiniz bulunmaktadır. Kaldığınız yerden devam edebilirsiniz.</p>
        <div style="text-align:center;margin:24px 0">
          <a href="${data.surveyUrl}" style="display:inline-block;background:#E8A838;color:#0F1D2F;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:600">Devam Et →</a>
        </div>
      </div>
    `,
    text: `Hatırlatma: Henüz tamamlanmamış bir anketiniz var.\nDevam etmek için: ${data.surveyUrl}`,
  }),

  'report-ready': (data) => ({
    html: `
      <div style="font-family:'DM Sans',system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px">
        <h1 style="color:#0F1D2F;font-size:22px">📊 Raporunuz Hazır</h1>
        <p style="color:#0F1D2F80;font-size:14px">
          <strong>${data.campaignName}</strong> kampanyasının raporu hazırlanmıştır.
        </p>
        <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:16px;margin:20px 0">
          <p style="color:#166534;font-size:13px;margin:0">
            ✅ Yanıt Oranı: %${data.responseRate} (${data.completedCount}/${data.totalCount})
          </p>
        </div>
        <div style="text-align:center;margin:24px 0">
          <a href="${data.reportUrl}" style="display:inline-block;background:#2E86AB;color:white;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:600">Raporu Görüntüle →</a>
        </div>
      </div>
    `,
    text: `Raporunuz hazır: ${data.campaignName}\nYanıt Oranı: %${data.responseRate}\nGörüntüle: ${data.reportUrl}`,
  }),

  'otp-verification': (data) => ({
    html: `
      <div style="font-family:'DM Sans',system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px;text-align:center">
        <h1 style="color:#0F1D2F;font-size:22px">Doğrulama Kodu</h1>
        <p style="color:#0F1D2F80;font-size:14px">CVF-QA hesabınıza giriş yapmak için aşağıdaki kodu kullanın:</p>
        <div style="background:#0F1D2F;color:white;font-size:36px;letter-spacing:8px;font-weight:bold;padding:20px;border-radius:12px;margin:24px auto;max-width:240px">${data.otpCode}</div>
        <p style="color:#0F1D2F40;font-size:12px">Bu kod 5 dakika geçerlidir. Kimseyle paylaşmayın.</p>
      </div>
    `,
    text: `CVF-QA Doğrulama Kodu: ${data.otpCode}\nBu kod 5 dakika geçerlidir.`,
  }),
};

class NotificationService {
  // ── E-posta Gönder ──
  async sendEmail(payload: EmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = EMAIL_TEMPLATES[payload.template];
    if (!template) return { success: false, error: `Template bulunamadı: ${payload.template}` };

    const { html, text } = template(payload.data);

    if (!resend) {
      console.log(`[EMAIL MOCK] To: ${payload.to} | Subject: ${payload.subject}`);
      return { success: true, messageId: 'mock_' + Date.now() };
    }

    try {
      const result = await resend.emails.send({
        from: config.EMAIL_FROM,
        to: payload.to,
        subject: payload.subject,
        html,
        text,
        tags: [{ name: 'template', value: payload.template }],
      });
      return { success: true, messageId: result.data?.id };
    } catch (err: any) {
      console.error('Email send failed:', err);
      return { success: false, error: err.message };
    }
  }

  // ── SMS Gönder (OTP için — Netgsm) ──
  async sendSMS(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
    if (!config.NETGSM_USERCODE) {
      console.log(`[SMS MOCK] To: ${phone} | Message: ${message}`);
      return { success: true };
    }

    try {
      const params = new URLSearchParams({
        usercode: config.NETGSM_USERCODE,
        password: config.NETGSM_PASSWORD ?? '',
        gsmno: phone.replace(/\D/g, ''),
        message,
        msgheader: 'CVFQA',
      });

      const response = await fetch(`https://api.netgsm.com.tr/sms/send/get?${params}`);
      const text = await response.text();

      if (text.startsWith('00')) return { success: true };
      return { success: false, error: `Netgsm error: ${text}` };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ── Toplu Bildirim (Kampanya) ──
  async notifyReportReady(campaignId: string) {
    const campaign = await prisma.surveyCampaign.findUnique({
      where: { id: campaignId },
      include: { organization: true },
    });
    if (!campaign) return;

    // Org admin'lere bildirim gönder
    const admins = await prisma.user.findMany({
      where: { orgId: campaign.orgId, role: { in: ['ORG_ADMIN', 'SUPER_ADMIN'] }, isActive: true },
    });

    for (const admin of admins) {
      await this.sendEmail({
        to: admin.id, // decrypt edilecek
        subject: `Rapor Hazır: ${campaign.name}`,
        template: 'report-ready',
        data: {
          campaignName: campaign.name,
          reportUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/reports`,
          responseRate: 0, // TODO: hesapla
          completedCount: 0,
          totalCount: 0,
        },
      });
    }
  }
}

export const notificationService = new NotificationService();
