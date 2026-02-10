# CVF-QA — Faz 0: Altyapı Kurulum Rehberi

## Ön Gereksinimler

Bilgisayarında şunların kurulu olması gerekiyor:

| Araç | Minimum Versiyon | Kurulum |
|------|-----------------|---------|
| **Node.js** | 20+ | https://nodejs.org |
| **pnpm** | 9+ | `npm install -g pnpm` |
| **Docker Desktop** | 4+ | https://docker.com/products/docker-desktop |
| **Git** | 2+ | https://git-scm.com |
| **Claude Code** | Son sürüm | `npm install -g @anthropic-ai/claude-code` |

---

## Kurulum (5 Adım)

### Adım 1 — Projeyi aç ve Git'i başlat

```bash
# Arşivi aç (indirdiğin .tar.gz)
tar -xzf cvf-qa-monorepo.tar.gz
cd cvf-qa

# Git repo oluştur
git init
git add .
git commit -m "chore: initial project structure — Faz 0"
```

İstersen GitHub'da private repo aç ve push'la:
```bash
# GitHub'da "cvf-qa" adında private repo oluşturduktan sonra:
git remote add origin https://github.com/SENIN-HESABIN/cvf-qa.git
git branch -M main
git push -u origin main
```

### Adım 2 — Docker servislerini başlat

```bash
# Docker Desktop'ın açık olduğundan emin ol, sonra:
docker compose up -d
```

Bu komut 4 servis başlatır:

| Servis | Port | Ne İşe Yarar |
|--------|------|--------------|
| **PostgreSQL 16** | 5432 | Ana veritabanı |
| **Redis 7** | 6379 | Cache, session, rate-limit |
| **MinIO** | 9000, 9001 | Rapor dosya deposu (S3 uyumlu) |
| **Mailpit** | 1025, 8025 | Geliştirme ortamı e-posta test aracı |

Kontrol:
```bash
# Tümü "running" olmalı
docker compose ps

# PostgreSQL hazır mı?
docker exec cvfqa-db pg_isready -U cvfqa
# → accepting connections

# Redis hazır mı?
docker exec cvfqa-redis redis-cli ping
# → PONG
```

### Adım 3 — Bağımlılıkları kur

```bash
pnpm install
```

Bu komut hem `packages/api` hem `packages/web` bağımlılıklarını kurar.

### Adım 4 — Veritabanını hazırla

```bash
# Prisma client üret
cd packages/api
npx prisma generate

# Tabloları oluştur
npx prisma db push

# Kontrol et (tarayıcıda veritabanını gör)
npx prisma studio
# → http://localhost:5555 açılır, tabloları görebilirsin
```

`Ctrl+C` ile Prisma Studio'yu kapat.

```bash
cd ../..
```

### Adım 5 — Servisleri başlat ve test et

İki ayrı terminal aç:

**Terminal 1 — API:**
```bash
pnpm --filter @cvf-qa/api dev
```
→ `🚀 CVF-QA API → http://localhost:3001` mesajını göreceksin

**Terminal 2 — Frontend:**
```bash
pnpm --filter @cvf-qa/web dev
```
→ `ready started server on 0.0.0.0:3000` mesajını göreceksin

### Doğrulama

Tarayıcıda aç:
- **http://localhost:3000** → "Faz 0 Tamamlandı" sayfası görünmeli
- **http://localhost:3001/health** → `{"status":"ok",...}` JSON dönmeli
- **http://localhost:8025** → Mailpit (boş e-posta kutusu)
- **http://localhost:9001** → MinIO Console (user: `cvfqa_minio` / pass: `cvfqa_minio_secret`)

Eğer hepsini görüyorsan: **✅ Faz 0 tamamlandı.**

---

## Sorun Giderme

| Problem | Çözüm |
|---------|-------|
| `docker compose up` hata veriyor | Docker Desktop açık mı? `docker info` ile kontrol et |
| Port 5432 kullanımda | Bilgisayarında zaten PostgreSQL kurulu. `docker compose` port'u değiştir veya yerel PG'yi durdur |
| `pnpm install` hata | `node -v` ile Node 20+ olduğunu kontrol et |
| Prisma `db push` bağlantı hatası | `packages/api/.env` dosyasında DATABASE_URL doğru mu? Docker ayakta mı? |
| API başlamıyor | `packages/api/src/server.ts` içinde syntax hatası olabilir, hata mesajını oku |

---

## Faz 0 Sonrası: Claude Code ile Faz 1'e Başla

Faz 0 tamamlandıktan sonra, proje klasöründe Claude Code'u aç:

```bash
cd cvf-qa
claude
```

Claude Code açılınca, `CLAUDE.md` dosyasını otomatik okuyacak ve proje bağlamını anlayacak. İlk isteğin şu olabilir:

> "Faz 1'e başlayalım. Auth sistemi kur: email + şifre ile giriş, JWT token üretimi, basit login sayfası. Prisma schema'daki User modeli kullanılsın."

Sonrasında adım adım:
1. Auth → Login → Dashboard
2. CSV import → Kullanıcı listesi
3. OCAI anket widget → Soru akışı
4. Yanıt kaydetme → Basit sonuç ekranı

---

## Klasör Yapısı Hatırlatma

```
cvf-qa/
├── CLAUDE.md              ← Claude Code bu dosyayı okur
├── setup.sh               ← Otomatik kurulum scripti
├── .env.local             ← Geliştirme ortam değişkenleri
├── docker-compose.yml     ← PostgreSQL + Redis + MinIO + Mailpit
├── packages/
│   ├── api/               ← Backend (Fastify) — port 3001
│   │   ├── prisma/schema.prisma  ← Veritabanı şeması
│   │   └── src/server.ts         ← API giriş noktası
│   ├── web/               ← Frontend (Next.js) — port 3000
│   │   └── src/app/page.tsx      ← Ana sayfa
│   ├── shared/            ← Ortak tipler ve sabitler
│   └── analytics/         ← Python analiz (Faz 2+)
└── docs/                  ← Teknik dokümanlar
```
