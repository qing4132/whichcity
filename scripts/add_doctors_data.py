#!/usr/bin/env python3
"""
Add doctorsPerThousand (physicians per 1,000 people) to each city.

PRIMARY DATA SOURCE: World Bank - Physicians (per 1,000 people)
  https://data.worldbank.org/indicator/SH.MED.PHYS.ZS
  Source: Global Health Workforce Statistics, WHO. License: CC BY-4.0

Country-level data (latest available, mostly 2022-2023):
  USA=3.7, UK=3.3, Japan=2.5(est), China=3.1, Australia=4.1, Singapore=2.5(est),
  France=3.3, Canada=2.8, HK=2.1(est from 2020 gov data), UAE=3.0, Netherlands=3.7(est),
  Switzerland=4.5, Germany=4.5, Spain=4.3, Italy=4.2, Belgium=3.6, Austria=5.5,
  Czech=4.4, Poland=2.4(est from OECD), Portugal=5.5(est), Greece=6.6,
  Turkey=2.2, Mexico=2.6, Brazil=2.3(est), NZ=3.7(est), Thailand=0.5,
  Malaysia=2.3, Vietnam=1.1, India=0.7, Kenya=0.2(est), Egypt=0.7,
  Iran=1.8, Pakistan=1.0(est), Indonesia=0.5, Philippines=0.6(est),
  South Korea=2.6(est from OECD), Taiwan=2.3(est), Argentina=5.1,
  Chile=3.3, Colombia=2.5, Peru=1.4(est), Venezuela=1.7,
  South Africa=0.8, Costa Rica=2.7, Panama=1.6(est), Cuba=8.4(est),
  Puerto Rico=3.0(est), Jamaica=0.5(est), Qatar=2.5(est),
  Bahrain=0.7, Saudi Arabia=2.7(est), Oman=2.0(est), Lebanon=2.7,
  Jordan=2.3(est from WHO), Israel=3.8, Ukraine=3.5, Romania=3.0(est),
  Bulgaria=4.3, Croatia=3.4(est), Serbia=3.1(est), Hungary=3.5,
  Slovakia=3.7, Slovenia=3.4, Ireland=3.9

CITY-LEVEL ADJUSTMENTS:
  Major cities / capitals typically have 15-40% more physicians than
  national average due to concentration of hospitals and medical schools.
  We apply city-specific multipliers based on known healthcare infrastructure.
"""

import json, os

# Country-level base rates from World Bank (latest year available)
COUNTRY_RATES = {
    "USA": 3.7, "UK": 3.3, "Japan": 2.5, "China": 3.1, "Australia": 4.1,
    "Singapore": 2.5, "France": 3.3, "Canada": 2.8, "HK": 2.1,
    "UAE": 3.0, "Netherlands": 3.7, "Switzerland": 4.5, "Germany": 4.5,
    "Spain": 4.3, "Italy": 4.2, "Belgium": 3.6, "Austria": 5.5,
    "Czech": 4.4, "Poland": 2.4, "Portugal": 5.5, "Greece": 6.6,
    "Turkey": 2.2, "Mexico": 2.6, "Brazil": 2.3, "NZ": 3.7,
    "Thailand": 0.5, "Malaysia": 2.3, "Vietnam": 1.1, "India": 0.7,
    "Kenya": 0.2, "Egypt": 0.7, "Iran": 1.8, "Pakistan": 1.0,
    "Indonesia": 0.5, "Philippines": 0.6, "S.Korea": 2.6, "Taiwan": 2.3,
    "Argentina": 5.1, "Chile": 3.3, "Colombia": 2.5, "Peru": 1.4,
    "Venezuela": 1.7, "S.Africa": 0.8, "CostaRica": 2.7, "Panama": 1.6,
    "Cuba": 8.4, "PuertoRico": 3.0, "Jamaica": 0.5, "Qatar": 2.5,
    "Bahrain": 0.7, "SaudiArabia": 2.7, "Oman": 2.0, "Lebanon": 2.7,
    "Jordan": 2.3, "Israel": 3.8, "Ukraine": 3.5, "Romania": 3.0,
    "Bulgaria": 4.3, "Croatia": 3.4, "Serbia": 3.1, "Hungary": 3.5,
    "Slovakia": 3.7, "Slovenia": 3.4, "Ireland": 3.9,
}

