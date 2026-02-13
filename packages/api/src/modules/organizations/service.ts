import crypto from 'crypto';
import { prisma } from '../../config/database';
import { config } from '../../config/env';
import { TIER_CAPABILITY_DEFAULTS } from '@cvf-qa/shared';
import type { OrgCapabilities, PackageTier } from '@cvf-qa/shared';
import type { UserRole, EmailStatus } from '../../database/generated/client';
import { resolveCapabilities } from '../campaigns/service';

class OrganizationsService {
  async list(page: number, limit: number, search?: string) {
    const where = {
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    };

    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { users: true } } },
      }),
      prisma.organization.count({ where }),
    ]);

    return {
      success: true,
      data: {
        organizations: organizations.map((org) => ({
          id: org.id,
          name: org.name,
          domain: org.domain,
          packageTier: org.packageTier,
          isActive: org.isActive,
          userCount: org._count.users,
          createdAt: org.createdAt,
          updatedAt: org.updatedAt,
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    };
  }

  private decryptField(encrypted: string): string {
    const [ivHex, dataHex] = encrypted.split(':');
    const key = Buffer.from(config.ENCRYPTION_KEY, 'hex').subarray(0, 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
    return decipher.update(Buffer.from(dataHex, 'hex')) + decipher.final('utf8');
  }

  async getById(id: string) {
    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, campaigns: true } },
        users: {
          where: { role: { in: ['ORG_ADMIN', 'UNIT_ADMIN', 'SUPER_ADMIN'] } },
          select: {
            id: true,
            role: true,
            emailEncrypted: true,
            nameEncrypted: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        inviteTokens: {
          where: { usedAt: null },
          select: {
            id: true,
            email: true,
            role: true,
            expiresAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!org) {
      return { success: false, error: 'Kurum bulunamadı' };
    }

    return {
      success: true,
      data: {
        id: org.id,
        name: org.name,
        domain: org.domain,
        packageTier: org.packageTier,
        isActive: org.isActive,
        settings: org.settings,
        userCount: org._count.users,
        campaignCount: org._count.campaigns,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
        admins: org.users.map((u) => ({
          id: u.id,
          email: this.decryptField(u.emailEncrypted),
          name: u.nameEncrypted ? this.decryptField(u.nameEncrypted) : null,
          role: u.role,
          isActive: u.isActive,
          lastLoginAt: u.lastLoginAt,
          createdAt: u.createdAt,
        })),
        pendingInvites: org.inviteTokens.map((t) => ({
          id: t.id,
          email: t.email,
          role: t.role,
          expiresAt: t.expiresAt,
          createdAt: t.createdAt,
          isExpired: t.expiresAt < new Date(),
        })),
      },
    };
  }

  async create(name: string, domain: string, packageTier: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE') {
    const existing = await prisma.organization.findUnique({ where: { domain } });
    if (existing) {
      return { success: false, error: 'Bu domain zaten kayıtlı' };
    }

    const org = await prisma.organization.create({
      data: { name, domain, packageTier },
    });

    return {
      success: true,
      data: { id: org.id, name: org.name, domain: org.domain, packageTier: org.packageTier },
    };
  }

  async update(id: string, data: { name?: string; domain?: string; packageTier?: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'; settings?: Record<string, unknown> }) {
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) {
      return { success: false, error: 'Kurum bulunamadı' };
    }

    if (data.domain && data.domain !== org.domain) {
      const domainTaken = await prisma.organization.findUnique({ where: { domain: data.domain } });
      if (domainTaken) {
        return { success: false, error: 'Bu domain zaten kullanılıyor' };
      }
    }

    const updated = await prisma.organization.update({
      where: { id },
      data,
    });

    return {
      success: true,
      data: { id: updated.id, name: updated.name, domain: updated.domain, packageTier: updated.packageTier },
    };
  }

  async deactivate(id: string) {
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) {
      return { success: false, error: 'Kurum bulunamadı' };
    }

    await prisma.organization.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true, data: { message: 'Kurum pasifleştirildi' } };
  }

  async createInviteToken(orgId: string, email: string, role: UserRole, createdById: string) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      return { success: false, error: 'Kurum bulunamadı' };
    }
    if (!org.isActive) {
      return { success: false, error: 'Kurum pasif durumda' };
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 gün

    const invite = await prisma.orgInviteToken.create({
      data: { orgId, token, email, role, expiresAt, createdById },
    });

    return {
      success: true,
      data: {
        id: invite.id,
        token: invite.token,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
        orgName: org.name,
      },
    };
  }

  async validateInviteToken(token: string) {
    const invite = await prisma.orgInviteToken.findUnique({
      where: { token },
      include: { organization: true },
    });

    if (!invite) {
      return { success: false, error: 'Geçersiz davet linki' };
    }
    if (invite.usedAt) {
      return { success: false, error: 'Bu davet linki zaten kullanılmış' };
    }
    if (invite.expiresAt < new Date()) {
      return { success: false, error: 'Davet linkinin süresi dolmuş' };
    }
    if (!invite.organization.isActive) {
      return { success: false, error: 'Kurum pasif durumda' };
    }

    return {
      success: true,
      data: {
        email: invite.email,
        role: invite.role,
        orgId: invite.orgId,
        orgName: invite.organization.name,
      },
    };
  }

  async markTokenUsed(token: string) {
    await prisma.orgInviteToken.update({
      where: { token },
      data: { usedAt: new Date() },
    });
  }

  // ════════════════════════════════════
  // CAPABILITY MANAGEMENT
  // ════════════════════════════════════

  async getCapabilities(orgId: string) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return { success: false, error: 'Kurum bulunamadı' };

    const capabilities = resolveCapabilities(org);
    const hasOverrides = !!(org.settings as any)?.capabilities;

    return {
      success: true,
      data: {
        capabilities,
        tier: org.packageTier,
        hasOverrides,
        tierDefaults: TIER_CAPABILITY_DEFAULTS[org.packageTier.toLowerCase() as PackageTier],
      },
    };
  }

  async updateCapabilities(orgId: string, overrides: Partial<OrgCapabilities>) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return { success: false, error: 'Kurum bulunamadı' };

    const currentSettings = (org.settings as Record<string, unknown>) ?? {};
    const currentCapOverrides = (currentSettings.capabilities ?? {}) as Partial<OrgCapabilities>;

    // Deep merge overrides
    const mergedOverrides: Partial<OrgCapabilities> = {
      ...currentCapOverrides,
      ...overrides,
    };
    if (overrides.features) {
      mergedOverrides.features = { ...(currentCapOverrides.features ?? {} as any), ...overrides.features };
    }
    if (overrides.limits) {
      mergedOverrides.limits = { ...(currentCapOverrides.limits ?? {} as any), ...overrides.limits };
    }

    const updatedSettings = { ...currentSettings, capabilities: mergedOverrides };

    await prisma.organization.update({
      where: { id: orgId },
      data: { settings: updatedSettings },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        orgId,
        action: 'capabilities.update',
        resourceType: 'organization',
        resourceId: orgId,
        detailsJson: { overrides },
      },
    });

    const resolved = resolveCapabilities({ ...org, settings: updatedSettings });
    return { success: true, data: { capabilities: resolved, hasOverrides: true } };
  }

  async resetCapabilities(orgId: string) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return { success: false, error: 'Kurum bulunamadı' };

    const currentSettings = (org.settings as Record<string, unknown>) ?? {};
    const { capabilities: _, ...rest } = currentSettings;

    await prisma.organization.update({
      where: { id: orgId },
      data: { settings: rest },
    });

    await prisma.auditLog.create({
      data: {
        orgId,
        action: 'capabilities.reset',
        resourceType: 'organization',
        resourceId: orgId,
      },
    });

    const tier = org.packageTier.toLowerCase() as PackageTier;
    return {
      success: true,
      data: {
        capabilities: TIER_CAPABILITY_DEFAULTS[tier],
        hasOverrides: false,
      },
    };
  }

  // ════════════════════════════════════
  // EMAIL LOGS
  // ════════════════════════════════════

  async getEmailLogs(orgId: string, page: number, limit: number, filters: { status?: string; template?: string }) {
    const where: any = { orgId };
    if (filters.status) where.status = filters.status;
    if (filters.template) where.template = filters.template;

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.emailLog.count({ where }),
    ]);

    return {
      success: true,
      data: {
        logs: logs.map((log) => ({
          id: log.id,
          toAddress: log.toAddress,
          subject: log.subject,
          template: log.template,
          status: log.status,
          messageId: log.messageId,
          errorMessage: log.errorMessage,
          sentAt: log.sentAt,
          failedAt: log.failedAt,
          createdAt: log.createdAt,
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    };
  }

  async getEmailStats(orgId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [statusCounts, templateCounts] = await Promise.all([
      prisma.emailLog.groupBy({
        by: ['status'],
        where: { orgId, createdAt: { gte: thirtyDaysAgo } },
        _count: true,
      }),
      prisma.emailLog.groupBy({
        by: ['template'],
        where: { orgId, createdAt: { gte: thirtyDaysAgo } },
        _count: true,
      }),
    ]);

    const statusMap = Object.fromEntries(statusCounts.map((s) => [s.status, s._count]));
    const total = statusCounts.reduce((sum, s) => sum + s._count, 0);

    return {
      success: true,
      data: {
        period: '30d',
        total,
        sent: statusMap['SENT'] ?? 0,
        failed: statusMap['FAILED'] ?? 0,
        queued: statusMap['QUEUED'] ?? 0,
        bounced: statusMap['BOUNCED'] ?? 0,
        byTemplate: Object.fromEntries(templateCounts.map((t) => [t.template, t._count])),
      },
    };
  }

  // ════════════════════════════════════
  // USER MANAGEMENT
  // ════════════════════════════════════

  async listOrgUsers(orgId: string, page: number, limit: number, filters: { role?: string; isActive?: boolean }) {
    const where: any = { orgId };
    if (filters.role) where.role = filters.role;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          emailEncrypted: true,
          nameEncrypted: true,
          role: true,
          stakeholderGroup: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          department: { select: { id: true, name: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      success: true,
      data: {
        users: users.map((u) => ({
          id: u.id,
          email: this.decryptField(u.emailEncrypted),
          name: u.nameEncrypted ? this.decryptField(u.nameEncrypted) : null,
          role: u.role,
          stakeholderGroup: u.stakeholderGroup,
          isActive: u.isActive,
          lastLoginAt: u.lastLoginAt,
          createdAt: u.createdAt,
          department: u.department,
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    };
  }

  async toggleUserActive(orgId: string, userId: string, isActive: boolean, performedBy?: string) {
    const user = await prisma.user.findFirst({ where: { id: userId, orgId } });
    if (!user) return { success: false, error: 'Kullanıcı bulunamadı' };

    await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });

    await prisma.auditLog.create({
      data: {
        orgId,
        userId: performedBy,
        action: isActive ? 'user.activate' : 'user.deactivate',
        resourceType: 'user',
        resourceId: userId,
        detailsJson: { targetUserId: userId, isActive },
      },
    });

    return { success: true, data: { userId, isActive } };
  }

  // ════════════════════════════════════
  // CAMPAIGN INTERVENTION
  // ════════════════════════════════════

  async pauseCampaign(orgId: string, campaignId: string, performedBy?: string) {
    const campaign = await prisma.surveyCampaign.findFirst({ where: { id: campaignId, orgId } });
    if (!campaign) return { success: false, error: 'Kampanya bulunamadı' };
    if (campaign.status !== 'ACTIVE') return { success: false, error: 'Sadece aktif kampanyalar duraklatılabilir' };

    await prisma.surveyCampaign.update({
      where: { id: campaignId },
      data: { status: 'PAUSED' },
    });

    await prisma.auditLog.create({
      data: {
        orgId,
        userId: performedBy,
        action: 'campaign.pause',
        resourceType: 'campaign',
        resourceId: campaignId,
      },
    });

    return { success: true, data: { campaignId, status: 'PAUSED' } };
  }

  // ════════════════════════════════════
  // CAMPAIGN LISTING (for SUPER_ADMIN)
  // ════════════════════════════════════

  async listOrgCampaigns(orgId: string, page: number, limit: number) {
    const where = { orgId };

    const [campaigns, total] = await Promise.all([
      prisma.surveyCampaign.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { tokens: true, responses: true } } },
      }),
      prisma.surveyCampaign.count({ where }),
    ]);

    return {
      success: true,
      data: {
        campaigns: campaigns.map((c) => ({
          id: c.id,
          name: c.name,
          status: c.status,
          startedAt: c.startedAt,
          closesAt: c.closesAt,
          createdAt: c.createdAt,
          _count: c._count,
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    };
  }

  // ════════════════════════════════════
  // INVITE REVOCATION
  // ════════════════════════════════════

  async revokeInvite(inviteId: string, performedBy?: string) {
    const invite = await prisma.orgInviteToken.findUnique({ where: { id: inviteId } });
    if (!invite) return { success: false, error: 'Davet bulunamadı' };
    if (invite.usedAt) return { success: false, error: 'Davet zaten kullanılmış' };

    await prisma.orgInviteToken.update({
      where: { id: inviteId },
      data: { usedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        orgId: invite.orgId,
        userId: performedBy,
        action: 'invite.revoke',
        resourceType: 'invite',
        resourceId: inviteId,
      },
    });

    return { success: true, data: { inviteId, message: 'Davet iptal edildi' } };
  }
}

export const organizationsService = new OrganizationsService();
