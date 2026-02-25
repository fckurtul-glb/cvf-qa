export default function CerezPolitikasiPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Çerez Politikası</h1>
          <p className="mb-8 text-sm text-gray-500">Son güncelleme: Şubat 2026</p>
          <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold text-gray-900">Kullanılan Çerezler</h2>
              <p>CVF-QA yalnızca aşağıdaki zorunlu çerezleri kullanmaktadır:</p>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">Çerez Adı</th>
                    <th className="border p-2 text-left">Amaç</th>
                    <th className="border p-2 text-left">Süre</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border p-2">cvfqa_session</td>
                    <td className="border p-2">Oturum yönetimi</td>
                    <td className="border p-2">Oturum sonu</td>
                  </tr>
                  <tr>
                    <td className="border p-2">cvfqa_csrf</td>
                    <td className="border p-2">Güvenlik (CSRF koruması)</td>
                    <td className="border p-2">Oturum sonu</td>
                  </tr>
                </tbody>
              </table>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-gray-900">Çerezleri Reddetme</h2>
              <p>Zorunlu çerezler platformun çalışması için gereklidir. Tarayıcı ayarlarından çerezleri devre dışı bırakabilirsiniz; ancak bu durumda platforma erişiminiz kısıtlanabilir.</p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-gray-900">İletişim</h2>
              <p>Çerez politikamıza ilişkin sorularınız için: <a href="mailto:kvkk@cvf-qa.com.tr" className="text-blue-600 underline">kvkk@cvf-qa.com.tr</a></p>
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
