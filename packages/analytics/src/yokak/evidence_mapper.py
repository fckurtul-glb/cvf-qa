"""YÖKAK ölçüt-kanıt eşleştirme motoru"""

YOKAK_MODULE_MAP = {
    "A.1.4": {"modules": ["M2_QCI"], "evidence": "Kalite kültürü envanter sonuçları"},
    "A.2.3": {"modules": ["M3_MSAI"], "evidence": "360° liderlik yetkinlik değerlendirmesi"},
    "A.3.1": {"modules": ["M1_OCAI", "M6_SPU"], "evidence": "Kültür profili ve stratejik plan uyum analizi"},
    "A.4.1": {"modules": ["M5_PKE"], "evidence": "Paydaş katılım endeksi sonuçları"},
    "A.5":   {"modules": ["M4_UWES"], "evidence": "Çalışan bağlılığı ölçüm sonuçları"},
}

def generate_evidence_table(campaign_results: dict) -> list:
    evidence = []
    for criterion, mapping in YOKAK_MODULE_MAP.items():
        evidence.append({
            "criterion": criterion,
            "modules": mapping["modules"],
            "evidence_type": mapping["evidence"],
            "data_available": all(m in campaign_results for m in mapping["modules"]),
        })
    return evidence
