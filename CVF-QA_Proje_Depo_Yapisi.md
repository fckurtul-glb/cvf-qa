# CVF-QA Monorepo — Proje Depo Yapısı

```
cvf-qa/
│
├── 📄 README.md                          # Proje genel bakış, kurulum rehberi
├── 📄 package.json                       # Root monorepo (pnpm + turbo)
├── 📄 pnpm-workspace.yaml               # Workspace tanımları
├── 📄 turbo.json                         # Turborepo task pipeline
├── 📄 tsconfig.base.json                 # Paylaşılan TypeScript config
├── 📄 .prettierrc                        # Kod formatlama kuralları
├── 📄 .gitignore                         # Git ignore kuralları
├── 📄 .env.example                       # Ortam değişkenleri şablonu
├── 📄 docker-compose.yml                 # Yerel geliştirme stack
│
├── 📁 .github/workflows/
│   ├── ci.yml                            # CI: lint, typecheck, test
│   └── deploy.yml                        # CD: Vercel + Railway deploy
│
├── 📁 .vscode/
│   └── extensions.json                   # Önerilen VS Code eklentileri
│
├── 📁 docs/
│   ├── ARCHITECTURE.md                   # Teknik mimari + sprint planı
│   ├── SECURITY.md                       # Güvenlik & KVKK dökümantasyonu
│   └── API.md                            # API endpoint haritası
│
├── 📁 infrastructure/
│   └── docker/
│       ├── Dockerfile.api                # API container image
│       ├── Dockerfile.web                # Web container image
│       ├── Dockerfile.analytics          # Python analytics image
│       └── init-db.sql                   # PostgreSQL init (pgcrypto, schemas)
│
│ ═══════════════════════════════════════════════════════════════
│  PACKAGES
│ ═══════════════════════════════════════════════════════════════
│
├── 📦 packages/shared/                   # @cvf-qa/shared — Ortak kütüphane
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                      # Barrel export
│       ├── types/
│       │   ├── index.ts                  # Tüm tip export'ları
│       │   ├── auth.ts                   # UserRole, JwtPayload, LoginRequest
│       │   ├── survey.ts                 # ModuleCode, CultureType, SurveySession
│       │   ├── organization.ts           # Organization, Department, PackageTier
│       │   ├── campaign.ts               # Campaign, CampaignStats, ReminderConfig
│       │   ├── report.ts                 # Report, GapAnalysis, YokakEvidenceMap
│       │   └── modules.ts               # MODULE_DEFINITIONS, PACKAGE_MODULE_MAP
│       ├── constants/
│       │   └── index.ts                  # RATE_LIMITS, ANONYMITY, YOKAK_CRITERIA
│       ├── validators/
│       │   └── index.ts                  # ipsatif/likert validasyon, email, CSV
│       └── utils/
│           └── index.ts                  # Skor hesaplama, gap analizi, anonim ID
│
├── 📦 packages/api/                      # @cvf-qa/api — Backend (Fastify)
│   ├── package.json
│   ├── prisma/
│   │   └── schema.prisma                 # ⭐ Veritabanı şeması (13 model, 8 enum)
│   │                                     #    Organizations, Users, Departments
│   │                                     #    SurveyCampaigns, SurveyTokens
│   │                                     #    SurveyResponses, SurveyAnswers
│   │                                     #    Assessment360Config/Rater
│   │                                     #    Reports, AuditLogs, ConsentLogs
│   └── src/
│       ├── server.ts                     # ⭐ Fastify bootstrap, graceful shutdown
│       ├── routes.ts                     # Route registry (tüm modüller)
│       ├── config/
│       │   ├── env.ts                    # Zod ile env validation
│       │   ├── database.ts               # Prisma client singleton
│       │   └── redis.ts                  # Redis bağlantı + hata yönetimi
│       ├── middleware/
│       │   ├── auth.ts                   # JWT doğrulama, RBAC, org_id kontrolü
│       │   ├── rate-limiter.ts           # Redis tabanlı rate limiting
│       │   ├── error-handler.ts          # Merkezi hata yakalama
│       │   └── request-logger.ts         # İstek loglama
│       ├── modules/
│       │   ├── auth/
│       │   │   ├── routes.ts             # /auth/login, /magic-link, /verify-otp
│       │   │   ├── service.ts            # ⭐ Auth iş mantığı (Argon2, TOTP, brute-force)
│       │   │   └── schema.ts             # Request validation schemas
│       │   ├── users/
│       │   │   └── routes.ts             # /orgs/:id/users, CSV import
│       │   ├── organizations/
│       │   │   └── routes.ts             # /orgs CRUD
│       │   ├── campaigns/
│       │   │   └── routes.ts             # /campaigns CRUD, /launch, /status
│       │   ├── survey/
│       │   │   └── routes.ts             # /survey/start, /save, /submit
│       │   ├── reports/
│       │   │   └── routes.ts             # /reports/:id, /download
│       │   ├── analytics/
│       │   │   └── routes.ts             # /analytics/dashboard
│       │   ├── notifications/            # E-posta + SMS servisi
│       │   └── ai/                       # Claude API entegrasyonu
│       ├── jobs/
│       │   ├── email-sender.ts           # BullMQ email worker
│       │   └── campaign-launcher.ts      # Token üretimi + dağıtım worker
│       ├── utils/
│       │   └── encryption.ts             # AES-256 encrypt/decrypt, Argon2 hash
│       ├── templates/
│       │   ├── email/                    # E-posta şablonları (davet, OTP, rapor)
│       │   └── pdf/                      # PDF rapor şablonları
│       └── database/
│           ├── migrations/               # Prisma migration dosyaları
│           └── seeds/
│               └── index.ts              # Demo veri (Kadir Has Üniversitesi)
│
├── 📦 packages/web/                      # @cvf-qa/web — Frontend (Next.js 14)
│   ├── package.json
│   ├── next.config.js                    # Güvenlik header'ları, image config
│   ├── tailwind.config.ts                # CVF-QA renk paleti, fontlar
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── public/
│   │   ├── images/                       # Logo, OG image, favicon
│   │   └── fonts/                        # Self-hosted fontlar
│   └── src/
│       ├── styles/
│       │   └── globals.css               # Tailwind base + CVF-QA utilities
│       ├── lib/
│       │   └── utils.ts                  # cn() — Tailwind merge helper
│       ├── hooks/
│       │   ├── use-api.ts                # API fetch wrapper (credentials)
│       │   └── use-auth.ts               # Auth context + hooks
│       ├── app/
│       │   ├── layout.tsx                # ⭐ Root layout (fonts, metadata, SEO)
│       │   ├── page.tsx                  # / — Marketing landing page
│       │   ├── cozumler/page.tsx         # /cozumler — 6 modül detayları
│       │   ├── fiyatlandirma/page.tsx    # /fiyatlandirma — Paketler + iletişim
│       │   ├── demo/page.tsx             # /demo — Mini kültür taraması
│       │   ├── blog/                     # /blog — MDX blog yazıları
│       │   ├── auth/
│       │   │   ├── login/page.tsx        # /auth/login — 3 yöntem (email/magic/SSO)
│       │   │   ├── magic-link/           # /auth/magic-link
│       │   │   └── verify/               # /auth/verify — OTP doğrulama
│       │   ├── dashboard/
│       │   │   ├── page.tsx              # /dashboard — Genel bakış
│       │   │   ├── users/page.tsx        # /dashboard/users — Personel yönetimi
│       │   │   └── reports/page.tsx      # /dashboard/reports — Rapor listesi
│       │   └── survey/
│       │       ├── start/page.tsx        # /survey/start?t={token}
│       │       ├── in-progress/page.tsx  # /survey/in-progress — Soru akışı
│       │       └── complete/page.tsx     # /survey/complete — Teşekkür
│       └── components/
│           ├── ui/                       # shadcn/ui bileşenleri
│           ├── layout/
│           │   ├── navbar.tsx            # Sabit navigasyon (blur backdrop)
│           │   └── footer.tsx            # 4 sütun footer
│           ├── marketing/
│           │   ├── hero-section.tsx       # Hero + radar chart + istatistikler
│           │   ├── pain-points.tsx        # 4 acı nokta kartı
│           │   ├── yokak-red-flags.tsx    # YÖKAK eksiklik vurgusu
│           │   ├── solution-steps.tsx     # Ölçün → Anlayın → Dönüştürün
│           │   ├── trust-section.tsx      # Güvenlik, YÖKAK, AI, Danışmanlık
│           │   ├── cta-section.tsx        # Call-to-action
│           │   ├── module-tabs.tsx        # 6 modül sekmeli detay
│           │   ├── package-cards.tsx      # 3 paket kartı
│           │   └── contact-form.tsx       # Teklif talep formu
│           ├── survey/
│           │   └── mini-culture-survey.tsx # 10 soruluk demo tarama
│           ├── charts/
│           │   └── radar-chart.tsx        # D3.js radar chart bileşeni
│           ├── auth/
│           │   └── login-form.tsx         # Giriş formu (3 yöntem)
│           └── dashboard/
│               └── overview.tsx           # İstatistik kartları + kampanya tablosu
│
└── 📦 packages/analytics/                # CVF-QA Analytics — Python (FastAPI)
    ├── README.md
    ├── requirements.txt                  # numpy, pandas, scipy, matplotlib, semopy
    ├── src/
    │   ├── __init__.py
    │   ├── main.py                       # FastAPI app (port 3002)
    │   ├── scoring/
    │   │   ├── __init__.py
    │   │   ├── ocai.py                   # ⭐ OCAI ipsatif skor hesaplama
    │   │   └── likert.py                 # Likert boyut bazlı betimsel istatistik
    │   ├── statistical/
    │   │   └── __init__.py               # Güvenilirlik, FA, SEM, bootstrap CI
    │   ├── visualization/
    │   │   ├── __init__.py
    │   │   └── radar.py                  # Matplotlib radar chart üretimi (PDF için)
    │   └── yokak/
    │       ├── __init__.py
    │       └── evidence_mapper.py        # ⭐ YÖKAK ölçüt-kanıt eşleştirme motoru
    └── tests/
        ├── __init__.py
        └── test_ocai.py                  # OCAI skor testleri
```

