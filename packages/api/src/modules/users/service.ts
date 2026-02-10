import { prisma } from '../../config/database';
import { config } from '../../config/env';
import crypto from 'crypto';
import { parse } from 'csv-parse/sync';
import { hashPassword } from '../../utils/encryption';

interface CSVRow {
  ad: string;
  soyad: string;
  email: string;
  birim: string;
  unvan?: string;
}

const REQUIRED_HEADERS = ['ad', 'soyad', 'email', 'birim'];

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

  private decryptField(encrypted: string): string {
    const [ivHex, dataHex] = encrypted.split(':');
    const key = Buffer.from(config.ENCRYPTION_KEY, 'hex').subarray(0, 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
    return decipher.update(Buffer.from(dataHex, 'hex')) + decipher.final('utf8');
  }

  // ── CSV Toplu Yükleme ──
  async importCSV(orgId: string, csvContent: string, importedBy: string) {
    const records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true, bom: true }) as CSVRow[];

    if (records.length === 0) throw new Error('CSV dosyası boş');

    // Header validasyonu
    const headers = Object.keys(records[0]).map((h) => h.toLowerCase());
    const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
    if (missing.length > 0) throw new Error(`Eksik sütunlar: ${missing.join(', ')}`);

    // Kurum kontrolü
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new Error('Kurum bulunamadı');

    // Mevcut birimleri al
    const existingDepts = await prisma.department.findMany({ where: { orgId } });
    const deptMap = new Map(existingDepts.map((d) => [d.name.toLowerCase(), d.id]));

    const results = { created: 0, skipped: 0, errors: [] as { row: number; message: string }[] };
    const defaultPassword = await hashPassword('CVF-QA-2026!');

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2; // 1-indexed + header row

      try {
        const email = row.email?.trim().toLowerCase();
        const ad = row.ad?.trim();
        const soyad = row.soyad?.trim();
        const birim = row.birim?.trim();

        // Validasyonlar
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          results.errors.push({ row: rowNum, message: `Geçersiz e-posta: ${row.email || '(boş)'}` });
          results.skipped++;
          continue;
        }

        if (!ad || !soyad) {
          results.errors.push({ row: rowNum, message: 'Ad ve soyad zorunludur' });
          results.skipped++;
          continue;
        }

        if (!birim) {
          results.errors.push({ row: rowNum, message: 'Birim zorunludur' });
          results.skipped++;
          continue;
        }

        // Duplicate email kontrolü
        const emailHash = this.hashEmail(email);
        const existing = await prisma.user.findUnique({ where: { emailHash } });
        if (existing) {
          results.errors.push({ row: rowNum, message: `Bu e-posta zaten kayıtlı: ${email}` });
          results.skipped++;
          continue;
        }

        // Birim: yoksa oluştur
        let departmentId: string;
        const deptKey = birim.toLowerCase();
        if (deptMap.has(deptKey)) {
          departmentId = deptMap.get(deptKey)!;
        } else {
          const dept = await prisma.department.create({ data: { orgId, name: birim } });
          deptMap.set(deptKey, dept.id);
          departmentId = dept.id;
        }

        const fullName = `${ad} ${soyad}`;

        await prisma.user.create({
          data: {
            orgId,
            emailEncrypted: this.encryptField(email),
            emailHash,
            nameEncrypted: this.encryptField(fullName),
            departmentId,
            stakeholderGroup: 'ACADEMIC',
            role: 'PARTICIPANT',
            passwordHash: defaultPassword,
            authMethod: 'EMAIL_PASSWORD',
          },
        });
        results.created++;
      } catch (err: any) {
        results.errors.push({ row: rowNum, message: err.message });
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

    return { totalRows: records.length, ...results };
  }

  // ── Kullanıcı Listesi ──
  async list(orgId: string, page = 1, limit = 50) {
    const where = { orgId, isActive: true };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { department: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users: users.map((u) => ({
        id: u.id,
        email: this.decryptField(u.emailEncrypted),
        name: u.nameEncrypted ? this.decryptField(u.nameEncrypted) : null,
        department: u.department?.name || null,
        stakeholderGroup: u.stakeholderGroup,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}

export const userService = new UserService();
