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

  async deactivate(id: string, performedBy?: string) {
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) {
      return { success: false, error: 'Kurum bulunamadı' };
    }
    if (!org.isActive) {
      return { success: false, error: 'Kurum zaten pasif durumda' };
    }

    await prisma.organization.update({
      where: { id },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        orgId: id,
        userId: performedBy,
        action: 'org.deactivate',
        resourceType: 'organization',
        resourceId: id,
      },
    });

    return { success: true, data: { message: 'Kurum pasifleştirildi' } };
  }

  async reactivate(id: string, performedBy?: string) {
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) {
      return { success: false, error: 'Kurum bulunamadı' };
    }
    if (org.isActive) {
      return { success: false, error: 'Kurum zaten aktif durumda' };
    }

    await prisma.organization.update({
      where: { id },
      data: { isActive: true },
    });

    await prisma.auditLog.create({
      data: {
        orgId: id,
        userId: performedBy,
        action: 'org.reactivate',
        resourceType: 'organization',
        resourceId: id,
      },
    });

    return { success: true, data: { message: 'Kurum reaktifleştirildi' } };
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
  // LOGO UPLOAD
  // ════════════════════════════════════

  async uploadLogo(orgId: string, fileBuffer: Buffer, mimeType: string, performedBy?: string) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return { success: false, error: 'Kurum bulunamadı' };

    // Validate image type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(mimeType)) {
      return { success: false, error: 'Desteklenmeyen dosya türü. JPEG, PNG, GIF, WebP veya SVG yükleyin.' };
    }

    // Build a data URL (base64) — works without MinIO for MVP
    const base64 = fileBuffer.toString('base64');
    const logoUrl = `data:${mimeType};base64,${base64}`;

    const currentSettings = (org.settings as Record<string, unknown>) ?? {};
    const updatedSettings = { ...currentSettings, logoUrl };

    await prisma.organization.update({
      where: { id: orgId },
      data: { settings: updatedSettings },
    });

    await prisma.auditLog.create({
      data: {
        orgId,
        userId: performedBy,
        action: 'org.logo.upload',
        resourceType: 'organization',
        resourceId: orgId,
        detailsJson: { mimeType, sizeBytes: fileBuffer.length },
      },
    });

    return { success: true, data: { logoUrl } };
  }

  // ════════════════════════════════════
  // DEPARTMENT MANAGEMENT
  // ════════════════════════════════════

  async listDepartments(orgId: string) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return { success: false, error: 'Kurum bulunamadı' };

    const departments = await prisma.department.findMany({
      where: { orgId },
      include: {
        _count: { select: { users: true } },
        parentDepartment: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      data: {
        departments: departments.map((d) => ({
          id: d.id,
          name: d.name,
          parentDepartmentId: d.parentDepartmentId,
          parentDepartment: d.parentDepartment,
          headUserId: d.headUserId,
          userCount: d._count.users,
        })),
      },
    };
  }

  async createDepartment(orgId: string, name: string, parentDepartmentId?: string, performedBy?: string) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return { success: false, error: 'Kurum bulunamadı' };

    if (parentDepartmentId) {
      const parent = await prisma.department.findFirst({ where: { id: parentDepartmentId, orgId } });
      if (!parent) return { success: false, error: 'Üst birim bulunamadı' };
    }

    try {
      const dept = await prisma.department.create({
        data: { orgId, name, parentDepartmentId: parentDepartmentId ?? null },
      });

      await prisma.auditLog.create({
        data: {
          orgId,
          userId: performedBy,
          action: 'department.create',
          resourceType: 'department',
          resourceId: dept.id,
          detailsJson: { name, parentDepartmentId },
        },
      });

      return { success: true, data: { id: dept.id, name: dept.name, parentDepartmentId: dept.parentDepartmentId } };
    } catch (err: any) {
      if (err.code === 'P2002') return { success: false, error: 'Bu isimde bir birim zaten mevcut' };
      throw err;
    }
  }

  async updateDepartment(orgId: string, departmentId: string, data: { name?: string; parentDepartmentId?: string | null }, performedBy?: string) {
    const dept = await prisma.department.findFirst({ where: { id: departmentId, orgId } });
    if (!dept) return { success: false, error: 'Birim bulunamadı' };

    if (data.parentDepartmentId) {
      if (data.parentDepartmentId === departmentId) return { success: false, error: 'Birim kendi kendine üst birim olamaz' };
      const parent = await prisma.department.findFirst({ where: { id: data.parentDepartmentId, orgId } });
      if (!parent) return { success: false, error: 'Üst birim bulunamadı' };
    }

    try {
      const updated = await prisma.department.update({
        where: { id: departmentId },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.parentDepartmentId !== undefined ? { parentDepartmentId: data.parentDepartmentId } : {}),
        },
      });

      await prisma.auditLog.create({
        data: {
          orgId,
          userId: performedBy,
          action: 'department.update',
          resourceType: 'department',
          resourceId: departmentId,
          detailsJson: data,
        },
      });

      return { success: true, data: { id: updated.id, name: updated.name } };
    } catch (err: any) {
      if (err.code === 'P2002') return { success: false, error: 'Bu isimde bir birim zaten mevcut' };
      throw err;
    }
  }

  async deleteDepartment(orgId: string, departmentId: string, performedBy?: string) {
    const dept = await prisma.department.findFirst({
      where: { id: departmentId, orgId },
      include: { _count: { select: { users: true, childDepartments: true } } },
    });
    if (!dept) return { success: false, error: 'Birim bulunamadı' };
    if (dept._count.users > 0) return { success: false, error: 'Bu birimde kullanıcılar var. Önce kullanıcıları taşıyın veya kaldırın.' };
    if (dept._count.childDepartments > 0) return { success: false, error: 'Bu birimin alt birimleri var. Önce alt birimleri silin.' };

    await prisma.department.delete({ where: { id: departmentId } });

    await prisma.auditLog.create({
      data: {
        orgId,
        userId: performedBy,
        action: 'department.delete',
        resourceType: 'department',
        resourceId: departmentId,
        detailsJson: { name: dept.name },
      },
    });

    return { success: true, data: { message: 'Birim silindi' } };
  }

  // ════════════════════════════════════
  // USER ROLE REASSIGNMENT
  // ════════════════════════════════════

  async reassignUserRole(orgId: string, userId: string, newRole: string, performedBy?: string) {
    const user = await prisma.user.findFirst({ where: { id: userId, orgId } });
    if (!user) return { success: false, error: 'Kullanıcı bulunamadı' };

    const allowedRoles = ['ORG_ADMIN', 'UNIT_ADMIN', 'PARTICIPANT', 'VIEWER'];
    if (!allowedRoles.includes(newRole)) return { success: false, error: 'Geçersiz rol' };

    const prevRole = user.role;

    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole as any },
    });

    await prisma.auditLog.create({
      data: {
        orgId,
        userId: performedBy,
        action: 'user.role.change',
        resourceType: 'user',
        resourceId: userId,
        detailsJson: { previousRole: prevRole, newRole },
      },
    });

    return { success: true, data: { userId, role: newRole } };
  }

  // ════════════════════════════════════
  // AUDIT LOG VIEWER
  // ════════════════════════════════════

  async getAuditLogs(
    orgId: string,
    page: number,
    limit: number,
    filters: { action?: string; resourceType?: string; userId?: string },
  ) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return { success: false, error: 'Kurum bulunamadı' };

    const where: any = { orgId };
    if (filters.action) where.action = { contains: filters.action };
    if (filters.resourceType) where.resourceType = filters.resourceType;
    if (filters.userId) where.userId = filters.userId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { timestamp: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Batch-fetch performers to decrypt their names/emails
    const performerIds = [...new Set(logs.map((l) => l.userId).filter((id): id is string => !!id))];
    const performers = performerIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: performerIds } },
          select: { id: true, emailEncrypted: true, nameEncrypted: true },
        })
      : [];
    const performerMap = new Map(performers.map((u) => [u.id, u]));

    return {
      success: true,
      data: {
        logs: logs.map((log) => {
          const performer = log.userId ? performerMap.get(log.userId) : undefined;
          return {
            id: log.id,
            action: log.action,
            resourceType: log.resourceType,
            resourceId: log.resourceId,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            details: log.detailsJson,
            timestamp: log.timestamp,
            performedBy: performer
              ? {
                  id: performer.id,
                  email: this.decryptField(performer.emailEncrypted),
                  name: performer.nameEncrypted ? this.decryptField(performer.nameEncrypted) : null,
                }
              : null,
          };
        }),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    };
  }

  // ════════════════════════════════════
  // BULK USER OPERATIONS
  // ════════════════════════════════════

  async bulkToggleUsers(orgId: string, userIds: string[], isActive: boolean, performedBy?: string) {
    // Verify all users belong to this org
    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, orgId },
      select: { id: true },
    });
    if (users.length !== userIds.length) {
      return { success: false, error: 'Bazı kullanıcılar bu kuruma ait değil' };
    }

    await prisma.user.updateMany({
      where: { id: { in: userIds }, orgId },
      data: { isActive },
    });

    await prisma.auditLog.create({
      data: {
        orgId,
        userId: performedBy,
        action: isActive ? 'user.bulk.activate' : 'user.bulk.deactivate',
        resourceType: 'user',
        detailsJson: { userIds, count: userIds.length, isActive },
      },
    });

    return { success: true, data: { count: userIds.length, isActive } };
  }

  async bulkDeleteUsers(orgId: string, userIds: string[], performedBy?: string) {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, orgId },
      select: { id: true, role: true },
    });
    if (users.length !== userIds.length) {
      return { success: false, error: 'Bazı kullanıcılar bu kuruma ait değil' };
    }

    // Prevent deleting admins in bulk for safety
    const adminIds = users.filter((u) => ['SUPER_ADMIN', 'ORG_ADMIN'].includes(u.role)).map((u) => u.id);
    if (adminIds.length > 0) {
      return { success: false, error: 'Yönetici rolündeki kullanıcılar toplu silinemez. Önce rollerini değiştirin.' };
    }

    await prisma.user.deleteMany({
      where: { id: { in: userIds }, orgId },
    });

    await prisma.auditLog.create({
      data: {
        orgId,
        userId: performedBy,
        action: 'user.bulk.delete',
        resourceType: 'user',
        detailsJson: { userIds, count: userIds.length },
      },
    });

    return { success: true, data: { count: userIds.length } };
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

  // ════════════════════════════════════
  // ORG_ADMIN SELF-SERVICE
  // Returns data scoped to the requesting user's own org
  // ════════════════════════════════════

  async getMyOrg(orgId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: { select: { users: true, campaigns: true, departments: true } },
      },
    });
    if (!org) return { success: false, error: 'Kurum bulunamadı' };

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
        departmentCount: org._count.departments,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
      },
    };
  }

  async getMyOrgUsers(orgId: string, page: number, limit: number, filters: { role?: string; isActive?: boolean }) {
    return this.listOrgUsers(orgId, page, limit, filters);
  }

  async toggleMyOrgUser(orgId: string, userId: string, isActive: boolean, performedBy?: string) {
    // ORG_ADMIN cannot toggle SUPER_ADMIN users
    const targetUser = await prisma.user.findFirst({ where: { id: userId, orgId } });
    if (!targetUser) return { success: false, error: 'Kullanıcı bulunamadı' };
    if (targetUser.role === 'SUPER_ADMIN') return { success: false, error: 'Sistem yöneticisi hesabı değiştirilemez' };

    return this.toggleUserActive(orgId, userId, isActive, performedBy);
  }

  async reassignMyOrgUserRole(orgId: string, userId: string, newRole: string, performedBy?: string) {
    // ORG_ADMIN can only assign UNIT_ADMIN, PARTICIPANT, VIEWER roles (not another ORG_ADMIN or SUPER_ADMIN)
    const user = await prisma.user.findFirst({ where: { id: userId, orgId } });
    if (!user) return { success: false, error: 'Kullanıcı bulunamadı' };
    if (user.role === 'SUPER_ADMIN') return { success: false, error: 'Sistem yöneticisi rolü değiştirilemez' };

    const allowedRoles = ['UNIT_ADMIN', 'PARTICIPANT', 'VIEWER'];
    if (!allowedRoles.includes(newRole)) return { success: false, error: 'Geçersiz rol. Kurum yöneticisi UNIT_ADMIN, PARTICIPANT veya VIEWER rolü atayabilir.' };

    return this.reassignUserRole(orgId, userId, newRole, performedBy);
  }

  async bulkToggleMyOrgUsers(orgId: string, userIds: string[], isActive: boolean, performedBy?: string) {
    // ORG_ADMIN cannot bulk-toggle SUPER_ADMIN users
    const superAdmins = await prisma.user.findMany({
      where: { id: { in: userIds }, orgId, role: 'SUPER_ADMIN' },
    });
    if (superAdmins.length > 0) return { success: false, error: 'Sistem yöneticisi hesapları toplu işlemlere dahil edilemez' };

    return this.bulkToggleUsers(orgId, userIds, isActive, performedBy);
  }

  async listMyOrgDepartments(orgId: string) {
    return this.listDepartments(orgId);
  }

  async createMyOrgDepartment(orgId: string, name: string, parentDepartmentId?: string, performedBy?: string) {
    return this.createDepartment(orgId, name, parentDepartmentId, performedBy);
  }

  async updateMyOrgDepartment(orgId: string, departmentId: string, data: { name?: string; parentDepartmentId?: string | null }, performedBy?: string) {
    return this.updateDepartment(orgId, departmentId, data, performedBy);
  }

  async deleteMyOrgDepartment(orgId: string, departmentId: string, performedBy?: string) {
    return this.deleteDepartment(orgId, departmentId, performedBy);
  }

  async createMyOrgInvite(orgId: string, email: string, role: UserRole, createdById: string) {
    // ORG_ADMIN can only invite UNIT_ADMIN or lower (not another ORG_ADMIN)
    const allowedInviteRoles: UserRole[] = ['UNIT_ADMIN' as UserRole];
    if (!allowedInviteRoles.includes(role)) {
      return { success: false, error: 'Kurum yöneticisi sadece Birim Yöneticisi davet edebilir' };
    }
    return this.createInviteToken(orgId, email, role, createdById);
  }

  async getMyOrgPendingInvites(orgId: string) {
    const invites = await prisma.orgInviteToken.findMany({
      where: { orgId, usedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      success: true,
      data: {
        invites: invites.map((t) => ({
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

  async revokeMyOrgInvite(orgId: string, inviteId: string, performedBy?: string) {
    const invite = await prisma.orgInviteToken.findFirst({ where: { id: inviteId, orgId } });
    if (!invite) return { success: false, error: 'Davet bulunamadı' };
    return this.revokeInvite(inviteId, performedBy);
  }

  async getMyOrgAuditLogs(orgId: string, page: number, limit: number, filters: { action?: string; resourceType?: string }) {
    return this.getAuditLogs(orgId, page, limit, filters);
  }
}

export const organizationsService = new OrganizationsService();
