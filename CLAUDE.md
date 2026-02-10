# CLAUDE.md — CVF-QA Proje Talimatları

## Proje Nedir?
CVF-QA, yükseköğretim kurumları için kurumsal kültür değerlendirme ve YÖKAK akreditasyon destek platformudur. Türkçe bir projedir, tüm UI ve kullanıcıya dönük metinler Türkçe, kod ve teknik dokümanlar İngilizce olabilir.

## Monorepo Yapısı
```
packages/shared/   → Ortak tipler, sabitler, validasyon (TypeScript)
packages/api/      → Backend API (Fastify + Prisma + Redis + BullMQ)
packages/web/      → Frontend (Next.js 14 App Router + Tailwind + shadcn/ui)
packages/analytics/ → Analiz motoru (Python FastAPI + numpy + scipy)
```

## Komutlar
```bash
# Geliştirme
pnpm install                    # Bağımlılıkları kur
pnpm dev                        # Tüm servisleri başlat (turbo)
pnpm --filter @cvf-qa/api dev   # Sadece API
pnpm --filter @cvf-qa/web dev   # Sadece frontend

# Veritabanı
pnpm db:generate                # Prisma client üret
pnpm db:migrate                 # Migration çalıştır
pnpm db:seed                    # Demo veri yükle
pnpm db:studio                  # Prisma Studio aç

# Test & Lint
pnpm lint                       # ESLint
pnpm typecheck                  # TypeScript kontrolü
pnpm test                       # Vitest (API) + pytest (analytics)

# Docker (yerel servisler)
docker compose up -d            # PostgreSQL + Redis + MinIO + Mailpit
docker compose down             # Servisleri durdur
```

## Teknoloji Stack
- **Runtime:** Node.js 20+, pnpm 9+
- **Frontend:** Next.js 14 (App Router, SSR/SSG), TypeScript, Tailwind CSS, shadcn/ui, D3.js
- **Backend:** Fastify 4, Prisma ORM, PostgreSQL 16 (RLS), Redis 7, BullMQ
- **Auth:** JWT (access + refresh), Argon2id, TOTP, Magic Link
- **Analytics:** Python 3.12, FastAPI, numpy, scipy, matplotlib
- **AI:** Anthropic Claude API (rapor yorumlama)

## Veritabanı
- Prisma şeması: `packages/api/prisma/schema.prisma`
- 2 mantıksal şema: identity (şifreli kişisel veri) + survey (anonim yanıtlar)
- Row Level Security (RLS) ile kurum izolasyonu
- Kişisel alanlar AES-256 ile column-level encryption

## Güvenlik Kuralları (KESİNLİKLE UYULMALI)
1. Kişisel veriler (email, isim) her zaman şifrelenmiş saklanır
2. Anket yanıtları asla kullanıcı kimliğiyle birlikte sorgulanmaz
3. Survey tokenları tek kullanımlık, HMAC-SHA256 ile hash'lenir
4. Birim bazlı raporlar minimum 5 kişi kuralına tabidir
5. KVKK aydınlatma metni onayı olmadan veri toplanamaz
6. Tüm API endpoint'leri rate limiting'e tabidir

## 6 Modül
| Kod | Ad | Soru | Format |
|-----|----|------|--------|
| M1 | OCAI+ | 24 | İpsatif (100 puan dağıtma) |
| M2 | QCI-TR | 30 | 5'li Likert |
| M3 | MSAI-YÖ | 48 | 360° Likert |
| M4 | UWES-TR | 9 | 7'li Likert |
| M5 | PKE | 20 | 5'li Likert |
| M6 | SPU | 15 | 5'li Likert |

## Geliştirme Önceliği (MVP)
Şu an odak: Faz 1 MVP — OCAI anket motoru çalışır hale gelsin.
1. Auth (basit email+şifre)
2. CSV ile kullanıcı yükleme
3. M1 OCAI ipsatif anket widget'ı
4. Anket doldurma + kaydetme akışı
5. Basit radar chart sonuç ekranı

## Ortam Değişkenleri
`.env.local` dosyasına bakın. Kritik olanlar:
- `DATABASE_URL` — PostgreSQL bağlantısı
- `REDIS_URL` — Redis bağlantısı
- `JWT_SECRET` — Minimum 32 karakter
- `ENCRYPTION_KEY` — 64 hex karakter (AES-256)

## Kodlama Kuralları
- TypeScript strict mode
- Prettier ile format (2 space, single quote, trailing comma)
- Tüm API response'ları `{ success: boolean, data?: T, error?: { code, message } }` formatında
- Türkçe karakter kullanımına dikkat (İ/i, Ş/ş, Ğ/ğ, Ü/ü, Ö/ö, Ç/ç)
