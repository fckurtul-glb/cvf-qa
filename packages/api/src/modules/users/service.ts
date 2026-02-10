import { prisma } from '../../config/database';
import { config } from '../../config/env';
import crypto from 'crypto';
import { parse } from 'csv-parse/sync';
import { hashPassword } from '../../utils/encryption';
import { validateEmail, validateCSVHeaders } from '@cvf-qa/shared';

interface CSVRow {
  email: string;
  name?: string;
  department: string;
  stakeholder_group: string;
  role?: string;
}

const REQUIRED_HEADERS = ['email', 'department', 'stakeholder_group'];

class UserService {
  private hashEmail(email: string): string {
    return crypto.createHmac('sha256', config.ENCRYPTION_KEY).update(email.toLowerCase().trim()).digest('hex');
  }

  private encryptField(value: string): string {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(config.ENCRYPTION_KEY, 'hex').subarray(0, 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    return iv.toString('hex') + ':' + Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]).toString('hex');
  }

  // ── CSV Toplu Yükleme ──
  async importCSV(orgId: string, csvContent: string, importedBy: string) {
    const records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true }) as CSVRow[];

    // Header validasyonu
    if (records.length === 0) throw new Error('CSV dosyası boş');
    const headers = Object.keys(records[0]);
    const headerCheck = validateCSVHeaders(headers, REQUIRED_HEADERS);
    if (!headerCheck.valid) throw new Error(`Eksik sütunlar: ${headerCheck.missing.join(', ')}`);

    // Kurum ve mevcut birimleri al
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new Error('Kurum bulunamadı');

    const existingDepts = await prisma.department.findMany({ where: { orgId } });
    const deptMap = new Map(existingDepts.map((d) => [d.name.toLowerCase(), d.id]));

    const results = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };
    const defaultPassword = await hashPassword('CVF-QA-2026!'); // İlk giriş sonrası değiştirilecek

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2; // 1-indexed + header

      try {
        // E-posta validasyonu
        if (!row.email || !validateEmail(row.email)) {
          results.errors.push(`Satır ${rowNum}: Geçersiz e-posta: ${row.email}`);
          results.skipped++;
          continue;
        }

        // Paydaş grubu validasyonu
        const validGroups = ['ACADEMIC', 'ADMINISTRATIVE', 'STUDENT', 'EXTERNAL', 'ALUMNI'];
        const group = row.stakeholder_group?.toUpperCase();
        if (!validGroups.includes(group)) {
          results.errors.push(`Satır ${rowNum}: Geçersiz paydaş grubu: ${row.stakeholder_group}`);
          results.skipped++;
          continue;
        }

        // Birim: yoksa oluştur
        let departmentId: string | null = null;
        if (row.department) {
          const deptKey = row.department.toLowerCase();
          if (deptMap.has(deptKey)) {
            departmentId = deptMap.get(deptKey)!;
          } else {
            const dept = await prisma.department.create({ data: { orgId, name: row.department } });
            deptMap.set(deptKey, dept.id);
            departmentId = dept.id;
          }
        }

        // Kullanıcı: var mı kontrol et
        const emailHash = this.hashEmail(row.email);
        const existing = await prisma.user.findUnique({ where: { emailHash } });

        if (existing) {
          // Güncelle
          await prisma.user.update({
            where: { id: existing.id },
            data: {
              departmentId,
              stakeholderGroup: group as any,
              nameEncrypted: row.name ? this.encryptField(row.name) : existing.nameEncrypted,
            },
          });
          results.updated++;
        } else {
          // Yeni kullanıcı oluştur
          await prisma.user.create({
            data: {
              orgId,
              emailEncrypted: this.encryptField(row.email),
              emailHash,
              nameEncrypted: row.name ? this.encryptField(row.name) : null,
              departmentId,
              stakeholderGroup: group as any,
              role: (row.role?.toUpperCase() as any) || 'PARTICIPANT',
              passwordHash: defaultPassword,
              authMethod: 'EMAIL_PASSWORD',
            },
          });
          results.created++;
        }
      } catch (err: any) {
        results.errors.push(`Satır ${rowNum}: ${err.message}`);
        results.skipped++;
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        orgId,
        userId: importedBy,
        action: 'users.csv_import',
        detailsJson: { totalRows: records.length, ...results },
      },
    });

    return results;
  }

  // ── Kullanıcı Listesi (sayfalı) ──
  async list(orgId: string, page = 1, limit = 50, filters?: { department?: string; stakeholderGroup?: string }) {
    const where: any = { orgId, isActive: true };
    if (filters?.department) where.departmentId = filters.department;
    if (filters?.stakeholderGroup) where.stakeholderGroup = filters.stakeholderGroup;

    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, skip: (page - 1) * limit, take: limit, include: { department: true }, orderBy: { createdAt: 'desc' } }),
      prisma.user.count({ where }),
    ]);

    return {
      users: users.map((u) => ({
        id: u.id,
        department: u.department?.name,
        stakeholderGroup: u.stakeholderGroup,
        role: u.role,
        isActive: u.isActive,
        lastLoginAt: u.lastLoginAt,
        // NOT: email ve isim şifreli — sadece admin görebilir
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── KVKK: Kullanıcı Silme (Soft Delete → 30 gün sonra kalıcı) ──
  async requestDeletion(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    // 30 gün sonra kalıcı silme job'u ekle
    // TODO: BullMQ delayed job
    return { success: true, message: 'Hesabınız 30 gün içinde kalıcı olarak silinecektir. Anonim analiz verileri korunur.' };
  }
}

export const userService = new UserService();
