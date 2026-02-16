import { Shield, FileCheck, MapPin, Lock, Key, Ticket } from 'lucide-react';

const trustItems = [
  { label: 'AES-256 Şifreleme', icon: Shield },
  { label: 'KVKK Tam Uyum', icon: FileCheck },
  { label: 'Türkiye Hosting', icon: MapPin },
  { label: 'Argon2id Hashing', icon: Lock },
  { label: 'Row Level Security', icon: Key },
  { label: 'Tek Kullanımlık Token', icon: Ticket },
];

const stats = [
  { value: '6 Modül', label: 'Bilimsel Ölçek' },
  { value: '194 Soru', label: 'Toplam Madde' },
  { value: '4 Kültür Tipi', label: 'CVF Çerçevesi' },
];

export function TrustSection() {
  return (
    <section className="border-y bg-icy/30 py-12">
      <div className="container mx-auto px-4">
        <p className="mb-6 text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Güvenlik ve Uyumluluk
        </p>
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-6 md:gap-10">
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground">
                <Icon className="h-5 w-5 text-primary" />
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>
        <div className="mx-auto mt-8 flex max-w-2xl items-center justify-center gap-8 border-t border-border/50 pt-8">
          {stats.map((stat) => (
            <div key={stat.value} className="text-center">
              <div className="text-xl font-bold text-navy">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
