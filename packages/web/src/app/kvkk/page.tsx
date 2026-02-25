export default function KVKKPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">KVKK Aydınlatma Metni</h1>
          <p className="mb-8 text-sm text-gray-500">Son güncelleme: Şubat 2026</p>

          <div className="prose prose-gray max-w-none space-y-8 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold text-gray-900">1. Veri Sorumlusu</h2>
              <p>
                6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu
                sıfatıyla <strong>CVF-QA Kurumsal Kültür Değerlendirme Platformu</strong>
                ("Platform") tarafından kişisel verileriniz aşağıda açıklanan amaçlar
                doğrultusunda işlenmektedir.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">2. İşlenen Kişisel Veriler</h2>
              <ul className="list-disc space-y-1 pl-6">
                <li>Kimlik bilgileri: Ad, soyad</li>
                <li>İletişim bilgileri: E-posta adresi</li>
                <li>Kurumsal bilgiler: Çalıştığınız birim, unvan</li>
                <li>Anket yanıtları: Anonim olarak işlenen değerlendirme verileri</li>
                <li>İşlem güvenliği verileri: Giriş kayıtları, IP adresi</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">3. Kişisel Veri İşleme Amaçları</h2>
              <ul className="list-disc space-y-1 pl-6">
                <li>Kurumsal kültür değerlendirme anketlerinin yürütülmesi</li>
                <li>YÖKAK akreditasyon süreçlerinin desteklenmesi</li>
                <li>Kurum içi analiz ve raporlama hizmetlerinin sunulması</li>
                <li>Platform güvenliği ve teknik işlemlerin yürütülmesi</li>
                <li>Yasal yükümlülüklerin yerine getirilmesi</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">4. Hukuki Dayanaklar</h2>
              <p>Kişisel verileriniz aşağıdaki hukuki dayanaklar çerçevesinde işlenmektedir:</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>KVKK md. 5/2(a): Kanunlarda açıkça öngörülmesi</li>
                <li>KVKK md. 5/2(c): Sözleşmenin kurulması veya ifası</li>
                <li>KVKK md. 5/2(ç): Hukuki yükümlülüğün yerine getirilmesi</li>
                <li>KVKK md. 5/1: Açık rıza (anket katılımı için)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">5. Veri Saklama Süresi</h2>
              <p>
                Kişisel verileriniz, işleme amacının gerektirdiği süre boyunca ve yasal
                zorunluluklar çerçevesinde saklanmaktadır. Anket yanıtları anonim biçimde
                işlenmekte olup kimlik bilgileriyle ilişkilendirilmemektedir.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">6. Veri Aktarımı</h2>
              <p>
                Kişisel verileriniz; yasal zorunluluklar, hizmetin ifası ve teknik altyapı
                gereksinimleri dışında üçüncü taraflarla paylaşılmamaktadır.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">7. Haklarınız (KVKK Md. 11)</h2>
              <p>Kişisel veri sahibi olarak aşağıdaki haklara sahipsiniz:</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
                <li>Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme</li>
                <li>Kişisel verilerinizin işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
                <li>Yurt içinde veya yurt dışında kişisel verilerinizin aktarıldığı üçüncü kişileri bilme</li>
                <li>Kişisel verilerinizin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme</li>
                <li>KVKK'nın 7. maddesi çerçevesinde silinmesini veya yok edilmesini isteme</li>
                <li>İşlenen verilerinizin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme</li>
                <li>Kişisel verilerinizin kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">8. Başvuru Yöntemi</h2>
              <p>
                Haklarınıza ilişkin taleplerinizi{' '}
                <a href="mailto:kvkk@cvf-qa.com.tr" className="text-blue-600 underline">
                  kvkk@cvf-qa.com.tr
                </a>{' '}
                adresine yazılı olarak veya platforma kayıtlı e-posta adresiniz üzerinden
                iletebilirsiniz. Talepleriniz en geç 30 gün içinde sonuçlandırılacaktır.
              </p>
            </section>
          </div>

          <div className="mt-10 border-t pt-6">
            <a href="/" className="text-sm text-blue-600 hover:underline">
              ← Ana Sayfaya Dön
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
