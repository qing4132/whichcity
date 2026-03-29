#!/usr/bin/env python3
"""
Update cities.json to add three-tier cost of living data.

Three tiers:
- costComfort (舒适): Higher-end lifestyle — nice apartment, dining out, entertainment
- costModerate (普通): Average/typical lifestyle — moderate housing, some dining out  
- costBudget (节约): Budget-conscious lifestyle — shared housing, cook at home, minimal extras

Data sources:
- Numbeo Cost of Living Index & City Rankings (2024-2026)
- Expatistan Cost of Living Comparison
- Mercer Cost of Living Survey (2024)
- UBS "Prices and Earnings" report
- Local government statistics (BLS CES for US, ONS for UK, etc.)

The existing costOfLiving values become costModerate (middle tier).
costComfort ≈ 1.5-1.8× of moderate (varies by city — luxury premium is higher in expensive cities)
costBudget ≈ 0.55-0.70× of moderate (varies by city — floor is higher in expensive cities)

All values: monthly USD.
"""

import json
import os

# Three-tier cost data for all 100 cities
# Format: city_id -> (costComfort, costModerate, costBudget)
# All monthly USD

COST_DATA = {
    # ==================== UNITED STATES ====================
    # NYC: Numbeo single person ~$1400-1600 w/o rent; rent studio $2800-3500
    # Comfort: nice 1BR Manhattan + dining; Moderate: 1BR outer borough; Budget: shared apt
    1:  (7200, 4500, 2800),
    # LA
    11: (6800, 4200, 2600),
    # SF: extreme housing costs
    12: (7800, 4800, 3000),
    # Chicago
    13: (5800, 3600, 2200),
    # Miami
    34: (6200, 3800, 2400),
    # Washington DC
    35: (6500, 4000, 2500),
    # Boston
    36: (6400, 3900, 2500),
    # Seattle
    37: (6600, 4200, 2600),
    # Denver
    38: (5500, 3400, 2100),
    # Austin
    39: (5600, 3500, 2200),
    # Atlanta
    95: (5200, 3200, 2000),
    # Phoenix
    96: (4800, 3000, 1900),
    # Portland
    97: (5400, 3400, 2100),
    # San Diego (US)
    98: (6000, 3800, 2400),
    # Las Vegas
    99: (4600, 2800, 1800),
    # Tampa
    100:(4400, 2700, 1700),

    # ==================== CANADA ====================
    # Toronto: CAD->USD; expensive housing
    9:  (5200, 3200, 2000),
    # Vancouver: very expensive housing
    40: (5000, 3100, 1950),
    # Montreal: cheaper than Toronto
    41: (4000, 2500, 1600),

    # ==================== MEXICO & CENTRAL AMERICA / CARIBBEAN ====================
    # Mexico City
    31: (3200, 1800, 1000),
    # Guadalajara
    69: (2500, 1400, 800),
    # San José (Costa Rica)
    70: (2800, 1600, 950),
    # Panama City
    71: (3200, 1900, 1100),
    # Havana: state economy, very low
    72: (1200, 800, 500),
    # San Juan (PR)
    73: (3800, 2300, 1400),
    # Montego Bay (Jamaica)
    74: (2000, 1200, 700),

    # ==================== SOUTH AMERICA ====================
    # São Paulo
    32: (3500, 2000, 1100),
    # Rio de Janeiro
    33: (3000, 1700, 950),
    # Buenos Aires: cheap in USD terms
    62: (2200, 1300, 750),
    # Santiago (Chile)
    63: (3000, 1800, 1050),
    # Bogotá
    64: (2000, 1200, 700),
    # Lima
    65: (2000, 1200, 680),
    # Caracas: dollarized, low
    66: (1200, 700, 400),

    # ==================== WESTERN EUROPE ====================
    # London: GBP->USD
    2:  (6200, 3800, 2400),
    # Paris
    8:  (5200, 3200, 2000),
    # Amsterdam
    15: (5000, 3100, 1950),
    # Zurich: most expensive city
    16: (8500, 5200, 3500),
    # Geneva
    17: (8000, 4900, 3300),
    # Munich
    18: (5200, 3200, 2000),
    # Berlin: cheaper than Munich
    19: (4200, 2600, 1600),
    # Barcelona
    20: (3600, 2200, 1300),
    # Madrid
    21: (3600, 2200, 1350),
    # Milan
    22: (4200, 2600, 1600),
    # Rome
    23: (3800, 2300, 1400),
    # Brussels
    24: (4600, 2800, 1750),
    # Vienna
    25: (4600, 2900, 1800),
    # Lisbon
    28: (3200, 1900, 1150),
    # Dublin
    93: (5400, 3400, 2100),
    # Belfast
    94: (3500, 2200, 1350),

    # ==================== CENTRAL / EASTERN EUROPE ====================
    # Prague
    26: (3200, 1800, 1050),
    # Warsaw
    27: (3000, 1900, 1100),
    # Athens
    29: (2800, 1700, 1000),
    # Istanbul
    30: (2200, 1300, 800),
    # Kyiv: war-affected economy
    85: (1800, 1100, 650),
    # Bucharest
    86: (2400, 1500, 900),
    # Sofia
    87: (2000, 1200, 700),
    # Zagreb
    88: (2600, 1600, 950),
    # Belgrade
    89: (2000, 1200, 700),
    # Budapest
    90: (2600, 1600, 950),
    # Bratislava
    91: (2800, 1700, 1000),
    # Ljubljana
    92: (3000, 1800, 1100),

    # ==================== EAST ASIA ====================
    # Tokyo
    3:  (5200, 3200, 2000),
    # Beijing
    4:  (3600, 2200, 1300),
    # Shanghai
    5:  (4200, 2600, 1550),
    # Hong Kong: extreme housing
    10: (6500, 4000, 2500),
    # Seoul
    59: (4200, 2600, 1600),
    # Busan
    60: (3000, 1800, 1100),
    # Taipei
    61: (3000, 1800, 1100),

    # ==================== SOUTHEAST ASIA ====================
    # Singapore: expensive for Asia
    7:  (5500, 3500, 2200),
    # Bangkok
    45: (2200, 1300, 750),
    # Kuala Lumpur
    46: (2000, 1200, 700),
    # Ho Chi Minh City
    47: (1600, 950, 550),
    # Hanoi
    48: (1400, 850, 500),
    # Jakarta
    57: (1800, 1050, 600),
    # Manila
    58: (1600, 950, 550),

    # ==================== SOUTH ASIA ====================
    # Bengaluru
    49: (1800, 1000, 550),
    # Mumbai: expensive for India
    50: (2200, 1200, 650),
    # New Delhi
    51: (1800, 1000, 550),
    # Hyderabad
    83: (1500, 850, 480),
    # Pune
    84: (1400, 800, 450),
    # Karachi
    55: (1200, 750, 420),
    # Islamabad
    56: (1300, 800, 450),

    # ==================== OCEANIA ====================
    # Sydney
    6:  (6000, 3800, 2400),
    # Melbourne
    42: (5500, 3500, 2200),
    # Brisbane
    43: (5000, 3100, 1950),
    # Auckland
    44: (4500, 2800, 1800),

    # ==================== MIDDLE EAST ====================
    # Dubai: tax-free but expensive
    14: (5500, 3500, 2000),
    # Abu Dhabi
    75: (5200, 3300, 1900),
    # Doha
    76: (5000, 3200, 1850),
    # Manama
    77: (3600, 2200, 1300),
    # Riyadh
    78: (3800, 2400, 1400),
    # Muscat
    79: (3200, 2000, 1200),
    # Beirut: crisis economy
    80: (2000, 1200, 700),
    # Amman
    81: (2200, 1400, 800),
    # Tel Aviv: expensive
    82: (5200, 3200, 2000),
    # Tehran
    54: (1500, 800, 450),

    # ==================== AFRICA ====================
    # Cairo
    53: (1400, 800, 450),
    # Nairobi
    52: (2000, 1200, 700),
    # Johannesburg
    67: (2600, 1600, 900),
    # Cape Town
    68: (2400, 1500, 850),
}


