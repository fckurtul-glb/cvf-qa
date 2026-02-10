#!/bin/bash
# ═══════════════════════════════════════════════════
# CVF-QA — Faz 0 Kurulum Scripti
# Kullanım: chmod +x setup.sh && ./setup.sh
# ═══════════════════════════════════════════════════

set -e
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   CVF-QA — Faz 0 Kurulum Başlıyor   ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── 1. Gereksinim Kontrolü ──
echo -e "${YELLOW}[1/7] Gereksinimler kontrol ediliyor...${NC}"

check_cmd() {
  if ! command -v $1 &> /dev/null; then
    echo -e "${RED}  ✗ $1 bulunamadı. Lütfen kurun: $2${NC}"
    exit 1
  else
    echo -e "${GREEN}  ✓ $1 mevcut${NC}"
  fi
}

check_cmd "node" "https://nodejs.org (v20+)"
check_cmd "pnpm" "npm install -g pnpm"
check_cmd "docker" "https://docs.docker.com/get-docker/"
check_cmd "git" "https://git-scm.com"

# Node version check
NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 20 ]; then
  echo -e "${RED}  ✗ Node.js 20+ gerekli, şu an: $(node -v)${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ Node.js $(node -v)${NC}"

# ── 2. Git Repo ──
echo ""
echo -e "${YELLOW}[2/7] Git repo hazırlanıyor...${NC}"

if [ ! -d ".git" ]; then
  git init
  echo -e "${GREEN}  ✓ Git repo oluşturuldu${NC}"
else
  echo -e "${GREEN}  ✓ Git repo zaten mevcut${NC}"
fi

# ── 3. Env dosyası ──
echo ""
echo -e "${YELLOW}[3/7] Ortam değişkenleri kontrol ediliyor...${NC}"

if [ ! -f ".env.local" ]; then
  cp .env.example .env.local
  echo -e "${GREEN}  ✓ .env.local oluşturuldu (.env.example'dan kopyalandı)${NC}"
  echo -e "${YELLOW}  ⚠ Lütfen .env.local dosyasını kontrol edin${NC}"
else
  echo -e "${GREEN}  ✓ .env.local zaten mevcut${NC}"
fi

# ── 4. Docker servisleri ──
echo ""
echo -e "${YELLOW}[4/7] Docker servisleri başlatılıyor...${NC}"

if ! docker info &> /dev/null; then
  echo -e "${RED}  ✗ Docker çalışmıyor. Docker Desktop'ı başlatın.${NC}"
  exit 1
fi

docker compose up -d
echo ""

# PostgreSQL hazır olana kadar bekle
echo -n "  PostgreSQL'in hazır olması bekleniyor"
for i in {1..30}; do
  if docker exec cvfqa-db pg_isready -U cvfqa &> /dev/null; then
    echo ""
    echo -e "${GREEN}  ✓ PostgreSQL hazır${NC}"
    break
  fi
  echo -n "."
  sleep 1
  if [ $i -eq 30 ]; then
    echo ""
    echo -e "${RED}  ✗ PostgreSQL başlatılamadı. 'docker compose logs postgres' ile kontrol edin${NC}"
    exit 1
  fi
done

# Redis kontrolü
if docker exec cvfqa-redis redis-cli ping &> /dev/null; then
  echo -e "${GREEN}  ✓ Redis hazır${NC}"
fi

# ── 5. Bağımlılıkları kur ──
echo ""
echo -e "${YELLOW}[5/7] pnpm bağımlılıkları yükleniyor...${NC}"
pnpm install
echo -e "${GREEN}  ✓ Bağımlılıklar yüklendi${NC}"

# ── 6. Prisma ──
echo ""
echo -e "${YELLOW}[6/7] Veritabanı hazırlanıyor...${NC}"

cd packages/api

# .env dosyasını api paketi için de oluştur (Prisma buraya bakar)
if [ ! -f ".env" ]; then
  echo 'DATABASE_URL="postgresql://cvfqa:cvfqa_dev_2026@localhost:5432/cvfqa?schema=public"' > .env
fi

# Prisma generate + migrate
npx prisma generate
npx prisma migrate dev --name init --create-only 2>/dev/null || true
npx prisma migrate dev --name init 2>/dev/null || npx prisma db push
echo -e "${GREEN}  ✓ Veritabanı tabloları oluşturuldu${NC}"

# Seed
npx tsx src/database/seeds/index.ts 2>/dev/null && echo -e "${GREEN}  ✓ Demo veri yüklendi${NC}" || echo -e "${YELLOW}  ⚠ Seed atlandı (ilk çalıştırmada normal)${NC}"

cd ../..

# ── 7. Durum Raporu ──
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║          ✅  FAZ 0 KURULUM TAMAMLANDI!           ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  Çalışan servisler:"
echo "  ─────────────────────────────────────────────"
echo "  PostgreSQL    → localhost:5432  (user: cvfqa)"
echo "  Redis         → localhost:6379"
echo "  MinIO Console → http://localhost:9001"
echo "  Mailpit       → http://localhost:8025"
echo ""
echo "  Sonraki adımlar:"
echo "  ─────────────────────────────────────────────"
echo "  1. pnpm --filter @cvf-qa/api dev    (API başlat)"
echo "  2. pnpm --filter @cvf-qa/web dev    (Frontend başlat)"
echo "  3. http://localhost:3000             (Tarayıcıda aç)"
echo ""
echo "  Prisma Studio (veritabanı yönetimi):"
echo "  pnpm db:studio → http://localhost:5555"
echo ""
echo "  Docker durdurmak için:"
echo "  docker compose down"
echo ""
