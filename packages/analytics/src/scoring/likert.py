import numpy as np

def calculate_likert_scores(answers: list, scale_max: int = 5) -> dict:
    dims = {}
    for a in answers:
        d = a.get("dimension", "unknown")
        dims.setdefault(d, []).append(a.get("value", 0))
    results = {}
    for dim, vals in dims.items():
        arr = np.array(vals, dtype=float)
        results[dim] = {"mean": round(float(arr.mean()), 3), "std": round(float(arr.std(ddof=1)), 3) if len(arr) > 1 else 0, "n": len(arr)}
    return {"dimensions": results}
