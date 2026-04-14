#!/usr/bin/env python3
"""
compute-salaries.py — 从原始数据构建 150城 × 24职业 薪资矩阵

方法论:
  Tier 1 — BLS 直接数据 (美国 21 城): 直接使用 BLS OEWS 年薪中位数
  Tier 2 — Eurostat + ILO 构建 (欧洲 ~25 城): Eurostat ISCO 组均值 × 组内美国比率 × 城市乘数
  Tier 3 — ILO + Numbeo 推算 (其余 ~104 城): 国家级 ISCO 组比率 × Numbeo 城市薪资水平 × 美国组内比率

每个数据点附带:
  - tier: 1/2/3 (数据来源层级)
  - confidence: 0-100 (置信度)
  - sources: 贡献数据源列表

所有输出均为 **税前年薪中位数 (USD)**
"""

import json
import os
import sys
from pathlib import Path
from statistics import median, mean
from collections import defaultdict

ROOT = Path(__file__).resolve().parent.parent.parent.parent
RAW_DIR = ROOT / "data" / "salary-research" / "raw"
OUT_DIR = ROOT / "data" / "salary-research"

# ═══════════════════════════════════════════════════════════════
# Load all raw data sources
# ═══════════════════════════════════════════════════════════════

print("Loading data sources...")

bls_data = json.loads((RAW_DIR / "bls-oews-extracted.json").read_text())["data"]
numbeo_data = json.loads((RAW_DIR / "numbeo-salary-from-cache.json").read_text())["data"]
ilo_ratios = json.loads((RAW_DIR / "ilo-occupation-ratios.json").read_text())
eurostat_raw = json.loads((RAW_DIR / "eurostat-ses-earnings.json").read_text())
cities_source = json.loads((ROOT / "data" / "cities-source.json").read_text())["cities"]
rates_data = json.loads((ROOT / "public" / "data" / "exchange-rates.json").read_text())

print(f"  BLS: {len(bls_data)} records")
print(f"  Numbeo: {len(numbeo_data)} cities")
print(f"  ILO ratios: {len(ilo_ratios)} countries")
print(f"  Cities: {len(cities_source)} cities")

# ═══════════════════════════════════════════════════════════════
# Constants and mappings
# ═══════════════════════════════════════════════════════════════

PROFESSIONS = [
    "软件工程师", "医生/医学博士", "财务分析师", "市场经理", "平面设计师",
    "数据科学家", "销售经理", "人力资源经理", "教师", "护士",
    "律师", "建筑师", "厨师", "记者", "机械工程师",
    "药剂师", "会计师", "产品经理", "UI/UX设计师", "大学教授",
    "牙医", "公交司机", "电工", "政府/NGO行政",
]

# Profession → ISCO-08 major group (1-digit)
PROF_TO_ISCO = {
    "市场经理": 1, "销售经理": 1, "人力资源经理": 1, "产品经理": 1,
    "软件工程师": 2, "医生/医学博士": 2, "财务分析师": 2, "数据科学家": 2,
    "律师": 2, "建筑师": 2, "机械工程师": 2, "药剂师": 2, "会计师": 2,
    "UI/UX设计师": 2, "大学教授": 2, "牙医": 2, "护士": 2, "记者": 2, "教师": 2,
    "平面设计师": 3, "政府/NGO行政": 3,
    "厨师": 5,
    "电工": 7,
    "公交司机": 8,
}

ISCO_GROUP_LABELS = {
    1: "1. Managers", 2: "2. Professionals",
    3: "3. Technicians and associate professionals",
    5: "5. Service and sales workers",
    7: "7. Craft and related trades workers",
    8: "8. Plant and machine operators, and assemblers",
}

