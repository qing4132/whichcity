#!/usr/bin/env python3
"""
compute-salaries-v2.py — 重新计算薪资矩阵（v2: 四国本地数据 + 公式化置信度）

改进:
  1. 日本/中国/加拿大/澳大利亚使用各国发布的行业/职业统计构建本国比率，不再用美国结构代理
  2. 置信度由明确公式计算，每个分项有据可查
  3. 输出完整审计信息
"""
import json, os, time
from pathlib import Path
from statistics import median, mean
from collections import defaultdict

ROOT = Path(__file__).resolve().parent.parent.parent.parent
RAW = ROOT / "data" / "salary-research" / "raw"
OUT = ROOT / "data" / "salary-research"

# ═══════════════════════════════════════════════════════════════
# Load
# ═══════════════════════════════════════════════════════════════
bls = json.loads((RAW / "bls-oews-extracted.json").read_text())["data"]
numbeo = json.loads((RAW / "numbeo-salary-from-cache.json").read_text())["data"]
ilo = json.loads((RAW / "ilo-occupation-ratios.json").read_text())
country_ratios = json.loads((RAW / "country-specific-ratios.json").read_text())["countries"]
cities_src = json.loads((ROOT / "data" / "cities-source.json").read_text())["cities"]
rates = json.loads((ROOT / "public" / "data" / "exchange-rates.json").read_text())

PROFS = [
    "软件工程师", "医生/医学博士", "财务分析师", "市场经理", "平面设计师",
    "数据科学家", "销售经理", "人力资源经理", "教师", "护士", "律师", "建筑师",
    "厨师", "记者", "机械工程师", "药剂师", "会计师", "产品经理", "UI/UX设计师",
    "大学教授", "牙医", "公交司机", "电工", "政府/NGO行政",
]

PROF_TO_ISCO = {
    "市场经理": 1, "销售经理": 1, "人力资源经理": 1, "产品经理": 1,
    "软件工程师": 2, "医生/医学博士": 2, "财务分析师": 2, "数据科学家": 2,
    "律师": 2, "建筑师": 2, "机械工程师": 2, "药剂师": 2, "会计师": 2,
    "UI/UX设计师": 2, "大学教授": 2, "牙医": 2, "护士": 2, "记者": 2, "教师": 2,
    "平面设计师": 3, "政府/NGO行政": 3, "厨师": 5, "电工": 7, "公交司机": 8,
}

ISCO_LABELS = {1: "Managers", 2: "Professionals", 3: "Technicians", 5: "Service/Sales", 7: "Craft/Trades", 8: "Operators"}

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
    "乌拉圭": "Uruguay", "摩洛哥": "Morocco", "意大利": "Italy", "西班牙": "Spain",
}

# Effective tax rates (for Numbeo net→gross conversion)
TAX_RATES = {
    "美国": 0.24, "英国": 0.25, "日本": 0.20, "中国": 0.12, "中国香港": 0.10,
    "澳大利亚": 0.23, "新加坡": 0.07, "法国": 0.30, "加拿大": 0.22, "韩国": 0.15,
    "德国": 0.30, "瑞士": 0.18, "荷兰": 0.30, "比利时": 0.35, "奥地利": 0.28,
    "捷克": 0.22, "波兰": 0.22, "葡萄牙": 0.25, "希腊": 0.27, "土耳其": 0.20,
    "墨西哥": 0.18, "巴西": 0.20, "泰国": 0.10, "马来西亚": 0.12, "越南": 0.12,
    "印度": 0.15, "肯尼亚": 0.20, "埃及": 0.15, "伊朗": 0.10, "巴基斯坦": 0.10,
    "印度尼西亚": 0.12, "菲律宾": 0.15, "台湾": 0.12, "阿根廷": 0.22,
    "智利": 0.15, "哥伦比亚": 0.15, "秘鲁": 0.15, "南非": 0.22,
    "阿联酋": 0.0, "卡塔尔": 0.0, "巴林": 0.0, "沙特阿拉伯": 0.0, "阿曼": 0.0,
    "黎巴嫩": 0.10, "约旦": 0.10, "以色列": 0.25, "乌克兰": 0.18,
    "罗马尼亚": 0.20, "保加利亚": 0.10, "克罗地亚": 0.25, "塞尔维亚": 0.18,
    "匈牙利": 0.15, "斯洛伐克": 0.22, "斯洛文尼亚": 0.28, "爱尔兰": 0.25,
    "柬埔寨": 0.10, "缅甸": 0.08, "孟加拉国": 0.10, "斯里兰卡": 0.12,
    "尼泊尔": 0.10, "哈萨克斯坦": 0.10, "乌兹别克斯坦": 0.12, "阿塞拜疆": 0.14,
    "蒙古": 0.10, "瑞典": 0.32, "丹麦": 0.35, "芬兰": 0.30, "挪威": 0.28,
    "格鲁吉亚": 0.20, "尼日利亚": 0.12, "俄罗斯": 0.13, "卢森堡": 0.28,
    "爱沙尼亚": 0.20, "新西兰": 0.22, "哥斯达黎加": 0.15, "巴拿马": 0.12,
    "波多黎各": 0.20, "乌拉圭": 0.20, "摩洛哥": 0.15, "意大利": 0.30, "西班牙": 0.25,
}