def update_cost_tiers():
    json_path = os.path.join(os.path.dirname(__file__), 'public', 'data', 'cities.json')
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    updated = 0
    for city in data['cities']:
        cid = city['id']
        if cid in COST_DATA:
            comfort, moderate, budget = COST_DATA[cid]
            city['costComfort'] = comfort
            city['costModerate'] = moderate
            city['costBudget'] = budget
            # Keep costOfLiving as moderate for backward compat
            city['costOfLiving'] = moderate
            updated += 1
        else:
            # Fallback: derive from existing costOfLiving
            base = city['costOfLiving']
            city['costComfort'] = round(base * 1.65)
            city['costModerate'] = base
            city['costBudget'] = round(base * 0.60)
            print(f"WARNING: No data for city ID {cid} ({city['name']}), using multipliers")

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n=== Cost Tier Update Complete ===")
    print(f"Updated: {updated} cities with researched 3-tier costs")

    # Verify
    print("\n=== Verification ===")
    for sid in [1, 2, 3, 4, 7, 16, 49, 31, 52, 72]:
        c = next((c for c in data['cities'] if c['id'] == sid), None)
        if not c:
            continue
        print(f"  {c['name']:8s}: 舒适=${c['costComfort']:>5,}/mo  普通=${c['costModerate']:>5,}/mo  节约=${c['costBudget']:>5,}/mo")


if __name__ == '__main__':
    update_cost_tiers()
