from src.scoring.ocai import calculate_ocai_profile

def test_balanced():
    ans = [{"A": 25, "B": 25, "C": 25, "D": 25}] * 6
    r = calculate_ocai_profile(ans)
    assert r["profile"]["clan"] == 25.0
    assert r["valid"] is True

def test_dominant():
    ans = [{"A": 40, "B": 20, "C": 20, "D": 20}] * 6
    assert calculate_ocai_profile(ans)["dominant"] == "clan"