# Chinese country name → ILO English name
COUNTRY_EN = {
    "美国": "United States of America", "英国": "United Kingdom of Great Britain and Northern Ireland",
    "日本": "Japan", "中国": "China", "中国香港": "China, Hong Kong SAR",
    "澳大利亚": "Australia", "新加坡": "Singapore", "法国": "France",
    "加拿大": "Canada", "韩国": "Korea, Republic of", "德国": "Germany",
    "瑞士": "Switzerland", "荷兰": "Netherlands", "比利时": "Belgium",
    "奥地利": "Austria", "捷克": "Czech Republic", "波兰": "Poland",
    "葡萄牙": "Portugal", "希腊": "Greece", "土耳其": "Türkiye",
    "墨西哥": "Mexico", "巴西": "Brazil", "泰国": "Thailand",
    "马来西亚": "Malaysia", "越南": "Viet Nam", "印度": "India",
    "肯尼亚": "Kenya", "埃及": "Egypt", "伊朗": "Iran, Islamic Republic of",
    "巴基斯坦": "Pakistan", "印度尼西亚": "Indonesia", "菲律宾": "Philippines",
    "台湾": "Taiwan, China", "阿根廷": "Argentina", "智利": "Chile",
    "哥伦比亚": "Colombia", "秘鲁": "Peru", "南非": "South Africa",
    "阿联酋": "United Arab Emirates", "卡塔尔": "Qatar",
    "巴林": "Bahrain", "沙特阿拉伯": "Saudi Arabia", "阿曼": "Oman",
    "黎巴嫩": "Lebanon", "约旦": "Jordan", "以色列": "Israel",
    "乌克兰": "Ukraine", "罗马尼亚": "Romania", "保加利亚": "Bulgaria",
    "克罗地亚": "Croatia", "塞尔维亚": "Serbia", "匈牙利": "Hungary",
    "斯洛伐克": "Slovakia", "斯洛文尼亚": "Slovenia", "爱尔兰": "Ireland",
    "柬埔寨": "Cambodia", "缅甸": "Myanmar", "孟加拉国": "Bangladesh",
    "斯里兰卡": "Sri Lanka", "尼泊尔": "Nepal", "哈萨克斯坦": "Kazakhstan",
    "乌兹别克斯坦": "Uzbekistan", "阿塞拜疆": "Azerbaijan", "蒙古": "Mongolia",
    "瑞典": "Sweden", "丹麦": "Denmark", "芬兰": "Finland", "挪威": "Norway",
    "格鲁吉亚": "Georgia", "尼日利亚": "Nigeria", "俄罗斯": "Russian Federation",
    "卢森堡": "Luxembourg", "爱沙尼亚": "Estonia", "新西兰": "New Zealand",
    "哥斯达黎加": "Costa Rica", "巴拿马": "Panama", "波多黎各": "Puerto Rico",
    "乌拉圭": "Uruguay", "摩洛哥": "Morocco", "意大利": "Italy",
    "西班牙": "Spain", "爱尔兰": "Ireland",
}

# ═══════════════════════════════════════════════════════════════
# Step 1: Build US profession-within-ISCO-group ratios (benchmark)
# ═══════════════════════════════════════════════════════════════

print("\n─── Step 1: US intra-ISCO-group profession ratios ───")

# Compute US median per profession (across all MSAs)
us_prof_medians = {}
for prof in PROFESSIONS:
    vals = [r["annualMedian"] for r in bls_data if r["profession"] == prof]
    if vals:
        us_prof_medians[prof] = median(vals)

# For each ISCO group, compute the group average and each prof's ratio within it
us_isco_group_avg = {}
us_intra_group_ratio = {}  # prof → ratio within its ISCO group

for isco_grp in set(PROF_TO_ISCO.values()):
    group_profs = [p for p, g in PROF_TO_ISCO.items() if g == isco_grp and p in us_prof_medians]
    if group_profs:
        group_avg = mean([us_prof_medians[p] for p in group_profs])
        us_isco_group_avg[isco_grp] = group_avg
        for p in group_profs:
            us_intra_group_ratio[p] = us_prof_medians[p] / group_avg

print("  US ISCO group averages and intra-group ratios:")
for isco_grp in sorted(us_isco_group_avg.keys()):
    avg = us_isco_group_avg[isco_grp]
    print(f"  ISCO-{isco_grp} ({ISCO_GROUP_LABELS.get(isco_grp, '?')[:30]}): ${avg:,.0f}")
    for p in sorted([p for p, g in PROF_TO_ISCO.items() if g == isco_grp], 
                     key=lambda x: us_intra_group_ratio.get(x, 0), reverse=True):
        if p in us_intra_group_ratio:
            print(f"    {p:18s}: ${us_prof_medians[p]:>9,.0f}  ×{us_intra_group_ratio[p]:.3f}")

