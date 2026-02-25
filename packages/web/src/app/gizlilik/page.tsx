export default function GizlilikPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Gizlilik Politikası</h1>
          <p className="mb-8 text-sm text-gray-500">Son güncelleme: Şubat 2026</p>
          <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold text-gray-900">Veri Güvenliği</h2>
              <p>CVF-QA platformu, kişisel verilerinizi AES-256 şifrelemesi ile korumaktadır. Anket yanıtları tamamen anonim işlenmekte ve kullanıcı kimliğiyle ilişkilendirilmemektedir.</p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-gray-900">Çerezler</h2>
              <p>Platform, yalnızca teknik işleyiş için zorunlu oturum çerezleri kullanmaktadır. Reklam veya izleme amaçlı üçüncü taraf çerezleri kullanılmamaktadır.</p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-gray-900">Üçüncü Taraf Paylaşımı</h2>
              <p>Kişisel verileriniz; hizmetin yürütülmesi ve yasal zorunluluklar dışında üçüncü taraflarla paylaşılmamaktadır.</p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-gray-900">İletişim</h2>
              <p>Gizlilik politikamıza ilişkin sorularınız için: <a href="mailto:gizlilik@cvf-qa.com.tr" className="text-blue-600 underline">gizlilik@cvf-qa.com.tr</a></p>
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