---

## Dosya Sayıları

| Paket | Dosya | Açıklama |
|-------|-------|----------|
| Root | 9 | Config, CI/CD, Docker Compose |
| .github | 2 | CI + Deploy workflows |
| shared | 13 | Tipler, sabitler, validasyon, utils |
| api | 30 | Backend server, 8 modül servisi, Prisma, jobs |
| web | 39 | Next.js 12 sayfa + 18 bileşen + hooks |
| analytics | 14 | Python skorlama + analiz + testler |
| docs | 3 | Mimari, güvenlik, API dokümanı |
| infra | 4 | 3 Dockerfile + DB init SQL |
| **TOPLAM** | **115** | |

## Veritabanı Modelleri (Prisma)

| Model | Açıklama |
|-------|----------|
| Organization | Kurum bilgileri, paket tier, ayarlar |
| User | Şifreli kişisel veri (email, isim), RBAC rolleri |
| Department | Birim hiyerarşisi |
| SurveyCampaign | Anket kampanyası yapılandırması |
| SurveyToken | Tek kullanımlık anket tokenları (HMAC-SHA256) |
| SurveyResponse | Anonim yanıt kaydı (kimlik bilgisi YOK) |
| SurveyAnswer | Modül bazlı soru yanıtları (JSON) |
| Assessment360Config | 360° değerlendirme yapılandırması |
| Assessment360Rater | Değerlendirici atamaları (öz/ast/eş/üst) |
| Report | Üretilen rapor meta verisi (şifreli dosya yolu) |
| AuditLog | İmmutable denetim izi (YÖKAK kanıt) |
| ConsentLog | KVKK onay kayıtları |

## Enum Tanımları

`PackageTier` · `UserRole` · `StakeholderGroup` · `AuthMethod` · `CampaignStatus` · `SurveyStatus` · `Assessment360Status` · `Perspective360` · `ReportType`