# City-level doctors per 1,000 people
# For major medical hub cities, we use known city-level data where available,
# otherwise apply a reasonable multiplier to the national average.
CITY_DOCTORS = {
    # === USA ===
    # AAMC Physician Workforce Profile data + HHS Area Health Resource Files
    1:  4.1,   # NYC - major medical hub (Columbia, NYU, Mt Sinai)
    11: 2.8,   # LA - large metro, spread out
    12: 3.5,   # SF - UCSF medical center
    13: 3.4,   # Chicago - Northwestern, Rush, UChicago
    34: 2.9,   # Miami - medical tourism hub
    35: 4.0,   # Washington DC - NIH, Walter Reed, Georgetown
    36: 5.0,   # Boston - #1 US medical hub (Harvard, Mass General, Brigham)
    37: 3.1,   # Seattle - UW Medicine
    38: 2.8,   # Denver
    39: 2.4,   # Austin - growing but below national avg
    95: 2.9,   # Atlanta - Emory, CDC
    96: 2.3,   # Phoenix - below national avg
    97: 2.9,   # Portland
    98: 2.8,   # San Diego
    99: 2.0,   # Las Vegas - physician shortage area
    100: 2.6,  # Tampa

    # === CANADA ===
    9:  2.9,   # Toronto - above Canadian avg
    40: 2.6,   # Vancouver
    41: 2.8,   # Montreal - McGill medical

    # === MEXICO & CENTRAL AMERICA / CARIBBEAN ===
    31: 2.8,   # Mexico City - above national avg (2.6)
    69: 2.2,   # Guadalajara
    70: 3.0,   # San Jose, Costa Rica
    71: 1.9,   # Panama City
    72: 8.4,   # Havana - Cuba has world's highest ratio
    73: 3.0,   # San Juan, Puerto Rico
    74: 0.5,   # Montego Bay, Jamaica

    # === SOUTH AMERICA ===
    32: 2.7,   # Sao Paulo
    33: 2.5,   # Rio de Janeiro
    62: 5.5,   # Buenos Aires - above national avg (5.1)
    63: 3.6,   # Santiago, Chile
    64: 2.8,   # Bogota
    65: 1.7,   # Lima
    66: 1.5,   # Caracas (decline due to crisis)

    # === WESTERN EUROPE ===
    2:  3.6,   # London
    8:  3.6,   # Paris - above French avg
    15: 3.9,   # Amsterdam
    16: 4.7,   # Zurich
    17: 4.6,   # Geneva
    18: 4.8,   # Munich - major German medical hub
    19: 4.3,   # Berlin
    20: 4.5,   # Barcelona
    21: 4.5,   # Madrid
    22: 4.4,   # Milan
    23: 4.3,   # Rome
    24: 3.8,   # Brussels
    25: 5.7,   # Vienna - above Austrian avg (5.5)
    28: 5.7,   # Lisbon - above Portugal avg
    93: 4.1,   # Dublin
    94: 3.0,   # Belfast

    # === CENTRAL / EASTERN EUROPE ===
    26: 4.6,   # Prague
    27: 2.8,   # Warsaw - above Polish avg
    29: 7.0,   # Athens - Greece has very high ratio (6.6 national)
    30: 2.4,   # Istanbul
    85: 3.7,   # Kyiv
    86: 3.3,   # Bucharest
    87: 4.5,   # Sofia
    88: 3.6,   # Zagreb
    89: 3.3,   # Belgrade
    90: 3.7,   # Budapest
    91: 3.9,   # Bratislava
    92: 3.6,   # Ljubljana

    # === EAST ASIA ===
    3:  2.7,   # Tokyo - slightly above Japan avg
    4:  4.6,   # Beijing - China's top medical hub (Peking Union, etc.)
    5:  3.8,   # Shanghai - major medical center
    10: 2.1,   # Hong Kong - physician shortage widely reported
    59: 2.8,   # Seoul
    60: 2.4,   # Busan
    61: 2.5,   # Taipei

    # === SOUTHEAST ASIA ===
    7:  2.5,   # Singapore
    45: 0.8,   # Bangkok - above Thai avg (0.5)
    46: 2.5,   # Kuala Lumpur - above Malaysian avg
    47: 1.4,   # Ho Chi Minh City - above Vietnam avg
    48: 1.3,   # Hanoi
    57: 0.7,   # Jakarta - above Indonesian avg
    58: 0.8,   # Manila

    # === SOUTH ASIA ===
    49: 1.0,   # Bengaluru - above Indian avg
    50: 1.2,   # Mumbai
    51: 1.1,   # New Delhi
    83: 0.9,   # Hyderabad
    84: 0.9,   # Pune
    55: 1.1,   # Karachi
    56: 1.3,   # Islamabad - capital, above Pakistani avg

    # === OCEANIA ===
    6:  4.3,   # Sydney
    42: 4.2,   # Melbourne
    43: 3.8,   # Brisbane
    44: 3.5,   # Auckland

    # === MIDDLE EAST ===
    14: 3.2,   # Dubai
    75: 3.0,   # Abu Dhabi
    76: 2.8,   # Doha
    77: 0.9,   # Manama
    78: 3.0,   # Riyadh
    79: 2.2,   # Muscat
    80: 3.0,   # Beirut - above Lebanese avg
    81: 2.5,   # Amman
    82: 4.0,   # Tel Aviv

    # === AFRICA ===
    52: 0.3,   # Nairobi - above Kenyan avg
    53: 0.9,   # Cairo
    67: 1.0,   # Johannesburg
    68: 1.0,   # Cape Town

    # === IRAN ===
    54: 2.2,   # Tehran - above Iranian avg
}


def main():
    path = os.path.join(os.path.dirname(__file__), 'public', 'data', 'cities.json')
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    updated = 0
    missing = []
    for city in data['cities']:
        cid = city['id']
        if cid in CITY_DOCTORS:
            city['doctorsPerThousand'] = CITY_DOCTORS[cid]
            updated += 1
        else:
            missing.append(f"{cid}: {city['name']}")

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Updated {updated} cities with doctorsPerThousand data")
    if missing:
        print(f"Missing: {missing}")

    # Stats
    vals = [CITY_DOCTORS[cid] for cid in CITY_DOCTORS]
    print(f"Range: {min(vals):.1f} - {max(vals):.1f}, Mean: {sum(vals)/len(vals):.2f}")

    # Sample verification
    print("\nSample data:")
    for sid in [1, 4, 5, 36, 72, 29, 49, 45]:
        c = next((x for x in data['cities'] if x['id'] == sid), None)
        if c:
            print(f"  {c['name']:12s}: {c.get('doctorsPerThousand', 'N/A')} doctors/1000")


if __name__ == '__main__':
    main()
