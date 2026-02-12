# CVF-QA Geliştirme Yol Haritası — Faz 2, 3, 4

Bu dosya Claude Code'un sırayla takip edeceği görev listesidir.
Her görev tek başına çalıştırılabilir, önceki görevlere bağımlılıklar belirtilmiştir.
Soru metinleri: data/question-bank.json — hiçbir soru uydurulmayacak.
Tüm UI metinleri Türkçe olacak.

---

## FAZ 2: Likert Modüller + Kampanya + PDF Rapor

### F2-01: Likert Anket Widget (Ortak Bileşen)
- Yeniden kullanılabilir `LikertSurvey` bileşeni oluştur
- Props: questions[], scaleType ("likert5" | "likert7"), moduleCode, onSubmit
- Her soru için yatay radyo butonları (ölçek etiketleri üstte)
- Sayfa başına 5 soru göster, sayfalama + progress bar
- Mobil uyumlu: küçük ekranda ölçek dikey stack
- Konum: packages/web/src/components/survey/likert-survey.tsx

### F2-02: M2 QCI-TR Modülü (30 madde, 5'li Likert)
- Bağımlılık: F2-01
- data/question-bank.json > modules.M2_QCI kullan
- GET /survey/qci/questions — soru setini dön
- Frontend: /survey/qci sayfası — LikertSurvey bileşenini kullan
- POST /survey/submit ile kaydet (moduleCode: "M2_QCI")
- Sonuç: GET /survey/result/:id?module=QCI
- Sonuç ekranı: 6 alt boyut bar chart (ortalama + std sapma)
- Navbar'a "QCI Anket" linki ekle

### F2-03: M4 UWES-TR Modülü (9 madde, 7'li Likert)
- Bağımlılık: F2-01
- data/question-bank.json > modules.M4_UWES kullan
- GET /survey/uwes/questions — soru setini dön
- Frontend: /survey/uwes sayfası — LikertSurvey bileşenini kullan (scaleType: "likert7")
- POST /survey/submit ile kaydet (moduleCode: "M4_UWES")
- Sonuç: 3 alt boyut (Dinçlik, Adanma, Yoğunlaşma) bar chart
- Navbar'a "UWES Anket" linki ekle

### F2-04: M5 PKE Modülü (20 madde, 5'li Likert)
- Bağımlılık: F2-01
- data/question-bank.json > modules.M5_PKE kullan
- GET /survey/pke/questions
- Frontend: /survey/pke
- Sonuç: 5 alt boyut (Bilgilenme, Danışılma, Dahil Olma, İşbirliği, Yetkilendirme) bar chart
- Paydaş katılım merdiveni görseli (5 basamak, skor bazlı renklendirme)

### F2-05: M6 SPU Modülü (15 madde, 5'li Likert)
- Bağımlılık: F2-01
- data/question-bank.json > modules.M6_SPU kullan
- GET /survey/spu/questions
- Frontend: /survey/spu
- Hedef kitle: Sadece yönetim rolü — rol kontrolü ekle
- Sonuç: Strateji-kültür uyum matrisi (S5=Klan, S6=Adhokrasi, S7=Pazar, S8=Hiyerarşi)

### F2-06: Kampanya Yönetimi (Backend)
- POST /campaigns — Yeni kampanya oluştur (ad, açıklama, başlangıç/bitiş tarihi, hedef modüller, hedef paydaş grupları)
- GET /campaigns — Kampanya listesi (org_id filtreli)
- GET /campaigns/:id — Kampanya detayı + istatistikler
- PUT /campaigns/:id — Kampanya güncelle
- POST /campaigns/:id/launch — Kampanyayı başlat:
  * Hedef kullanıcılara benzersiz survey token üret (HMAC-SHA256)
  * SurveyToken tablosuna kaydet (tokenHash, moduleSet, expiresAt, maxUses:1)
  * E-posta kuyruğuna davet gönderimi ekle (BullMQ email queue)
- GET /campaigns/:id/status — Yanıt oranları: toplam davet, tamamlanan, devam eden, başlamamış

