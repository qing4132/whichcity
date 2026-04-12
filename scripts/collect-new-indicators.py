#!/usr/bin/env python3
"""
Collect 6 new indicators for WhichCity cities.
Fetches from public APIs and compiles from published data.

Data sources:
1. Out-of-pocket health expenditure % — World Bank SH.XPD.OOPC.CH.ZS
2. Government Effectiveness — World Bank GE.PER.RNK (percentile rank 0-100)
3. WPS Index — Georgetown Institute (manually compiled from 2023/24 report)
4. WJP Rule of Law — World Justice Project 2024 (manually compiled)
5. Freedom on the Net — Freedom House 2024 (manually compiled)
6. MIPEX — Migrant Integration Policy Index 2020 (manually compiled)
"""

import json, urllib.request, os, sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CITIES_PATH = os.path.join(BASE, "public", "data", "cities.json")
OUT_DIR = os.path.join(BASE, "public", "data", "sources")

# Chinese country names → ISO3 codes for World Bank API
COUNTRY_ISO3 = {
    "美国": "USA",
    "中国": "CHN",
    "中国香港": "HKG",
    "日本": "JPN",
    "韩国": "KOR",
    "英国": "GBR",
    "法国": "FRA",
    "德国": "DEU",
    "加拿大": "CAN",
    "澳大利亚": "AUS",
    "印度": "IND",
    "巴西": "BRA",
    "墨西哥": "MEX",
    "俄罗斯": "RUS",
    "新加坡": "SGP",
    "台湾": "TWN",  # WB doesn't have TW, will be null
    "意大利": "ITA",
    "西班牙": "ESP",
    "荷兰": "NLD",
    "瑞士": "CHE",
    "瑞典": "SWE",
    "挪威": "NOR",
    "丹麦": "DNK",
    "芬兰": "FIN",
    "奥地利": "AUT",
    "比利时": "BEL",
    "爱尔兰": "IRL",
    "葡萄牙": "PRT",
    "希腊": "GRC",
    "波兰": "POL",
    "捷克": "CZE",
    "匈牙利": "HUN",
    "罗马尼亚": "ROU",
    "保加利亚": "BGR",
    "克罗地亚": "HRV",
    "塞尔维亚": "SRB",
    "斯洛伐克": "SVK",
    "斯洛文尼亚": "SVN",
    "爱沙尼亚": "EST",
    "卢森堡": "LUX",
    "土耳其": "TUR",
    "以色列": "ISR",
    "阿联酋": "ARE",
    "卡塔尔": "QAT",
    "沙特阿拉伯": "SAU",
    "巴林": "BHR",
    "阿曼": "OMN",
    "约旦": "JOR",
    "埃及": "EGY",
    "南非": "ZAF",
    "肯尼亚": "KEN",
    "尼日利亚": "NGA",
    "新西兰": "NZL",
    "泰国": "THA",
    "越南": "VNM",
    "马来西亚": "MYS",
    "印度尼西亚": "IDN",
    "菲律宾": "PHL",
    "柬埔寨": "KHM",
    "缅甸": "MMR",
    "孟加拉国": "BGD",
    "巴基斯坦": "PAK",
    "斯里兰卡": "LKA",
    "尼泊尔": "NPL",
    "蒙古": "MNG",
    "哈萨克斯坦": "KAZ",
    "乌兹别克斯坦": "UZB",
    "格鲁吉亚": "GEO",
    "阿塞拜疆": "AZE",
    "伊朗": "IRN",
    "乌克兰": "UKR",
    "智利": "CHL",
    "阿根廷": "ARG",
    "哥伦比亚": "COL",
    "秘鲁": "PER",
    "乌拉圭": "URY",
    "哥斯达黎加": "CRI",
    "巴拿马": "PAN",
    "波多黎各": "PRI",  # US territory
    "黎巴嫩": "LBN",
    "马来西亚": "MYS",
}