# ═══════════════════════════════════════════════════════════════
# Step 2: Build ILO country ISCO group ratios
# ═══════════════════════════════════════════════════════════════

print("\n─── Step 2: ILO country-level ISCO group ratios ───")

def get_ilo_ratio(country_zh, isco_group):
    """Get the ILO ISCO-group-to-total ratio for a country."""
    en = COUNTRY_EN.get(country_zh)
    if not en or en not in ilo_ratios:
        # Try fuzzy match
        for ilo_name in ilo_ratios:
            if en and en.lower() in ilo_name.lower():
                en = ilo_name
                break
        else:
            return None
    
    country_data = ilo_ratios.get(en, {})
    groups = country_data.get("groups", {})
    label = ISCO_GROUP_LABELS.get(isco_group, "")
    
    for grp_name, grp_data in groups.items():
        if grp_name.startswith(str(isco_group)):
            return grp_data.get("ratioToTotal")
    return None

# ═══════════════════════════════════════════════════════════════
# Step 3: Numbeo → city-level salary multipliers
# ═══════════════════════════════════════════════════════════════

print("\n─── Step 3: Build city salary multipliers from Numbeo ───")

# For each country, find the primary/capital city's Numbeo salary
# Then compute each city's multiplier relative to the country primary city
country_cities = defaultdict(list)
for city in cities_source:
    country_cities[city["country"]].append(city)

# Numbeo salaries indexed by city ID
numbeo_salary = {}
for city_id_str, data in numbeo_data.items():
    sal = data.get("netMonthlySalary_USD")
    if sal and sal > 0:
        numbeo_salary[int(city_id_str)] = sal * 12  # Annual

# For each country, find the "reference city" (highest ID = usually capital/largest)
# and compute multipliers
city_multipliers = {}
for country, city_list in country_cities.items():
    # Find reference city: prefer one with Numbeo data
    ref_cities = [(c, numbeo_salary.get(c["id"])) for c in city_list if c["id"] in numbeo_salary]
    if not ref_cities:
        continue
    
    # Use the city with highest Numbeo salary as reference
    ref_cities.sort(key=lambda x: x[1], reverse=True)
    ref_city, ref_salary = ref_cities[0]
    
    # Country average = mean of all cities in that country (from Numbeo)
    all_salaries = [numbeo_salary[c["id"]] for c in city_list if c["id"] in numbeo_salary]
    country_avg = mean(all_salaries) if all_salaries else ref_salary
    
    for city in city_list:
        city_sal = numbeo_salary.get(city["id"])
        if city_sal:
            city_multipliers[city["id"]] = {
                "multiplier": city_sal / country_avg,
                "cityAnnualNetUSD": city_sal,
                "countryAvgNetUSD": country_avg,
                "refCity": ref_city["name"],
            }
        else:
            # No Numbeo data — use 1.0 (country average)
            city_multipliers[city["id"]] = {
                "multiplier": 1.0,
                "cityAnnualNetUSD": None,
                "countryAvgNetUSD": country_avg,
                "refCity": ref_city["name"],
                "note": "No Numbeo data, using country average",
            }

# ═══════════════════════════════════════════════════════════════
# Step 4: Numbeo net → gross conversion factor per country
# ═══════════════════════════════════════════════════════════════

# We need to convert Numbeo's after-tax to pre-tax.
# Use a rough effective tax rate per country from our existing tax data.
# Simple approach: mid-income effective tax rate
# For now, use a heuristic: gross ≈ net / (1 - effective_rate)
# effective_rate estimated from tax brackets at median income level