# Countries with country-specific ratios (from national stats)
# Now covers 80 countries from build-all-country-ratios.py
COUNTRY_RATIO_QUALITY = json.loads((RAW / "country-specific-ratios.json").read_text()).get("dataQuality", {})
COUNTRIES_WITH_LOCAL_RATIOS = {}
for zh_name, en_name in COUNTRY_EN.items():
    for ratio_key in country_ratios:
        if ratio_key == en_name or (en_name and en_name.split(',')[0] in ratio_key):
            COUNTRIES_WITH_LOCAL_RATIOS[zh_name] = ratio_key
            break
# Manual fixes for tricky name matches
COUNTRIES_WITH_LOCAL_RATIOS.update({
    "日本": "Japan", "中国": "China", "加拿大": "Canada", "澳大利亚": "Australia",
    "中国香港": "Hong Kong", "台湾": "Taiwan", "韩国": "South Korea",
    "阿联酋": "UAE", "沙特阿拉伯": "Saudi Arabia", "英国": "United Kingdom",
    "新西兰": "New Zealand", "南非": "South Africa", "捷克": "Czech Republic",
    "波多黎各": "Puerto Rico", "哥斯达黎加": "Costa Rica",
    "斯里兰卡": "Sri Lanka",
})
print(f"  Country ratios loaded: {len(COUNTRIES_WITH_LOCAL_RATIOS)} countries mapped")

# ═══════════════════════════════════════════════════════════════
# Step 1: Build US benchmarks
# ═══════════════════════════════════════════════════════════════
us_prof_med = {}
for p in PROFS:
    vals = [r["annualMedian"] for r in bls if r["profession"] == p]
    if vals: us_prof_med[p] = median(vals)
us_overall = median(list(us_prof_med.values()))

# US intra-ISCO-group ratios
us_isco_avg = {}
us_intra = {}
for grp in set(PROF_TO_ISCO.values()):
    gp = [p for p, g in PROF_TO_ISCO.items() if g == grp and p in us_prof_med]
    if gp:
        avg = mean([us_prof_med[p] for p in gp])
        us_isco_avg[grp] = avg
        for p in gp:
            us_intra[p] = us_prof_med[p] / avg

# BLS city index
bls_idx = {}
for r in bls:
    bls_idx[(r["cityId"], r["profession"])] = r["annualMedian"]

# Numbeo city annual gross
numbeo_gross = {}
for cid_str, nd in numbeo.items():
    cid = int(cid_str)
    sal = nd.get("netMonthlySalary_USD")
    if sal and sal > 0:
        city = next((c for c in cities_src if c["id"] == cid), None)
        if city:
            tax = TAX_RATES.get(city["country"], 0.20)
            numbeo_gross[cid] = sal * 12 / (1 - tax)

# Country average Numbeo gross
country_cities = defaultdict(list)
for c in cities_src:
    country_cities[c["country"]].append(c)