# English country names matching for various datasets
COUNTRY_EN = {
    "美国": "United States",
    "中国": "China",
    "中国香港": "Hong Kong",
    "日本": "Japan",
    "韩国": "South Korea",
    "英国": "United Kingdom",
    "法国": "France",
    "德国": "Germany",
    "加拿大": "Canada",
    "澳大利亚": "Australia",
    "印度": "India",
    "巴西": "Brazil",
    "墨西哥": "Mexico",
    "俄罗斯": "Russia",
    "新加坡": "Singapore",
    "台湾": "Taiwan",
    "意大利": "Italy",
    "西班牙": "Spain",
    "荷兰": "Netherlands",
    "瑞士": "Switzerland",
    "瑞典": "Sweden",
    "挪威": "Norway",
    "丹麦": "Denmark",
    "芬兰": "Finland",
    "奥地利": "Austria",
    "比利时": "Belgium",
    "爱尔兰": "Ireland",
    "葡萄牙": "Portugal",
    "希腊": "Greece",
    "波兰": "Poland",
    "捷克": "Czech Republic",
    "匈牙利": "Hungary",
    "罗马尼亚": "Romania",
    "保加利亚": "Bulgaria",
    "克罗地亚": "Croatia",
    "塞尔维亚": "Serbia",
    "斯洛伐克": "Slovakia",
    "斯洛文尼亚": "Slovenia",
    "爱沙尼亚": "Estonia",
    "卢森堡": "Luxembourg",
    "土耳其": "Turkey",
    "以色列": "Israel",
    "阿联酋": "United Arab Emirates",
    "卡塔尔": "Qatar",
    "沙特阿拉伯": "Saudi Arabia",
    "巴林": "Bahrain",
    "阿曼": "Oman",
    "约旦": "Jordan",
    "埃及": "Egypt",
    "南非": "South Africa",
    "肯尼亚": "Kenya",
    "尼日利亚": "Nigeria",
    "新西兰": "New Zealand",
    "泰国": "Thailand",
    "越南": "Vietnam",
    "马来西亚": "Malaysia",
    "印度尼西亚": "Indonesia",
    "菲律宾": "Philippines",
    "柬埔寨": "Cambodia",
    "缅甸": "Myanmar",
    "孟加拉国": "Bangladesh",
    "巴基斯坦": "Pakistan",
    "斯里兰卡": "Sri Lanka",
    "尼泊尔": "Nepal",
    "蒙古": "Mongolia",
    "哈萨克斯坦": "Kazakhstan",
    "乌兹别克斯坦": "Uzbekistan",
    "格鲁吉亚": "Georgia",
    "阿塞拜疆": "Azerbaijan",
    "伊朗": "Iran",
    "乌克兰": "Ukraine",
    "智利": "Chile",
    "阿根廷": "Argentina",
    "哥伦比亚": "Colombia",
    "秘鲁": "Peru",
    "乌拉圭": "Uruguay",
    "哥斯达黎加": "Costa Rica",
    "巴拿马": "Panama",
    "波多黎各": "Puerto Rico",
    "黎巴嫩": "Lebanon",
}


def fetch_worldbank(indicator, year_range="2019:2023"):
    """Fetch a World Bank indicator for all countries, return {ISO3: value}."""
    url = f"https://api.worldbank.org/v2/country/all/indicator/{indicator}?date={year_range}&format=json&per_page=2000"
    print(f"  Fetching {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "WhichCity/1.0"})
    resp = urllib.request.urlopen(req, timeout=30)
    data = json.loads(resp.read())
    if len(data) < 2:
        print(f"  WARNING: No data returned for {indicator}")
        return {}
    # Group by country, take most recent non-null value
    by_country = {}
    for item in data[1]:
        iso3 = item["countryiso3code"]
        val = item["value"]
        yr = int(item["date"])
        if val is not None and (iso3 not in by_country or yr > by_country[iso3][1]):
            by_country[iso3] = (val, yr)
    result = {k: round(v[0], 2) for k, v in by_country.items()}
    print(f"  Got {len(result)} countries")
    return result


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    # Load cities
    with open(CITIES_PATH, "r") as f:
        raw = json.load(f)
    cities = raw["cities"]
    countries = sorted(set(c["country"] for c in cities))
    print(f"Cities: {len(cities)}, Countries: {len(countries)}")

    # ── 1. World Bank: Out-of-pocket health expenditure ──
    print("\n[1] Out-of-pocket health expenditure (SH.XPD.OOPC.CH.ZS)")
    oop_data = fetch_worldbank("SH.XPD.OOPC.CH.ZS", "2018:2023")

    # ── 2. World Bank: Government Effectiveness percentile rank ──
    print("\n[2] Government Effectiveness (GE.PER.RNK)")
    ge_data = fetch_worldbank("GE.PER.RNK", "2018:2023")

    # Map to our countries
    oop_by_cn = {}
    ge_by_cn = {}
    for cn in countries:
        iso3 = COUNTRY_ISO3.get(cn)
        if iso3:
            oop_by_cn[cn] = oop_data.get(iso3)
            ge_by_cn[cn] = ge_data.get(iso3)
        else:
            print(f"  WARNING: No ISO3 mapping for {cn}")

    # Print results
    print("\n=== Out-of-pocket % ===")
    for cn in countries:
        v = oop_by_cn.get(cn)
        print(f"  {cn}: {v}")

    print("\n=== Government Effectiveness (percentile rank 0-100) ===")
    for cn in countries:
        v = ge_by_cn.get(cn)
        print(f"  {cn}: {v}")

    # Save intermediate results
    wb_results = {
        "outOfPocketPct": oop_by_cn,
        "govEffectiveness": ge_by_cn,
    }
    wb_path = os.path.join(OUT_DIR, "worldbank-new-2025.json")
    with open(wb_path, "w") as f:
        json.dump(wb_results, f, ensure_ascii=False, indent=2)
    print(f"\nSaved World Bank data to {wb_path}")


if __name__ == "__main__":
    main()