### F2-07: Kampanya Yönetimi (Frontend)
- Bağımlılık: F2-06
- /dashboard/campaigns — Kampanya listesi (tablo: ad, tarih, durum, yanıt oranı)
- /dashboard/campaigns/new — Yeni kampanya oluşturma formu:
  * Kampanya adı, açıklama
  * Başlangıç/bitiş tarihi (date picker)
  * Modül seçimi (checkbox: M1-M6)
  * Hedef paydaş grupları (checkbox)
- /dashboard/campaigns/:id — Kampanya detay:
  * Yanıt oranı progress bar
  * Modül bazlı ilerleme
  * Kullanıcı durum tablosu (tamamladı/devam ediyor/başlamadı)
  * "Hatırlatma Gönder" butonu

### F2-08: Token ile Anket Başlatma
- GET /survey/start?t={token} — Token doğrulama endpoint'i:
  * Token hash'ini kontrol et
  * Expire kontrolü
  * maxUses kontrolü
  * Başarılıysa: session oluştur, kampanyanın modül setini dön
- Frontend: /survey/start sayfası:
  * Token query param'dan al
  * KVKK aydınlatma metni + onay checkbox'ı
  * Onay verilince: ConsentLog tablosuna kayıt (timestamp, IP)
  * Demografik form (birim otomatik, kıdem yılı, yaş aralığı — isim sorulmaz)
  * Onaydan sonra ilk modüle yönlendir
- Anket akışı: Modüller sırayla gösterilir, aralarında "mola ekranı"

### F2-09: Auto-Save (Otomatik Kaydetme)
- POST /survey/save endpoint'i — Her 30 saniyede otomatik kayıt
- Frontend: setInterval ile mevcut yanıtları gönder
- Session timeout: 60 dk inaktivite sonrası uyarı modal
- Geri dönüş: Aynı token ile tekrar gelince kaldığı yerden devam
- Rate limit: 120/dk

### F2-10: PDF Rapor Üretimi
- GET /reports/:id/download — PDF rapor endpoint'i
- Puppeteer veya html-pdf ile HTML → PDF dönüşümü
- Rapor içeriği (Kurumsal Rapor — Düzey 1):
  * Kapak sayfası (kurum adı, tarih, kampanya adı)
  * Yönetici özeti (3-5 sayfa)
  * OCAI kültür profili radar chart (mevcut + tercih edilen)
  * Gap analizi tablosu (mevcut - tercih edilen farklar)
  * QCI kalite kültürü boyut skorları bar chart
  * UWES işe bağlılık boyut skorları
  * PKE paydaş katılım merdiveni
  * SPU strateji-kültür uyum matrisi (varsa)
  * Birim karşılaştırma tabloları
  * Demografik dağılım
- Reports tablosuna kaydet (filePathEncrypted, accessTokenHash)
- Dashboard'da "Rapor İndir" butonu

### F2-11: Dashboard İstatistikleri
- GET /analytics/dashboard endpoint'i:
  * Toplam kampanya sayısı
  * Aktif kampanya sayısı
  * Toplam yanıt sayısı
  * Ortalama yanıt oranı (%)
  * Modül bazlı tamamlama oranları
  * Son 7 gün yanıt trendi (günlük)
- /dashboard sayfasını güncelle:
  * Üstte 4 istatistik kartı
  * Yanıt trendi çizgi grafiği
  * Aktif kampanyalar tablosu
  * Son yanıtlar listesi

---

## FAZ 3: 360° Değerlendirme + YÖKAK + Gelişmiş Analiz

### F3-01: M3 MSAI-YÖ 360° Değerlendirme Altyapısı
- MSAI-YÖ: 48 madde, Likert — ama 360° formatında
- Soru bankasına M3 sorularını ekle (question-bank.json'da henüz yok — Cameron & Quinn MSAI'den uyarla)
- 6 boyut × 8 madde = 48 soru
- Boyutlar: Klan Yönetimi, Adhokrasi Yönetimi, Pazar Yönetimi, Hiyerarşi Yönetimi, Kişisel Etkinlik, Kişilerarası Yetkinlik