# Rough effective tax rates at median income (research-based estimates)
EFFECTIVE_TAX_RATE = {
    "美国": 0.24, "英国": 0.25, "日本": 0.20, "中国": 0.12, "中国香港": 0.10,
    "澳大利亚": 0.23, "新加坡": 0.07, "法国": 0.30, "加拿大": 0.22,
    "韩国": 0.15, "德国": 0.30, "瑞士": 0.18, "荷兰": 0.30, "比利时": 0.35,
    "奥地利": 0.28, "捷克": 0.22, "波兰": 0.22, "葡萄牙": 0.25, "希腊": 0.27,
    "土耳其": 0.20, "墨西哥": 0.18, "巴西": 0.20, "泰国": 0.10,
    "马来西亚": 0.12, "越南": 0.12, "印度": 0.15, "肯尼亚": 0.20,
    "埃及": 0.15, "伊朗": 0.10, "巴基斯坦": 0.10, "印度尼西亚": 0.12,
    "菲律宾": 0.15, "台湾": 0.12, "阿根廷": 0.22, "智利": 0.15,
    "哥伦比亚": 0.15, "秘鲁": 0.15, "南非": 0.22, "阿联酋": 0.0,
    "卡塔尔": 0.0, "巴林": 0.0, "沙特阿拉伯": 0.0, "阿曼": 0.0,
    "黎巴嫩": 0.10, "约旦": 0.10, "以色列": 0.25, "乌克兰": 0.18,
    "罗马尼亚": 0.20, "保加利亚": 0.10, "克罗地亚": 0.25, "塞尔维亚": 0.18,
    "匈牙利": 0.15, "斯洛伐克": 0.22, "斯洛文尼亚": 0.28, "爱尔兰": 0.25,
    "柬埔寨": 0.10, "缅甸": 0.08, "孟加拉国": 0.10, "斯里兰卡": 0.12,
    "尼泊尔": 0.10, "哈萨克斯坦": 0.10, "乌兹别克斯坦": 0.12, "阿塞拜疆": 0.14,
    "蒙古": 0.10, "瑞典": 0.32, "丹麦": 0.35, "芬兰": 0.30, "挪威": 0.28,
    "格鲁吉亚": 0.20, "尼日利亚": 0.12, "俄罗斯": 0.13, "卢森堡": 0.28,
    "爱沙尼亚": 0.20, "新西兰": 0.22, "哥斯达黎加": 0.15, "巴拿马": 0.12,
    "波多黎各": 0.20, "乌拉圭": 0.20, "摩洛哥": 0.15, "意大利": 0.30,
    "西班牙": 0.25,
}

# ═══════════════════════════════════════════════════════════════
# Step 5: COMPUTE SALARY MATRIX
# ═══════════════════════════════════════════════════════════════

print("\n─── Step 5: Computing salary matrix ───")

output_matrix = []  # List of {cityId, cityName, country, profession, salary, tier, confidence, sources, notes}

# ── Tier 1: BLS direct data (US cities) ──
print("\n  Tier 1: BLS direct data...")
bls_index = {}  # (cityId, profession) → annualMedian
for r in bls_data:
    key = (r["cityId"], r["profession"])
    if key not in bls_index:
        bls_index[key] = r["annualMedian"]

tier1_count = 0
for city in cities_source:
    if city["country"] not in ("美国", "波多黎各"):
        continue
    for prof in PROFESSIONS:
        bls_val = bls_index.get((city["id"], prof))
        if bls_val:
            output_matrix.append({
                "cityId": city["id"], "cityName": city["name"], "country": city["country"],
                "profession": prof, "annualGrossMedian_USD": round(bls_val),
                "tier": 1, "confidence": 95,
                "sources": ["BLS OEWS May 2024"],
                "notes": f"Direct BLS metro area median. SOC matched.",
            })
            tier1_count += 1
        else:
            # BLS missing for this city-profession combo
            # Use US national median as fallback
            us_median = us_prof_medians.get(prof)
            city_mult = city_multipliers.get(city["id"], {}).get("multiplier", 1.0)
            if us_median:
                estimated = round(us_median * city_mult)
                output_matrix.append({
                    "cityId": city["id"], "cityName": city["name"], "country": city["country"],
                    "profession": prof, "annualGrossMedian_USD": estimated,
                    "tier": 1, "confidence": 75,
                    "sources": ["BLS OEWS May 2024 (US median × city multiplier)"],
                    "notes": f"BLS SOC not available for this MSA. Used US median ${us_median:,.0f} × city_mult {city_mult:.2f}",
                })
                tier1_count += 1

print(f"    {tier1_count} data points")

# ── Tier 2/3: Non-US cities ──
print("\n  Tier 2/3: Non-US cities (ILO ratios + Numbeo levels)...")

tier2_count = 0
tier3_count = 0

