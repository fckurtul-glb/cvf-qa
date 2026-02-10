import numpy as np

CULTURE_MAP = {"A": "clan", "B": "adhocracy", "C": "market", "D": "hierarchy"}

def calculate_ocai_profile(answers: list) -> dict:
    n = len(answers) or 1
    profile = {ct: 0.0 for ct in CULTURE_MAP.values()}
    for ans in answers:
        for key, culture in CULTURE_MAP.items():
            profile[culture] += ans.get(key, 0)
    for ct in profile:
        profile[ct] = round(profile[ct] / n, 2)
    dominant = max(profile, key=profile.get)
    return {"profile": profile, "dominant": dominant, "n": n, "valid": abs(sum(profile.values()) - 100) < 0.5}
