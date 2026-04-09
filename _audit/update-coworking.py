#!/usr/bin/env python3
"""Update coworking composite scores from nomads.com data"""
import json

compiled = json.load(open("_audit/nomad-data-compiled.json"))
supp = json.load(open("_archive/data_sources/nomad-research-supplement-2025.json"))

all_data = {}
for en, d in supp.get("nomads_com_city_data", {}).get("cities", {}).items():
    all_data[en] = d

# Add freshly fetched data
fresh = {
    "London": {"free_wifi": "Bad", "power_grid": "Great"},
    "Tokyo": {"free_wifi": "Bad", "power_grid": "Great"},
    "Singapore": {"free_wifi": "Okay", "power_grid": "Great"},
    "Paris": {"free_wifi": "Okay", "power_grid": "Great"},
    "Berlin": {"free_wifi": "Great", "power_grid": "Great"},
    "Barcelona": {"free_wifi": "Okay", "power_grid": "Great"},
    "Dubai": {"free_wifi": "Okay", "power_grid": "Great"},
    "Karachi": {"free_wifi": "Bad", "power_grid": "Very bad"},
    "Yangon": {"free_wifi": "Good", "power_grid": "Very bad"},
    "Kathmandu": {"free_wifi": "Bad", "power_grid": "Bad"},
    "Lagos": {"free_wifi": "Bad", "power_grid": "Very bad"},
    "Ulaanbaatar": {"free_wifi": "Bad", "power_grid": "Great"},
    "Tehran": {"free_wifi": "Bad", "power_grid": "Great"},
    "Phuket": {"free_wifi": "Bad", "power_grid": "Great"},
    "Ko Samui": {"free_wifi": "Bad", "power_grid": "Great"},
    "Ko Pha Ngan": {"free_wifi": "Bad", "power_grid": "Great"},
    "Porto": {"free_wifi": "Okay", "power_grid": "Great"},
    "Valencia": {"free_wifi": "Good", "power_grid": "Great"},
    "Split": {"free_wifi": "Okay", "power_grid": "Great"},
    "Montevideo": {"free_wifi": "Great", "power_grid": "Great"},
    "Las Palmas": {"free_wifi": "Bad", "power_grid": "Great"},
    "Bansko": {"free_wifi": "Bad", "power_grid": "Great"},
    "Playa del Carmen": {"free_wifi": "Bad", "power_grid": "Great"},
    "Cancun": {"free_wifi": "Great", "power_grid": "Great"},
    "Penang": {"free_wifi": "Great", "power_grid": "Great"},
    "Florianopolis": {"free_wifi": "Bad", "power_grid": "Great"},
    "Siem Reap": {"free_wifi": "Bad", "power_grid": "Great"},
    "Cusco": {"free_wifi": "Bad", "power_grid": "Great"},
    "Chiang Mai": {"free_wifi": "Okay", "power_grid": "Great"},
}
all_data.update(fresh)

rating_map = {"Great": 4, "Good": 3, "Okay": 2, "Bad": 1, "Very bad": 0}
name_map = {"Koh Phangan": "Ko Pha Ngan", "Koh Samui": "Ko Samui", "New York": "New York City"}

for cid, c in compiled["cities"].items():
    en = c["en"]
    nd = all_data.get(en) or all_data.get(name_map.get(en, ""))
    if not nd:
        continue

    free_wifi = nd.get("free_wifi")
    power_grid = nd.get("power_grid")
    fw_score = rating_map.get(free_wifi)
    pg_score = rating_map.get(power_grid)

    inet = nd.get("internet")
    if not inet and isinstance(c.get("internet"), dict):
        inet = c["internet"].get("downloadMbps")
    inet_score = min(4.0, (inet or 0) / 25.0 * 4.0) if inet else None

    parts = []
    total_w = 0
    if inet_score is not None:
        parts.append(inet_score * 0.4)
        total_w += 0.4
    if fw_score is not None:
        parts.append(fw_score * 0.3)
        total_w += 0.3
    if pg_score is not None:
        parts.append(pg_score * 0.3)
        total_w += 0.3

    if parts and total_w > 0:
        composite = sum(parts) / total_w
        c["coworking"] = {
            "compositeScore": round(composite, 2),
            "freeWifiRating": free_wifi,
            "powerGridRating": power_grid,
            "internetMbps": inet,
            "note": "Composite: 40% internet speed + 30% free WiFi + 30% power grid (0-4 scale)",
            "source": "nomads.com",
        }

total = len(compiled["cities"])
has_cw = sum(
    1
    for c in compiled["cities"].values()
    if isinstance(c.get("coworking"), dict) and c["coworking"].get("compositeScore") is not None
)
print(f"Coworking composite: {has_cw}/{total} ({has_cw/total*100:.0f}%)")

scores = sorted(
    [
        c["coworking"]["compositeScore"]
        for c in compiled["cities"].values()
        if isinstance(c.get("coworking"), dict) and c["coworking"].get("compositeScore") is not None
    ]
)
print(f"Range: {scores[0]:.2f} - {scores[-1]:.2f}, Median: {scores[len(scores)//2]:.2f}")

ranked = sorted(
    [
        (c["en"], c["coworking"]["compositeScore"])
        for c in compiled["cities"].values()
        if isinstance(c.get("coworking"), dict) and c["coworking"].get("compositeScore") is not None
    ],
    key=lambda x: x[1],
    reverse=True,
)
print(f'\nTop 5: {", ".join(f"{n}({s:.2f})" for n,s in ranked[:5])}')
print(f'Bottom 5: {", ".join(f"{n}({s:.2f})" for n,s in ranked[-5:])}')

json.dump(compiled, open("_audit/nomad-data-compiled.json", "w"), indent=2, ensure_ascii=False)
print("\nSaved.")