country_avg_gross = {}
for co, cl in country_cities.items():
    vals = [numbeo_gross[c["id"]] for c in cl if c["id"] in numbeo_gross]
    if vals:
        country_avg_gross[co] = mean(vals)

# ═══════════════════════════════════════════════════════════════
# Step 2: ILO group ratios
# ═══════════════════════════════════════════════════════════════
def get_ilo_ratio(country_zh, isco_grp):
    en = COUNTRY_EN.get(country_zh)
    if not en: return None
    cd = ilo.get(en)
    if not cd: return None
    for gname, gdata in cd.get("groups", {}).items():
        if gname.startswith(str(isco_grp)):
            return gdata.get("ratioToTotal")
    return None

# ═══════════════════════════════════════════════════════════════
# Confidence formula (公式化，每个分项可查)
# ═══════════════════════════════════════════════════════════════
# 
# confidence = C_base × C_city × C_prof × C_currency
#
# C_base: 薪资基准线的来源质量 (0-1)
#   1.0  = 官方统计局直接发布的该MSA/该职业薪资中位数 (BLS)
#   0.75 = Numbeo 众包税后薪资（样本量通常>100，转为税前）
#   0.4  = 无Numbeo数据，用同国其他城市平均代替
#
# C_city: 城市粒度 (0-1)
#   1.0  = 薪资数据是该城市/都会区特定的
#   0.8  = 薪资数据是国家级，用 Numbeo 城市间比率调整过
#   0.6  = 薪资数据是国家级，无城市调整
#
# C_prof: 职业分解的精度 (0-1)
#   1.0  = 有该职业的直接统计代码 (如 BLS SOC 15-1252)
#   0.85 = 有该国发布的具体职业数据 (如日本 SE/プログラマー)
#   0.7  = 有该国 ISCO 大类比率 + US 组内结构分解
#   0.55 = ILO ISCO 大类比率（可能过期2-3年）+ US 组内分解
#   0.35 = 无该国 ISCO 数据，完全用 US 结构代理
#
# C_currency: 货币换算可靠性 (0-1)
#   1.0  = 数据本身就是 USD (美国)
#   0.95 = 稳定货币 (EUR/GBP/JPY/CAD/AUD/CHF 等)
#   0.85 = 中等波动 (大部分发展中国家)
#   0.7  = 高波动 (阿根廷/黎巴嫩/伊朗等)
#
# final_confidence = round(C_base × C_city × C_prof × C_currency × 100)

def compute_confidence(base, city, prof, currency):
    return round(base * city * prof * currency * 100)

# ═══════════════════════════════════════════════════════════════
# Step 3: Compute salary matrix
# ═══════════════════════════════════════════════════════════════
print("Computing v2 salary matrix...\n")

results = []

