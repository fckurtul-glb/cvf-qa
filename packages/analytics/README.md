# CVF-QA Analytics Engine
# Python 3.12+ / FastAPI

## Kurulum

```bash
cd packages/analytics
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn src.main:app --reload --port 3002
```

## Modüller

- `scoring/` — Modül bazlı skor hesaplama (OCAI ipsatif, Likert betimsel)
- `statistical/` — İstatistiksel analiz (güvenilirlik, FA, SEM, bootstrap)
- `visualization/` — Grafik üretimi (radar chart, gap chart, heatmap)
- `yokak/` — YÖKAK kanıt dosyası üretimi ve eşleştirme