for city in cities_source:
    if city["country"] in ("美国", "波多黎各"):
        continue
    
    country = city["country"]
    
    # Get the Numbeo-based gross annual salary for this city
    city_mult_data = city_multipliers.get(city["id"])
    if not city_mult_data or not city_mult_data.get("cityAnnualNetUSD"):
        # No Numbeo data at all — very low confidence
        # Use a rough estimate from neighbors
        numbeo_gross_annual = None
    else:
        net_annual = city_mult_data["cityAnnualNetUSD"]
        tax_rate = EFFECTIVE_TAX_RATE.get(country, 0.20)
        numbeo_gross_annual = net_annual / (1 - tax_rate)
    
    for prof in PROFESSIONS:
        isco_grp = PROF_TO_ISCO.get(prof)
        if not isco_grp:
            continue
        
        # Get country's ILO ISCO group ratio
        ilo_group_ratio = get_ilo_ratio(country, isco_grp)
        
        # Get US intra-group ratio for this profession
        intra_ratio = us_intra_group_ratio.get(prof, 1.0)
        
        estimated = None
        confidence = 0
        sources = []
        notes_parts = []
        tier = 3
        
        if numbeo_gross_annual and ilo_group_ratio:
            # Full estimation: Numbeo base × ILO group ratio × US intra-group ratio
            estimated = round(numbeo_gross_annual * ilo_group_ratio * intra_ratio)
            confidence = 55
            sources = ["Numbeo city salary", "ILO ISCO-08 group ratio", "BLS US intra-group benchmark"]
            notes_parts.append(f"Numbeo gross≈${numbeo_gross_annual:,.0f} × ILO_grp={ilo_group_ratio:.2f} × intra={intra_ratio:.2f}")
            tier = 2 if country in ("英国", "德国", "法国", "日本", "澳大利亚", "加拿大", "韩国", 
                                     "荷兰", "瑞士", "瑞典", "挪威", "丹麦", "芬兰", "新加坡",
                                     "以色列", "意大利", "西班牙", "比利时", "奥地利", "爱尔兰",
                                     "葡萄牙", "捷克", "波兰", "新西兰", "卢森堡", "爱沙尼亚") else 3
            if tier == 2:
                confidence = 65
        
        elif numbeo_gross_annual:
            # Have Numbeo but no ILO group ratio
            # Use US ISCO group proportion as proxy
            us_isco_ratio = us_isco_group_avg.get(isco_grp, 1.0) / mean(list(us_isco_group_avg.values()))
            estimated = round(numbeo_gross_annual * us_isco_ratio * intra_ratio)
            confidence = 40
            sources = ["Numbeo city salary", "BLS US ISCO structure (proxy)"]
            notes_parts.append(f"No ILO data. Used US ISCO structure as proxy.")
            tier = 3
        
        elif ilo_group_ratio:
            # Have ILO but no Numbeo
            # Can't estimate city-level salary without a base
            confidence = 0
            notes_parts.append("No Numbeo base salary for this city")
        
        if estimated and estimated > 0:
            # Sanity bounds: salary shouldn't be < $500/yr or > $500,000/yr
            estimated = max(500, min(500000, estimated))
            
            output_matrix.append({
                "cityId": city["id"], "cityName": city["name"], "country": country,
                "profession": prof, "annualGrossMedian_USD": estimated,
                "tier": tier, "confidence": confidence,
                "sources": sources,
                "notes": "; ".join(notes_parts),
            })
            if tier == 2:
                tier2_count += 1
            else:
                tier3_count += 1

print(f"    Tier 2: {tier2_count} data points")
print(f"    Tier 3: {tier3_count} data points")
print(f"    Total: {len(output_matrix)} data points")

# ═══════════════════════════════════════════════════════════════
# Step 6: Restructure into city × profession matrix
# ═══════════════════════════════════════════════════════════════

print("\n─── Step 6: Quality report ───")

# Build matrix
matrix = {}  # cityId → {profession → entry}
for entry in output_matrix:
    cid = entry["cityId"]
    prof = entry["profession"]
    if cid not in matrix:
        matrix[cid] = {}
    matrix[cid][prof] = entry

# Coverage report
total_expected = len(cities_source) * len(PROFESSIONS)
total_actual = len(output_matrix)
coverage = total_actual / total_expected * 100

