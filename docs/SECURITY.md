# Güvenlik Mimarisi

## Şifreleme Katmanları
- **Transit:** TLS 1.3 (tüm trafik)
- **At-Rest:** AES-256 (disk)
- **Column-Level:** pgcrypto AES-256-CBC (PII alanları)
- **Token/Secret:** Argon2id (şifreler), HMAC-SHA256 (tokenlar)
- **Backup:** GPG/AES-256 (günlük yedek)

## Anonimlik Garantisi
- İki ayrı veritabanı şeması: identity_db + survey_db
- Eşleştirme tablosu şifreli, sadece KVKK silme talepleri için
- Birim raporları min. 5 kişi kuralı
- 360° değerlendirme bireysel yanıtlar asla gösterilmez

## KVKK Uyum
- Md. 5: Açık rıza + aydınlatma metni
- Md. 4: Veri minimizasyonu
- Md. 7: Silme hakkı (soft-delete + 30 gün kalıcı)
- Md. 9: Türkiye region hosting
- Md. 12: VERBİS kaydı
