import { PrismaClient } from '../generated/client';

const prisma = new PrismaClient();

async function main() {
  // Demo organization
  const org = await prisma.organization.upsert({
    where: { domain: 'khas.edu.tr' },
    update: {},
    create: {
      name: 'Kadir Has Üniversitesi',
      domain: 'khas.edu.tr',
      packageTier: 'ENTERPRISE',
      settings: { allowedModules: ['M1_OCAI','M2_QCI','M3_MSAI','M4_UWES','M5_PKE','M6_SPU'], maxParticipants: 9999, ssoEnabled: true },
    },
  });

  console.log('Seeded organization:', org.name);

  // Demo departments
  const depts = ['Rektörlük', 'İİSBF', 'Mühendislik', 'İletişim', 'Hukuk', 'Sanat ve Tasarım', 'İdari Birimler'];
  for (const name of depts) {
    await prisma.department.upsert({
      where: { orgId_name: { orgId: org.id, name } },
      update: {},
      create: { orgId: org.id, name },
    });
  }

  console.log('Seeded departments:', depts.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