### F3-02: 360° Değerlendirme İş Akışı (Backend)
- POST /360/config — 360° değerlendirme konfigürasyonu oluştur:
  * Hedef yönetici (userId)
  * Perspektifler: self, subordinate (3-5 ast), peer (2-3 eşdüzey), superior (1 üst)
- POST /360/config/:id/assign-raters — Değerlendirici ata
- Sistem otomatik olarak:
  * Yöneticinin 3-5 astını seçer
  * 2-3 eşdüzey yönetici atar
  * 1 üst yönetici atar
- Her değerlendiriciye ayrı token üretilir
- Assessment360Config + Assessment360Rater tablolarını kullan

### F3-03: 360° Değerlendirme (Frontend)
- /dashboard/360 — 360° konfigürasyon listesi
- /dashboard/360/new — Yeni 360° kurulumu:
  * Yönetici seç
  * Değerlendiricileri ata (otomatik öneri + manuel düzeltme)
  * Başlat butonu
- /survey/360?t={token} — 360° anket doldurma (standart Likert widget)
- Anonimlik: Bireysel yanıtlar ASLA gösterilmez, sadece perspektif ortalamaları

### F3-04: 360° Bireysel Rapor
- GET /reports/360/:configId — 360° rapor
- Rapor içeriği:
  * Öz-değerlendirme vs. diğer perspektifler karşılaştırma radar chart
  * Perspektif bazlı skor tablosu (self / subordinate / peer / superior)
  * Güçlü yönler (en yüksek 5 madde)
  * Gelişim alanları (en düşük 5 madde)
  * Kör nokta analizi (öz-değerlendirme >> diğer veya tam tersi)
- Minimum 3 değerlendirici tamamlamalı (anonimlik garantisi)

### F3-05: YÖKAK Kanıt Dosyası Üretici
- GET /reports/yokak/:campaignId — YÖKAK kanıt tablosu
- YÖKAK ölçüt-modül eşleştirmesi:
  * A.1.4 Misyon-kültür uyumu → M1 OCAI + M2 QCI
  * A.2.3 Liderlik etkinliği → M3 MSAI-YÖ
  * A.3 Kalite güvencesi → M2 QCI
  * A.4.1 Paydaş katılımı → M5 PKE
  * A.5 İnsan kaynakları → M4 UWES
  * A.6 Strateji → M6 SPU
- Çıktı formatı: Her ölçüt için:
  * Kanıt açıklaması
  * Kullanılan modül ve skor
  * Destekleyici grafik referansı
  * Örneklem büyüklüğü ve güvenilirlik (Cronbach alfa)
- PDF formatında indirilebilir

### F3-06: Gap Analizi Motoru
- OCAI mevcut vs. tercih edilen fark hesaplama
- Gap büyüklüğü sınıflandırma:
  * |fark| < 5: Düşük (yeşil)
  * 5 ≤ |fark| < 10: Orta (sarı)
  * |fark| ≥ 10: Yüksek (kırmızı)
