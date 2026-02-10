import argon2 from 'argon2';
import { prisma } from '../../config/database';
import { config } from '../../config/env';
import crypto from 'crypto';

class AuthService {
  private hashEmail(email: string): string {
    return crypto.createHmac('sha256', config.ENCRYPTION_KEY).update(email.toLowerCase().trim()).digest('hex');
  }

  private encryptField(value: string): string {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(config.ENCRYPTION_KEY, 'hex').subarray(0, 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  private decryptField(encrypted: string): string {
    const [ivHex, dataHex] = encrypted.split(':');
    const key = Buffer.from(config.ENCRYPTION_KEY, 'hex').subarray(0, 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
    return decipher.update(Buffer.from(dataHex, 'hex')) + decipher.final('utf8');
  }

  async register(email: string, password: string, name?: string) {
    const emailHash = this.hashEmail(email);

    const existing = await prisma.user.findUnique({ where: { emailHash } });
    if (existing) {
      return { success: false, error: 'Bu e-posta adresi zaten kayıtlı' };
    }

    // Varsayılan organizasyonu bul veya oluştur
    let org = await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!org) {
      org = await prisma.organization.create({
        data: { name: 'Varsayılan Kurum', domain: 'default.cvf-qa.local' },
      });
    }

    const passwordHash = await argon2.hash(password, {
      type: 2, // argon2id
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const user = await prisma.user.create({
      data: {
        orgId: org.id,
        emailEncrypted: this.encryptField(email),
        emailHash,
        nameEncrypted: name ? this.encryptField(name) : null,
        stakeholderGroup: 'ACADEMIC',
        role: 'PARTICIPANT',
        passwordHash,
        authMethod: 'EMAIL_PASSWORD',
      },
    });

    return {
      success: true,
      user: { id: user.id, role: user.role, org: user.orgId },
    };
  }

  async login(email: string, password: string, ip?: string, userAgent?: string) {
    const emailHash = this.hashEmail(email);
    const user = await prisma.user.findUnique({ where: { emailHash } });

    if (!user || !user.passwordHash) {
      return { success: false, error: 'Geçersiz kimlik bilgileri' };
    }
    if (!user.isActive) {
      return { success: false, error: 'Hesap devre dışı' };
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return { success: false, error: 'Hesap geçici olarak kilitli' };
    }

    const validPassword = await argon2.verify(user.passwordHash, password);
    if (!validPassword) {
      const attempts = user.failedLoginAttempts + 1;
      const update: Record<string, unknown> = { failedLoginAttempts: attempts };
      if (attempts >= 5) {
        update.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await prisma.user.update({ where: { id: user.id }, data: update });
      return { success: false, error: 'Geçersiz kimlik bilgileri' };
    }

    // Reset failed attempts, update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        orgId: user.orgId,
        userId: user.id,
        action: 'auth.login',
        ipAddress: ip,
        userAgent,
        detailsJson: { method: 'email_password' },
      },
    });

    return {
      success: true,
      user: { id: user.id, role: user.role, org: user.orgId, stakeholder: user.stakeholderGroup },
    };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true, department: true },
    });

    if (!user) {
      return { success: false, error: 'Kullanıcı bulunamadı' };
    }

    return {
      success: true,
      data: {
        id: user.id,
        email: this.decryptField(user.emailEncrypted),
        name: user.nameEncrypted ? this.decryptField(user.nameEncrypted) : null,
        role: user.role,
        stakeholderGroup: user.stakeholderGroup,
        organization: { id: user.organization.id, name: user.organization.name },
        department: user.department ? { id: user.department.id, name: user.department.name } : null,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      },
    };
  }
}

export const authService = new AuthService();
