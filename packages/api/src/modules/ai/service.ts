import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config/env';

const client = config.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: config.ANTHROPIC_API_KEY })
  : null;

interface InsightInput {
  orgName: string;
  campaignName: string;
  cultureProfile: { current: Record<string, number>; preferred: Record<string, number> };
  gapAnalysis: Array<{ type: string; current: number; preferred: number; gap: number }>;
  moduleScores: Record<string, Record<string, { mean: number; sd: number }>>;
  responseRate: number;
  departmentComparisons?: Record<string, Record<string, number>>;
}

interface InsightOutput {
  executiveSummary: string;
  cultureInterpretation: string;
  gapPriorities: string;
  recommendations: string[];
  yokakImplications: string;
  riskAreas: string[];
}

class AIInsightService {
  // ── Otomatik Rapor Yorumu Üret ──
  async generateInsights(input: InsightInput): Promise<InsightOutput> {
    if (!client) {
      return this.generateFallbackInsights(input);
    }

    const prompt = this.buildPrompt(input);

    try {
      const response = await client.messages.create({
        model: config.ANTHROPIC_MODEL,
        max_tokens: 4000,
        system: `Sen CVF-QA platformunun uzman analiz asistanısın. Yükseköğretim kurumlarının kurumsal kültür değerlendirme sonuçlarını yorumluyor ve stratejik öneriler üretiyorsun.

Kurallar:
- Türkçe yaz, akademik ama anlaşılır bir dil kullan
- Cameron & Quinn'in Rekabetçi Değerler Çerçevesi (CVF) terminolojisini kullan
- YÖKAK akreditasyon ölçütleriyle bağlantı kur
- Somut, uygulanabilir öneriler ver
- Verilere dayalı yorumla, spekülasyon yapma
- JSON formatında yanıt ver`,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      return this.parseInsightResponse(text);
    } catch (err: any) {
      console.error('AI insight generation failed:', err);
      return this.generateFallbackInsights(input);
    }
  }

  // ── Gap Analizi Öneri Motoru ──
  async generateGapRecommendations(
    gapData: Array<{ type: string; gap: number; direction: string }>,
    orgContext: string
  ): Promise<string[]> {
    if (!client) return this.defaultGapRecommendations(gapData);

    try {
      const response = await client.messages.create({
        model: config.ANTHROPIC_MODEL,
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Aşağıdaki kültür farkı (gap) analizine göre öncelikli aksiyon önerileri üret.

Gap Verileri: ${JSON.stringify(gapData)}
Kurum Bağlamı: ${orgContext}

Her gap için 2-3 somut, uygulanabilir öneri ver. Türkçe yanıtla. JSON array formatında: ["öneri1", "öneri2", ...]`,
        }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
      try {
        return JSON.parse(text.replace(/```json\n?|```/g, '').trim());
      } catch {
        return text.split('\n').filter(Boolean);
      }
    } catch {
      return this.defaultGapRecommendations(gapData);
    }
  }

  // ── 360° Liderlik Geri Bildirim Yorumu ──
  async generate360Feedback(
    managerScores: Record<string, { self: number; subordinate: number; peer: number; superior: number }>
  ): Promise<string> {
    if (!client) return 'AI yorum servisi kullanılamıyor. Skorlar doğrudan incelenebilir.';

    try {
      const response = await client.messages.create({
        model: config.ANTHROPIC_MODEL,
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Aşağıdaki 360° liderlik değerlendirme sonuçlarını yorumla. Kör noktaları (öz değerlendirme ile diğer perspektifler arasındaki farkları) ve güçlü yönleri belirle.

Skorlar: ${JSON.stringify(managerScores)}

Yapıcı, kişisel gelişim odaklı bir yorum yaz. Türkçe, 300 kelime maksimum.`,
        }],
      });

      return response.content[0].type === 'text' ? response.content[0].text : '';
    } catch {
      return 'Otomatik yorum üretilemedi.';
    }
  }

