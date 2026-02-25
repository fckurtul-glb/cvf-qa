export default function KullanimKosullariPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Kullanım Koşulları</h1>
          <p className="mb-8 text-sm text-gray-500">Son güncelleme: Şubat 2026</p>
          <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold text-gray-900">Platform Kullanımı</h2>
              <p>CVF-QA platformu, yükseköğretim kurumlarının kurumsal kültür değerlendirmesi ve YÖKAK akreditasyon süreçleri için tasarlanmıştır. Platform yalnızca bu amaçlar doğrultusunda kullanılabilir.</p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-gray-900">Kullanıcı Yükümlülükleri</h2>
              <ul className="list-disc space-y-1 pl-6">
                <li>Platforma erişim bilgilerinizin gizliliğini korumak</li>
                <li>Yanıtlarınızı dürüst ve bağımsız biçimde vermek</li>
                <li>Platform altyapısına zarar verecek faaliyetlerden kaçınmak</li>
                <li>Başkalarının verilerine izinsiz erişim girişiminde bulunmamak</li>
              </ul>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-gray-900">Sorumluluk Sınırlaması</h2>
              <p>Platform, teknik aksaklıklar, veri kaybı veya sonuçların yorumlanmasından doğabilecek zararlardan sorumlu tutulamaz.</p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-gray-900">Uygulanacak Hukuk</h2>
              <p>Bu koşullar Türk hukuku kapsamında yorumlanır. Uyuşmazlıklarda Türk mahkemeleri yetkilidir.</p>
            </section>
          </div>
          <div className="mt-10 border-t pt-6">
            <a href="/" className="text-sm text-blue-600 hover:underline">← Ana Sayfaya Dön</a>
          </div>
        </div>
      </div>
    </div>
  );
}
