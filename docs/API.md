# API Endpoint Haritası

| Method | Endpoint | Açıklama | Auth | Rate Limit |
|--------|---------|----------|------|-----------|
| POST | /auth/login | E-posta + şifre girişi | Public | 5/dk |
| POST | /auth/magic-link | Magic link gönder | Public | 3/dk |
| POST | /auth/verify-otp | OTP doğrulama | Public | 5/dk |
| POST | /auth/refresh | Token yenileme | Refresh | 10/dk |
| GET | /orgs/:id/users | Kullanıcı listesi | Admin | 30/dk |
| POST | /orgs/:id/users/import | CSV toplu yükleme | Admin | 5/dk |
| POST | /campaigns | Kampanya oluştur | Admin | 10/dk |
| POST | /campaigns/:id/launch | Kampanyayı başlat | Admin | 5/dk |
| GET | /campaigns/:id/status | İlerleme durumu | Admin | 60/dk |
| GET | /survey/start?t={token} | Anket başlat | Token | 10/dk |
| POST | /survey/save | Otomatik kaydetme | Session | 120/dk |
| POST | /survey/submit | Anketi tamamla | Session | 5/dk |
| GET | /reports/:id | Rapor görüntüle | Role | 30/dk |
| GET | /reports/:id/download | PDF indir | Role | 10/dk |
| GET | /analytics/dashboard | Dashboard verisi | Admin | 60/dk |