for city in cities_src:
    cid = city["id"]
    co = city["country"]
    
    for prof in PROFS:
        isco = PROF_TO_ISCO[prof]
        salary = None
        tier = 3
        conf_parts = {"base": 0, "city": 0, "prof": 0, "currency": 0}
        sources = []
        notes = []
        
        # ── Path A: BLS direct (US cities) ──
        bls_val = bls_idx.get((cid, prof))
        if bls_val:
            salary = round(bls_val)
            tier = 1
            conf_parts = {"base": 1.0, "city": 1.0, "prof": 1.0, "currency": 1.0}
            sources = ["BLS OEWS May 2024"]
            
        # ── Path B: BLS available for this MSA but missing this SOC ──
        elif co in ("美国", "波多黎各") and cid in {m[0]: m for m in [(k, v) for k, v in bls_idx.keys()]}: # has some BLS data
            us_med = us_prof_med.get(prof)
            # Use Numbeo city multiplier
            city_gross = numbeo_gross.get(cid)
            co_avg = country_avg_gross.get(co)
            if us_med and city_gross and co_avg:
                mult = city_gross / co_avg
                salary = round(us_med * mult)
                tier = 1
                conf_parts = {"base": 1.0, "city": 0.8, "prof": 0.7, "currency": 1.0}
                sources = ["BLS US national median", "Numbeo city multiplier"]
                notes.append(f"SOC not in this MSA; US median × city_mult({mult:.2f})")
        
        # ── Path C: Country with local ratios (JP/CN/CA/AU) ──
        if salary is None and co in COUNTRIES_WITH_LOCAL_RATIOS:
            local_key = COUNTRIES_WITH_LOCAL_RATIOS[co]
            local_ratio = country_ratios.get(local_key, {}).get(prof)
            city_gross = numbeo_gross.get(cid)
            if local_ratio and city_gross:
                salary = round(city_gross * local_ratio)
                tier = 2
                # Confidence depends on data quality of this country's ratios
                quality = COUNTRY_RATIO_QUALITY.get(local_key, "D")
                c_prof = {"A": 0.90, "B": 0.80, "C": 0.65, "D": 0.50}.get(quality, 0.50)
                conf_parts = {"base": 0.75, "city": 1.0, "prof": c_prof, "currency": 0.95}
                sources = [f"{local_key} national stats", "Numbeo city salary"]
                notes.append(f"Numbeo gross=${city_gross:,.0f} × local_ratio({local_ratio:.2f})")
            elif local_ratio and co in country_avg_gross:
                # No city Numbeo, use country average
                salary = round(country_avg_gross[co] * local_ratio)
                tier = 2
                quality = COUNTRY_RATIO_QUALITY.get(local_key, "D")
                c_prof = {"A": 0.90, "B": 0.80, "C": 0.65, "D": 0.50}.get(quality, 0.50)
                conf_parts = {"base": 0.75, "city": 0.6, "prof": c_prof, "currency": 0.95}
                sources = [f"{local_key} national stats", "Numbeo country average"]
                notes.append("No city-level Numbeo data")
        
        # ── Path D: Country with ILO ISCO group data ──
        if salary is None:
            ilo_ratio = get_ilo_ratio(co, isco)
            intra = us_intra.get(prof, 1.0)
            city_gross = numbeo_gross.get(cid)
            
            if city_gross and ilo_ratio:
                salary = round(city_gross * ilo_ratio * intra)
                tier = 2
                conf_parts = {"base": 0.75, "city": 1.0, "prof": 0.55, "currency": 0.95 if co not in ("美国",) else 1.0}
                sources = ["ILO ISCO-08 group ratio", "US intra-group benchmark", "Numbeo city salary"]
                notes.append(f"ILO_grp={ilo_ratio:.2f} × US_intra={intra:.2f}")
            elif city_gross:
                # No ILO, use US ISCO structure as full proxy
                us_ratio = us_prof_med.get(prof, us_overall) / us_overall
                salary = round(city_gross * us_ratio)
                tier = 3
                conf_parts = {"base": 0.75, "city": 1.0, "prof": 0.35, "currency": 0.85}
                sources = ["US occupation structure (proxy)", "Numbeo city salary"]
                notes.append("No ILO data; US structure as proxy")
            elif co in country_avg_gross:
                # No Numbeo for this city, use country average
                co_gross = country_avg_gross[co]
                if ilo_ratio:
                    salary = round(co_gross * ilo_ratio * intra)
                else:
                    us_ratio = us_prof_med.get(prof, us_overall) / us_overall
                    salary = round(co_gross * us_ratio)
                tier = 3
                conf_parts = {"base": 0.4, "city": 0.6, "prof": 0.35 if not ilo_ratio else 0.55, "currency": 0.85}
                sources = ["Numbeo country average (no city data)"]
                notes.append("No Numbeo city data")
        
        # Developing country currency penalty
        if salary and co not in ("美国", "波多黎各"):
            stable_currency = co in ("英国", "日本", "澳大利亚", "加拿大", "瑞士", "新加坡",
                                     "韩国", "新西兰", "中国香港", "台湾", "以色列",
                                     "德国", "法国", "荷兰", "比利时", "奥地利", "芬兰",
                                     "瑞典", "丹麦", "挪威", "爱尔兰", "卢森堡", "意大利",
                                     "西班牙", "葡萄牙", "希腊", "捷克", "波兰",
                                     "爱沙尼亚", "斯洛伐克", "斯洛文尼亚", "克罗地亚",
                                     "匈牙利", "罗马尼亚", "保加利亚")
            high_vol = co in ("缅甸", "柬埔寨", "孟加拉国", "尼泊尔", "尼日利亚",
                             "巴基斯坦", "埃及", "伊朗", "乌兹别克斯坦", "蒙古",
                             "黎巴嫩", "阿根廷")
            if stable_currency:
                conf_parts["currency"] = max(conf_parts["currency"], 0.95)
            elif high_vol:
                conf_parts["currency"] = min(conf_parts["currency"], 0.7)
        
        if salary and salary > 0:
            salary = max(300, min(600000, salary))
            conf = compute_confidence(**conf_parts)
            results.append({
                "cityId": cid, "cityName": city["name"], "country": co,
                "profession": prof, "annualGrossMedian_USD": salary,
                "tier": tier, "confidence": conf, "confidenceParts": conf_parts,
                "sources": sources, "notes": "; ".join(notes) if notes else "",
            })