print(f"\n  Overall coverage: {total_actual}/{total_expected} ({coverage:.1f}%)")
print(f"  Tier distribution:")
for t in [1, 2, 3]:
    count = sum(1 for e in output_matrix if e["tier"] == t)
    pct = count / total_actual * 100
    avg_conf = mean([e["confidence"] for e in output_matrix if e["tier"] == t]) if count else 0
    print(f"    Tier {t}: {count:>5} ({pct:>5.1f}%)  avg confidence: {avg_conf:.0f}")

# Show confidence distribution
print(f"\n  Confidence distribution:")
for lo, hi, label in [(90, 100, "High"), (60, 89, "Medium"), (30, 59, "Low"), (0, 29, "Very low")]:
    count = sum(1 for e in output_matrix if lo <= e["confidence"] <= hi)
    print(f"    {label:10s} ({lo}-{hi}): {count:>5}")

# Cities with worst coverage
print(f"\n  Cities with lowest coverage (bottom 10):")
city_coverage = []
for city in cities_source:
    profs_found = len(matrix.get(city["id"], {}))
    avg_conf = mean([e["confidence"] for e in matrix.get(city["id"], {}).values()]) if profs_found else 0
    city_coverage.append((city["name"], city["id"], city["country"], profs_found, avg_conf))

city_coverage.sort(key=lambda x: (x[3], x[4]))
for name, cid, country, count, conf in city_coverage[:10]:
    print(f"    {name:20s} [{country}]: {count}/24 profs, avg conf={conf:.0f}")

# Sample: compare BLS real vs current data for NYC
print(f"\n  NYC comparison (BLS real vs current cities.json):")
nyc_source = next((c for c in cities_source if c["id"] == 1), None)
if nyc_source:
    for prof in sorted(PROFESSIONS):
        bls_val = matrix.get(1, {}).get(prof, {}).get("annualGrossMedian_USD", 0)
        old_val = nyc_source.get("professions", {}).get(prof, 0)
        diff = ((bls_val / old_val - 1) * 100) if old_val else 0
        flag = "⚠" if abs(diff) > 30 else " "
        print(f"  {flag} {prof:18s}: BLS=${bls_val:>9,}  old=${old_val:>9,}  diff={diff:>+6.1f}%")

# ═══════════════════════════════════════════════════════════════
# Step 7: Save
# ═══════════════════════════════════════════════════════════════

print("\n─── Step 7: Saving ───")

output = {
    "schema": "WhichCity salary estimates — raw computation output",
    "methodology": {
        "tier1": "BLS OEWS May 2024 direct metro-area annual median (pre-tax USD)",
        "tier2": "Numbeo city salary × ILO ISCO group ratio × US intra-group ratio (developed countries)",
        "tier3": "Same as tier2 but for developing countries (lower ILO data quality)",
        "netToGross": "Numbeo after-tax salary converted using country-specific effective tax rates",
        "intraGroupRatio": "Derived from US BLS data: profession salary / ISCO group average within US",
        "confidence": "0-100 score based on data source quality and directness",
    },
    "generatedAt": __import__("time").strftime("%Y-%m-%dT%H:%M:%S"),
    "totalDataPoints": len(output_matrix),
    "coverage": f"{total_actual}/{total_expected} ({coverage:.1f}%)",
    "data": output_matrix,
}

out_path = OUT_DIR / "salary-estimates-raw.json"
with open(out_path, "w") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)
print(f"  ✅ {out_path} ({len(output_matrix)} data points)")

# Also save a compact matrix form
compact = {}
for entry in output_matrix:
    cid = entry["cityId"]
    if cid not in compact:
        compact[cid] = {
            "cityName": entry["cityName"], "country": entry["country"],
            "professions": {}, "avgConfidence": 0,
        }
    compact[cid]["professions"][entry["profession"]] = {
        "salary": entry["annualGrossMedian_USD"],
        "tier": entry["tier"],
        "conf": entry["confidence"],
    }

for cid, data in compact.items():
    confs = [p["conf"] for p in data["professions"].values()]
    data["avgConfidence"] = round(mean(confs)) if confs else 0

compact_path = OUT_DIR / "salary-matrix-compact.json"
with open(compact_path, "w") as f:
    json.dump(compact, f, indent=2, ensure_ascii=False)
print(f"  ✅ {compact_path} ({len(compact)} cities)")

print("\n  Done!")
