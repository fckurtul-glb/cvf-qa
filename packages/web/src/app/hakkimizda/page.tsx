import type { Metadata } from 'next';
import { Footer } from '@/components/layout/footer';

export const metadata: Metadata = {
  title: 'Hakkımızda',
  description: 'CVF-QA: Cameron & Quinn Rekabetçi Değerler Çerçevesi üzerine inşa edilmiş kurumsal kültür değerlendirme platformu.',
  openGraph: {
    title: 'CVF-QA Hakkımızda',
    description: 'Cameron & Quinn Rekabetçi Değerler Çerçevesi üzerine inşa edilmiş kurumsal kültür değerlendirme platformu.',
  },
};

export default function AboutPage() {
  return (
    <div>
      <section className="bg-primary py-20 pt-28">
        <div className="container mx-auto px-4 text-center">
          <h1 className="mb-4 font-display text-4xl font-bold text-white md:text-5xl">Hakkımızda</h1>
          <p className="mx-auto max-w-2xl text-lg text-white/60">
            Yükseköğretim kurumlarının kurumsal kültürünü bilimsel yöntemlerle ölçen ve geliştiren platform.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl space-y-12">
            <div>
              <h2 className="mb-4 font-display text-2xl font-bold text-foreground">Misyonumuz</h2>
              <p className="leading-relaxed text-muted-foreground">
                Türkiye yükseköğretim kurumlarının kurumsal kültürünü bilimsel, ölçülebilir ve karşılaştırılabilir
                yöntemlerle değerlendirmek; YÖKAK akreditasyon süreçlerini veri odaklı kanıtlarla desteklemek.
              </p>
            </div>

            <div>
              <h2 className="mb-4 font-display text-2xl font-bold text-foreground">Vizyonumuz</h2>
              <p className="leading-relaxed text-muted-foreground">
                Yükseköğretim ekosisteminde kültür değerlendirme ve kalite güvencesi alanında referans platform
                olmak; kurumların stratejik gelişimlerini veriye dayalı içgörülerle hızlandırmak.
              </p>
            </div>

            <div>
              <h2 className="mb-4 font-display text-2xl font-bold text-foreground">Teorik Temel</h2>
              <p className="leading-relaxed text-muted-foreground">
                CVF-QA, Cameron & Quinn tarafından geliştirilen Rekabetçi Değerler Çerçevesi (Competing Values Framework)
                üzerine inşa edilmiştir. Bu model, kurumsal kültürü dört temel boyutta analiz eder: Klan (işbirlikçi),
                Adhokrasi (yenilikçi), Pazar (rekabetçi) ve Hiyerarşi (kontrol odaklı). Platformumuz bu çerçeveyi
                Türkiye yükseköğretim ekosistemine özgü 6 bilimsel ölçekle genişletmektedir.
              </p>
            </div>

            <div className="rounded-xl bg-icy/20 p-8">
              <h2 className="mb-4 font-display text-2xl font-bold text-foreground">4 Kültür Tipi</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-white p-4 shadow-sm">
                  <div className="mb-2 h-1 w-12 rounded-full bg-frosted" />
                  <h3 className="font-semibold text-foreground">Klan Kültürü</h3>
                  <p className="text-sm text-muted-foreground">İşbirliği, mentorluk, takım çalışması ve katılım odaklı.</p>
                </div>
                <div className="rounded-lg bg-white p-4 shadow-sm">
                  <div className="mb-2 h-1 w-12 rounded-full bg-accent" />
                  <h3 className="font-semibold text-foreground">Adhokrasi Kültürü</h3>
                  <p className="text-sm text-muted-foreground">Yenilikçilik, girişimcilik, risk alma ve yaratıcılık odaklı.</p>
                </div>
                <div className="rounded-lg bg-white p-4 shadow-sm">
                  <div className="mb-2 h-1 w-12 rounded-full bg-secondary" />
                  <h3 className="font-semibold text-foreground">Pazar Kültürü</h3>
                  <p className="text-sm text-muted-foreground">Rekabet, sonuç odaklılık, hedef gerçekleştirme ve verimlilik.</p>
                </div>
                <div className="rounded-lg bg-white p-4 shadow-sm">
                  <div className="mb-2 h-1 w-12 rounded-full bg-primary" />
                  <h3 className="font-semibold text-foreground">Hiyerarşi Kültürü</h3>
                  <p className="text-sm text-muted-foreground">Yapı, kontrol, düzen, verimlilik ve istikrar odaklı.</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="mb-4 font-display text-2xl font-bold text-foreground">Ekibimiz</h2>
              <p className="leading-relaxed text-muted-foreground">
                CVF-QA ekibi, yükseköğretim yönetimi, örgüt psikolojisi ve yazılım mühendisliği alanlarında
                deneyimli uzmanlardan oluşmaktadır. Akademik danışma kurulumuz, ölçeklerin geçerlilik ve
                güvenilirlik çalışmalarını sürdürmektedir.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
