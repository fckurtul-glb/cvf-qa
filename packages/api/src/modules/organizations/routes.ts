import type { FastifyInstance } from 'fastify';
import { requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { organizationsService } from './service';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  createInviteSchema,
  listOrganizationsSchema,
  updateCapabilitiesSchema,
  emailLogQuerySchema,
  orgUsersQuerySchema,
} from './schema';
import { queueOrgInvitation } from '../../jobs/email-sender';
import { config } from '../../config/env';

export async function organizationsRoutes(app: FastifyInstance) {
  // GET /organizations — Kurum listesi (SUPER_ADMIN)
  app.get('/', { preHandler: [requireRole('SUPER_ADMIN')] }, async (request, reply) => {
    const query = listOrganizationsSchema.parse(request.query);
    const result = await organizationsService.list(query.page, query.limit, query.search);
    reply.send(result);
  });

  // GET /organizations/:id — Kurum detayı (SUPER_ADMIN)
  app.get('/:id', { preHandler: [requireRole('SUPER_ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await organizationsService.getById(id);
    if (!result.success) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: result.error } });
    }
    reply.send(result);
  });

  // POST /organizations — Yeni kurum oluştur (SUPER_ADMIN)
  app.post('/', { preHandler: [requireRole('SUPER_ADMIN'), validate(createOrganizationSchema)] }, async (request, reply) => {
    const { name, domain, packageTier } = request.body as { name: string; domain: string; packageTier: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' };
    const result = await organizationsService.create(name, domain, packageTier);
    if (!result.success) {
      return reply.status(409).send({ success: false, error: { code: 'CONFLICT', message: result.error } });
    }
    reply.status(201).send(result);
  });

  // PUT /organizations/:id — Güncelle (SUPER_ADMIN)
  app.put('/:id', { preHandler: [requireRole('SUPER_ADMIN'), validate(updateOrganizationSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as { name?: string; domain?: string; packageTier?: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'; settings?: Record<string, unknown> };
    const result = await organizationsService.update(id, data);
    if (!result.success) {
      return reply.status(result.error === 'Kurum bulunamadı' ? 404 : 409).send({ success: false, error: { code: result.error === 'Kurum bulunamadı' ? 'NOT_FOUND' : 'CONFLICT', message: result.error } });
    }
    reply.send(result);
  });

  // PATCH /organizations/:id/deactivate — Pasifleştir (SUPER_ADMIN)
  app.patch('/:id/deactivate', { preHandler: [requireRole('SUPER_ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { sub } = (request as any).user as { sub: string };
    const result = await organizationsService.deactivate(id, sub);
    if (!result.success) {
      return reply.status(result.error === 'Kurum bulunamadı' ? 404 : 400).send({
        success: false,
        error: { code: result.error === 'Kurum bulunamadı' ? 'NOT_FOUND' : 'BAD_REQUEST', message: result.error },
      });
    }
    reply.send(result);
  });

  // PATCH /organizations/:id/reactivate — Reaktifleştir (SUPER_ADMIN)
  app.patch('/:id/reactivate', { preHandler: [requireRole('SUPER_ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { sub } = (request as any).user as { sub: string };
    const result = await organizationsService.reactivate(id, sub);
    if (!result.success) {
      return reply.status(result.error === 'Kurum bulunamadı' ? 404 : 400).send({
        success: false,
        error: { code: result.error === 'Kurum bulunamadı' ? 'NOT_FOUND' : 'BAD_REQUEST', message: result.error },
      });
    }
    reply.send(result);
  });

  // POST /organizations/:id/invite — ORG_ADMIN davet linki (SUPER_ADMIN)
  app.post('/:id/invite', { preHandler: [requireRole('SUPER_ADMIN'), validate(createInviteSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { email, role } = request.body as { email: string; role: 'ORG_ADMIN' | 'UNIT_ADMIN' };
    const { sub } = (request as any).user as { sub: string };

    const result = await organizationsService.createInviteToken(id, email, role, sub);
    if (!result.success) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: result.error } });
    }

    // E-posta gönder
    const registerUrl = `${config.CORS_ORIGINS.split(',')[0]}/auth/register?token=${result.data!.token}`;
    await queueOrgInvitation(email, result.data!.orgName, registerUrl, result.data!.role, result.data!.expiresAt, id);

    reply.status(201).send({
      success: true,
      data: {
        id: result.data!.id,
        email: result.data!.email,
        role: result.data!.role,
        expiresAt: result.data!.expiresAt,
        registerUrl,
      },
    });
  });

  // ════════════════════════════════════
  // CAPABILITY MANAGEMENT
  // ════════════════════════════════════

  // GET /organizations/:id/capabilities — Çözümlenmiş yetenekler
  app.get('/:id/capabilities', { preHandler: [requireRole('SUPER_ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await organizationsService.getCapabilities(id);
    if (!result.success) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: result.error } });
    }
    reply.send(result);
  });

  // PUT /organizations/:id/capabilities — Override güncelle
  app.put('/:id/capabilities', { preHandler: [requireRole('SUPER_ADMIN'), validate(updateCapabilitiesSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const overrides = request.body as any;
    const result = await organizationsService.updateCapabilities(id, overrides);
    if (!result.success) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: result.error } });
    }
    reply.send(result);
  });

  // DELETE /organizations/:id/capabilities — Override sıfırla
  app.delete('/:id/capabilities', { preHandler: [requireRole('SUPER_ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await organizationsService.resetCapabilities(id);
    if (!result.success) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: result.error } });
    }
    reply.send(result);
  });

  // ════════════════════════════════════
  // EMAIL LOGS
  // ════════════════════════════════════

  // GET /organizations/:id/email-logs — E-posta logları
  app.get('/:id/email-logs', { preHandler: [requireRole('SUPER_ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = emailLogQuerySchema.parse(request.query);
    const result = await organizationsService.getEmailLogs(id, query.page, query.limit, {
      status: query.status,
      template: query.template,
    });
    reply.send(result);
  });

  // GET /organizations/:id/email-logs/stats — E-posta istatistikleri
  app.get('/:id/email-logs/stats', { preHandler: [requireRole('SUPER_ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await organizationsService.getEmailStats(id);
    reply.send(result);
  });

  // ════════════════════════════════════
  // USER MANAGEMENT
  // ════════════════════════════════════

  // GET /organizations/:id/users — Kurum kullanıcıları (tüm roller)
  app.get('/:id/users', { preHandler: [requireRole('SUPER_ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = orgUsersQuerySchema.parse(request.query);
    const result = await organizationsService.listOrgUsers(id, query.page, query.limit, {
      role: query.role,
      isActive: query.isActive,
    });
    reply.send(result);
  });

  // PATCH /organizations/:id/users/:userId/toggle — Aktif/pasif toggle
  app.patch('/:id/users/:userId/toggle', { preHandler: [requireRole('SUPER_ADMIN')] }, async (request, reply) => {
    const { id, userId } = request.params as { id: string; userId: string };
    const { isActive } = request.body as { isActive: boolean };
    const { sub } = (request as any).user as { sub: string };
    const result = await organizationsService.toggleUserActive(id, userId, isActive, sub);
    if (!result.success) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: result.error } });
    }
    reply.send(result);
  });

  // PATCH /organizations/:id/users/:userId/role — Rol değiştir
  app.patch('/:id/users/:userId/role', { preHandler: [requireRole('SUPER_ADMIN')] }, async (request, reply) => {
    const { id, userId } = request.params as { id: string; userId: string };
    const { role } = request.body as { role: string };
    const { sub } = (request as any).user as { sub: string };
    const result = await organizationsService.reassignUserRole(id, userId, role, sub);
    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: result.error } });
    }
    reply.send(result);
  });

  // POST /organizations/:id/users/bulk — Toplu kullanıcı işlemi
  app.post('/:id/users/bulk', { preHandler: [requireRole('SUPER_ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { action, userIds } = request.body as { action: 'activate' | 'deactivate' | 'delete'; userIds: string[] };
    const { sub } = (request as any).user as { sub: string };

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'userIds boş olamaz' } });
    }

    let result;
    if (action === 'activate') {
      result = await organizationsService.bulkToggleUsers(id, userIds, true, sub);
    } else if (action === 'deactivate') {
      result = await organizationsService.bulkToggleUsers(id, userIds, false, sub);
    } else if (action === 'delete') {
      result = await organizationsService.bulkDeleteUsers(id, userIds, sub);
    } else {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Geçersiz işlem' } });
    }

    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: result.error } });
    }
    reply.send(result);
  });

  // ════════════════════════════════════
  // LOGO UPLOAD
  // ════════════════════════════════════

  // POST /organizations/:id/logo — Logo yükle
  app.post('/:id/logo', { preHandler: [requireRole('SUPER_ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { sub } = (request as any).user as { sub: string };

    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Dosya bulunamadı' } });
    }

    const buffer = await file.toBuffer();
    if (buffer.length > 2 * 1024 * 1024) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Dosya boyutu 2MB limitini aşıyor' } });
    }

    const result = await organizationsService.uploadLogo(id, buffer, file.mimetype, sub);
    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: result.error } });
    }
    reply.send(result);
  });

  // DELETE /organizations/:id/logo — Logo sil
  app.delete('/:id/logo', { preHandler: [requireRole('SUPER_ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { sub } = (request as any).user as { sub: string };

    const { prisma } = await import('../../config/database');
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Kurum bulunamadı' } });

    const currentSettings = (org.settings as Record<string, unknown>) ?? {};
    delete currentSettings.logoUrl;
    await prisma.organization.update({ where: { id }, data: { settings: currentSettings } });

    await prisma.auditLog.create({
      data: {
        orgId: id,
        userId: sub,
        action: 'org.logo.delete',
        resourceType: 'organization',
        resourceId: id,
      },
    });

    reply.send({ success: true, data: { message: 'Logo silindi' } });
  });

  // ════════════════════════════════════
  // DEPARTMENT MANAGEMENT
  // ════════════════════════════════════

  // GET /organizations/:id/departments — Birim listesi
  app.get('/:id/departments', { preHandler: [requireRole('SUPER_ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await organizationsService.listDepartments(id);
    if (!result.success) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: result.error } });
    }
    reply.send(result);
  });

  // POST /organizations/:id/departments — Yeni birim oluştur
  app.post('/:id/departments', { preHandler: [requireRole('SUPER_ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name, parentDepartmentId } = request.body as { name: string; parentDepartmentId?: string };
    const { sub } = (request as any).user as { sub: string };

    if (!name || name.trim().length < 1) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Birim adı zorunludur' } });
    }

    const result = await organizationsService.createDepartment(id, name.trim(), parentDepartmentId, sub);
    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: result.error } });
    }
    reply.status(201).send(result);
  });

  // PUT /organizations/:id/departments/:deptId — Birim güncelle
  app.put('/:id/departments/:deptId', { preHandler: [requireRole('SUPER_ADMIN')] }, async (request, reply) => {
    const { id, deptId } = request.params as { id: string; deptId: string };
    const data = request.body as { name?: string; parentDepartmentId?: string | null };
    const { sub } = (request as any).user as { sub: string };

    const result = await organizationsService.updateDepartment(id, deptId, data, sub);
    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: result.error } });
    }
    reply.send(result);
  });

  // DELETE /organizations/:id/departments/:deptId — Birim sil
  app.delete('/:id/departments/:deptId', { preHandler: [requireRole('SUPER_ADMIN')] }, async (request, reply) => {
    const { id, deptId } = request.params as { id: string; deptId: string };
    const { sub } = (request as any).user as { sub: string };

    const result = await organizationsService.deleteDepartment(id, deptId, sub);
    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: result.error } });
    }
    reply.send(result);
  });

  // ════════════════════════════════════
  // AUDIT LOG VIEWER
  // ════════════════════════════════════

  // GET /organizations/:id/audit-logs — Denetim kayıtları
  app.get('/:id/audit-logs', { preHandler: [requireRole('SUPER_ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { page = '1', limit = '20', action, resourceType, userId } = request.query as {
      page?: string; limit?: string; action?: string; resourceType?: string; userId?: string;
    };
    const result = await organizationsService.getAuditLogs(id, parseInt(page), parseInt(limit), {
      action,
      resourceType,
      userId,
    });
    if (!result.success) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: result.error } });
    }
    reply.send(result);
  });

  // ════════════════════════════════════
  // CAMPAIGN MANAGEMENT
  // ════════════════════════════════════

  // GET /organizations/:id/campaigns — Kurum kampanyaları
  app.get('/:id/campaigns', { preHandler: [requireRole('SUPER_ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { page = '1', limit = '50' } = request.query as { page?: string; limit?: string };
    const result = await organizationsService.listOrgCampaigns(id, parseInt(page), parseInt(limit));
    reply.send(result);
  });

  // PATCH /organizations/:id/campaigns/:campaignId/pause — Kampanya durdur
  app.patch('/:id/campaigns/:campaignId/pause', { preHandler: [requireRole('SUPER_ADMIN')] }, async (request, reply) => {
    const { id, campaignId } = request.params as { id: string; campaignId: string };
    const { sub } = (request as any).user as { sub: string };
    const result = await organizationsService.pauseCampaign(id, campaignId, sub);
    if (!result.success) {
      return reply.status(result.error === 'Kampanya bulunamadı' ? 404 : 400).send({
        success: false,
        error: { code: result.error === 'Kampanya bulunamadı' ? 'NOT_FOUND' : 'BAD_REQUEST', message: result.error },
      });
    }
    reply.send(result);
  });

  // ════════════════════════════════════
  // INVITE REVOCATION
  // ════════════════════════════════════

  // DELETE /organizations/:id/invites/:inviteId — Davet iptal
  app.delete('/:id/invites/:inviteId', { preHandler: [requireRole('SUPER_ADMIN')] }, async (request, reply) => {
    const { id, inviteId } = request.params as { id: string; inviteId: string };
    const { sub } = (request as any).user as { sub: string };
    const result = await organizationsService.revokeInvite(inviteId, sub);
    if (!result.success) {
      return reply.status(result.error === 'Davet bulunamadı' ? 404 : 400).send({
        success: false,
        error: { code: result.error === 'Davet bulunamadı' ? 'NOT_FOUND' : 'BAD_REQUEST', message: result.error },
      });
    }
    reply.send(result);
  });
}

// ════════════════════════════════════════════════════
// ORG_ADMIN SELF-SERVICE ROUTES — /my-organization
// ORG_ADMIN manages their own org. SUPER_ADMIN can also call these.
// ════════════════════════════════════════════════════
export async function myOrgRoutes(app: FastifyInstance) {
  const { requireOrgMember } = await import('../../middleware/auth');

  // GET /my-organization — Kendi kurum bilgilerini getir
  app.get('/', { preHandler: [requireRole('ORG_ADMIN', 'SUPER_ADMIN')] }, async (request, reply) => {
    const user = (request as any).user as { sub: string; org: string; role: string };
    const orgId = user.org;
    const result = await organizationsService.getMyOrg(orgId);
    if (!result.success) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: result.error } });
    }
    reply.send(result);
  });

  // ── Kullanıcı Yönetimi ──

  // GET /my-organization/users
  app.get('/users', { preHandler: [requireRole('ORG_ADMIN', 'SUPER_ADMIN')] }, async (request, reply) => {
    const user = (request as any).user as { sub: string; org: string; role: string };
    const query = orgUsersQuerySchema.parse(request.query);
    const result = await organizationsService.getMyOrgUsers(user.org, query.page, query.limit, {
      role: query.role,
      isActive: query.isActive,
    });
    reply.send(result);
  });

  // PATCH /my-organization/users/:userId/toggle
  app.patch('/users/:userId/toggle', { preHandler: [requireRole('ORG_ADMIN', 'SUPER_ADMIN')] }, async (request, reply) => {
    const user = (request as any).user as { sub: string; org: string; role: string };
    const { userId } = request.params as { userId: string };
    const { isActive } = request.body as { isActive: boolean };
    const result = await organizationsService.toggleMyOrgUser(user.org, userId, isActive, user.sub);
    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: result.error } });
    }
    reply.send(result);
  });

  // PATCH /my-organization/users/:userId/role
  app.patch('/users/:userId/role', { preHandler: [requireRole('ORG_ADMIN', 'SUPER_ADMIN')] }, async (request, reply) => {
    const user = (request as any).user as { sub: string; org: string; role: string };
    const { userId } = request.params as { userId: string };
    const { role: newRole } = request.body as { role: string };
    const result = await organizationsService.reassignMyOrgUserRole(user.org, userId, newRole, user.sub);
    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: result.error } });
    }
    reply.send(result);
  });

  // POST /my-organization/users/bulk
  app.post('/users/bulk', { preHandler: [requireRole('ORG_ADMIN', 'SUPER_ADMIN')] }, async (request, reply) => {
    const user = (request as any).user as { sub: string; org: string; role: string };
    const { action, userIds } = request.body as { action: 'activate' | 'deactivate'; userIds: string[] };

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'userIds boş olamaz' } });
    }
    if (!['activate', 'deactivate'].includes(action)) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Geçersiz işlem. Kurum yöneticisi sadece aktifleştirme/deaktifleştirme yapabilir' } });
    }

    const result = await organizationsService.bulkToggleMyOrgUsers(user.org, userIds, action === 'activate', user.sub);
    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: result.error } });
    }
    reply.send(result);
  });

  // ── Birim Yönetimi ──

  // GET /my-organization/departments
  app.get('/departments', { preHandler: [requireRole('ORG_ADMIN', 'UNIT_ADMIN', 'SUPER_ADMIN')] }, async (request, reply) => {
    const user = (request as any).user as { sub: string; org: string; role: string };
    const result = await organizationsService.listMyOrgDepartments(user.org);
    reply.send(result);
  });

  // POST /my-organization/departments
  app.post('/departments', { preHandler: [requireRole('ORG_ADMIN', 'SUPER_ADMIN')] }, async (request, reply) => {
    const user = (request as any).user as { sub: string; org: string; role: string };
    const { name, parentDepartmentId } = request.body as { name: string; parentDepartmentId?: string };
    if (!name || name.trim().length < 1) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Birim adı zorunludur' } });
    }
    const result = await organizationsService.createMyOrgDepartment(user.org, name.trim(), parentDepartmentId, user.sub);
    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: result.error } });
    }
    reply.status(201).send(result);
  });

  // PUT /my-organization/departments/:deptId
  app.put('/departments/:deptId', { preHandler: [requireRole('ORG_ADMIN', 'SUPER_ADMIN')] }, async (request, reply) => {
    const user = (request as any).user as { sub: string; org: string; role: string };
    const { deptId } = request.params as { deptId: string };
    const data = request.body as { name?: string; parentDepartmentId?: string | null };
    const result = await organizationsService.updateMyOrgDepartment(user.org, deptId, data, user.sub);
    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: result.error } });
    }
    reply.send(result);
  });

  // DELETE /my-organization/departments/:deptId
  app.delete('/departments/:deptId', { preHandler: [requireRole('ORG_ADMIN', 'SUPER_ADMIN')] }, async (request, reply) => {
    const user = (request as any).user as { sub: string; org: string; role: string };
    const { deptId } = request.params as { deptId: string };
    const result = await organizationsService.deleteMyOrgDepartment(user.org, deptId, user.sub);
    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: result.error } });
    }
    reply.send(result);
  });

  // ── Davet Yönetimi ──

  // GET /my-organization/invites — Bekleyen davetler
  app.get('/invites', { preHandler: [requireRole('ORG_ADMIN', 'SUPER_ADMIN')] }, async (request, reply) => {
    const user = (request as any).user as { sub: string; org: string; role: string };
    const result = await organizationsService.getMyOrgPendingInvites(user.org);
    reply.send(result);
  });

  // POST /my-organization/invites — Davet gönder (sadece UNIT_ADMIN daveti)
  app.post('/invites', { preHandler: [requireRole('ORG_ADMIN', 'SUPER_ADMIN'), validate(createInviteSchema)] }, async (request, reply) => {
    const user = (request as any).user as { sub: string; org: string; role: string };
    const { email, role } = request.body as { email: string; role: 'ORG_ADMIN' | 'UNIT_ADMIN' };

    const result = await organizationsService.createMyOrgInvite(user.org, email, role as any, user.sub);
    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: result.error } });
    }

    const registerUrl = `${config.CORS_ORIGINS.split(',')[0]}/auth/register?token=${result.data!.token}`;
    await queueOrgInvitation(email, result.data!.orgName, registerUrl, result.data!.role, result.data!.expiresAt, user.org);

    reply.status(201).send({
      success: true,
      data: {
        id: result.data!.id,
        email: result.data!.email,
        role: result.data!.role,
        expiresAt: result.data!.expiresAt,
        registerUrl,
      },
    });
  });

  // DELETE /my-organization/invites/:inviteId — Davet iptal
  app.delete('/invites/:inviteId', { preHandler: [requireRole('ORG_ADMIN', 'SUPER_ADMIN')] }, async (request, reply) => {
    const user = (request as any).user as { sub: string; org: string; role: string };
    const { inviteId } = request.params as { inviteId: string };
    const result = await organizationsService.revokeMyOrgInvite(user.org, inviteId, user.sub);
    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: result.error } });
    }
    reply.send(result);
  });

  // ── Denetim Kayıtları ──

  // GET /my-organization/audit-logs
  app.get('/audit-logs', { preHandler: [requireRole('ORG_ADMIN', 'SUPER_ADMIN')] }, async (request, reply) => {
    const user = (request as any).user as { sub: string; org: string; role: string };
    const { page = '1', limit = '20', action, resourceType } = request.query as {
      page?: string; limit?: string; action?: string; resourceType?: string;
    };
    const result = await organizationsService.getMyOrgAuditLogs(user.org, parseInt(page), parseInt(limit), {
      action,
      resourceType,
    });
    reply.send(result);
  });
}

// Public route — Token doğrulama (auth gerekmez)
export async function inviteRoutes(app: FastifyInstance) {
  // GET /invite/:token — Token doğrula (PUBLIC)
  app.get('/:token', { config: { skipCsrf: true } as any }, async (request, reply) => {
    const { token } = request.params as { token: string };
    const result = await organizationsService.validateInviteToken(token);
    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'INVALID_TOKEN', message: result.error } });
    }
    reply.send(result);
  });
}
