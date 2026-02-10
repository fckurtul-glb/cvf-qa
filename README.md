# CVF-QA Platform

**Yükseköğretim Kurumları için Bütünleşik Kurumsal Kültür Değerlendirme ve Akreditasyon Destek Platformu**

## Mimari Genel Bakış

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js 14+ App Router, TypeScript, Tailwind CSS)   │
│  ┌──────────┐ ┌──────────────┐ ┌───────────┐ ┌─────────────┐  │
│  │ Public   │ │ Survey       │ │ Dashboard │ │ Portal      │  │
│  │ Website  │ │ Engine       │ │ (Admin)   │ │ (Reports)   │  │
│  └──────────┘ └──────────────┘ └───────────┘ └─────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  BACKEND API (Node.js / Fastify, TypeScript)                   │
│  ┌──────┐ ┌──────────┐ ┌────────┐ ┌────────┐ ┌─────────────┐ │
│  │ Auth │ │ Campaign │ │ Survey │ │Reports │ │Notification │ │
│  │      │ │ Manager  │ │ Engine │ │ Gen    │ │  Service    │ │
│  └──────┘ └──────────┘ └────────┘ └────────┘ └─────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  DATA LAYER                                                     │
│  ┌──────────────┐ ┌───────┐ ┌────────────┐ ┌───────────────┐  │
│  │ PostgreSQL   │ │ Redis │ │ S3 Object  │ │ Encrypted     │  │
│  │ 16+ (RLS)    │ │       │ │ Storage    │ │ Backup        │  │
│  └──────────────┘ └───────┘ └────────────┘ └───────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ANALYTICS ENGINE (Python, FastAPI)                             │
│  ┌──────────┐ ┌───────┐ ┌───────────┐ ┌──────────────────┐    │
│  │ Scoring  │ │  SEM  │ │ PDF/Chart │ │ Claude AI Insight │   │
│  └──────────┘ └───────┘ └───────────┘ └──────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Monorepo Yapısı

```
cvf-qa/
├── packages/
│   ├── shared/          # Ortak tipler, sabitler, validasyon
│   ├── web/             # Next.js 14 frontend
│   ├── api/             # Fastify backend API
│   └── analytics/       # Python analiz motoru
├── infrastructure/      # Docker, K8s, Terraform
├── docs/                # Proje dokümantasyonu
└── .github/workflows/   # CI/CD pipeline
```

## Hızlı Başlangıç

```bash
# 1. Bağımlılıkları yükle
pnpm install

# 2. Ortam değişkenlerini ayarla
cp .env.example .env.local

# 3. Veritabanını hazırla
pnpm db:migrate
pnpm db:seed

# 4. Development sunucularını başlat
pnpm dev
```

## Modüller

| Kod | Modül | Açıklama |
|-----|-------|----------|
| M1 | OCAI+ | Örgüt Kültürü Değerlendirme (24 madde, ipsatif) |
| M2 | QCI-TR | Kalite Kültürü Envanteri (30 madde, 5'li ölçek) |
| M3 | MSAI-YÖ | 360° Liderlik Değerlendirme (48 madde) |
| M4 | UWES-TR | Çalışan Bağlılığı (9 madde, 7'li ölçek) |
| M5 | PKE | Paydaş Katılım Endeksi (20 madde, özgün) |
| M6 | SPU | Stratejik Plan Uyum Analizi (15 madde, özgün) |

## Teknoloji Stack

- **Frontend:** Next.js 14+, TypeScript, Tailwind CSS, shadcn/ui, D3.js
- **Backend:** Node.js, Fastify, Prisma ORM, BullMQ
- **Database:** PostgreSQL 16+ (RLS), Redis
- **Analytics:** Python, FastAPI, scipy, pandas
- **AI:** Claude API (Anthropic)
- **Infra:** Docker, GitHub Actions, Vercel + Railway

## Güvenlik

- Tek kullanımlık kişiye özel anket tokenları
- Kriptografik anonimlik (iki ayrı DB şeması)
- KVKK tam uyum, Türkiye region hosting
- TLS 1.3, AES-256, Argon2id
- Row Level Security (RLS) — kurum izolasyonu