# ═══════════════════════════════════════════════════════════════
# Report
# ═══════════════════════════════════════════════════════════════
total = len(results)
expected = len(cities_src) * len(PROFS)
print(f"Total: {total}/{expected} ({total/expected*100:.1f}%)")
for t in [1, 2, 3]:
    subset = [r for r in results if r["tier"] == t]
    avg_c = mean([r["confidence"] for r in subset]) if subset else 0
    print(f"  Tier {t}: {len(subset):>5} points, avg conf={avg_c:.0f}")

# Confidence distribution
for lo, hi in [(80, 100), (50, 79), (20, 49), (0, 19)]:
    n = sum(1 for r in results if lo <= r["confidence"] <= hi)
    print(f"  Conf {lo}-{hi}: {n}")

# NYC comparison: new v2 vs old
print("\nNYC v2 vs old data:")
old_nyc = next(c for c in cities_src if c["id"] == 1)
for prof in sorted(PROFS):
    v2 = next((r["annualGrossMedian_USD"] for r in results if r["cityId"] == 1 and r["profession"] == prof), 0)
    old = old_nyc["professions"].get(prof, 0)
    bv = bls_idx.get((1, prof), 0)
    conf = next((r["confidence"] for r in results if r["cityId"] == 1 and r["profession"] == prof), 0)
    print(f"  {prof:18s}: v2=${v2:>9,} conf={conf:>3} old=${old:>9,} BLS=${bv:>9,.0f}")

# Tokyo comparison
print("\nTokyo v2 vs old:")
old_tk = next(c for c in cities_src if c["id"] == 3)
for prof in ["软件工程师", "医生/医学博士", "教师", "厨师", "律师", "大学教授"]:
    v2 = next((r["annualGrossMedian_USD"] for r in results if r["cityId"] == 3 and r["profession"] == prof), 0)
    old = old_tk["professions"].get(prof, 0)
    conf = next((r["confidence"] for r in results if r["cityId"] == 3 and r["profession"] == prof), 0)
    print(f"  {prof:18s}: v2=${v2:>9,} conf={conf:>3} old=${old:>9,}")

# Save
output = {
    "schema": "WhichCity salary estimates v2",
    "confidenceFormula": "confidence = C_base × C_city × C_prof × C_currency × 100. See confidenceParts for breakdown.",
    "confidenceFactors": {
        "C_base": {"1.0": "BLS direct survey", "0.6": "Numbeo crowdsourced (net→gross)", "0.3": "No city Numbeo, country avg"},
        "C_city": {"1.0": "City/MSA specific data", "0.7": "National data × city multiplier", "0.5": "National data, no city adjust"},
        "C_prof": {"1.0": "Direct SOC match", "0.8": "Country-specific occupation data", "0.6": "ILO ISCO + US intra-group", "0.5": "ILO ISCO + US intra (stale data)", "0.3": "US structure proxy"},
        "C_currency": {"1.0": "USD native", "0.9": "Stable currency → USD", "0.8": "Moderate volatility", "0.7": "High volatility (developing)"},
    },
    "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
    "totalDataPoints": total,
    "data": results,
}
with open(OUT / "salary-estimates-v2.json", "w") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)
print(f"\n✅ Saved salary-estimates-v2.json ({total} points)")