- Kültür tipi bazlı değişim yönü: artış mı azalış mı
- Frontend: Gap analizi sayfası (/dashboard/gap-analysis)
  * Fark tablosu (4 kültür tipi × 6 boyut)
  * Oklu görseller (mevcut → tercih yönü)
  * Öncelik sıralama (en büyük gap'ler üstte)

### F3-07: Birim Bazlı Karşılaştırma
- GET /analytics/departments — Birim bazlı OCAI skorları
- Minimum 5 kişi kuralı: 5'ten az yanıt varsa birim raporu üretilmez
- Frontend: /dashboard/departments
  * Birim bazlı radar chart'lar yan yana
  * Birim karşılaştırma tablosu
  * Hiyerarşik gösterim (Fakülte > Bölüm)

### F3-08: Paydaş Grubu Karşılaştırma
- GET /analytics/stakeholders — Paydaş grubu bazlı skorlar
- Gruplar: Akademik, İdari, Öğrenci, Yönetim, Dış Paydaş
- Frontend: /dashboard/stakeholders
  * Grup bazlı radar chart overlay
  * Karşılaştırma tablosu (kültür tipi × paydaş grubu)
  * En büyük algı farkları vurgulama

### F3-09: Betimsel İstatistik Motoru
- Her modül ve boyut için:
  * Ortalama (mean)
  * Standart sapma (std)
  * Medyan
  * Çarpıklık (skewness)
  * Basıklık (kurtosis)
  * Güvenilirlik: Cronbach alfa
  * Yanıt dağılımı histogramı
- packages/analytics Python servisinde hesapla
- GET /analytics/descriptive/:campaignId/:moduleCode

### F3-10: E-posta Sistemi
- BullMQ email worker ile kuyruk tabanlı gönderim
- E-posta tipleri:
  * Anket daveti (token linki ile)
  * Hatırlatma (1., 3., 7., 14. gün)
  * OTP doğrulama kodu
  * Rapor hazır bildirimi
  * 360° değerlendirme daveti
- Mailpit (dev) / Resend (prod) entegrasyonu
- E-posta şablonları: HTML + inline CSS (kurum logosu, Türkçe)

---

## FAZ 4: AI İçgörü + Public Website + Optimizasyon

### F4-01: AI İçgörü Motoru (Claude API)
- Anthropic Claude API entegrasyonu
- POST /analytics/ai-insight/:campaignId
- Claude'a gönderilecek prompt:
  * OCAI skorları (mevcut + tercih + gap)
  * QCI boyut skorları
  * UWES boyut skorları
  * PKE boyut skorları
  * Demografik dağılım
  * Birim karşılaştırma
- Claude'dan beklenen çıktı:
  * Kurumsal kültür profili yorumu (3-5 paragraf)
  * Güçlü yönler (3 madde)
  * Gelişim alanları (3 madde)
  * Stratejik öneriler (5 madde, öncelik sıralı)
  * YÖKAK ölçütleriyle ilişkilendirme
- Sonuçlar reports tablosuna kaydet
- Dashboard'da "AI Analiz Oluştur" butonu

### F4-02: AI Rapor Yorumlama
- PDF rapor üretiminde AI bölümü ekle
- Claude API ile her bölüm için otomatik yorum:
  * OCAI profili ne anlama geliyor?
  * Gap'ler hangi kültürel değişimlere işaret ediyor?
  * Paydaş grupları arasındaki farklar ne gösteriyor?
  * Birim bazlı farklılıklar ne söylüyor?
- Yorumlar Türkçe, akademik dilde ama anlaşılır

### F4-03: Public Website (Marketing)
- packages/web'de public sayfalar (auth gerektirmeyen):
  * / — Landing page:
    - Hero section (radar chart animasyonu)
    - Problem tanımı (YÖKAK eksiklikleri)
    - 6 modül kartları
    - Güvenlik vurguları (token, şifreleme, anonimlik, KVKK)
    - Sayaç animasyonu (kurum sayısı, anket sayısı)
    - CTA: "Demo Talep Et"
  * /cozumler — 6 modül detay sayfaları (sekmeli)
  * /fiyatlandirma — 3 paket kartı (Başlangıç, Profesyonel, Kurumsal)
    - Fiyat YAZILMAYACAK, "İletişime Geçin" butonu
  * /demo — Mini kültür taraması (6 soru, OCAI kısa form)
    - Lead generation: isim, email, kurum adı formu
    - Sonuçta basit radar chart
  * /hakkimizda — Ekip, misyon, referanslar
  * /iletisim — İletişim formu
  * /blog — MDX blog yazıları (SSG)

### F4-04: SEO ve Performans
- Next.js SSG ile statik sayfa üretimi
- Metadata: title, description, og:image her sayfa için
- Sitemap.xml + robots.txt
- Lighthouse 95+ hedef
- Image optimization (next/image)
- Font optimization (DM Sans + Playfair Display)

### F4-05: Tailwind CSS + shadcn/ui Entegrasyonu
- Tailwind CSS kurulumu
- shadcn/ui bileşen kütüphanesi kurulumu
- CVF-QA renk paleti:
  * navy: #0F1D2F
  * accent: #2E86AB
  * gold: #D4A843
  * cream: #FBF9F4
- Tüm mevcut sayfaları Tailwind + shadcn ile yeniden stillendir
- Dark mode desteği (opsiyonel)

### F4-06: RBAC (Rol Tabanlı Erişim) Güçlendirme
- Roller: SUPER_ADMIN, ORG_ADMIN, DEPARTMENT_HEAD, STAFF, STUDENT, EXTERNAL
- Middleware: requireRole(["ORG_ADMIN", "SUPER_ADMIN"])
- Her endpoint için rol kontrolü
- Dashboard menüsü role göre filtreleme
- SPU modülü: Sadece yönetim rolleri erişebilsin

### F4-07: Rate Limiting ve Güvenlik
- Redis tabanlı rate limiting tüm endpoint'lere:
  * AUTH_LOGIN: 5/dk
  * AUTH_MAGIC_LINK: 3/dk
  * SURVEY_SAVE: 120/dk
  * SURVEY_SUBMIT: 5/dk
  * REPORT_DOWNLOAD: 10/dk
  * DASHBOARD: 60/dk
- Helmet security headers
- CSRF token
- Input sanitization (XSS koruması)

### F4-08: Monitoring ve Logging
- Sentry entegrasyonu (hata izleme)
- Pino logger yapılandırması
- Health check endpoint'lerini genişlet:
  * DB bağlantı durumu
  * Redis bağlantı durumu
  * Disk kullanımı
  * Son hata sayısı
- Better Uptime / UptimeRobot entegrasyonu

### F4-09: CI/CD Pipeline
- GitHub Actions:
  * lint-and-typecheck: pnpm lint + typecheck (her PR)
  * test-api: PostgreSQL + Redis services, vitest (her PR)
  * test-analytics: pytest (her PR)
  * build: pnpm build (her PR)
  * deploy-web: Vercel (main branch merge)
  * deploy-api: Railway (main branch merge)

### F4-10: Test Coverage
- API testleri (Vitest):
  * Auth: register, login, JWT validation
  * Survey: OCAI submit, Likert submit, validasyon
  * Campaign: CRUD, launch, status
  * Reports: PDF generation
- Frontend testleri (React Testing Library):
  * OCAI ipsatif widget: 100 puan validasyonu
  * Likert widget: soru navigasyonu
  * Login formu: hata durumları
- Analytics testleri (pytest):
  * OCAI skorlama: balanced profile, dominant culture
  * Likert istatistik: mean, std, Cronbach alfa
- Hedef: %80 coverage

---

## UYGULAMA SIRASI ÖNERİSİ

Claude Code bu dosyayı okuduğunda, görevleri şu sırayla yapmalı:

### Faz 2 (Öncelik: Yüksek — Pilot için gerekli)
1. F2-01 → F2-02 → F2-03 → F2-04 → F2-05 (Likert modüller)
2. F2-06 → F2-07 (Kampanya yönetimi)
3. F2-08 → F2-09 (Token akışı + auto-save)
4. F2-10 → F2-11 (Rapor + dashboard)

### Faz 3 (Öncelik: Orta — Pilot sonrası)
5. F3-01 → F3-02 → F3-03 → F3-04 (360° değerlendirme)
6. F3-05 (YÖKAK kanıt dosyası)
7. F3-06 → F3-07 → F3-08 (Karşılaştırma analizler)
8. F3-09 → F3-10 (İstatistik + e-posta)

### Faz 4 (Öncelik: Düşük — Ürünleştirme)
9. F4-01 → F4-02 (AI içgörü)
10. F4-05 → F4-03 → F4-04 (UI + website + SEO)
11. F4-06 → F4-07 → F4-08 (Güvenlik)
12. F4-09 → F4-10 (CI/CD + test)

---

## NOTLAR

- Her görev tamamlandığında git commit at: `git add -A && git commit -m "feat: F2-01 Likert widget"`
- Soru metinlerini ASLA uydurmayacaksın — data/question-bank.json kullan
- M3 MSAI-YÖ soruları henüz question-bank.json'da yok — F3-01'de eklenecek
- Minimum 5 kişi kuralı: Birim raporlarında 5'ten az yanıt varsa rapor üretilmez
- 360° bireysel yanıtlar ASLA gösterilmez — sadece perspektif ortalamaları
- KVKK onayı olmadan veri toplanamaz
- Her kampanya org_id ile filtrelenir (RLS — Row Level Security)
