import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../config/database';
import { notificationService } from '../notifications/service';

interface ContactBody {
  name: string;
  email: string;
  institution: string;
  phone?: string;
}

export async function contactRoutes(app: FastifyInstance) {
  app.post(
    '/',
    { config: { skipCsrf: true } as any },
    async (
      request: FastifyRequest<{ Body: ContactBody }>,
      reply: FastifyReply,
    ) => {
      const { name, email, institution, phone } = request.body;

      if (!name || !email || !institution) {
        return reply.status(400).send({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Ad, e-posta ve kurum alanları zorunludur' },
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return reply.status(400).send({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Geçersiz e-posta adresi' },
        });
      }

      try {
        // Veritabanına kaydet (demoRequest tablosu yoksa auditLog'a yaz)
        await prisma.auditLog.create({
          data: {
            orgId: 'SYSTEM',
            action: 'contact.demo_request',
            resourceType: 'contact',
            detailsJson: { name, email, institution, phone: phone || null },
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'] || null,
          },
        });

        // Admin'e bildirim e-postası gönder
        await notificationService.sendEmail({
          to: 'admin@cvf-qa.com.tr',
          subject: `Yeni Demo Talebi: ${institution}`,
          template: 'otp-verification', // Geçici: basit template
          data: {
            otpCode: `${name}\n${email}\n${institution}\n${phone || '-'}`,
          },
        });

        return reply.send({
          success: true,
          data: { message: 'Demo talebiniz alınmıştır. En kısa sürede sizinle iletişime geçeceğiz.' },
        });
      } catch (err: any) {
        app.log.error('Contact form error:', err);
        return reply.status(500).send({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Talebiniz kaydedilemedi. Lütfen tekrar deneyin.' },
        });
      }
    },
  );
}