  // ── Private: Prompt Builder ──
  private buildPrompt(input: InsightInput): string {
    return `Aşağıdaki kurumsal kültür değerlendirme sonuçlarını analiz et ve JSON formatında yanıt ver.

KURUM: ${input.orgName}
KAMPANYA: ${input.campaignName}
YANIT ORANI: %${input.responseRate}

KÜLTÜR PROFİLİ (Mevcut):
${Object.entries(input.cultureProfile.current).map(([k, v]) => `  ${k}: ${v}`).join('\n')}

KÜLTÜR PROFİLİ (Tercih Edilen):
${Object.entries(input.cultureProfile.preferred).map(([k, v]) => `  ${k}: ${v}`).join('\n')}

GAP ANALİZİ:
${input.gapAnalysis.map((g) => `  ${g.type}: Mevcut ${g.current} → Tercih ${g.preferred} (Fark: ${g.gap > 0 ? '+' : ''}${g.gap})`).join('\n')}

MODÜL SKORLARI:
${Object.entries(input.moduleScores).map(([mod, dims]) => 
  `  ${mod}:\n${Object.entries(dims).map(([d, s]) => `    ${d}: M=${s.mean}, SD=${s.sd}`).join('\n')}`
).join('\n')}

${input.departmentComparisons ? `BİRİM KARŞILAŞTIRMASI:\n${JSON.stringify(input.departmentComparisons, null, 2)}` : ''}

Yanıtını şu JSON formatında ver:
{
  "executiveSummary": "2-3 cümlelik yönetici özeti",
  "cultureInterpretation": "Mevcut kültür profilinin detaylı yorumu (150 kelime)",
  "gapPriorities": "En kritik değişim alanları ve önceliklendirme",
  "recommendations": ["öneri1", "öneri2", "öneri3", "öneri4", "öneri5"],
  "yokakImplications": "YÖKAK akreditasyonu için çıkarımlar",
  "riskAreas": ["risk1", "risk2", "risk3"]
}`;
  }

  // ── Private: Response Parser ──
  private parseInsightResponse(text: string): InsightOutput {
    try {
      const cleaned = text.replace(/```json\n?|```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return {
        executiveSummary: text.substring(0, 500),
        cultureInterpretation: '',
        gapPriorities: '',
        recommendations: [],
        yokakImplications: '',
        riskAreas: [],
      };
    }
  }

  // ── Fallback (AI kullanılamadığında) ──
  private generateFallbackInsights(input: InsightInput): InsightOutput {
    const dominant = Object.entries(input.cultureProfile.current).sort((a, b) => b[1] - a[1])[0];
    const dominantName = { clan: 'Klan', adhocracy: 'Adhokrasi', market: 'Pazar', hierarchy: 'Hiyerarşi' }[dominant[0]] ?? dominant[0];

    return {
      executiveSummary: `${input.orgName} kurumunda baskın kültür tipi %${dominant[1]} ile ${dominantName}'dir. Yanıt oranı %${input.responseRate} olarak gerçekleşmiştir.`,
      cultureInterpretation: `Kurumun mevcut kültür profili incelendiğinde ${dominantName} kültürünün ön plana çıktığı görülmektedir.`,
      gapPriorities: input.gapAnalysis.length > 0
        ? `En büyük fark ${input.gapAnalysis[0].type} boyutunda (${input.gapAnalysis[0].gap > 0 ? '+' : ''}${input.gapAnalysis[0].gap} puan) gözlenmiştir.`
        : 'Gap analizi verisi yeterli değil.',
      recommendations: [
        'Kültür değişim yönetimi programı başlatılması',
        'Liderlik gelişim programlarının güçlendirilmesi',
        'Paydaş katılım mekanizmalarının sistematize edilmesi',
        'Kalite kültürü farkındalık eğitimleri düzenlenmesi',
        'Periyodik kültür ölçümü ile trend takibi yapılması',
      ],
      yokakImplications: 'Sonuçlar YÖKAK kalite güvence ölçütleri bağlamında detaylı değerlendirilmelidir.',
      riskAreas: ['Düşük yanıt oranı birim bazlı karşılaştırmayı sınırlandırabilir'],
    };
  }

  private defaultGapRecommendations(gapData: Array<{ type: string; gap: number }>): string[] {
    return gapData.map((g) => `${g.type} boyutunda ${Math.abs(g.gap)} puanlık fark kapatılmalıdır.`);
  }
}

export const aiInsightService = new AIInsightService();
