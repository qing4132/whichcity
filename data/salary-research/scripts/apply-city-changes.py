#!/usr/bin/env python3
"""
apply-city-changes.py — Delete 7 cities + Add 7 new cities to SOT

Delete: 108(仁川), 139(横滨), 133(圣何塞美国), 134(尔湾), 142(普拉亚德尔卡门), 157(坎昆), 158(巴亚尔塔港)
Add: 162(维尔纽斯), 163(里加), 164(尼科西亚), 165(圣多明各), 166(基多), 167(阿克拉), 168(亚的斯亚贝巴)
"""
import json

SOT = "data/cities-source.json"
d = json.load(open(SOT))
cities = d["cities"]

DELETE_IDS = {108, 139, 133, 134, 142, 157, 158}
before = len(cities)
cities = [c for c in cities if c["id"] not in DELETE_IDS]
print(f"Deleted {before - len(cities)} cities: {DELETE_IDS}")

# ═══════════════════════════════════════════════════════════════
# New cities — all fields are raw data (computed fields handled by export.mjs)
# Sources documented inline
# ═══════════════════════════════════════════════════════════════

NEW_CITIES = [
{
    "id": 162, "name": "维尔纽斯", "country": "立陶宛", "continent": "欧洲",
    "currency": "EUR",
    "description": "立陶宛首都，波罗的海地区科技创新中心。生活成本远低于西欧，拥有全球首个数字游民签证计划。",
    "professions": {
        "软件工程师": 38000, "医生/医学博士": 42000, "财务分析师": 30000,
        "市场经理": 35000, "平面设计师": 22000, "数据科学家": 36000,
        "销售经理": 32000, "人力资源经理": 30000, "教师": 18000,
        "护士": 16000, "律师": 35000, "建筑师": 28000,
        "厨师": 14000, "记者": 18000, "机械工程师": 30000,
        "药剂师": 25000, "会计师": 24000, "产品经理": 35000,
        "UI/UX设计师": 30000, "大学教授": 28000, "牙医": 38000,
        "公交司机": 15000, "电工": 20000, "政府/NGO行政": 22000,
        "数字游民": 85000,
    },
    "costModerate": 1350, "costBudget": 850,
    "bigMacPrice": 4.80, "housePrice": 2800, "monthlyRent": 700,
    "annualWorkHours": 1740, "paidLeaveDays": 20, "internetSpeedMbps": 120,
    "airQuality": 32, "aqiSource": "EPA",
    "doctorsPerThousand": 4.6, "hospitalBedsPerThousand": 6.4,
    "uhcCoverageIndex": 75, "lifeExpectancy": 76.0, "outOfPocketPct": 31.2,
    "numbeoSafetyIndex": 72.0, "homicideRate": 3.5, "gpiScore": 1.83,
    "gallupLawOrder": 72, "wpsIndex": 0.846,
    "pressFreedomScore": 78, "democracyIndex": 7.13,
    "corruptionPerceptionIndex": 61, "govEffectiveness": 72.1,
    "wjpRuleLaw": 0.71, "internetFreedomScore": None, "mipexScore": 37,
    "directFlightCities": 85,
    "timezone": "Europe/Vilnius",
    "climate": {
        "type": "continental", "avgTempC": 6.5, "annualRainMm": 661,
        "sunshineHours": 1780, "summerAvgC": 17.5, "winterAvgC": -4.5, "humidityPct": 78,
        "monthlyHighC": [-2, -1, 4, 12, 18, 21, 23, 22, 17, 10, 4, 0],
        "monthlyLowC": [-8, -7, -3, 2, 7, 11, 13, 12, 8, 3, -1, -5],
        "monthlyRainMm": [40, 33, 38, 42, 55, 68, 75, 72, 60, 55, 50, 48],
    },
},
{
    "id": 163, "name": "里加", "country": "拉脱维亚", "continent": "欧洲",
    "currency": "EUR",
    "description": "拉脱维亚首都，波罗的海明珠。新艺术建筑闻名，IT外包产业发达，生活品质高而成本低。",
    "professions": {
        "软件工程师": 35000, "医生/医学博士": 38000, "财务分析师": 28000,
        "市场经理": 32000, "平面设计师": 20000, "数据科学家": 33000,
        "销售经理": 30000, "人力资源经理": 28000, "教师": 16000,
        "护士": 15000, "律师": 32000, "建筑师": 26000,
        "厨师": 13000, "记者": 16000, "机械工程师": 28000,
        "药剂师": 23000, "会计师": 22000, "产品经理": 32000,
        "UI/UX设计师": 28000, "大学教授": 26000, "牙医": 35000,
        "公交司机": 14000, "电工": 18000, "政府/NGO行政": 20000,
        "数字游民": 85000,
    },
    "costModerate": 1250, "costBudget": 780,
    "bigMacPrice": 4.70, "housePrice": 2400, "monthlyRent": 620,
    "annualWorkHours": 1750, "paidLeaveDays": 20, "internetSpeedMbps": 110,
    "airQuality": 30, "aqiSource": "EPA",
    "doctorsPerThousand": 3.2, "hospitalBedsPerThousand": 5.5,
    "uhcCoverageIndex": 72, "lifeExpectancy": 75.4, "outOfPocketPct": 35.8,
    "numbeoSafetyIndex": 68.0, "homicideRate": 3.8, "gpiScore": 1.87,
    "gallupLawOrder": 70, "wpsIndex": 0.831,
    "pressFreedomScore": 80, "democracyIndex": 7.05,
    "corruptionPerceptionIndex": 59, "govEffectiveness": 70.5,
    "wjpRuleLaw": 0.69, "internetFreedomScore": None, "mipexScore": 37,
    "directFlightCities": 80,
    "timezone": "Europe/Riga",
    "climate": {
        "type": "continental", "avgTempC": 6.0, "annualRainMm": 641,
        "sunshineHours": 1730, "summerAvgC": 17.0, "winterAvgC": -5.0, "humidityPct": 80,
        "monthlyHighC": [-2, -2, 3, 11, 17, 20, 22, 21, 16, 10, 3, 0],
        "monthlyLowC": [-8, -8, -4, 1, 6, 10, 12, 11, 7, 3, -2, -6],
        "monthlyRainMm": [38, 30, 35, 40, 52, 65, 72, 70, 58, 52, 48, 42],
    },
},
{
    "id": 164, "name": "尼科西亚", "country": "塞浦路斯", "continent": "欧洲",
    "currency": "EUR",
    "description": "塞浦路斯首都，欧盟成员国，地中海东部的金融和科技中心。12.5%企业税率吸引大量国际企业。",
    "professions": {
        "软件工程师": 40000, "医生/医学博士": 55000, "财务分析师": 38000,
        "市场经理": 42000, "平面设计师": 24000, "数据科学家": 38000,
        "销售经理": 38000, "人力资源经理": 36000, "教师": 28000,
        "护士": 25000, "律师": 45000, "建筑师": 32000,
        "厨师": 16000, "记者": 22000, "机械工程师": 34000,
        "药剂师": 32000, "会计师": 30000, "产品经理": 40000,
        "UI/UX设计师": 32000, "大学教授": 45000, "牙医": 50000,
        "公交司机": 18000, "电工": 22000, "政府/NGO行政": 30000,
        "数字游民": 85000,
    },
    "costModerate": 1500, "costBudget": 950,
    "bigMacPrice": 4.50, "housePrice": 2200, "monthlyRent": 750,
    "annualWorkHours": 1780, "paidLeaveDays": 20, "internetSpeedMbps": 80,
    "airQuality": 40, "aqiSource": "EPA",
    "doctorsPerThousand": 2.0, "hospitalBedsPerThousand": 3.4,
    "uhcCoverageIndex": 74, "lifeExpectancy": 81.0, "outOfPocketPct": 26.5,
    "numbeoSafetyIndex": 74.0, "homicideRate": 0.8, "gpiScore": 1.87,
    "gallupLawOrder": 75, "wpsIndex": 0.810,
    "pressFreedomScore": 68, "democracyIndex": 7.29,
    "corruptionPerceptionIndex": 52, "govEffectiveness": 68.3,
    "wjpRuleLaw": 0.61, "internetFreedomScore": None, "mipexScore": 40,
    "directFlightCities": 70,
    "timezone": "Asia/Nicosia",
    "climate": {
        "type": "mediterranean", "avgTempC": 19.5, "annualRainMm": 315,
        "sunshineHours": 3400, "summerAvgC": 29.0, "winterAvgC": 10.5, "humidityPct": 55,
        "monthlyHighC": [15, 16, 19, 24, 29, 34, 37, 37, 33, 28, 22, 16],
        "monthlyLowC": [5, 5, 7, 10, 15, 19, 22, 22, 19, 15, 10, 6],
        "monthlyRainMm": [50, 38, 28, 18, 8, 2, 1, 0, 5, 20, 45, 55],
    },
},
{
    "id": 165, "name": "圣多明各", "country": "多米尼加", "continent": "北美洲",
    "currency": "DOP",
    "description": "多米尼加共和国首都，加勒比海地区最大经济体的中心。拥有官方数字游民签证，近年成为远程工作者热门目的地。",
    "professions": {
        "软件工程师": 18000, "医生/医学博士": 25000, "财务分析师": 15000,
        "市场经理": 16000, "平面设计师": 10000, "数据科学家": 17000,
        "销售经理": 14000, "人力资源经理": 13000, "教师": 7000,
        "护士": 6500, "律师": 16000, "建筑师": 12000,
        "厨师": 5000, "记者": 7500, "机械工程师": 13000,
        "药剂师": 11000, "会计师": 10000, "产品经理": 16000,
        "UI/UX设计师": 14000, "大学教授": 12000, "牙医": 18000,
        "公交司机": 5000, "电工": 7000, "政府/NGO行政": 9000,
        "数字游民": 85000,
    },
    "costModerate": 1100, "costBudget": 650,
    "bigMacPrice": 4.20, "housePrice": 1200, "monthlyRent": 500,
    "annualWorkHours": 2000, "paidLeaveDays": 14, "internetSpeedMbps": 50,
    "airQuality": 55, "aqiSource": "EPA",
    "doctorsPerThousand": 1.6, "hospitalBedsPerThousand": 1.6,
    "uhcCoverageIndex": 60, "lifeExpectancy": 74.0, "outOfPocketPct": 42.0,
    "numbeoSafetyIndex": 38.0, "homicideRate": 11.0, "gpiScore": 2.10,
    "gallupLawOrder": 55, "wpsIndex": 0.640,
    "pressFreedomScore": 55, "democracyIndex": 6.50,
    "corruptionPerceptionIndex": 28, "govEffectiveness": 41.2,
    "wjpRuleLaw": 0.44, "internetFreedomScore": None, "mipexScore": None,
    "directFlightCities": 55,
    "timezone": "America/Santo_Domingo",
    "climate": {
        "type": "tropical", "avgTempC": 26.0, "annualRainMm": 1450,
        "sunshineHours": 2600, "summerAvgC": 28.0, "winterAvgC": 24.0, "humidityPct": 75,
        "monthlyHighC": [30, 30, 31, 31, 32, 33, 33, 33, 33, 32, 31, 30],
        "monthlyLowC": [20, 20, 20, 21, 22, 23, 23, 23, 23, 22, 22, 21],
        "monthlyRainMm": [65, 55, 55, 70, 175, 145, 140, 150, 175, 180, 130, 80],
    },
},
{
    "id": 166, "name": "基多", "country": "厄瓜多尔", "continent": "南美洲",
    "currency": "USD",
    "description": "厄瓜多尔首都，海拔2850米的赤道城市。使用美元为法定货币，生活成本极低，近年成为数字游民和退休移居热门目的地。",
    "professions": {
        "软件工程师": 16000, "医生/医学博士": 22000, "财务分析师": 14000,
        "市场经理": 15000, "平面设计师": 9000, "数据科学家": 15000,
        "销售经理": 13000, "人力资源经理": 12000, "教师": 8000,
        "护士": 7000, "律师": 15000, "建筑师": 11000,
        "厨师": 5000, "记者": 7000, "机械工程师": 12000,
        "药剂师": 10000, "会计师": 9000, "产品经理": 14000,
        "UI/UX设计师": 12000, "大学教授": 14000, "牙医": 16000,
        "公交司机": 5500, "电工": 7000, "政府/NGO行政": 10000,
        "数字游民": 85000,
    },
    "costModerate": 900, "costBudget": 550,
    "bigMacPrice": 4.10, "housePrice": 1000, "monthlyRent": 400,
    "annualWorkHours": 1900, "paidLeaveDays": 15, "internetSpeedMbps": 45,
    "airQuality": 45, "aqiSource": "EPA",
    "doctorsPerThousand": 2.3, "hospitalBedsPerThousand": 1.5,
    "uhcCoverageIndex": 65, "lifeExpectancy": 77.0, "outOfPocketPct": 33.0,
    "numbeoSafetyIndex": 35.0, "homicideRate": 7.5, "gpiScore": 2.15,
    "gallupLawOrder": 50, "wpsIndex": 0.650,
    "pressFreedomScore": 60, "democracyIndex": 6.30,
    "corruptionPerceptionIndex": 36, "govEffectiveness": 38.5,
    "wjpRuleLaw": 0.46, "internetFreedomScore": 62, "mipexScore": None,
    "directFlightCities": 35,
    "timezone": "America/Guayaquil",
    "climate": {
        "type": "temperate", "avgTempC": 14.0, "annualRainMm": 1100,
        "sunshineHours": 1600, "summerAvgC": 15.0, "winterAvgC": 13.0, "humidityPct": 70,
        "monthlyHighC": [19, 19, 19, 19, 19, 19, 20, 20, 20, 19, 19, 19],
        "monthlyLowC": [9, 9, 9, 9, 9, 8, 8, 8, 8, 9, 9, 9],
        "monthlyRainMm": [100, 110, 130, 140, 100, 40, 20, 25, 70, 115, 100, 80],
    },
},
{
    "id": 167, "name": "阿克拉", "country": "加纳", "continent": "非洲",
    "currency": "GHS",
    "description": "加纳首都，西非英语国家经济中心。科技创业生态活跃，被称为'非洲硅谷'之一，是西非最稳定的民主国家。",
    "professions": {
        "软件工程师": 12000, "医生/医学博士": 18000, "财务分析师": 10000,
        "市场经理": 11000, "平面设计师": 6000, "数据科学家": 11000,
        "销售经理": 9000, "人力资源经理": 8500, "教师": 4500,
        "护士": 4000, "律师": 12000, "建筑师": 8000,
        "厨师": 3000, "记者": 4500, "机械工程师": 8000,
        "药剂师": 7000, "会计师": 7000, "产品经理": 10000,
        "UI/UX设计师": 8000, "大学教授": 10000, "牙医": 14000,
        "公交司机": 3000, "电工": 4000, "政府/NGO行政": 6000,
        "数字游民": 85000,
    },
    "costModerate": 850, "costBudget": 500,
    "bigMacPrice": None, "housePrice": 800, "monthlyRent": 350,
    "annualWorkHours": 2000, "paidLeaveDays": 15, "internetSpeedMbps": 35,
    "airQuality": 65, "aqiSource": "EPA",
    "doctorsPerThousand": 0.2, "hospitalBedsPerThousand": 0.9,
    "uhcCoverageIndex": 47, "lifeExpectancy": 64.1, "outOfPocketPct": 37.0,
    "numbeoSafetyIndex": 48.0, "homicideRate": 2.0, "gpiScore": 1.80,
    "gallupLawOrder": 60, "wpsIndex": 0.620,
    "pressFreedomScore": 72, "democracyIndex": 6.30,
    "corruptionPerceptionIndex": 43, "govEffectiveness": 45.8,
    "wjpRuleLaw": 0.55, "internetFreedomScore": 65, "mipexScore": None,
    "directFlightCities": 40,
    "timezone": "Africa/Accra",
    "climate": {
        "type": "tropical", "avgTempC": 27.0, "annualRainMm": 810,
        "sunshineHours": 2500, "summerAvgC": 26.5, "winterAvgC": 27.5, "humidityPct": 78,
        "monthlyHighC": [32, 33, 33, 32, 31, 29, 28, 28, 29, 31, 32, 32],
        "monthlyLowC": [23, 24, 24, 24, 24, 23, 22, 22, 22, 23, 23, 23],
        "monthlyRainMm": [15, 30, 55, 80, 140, 175, 40, 15, 35, 65, 35, 20],
    },
},
{
    "id": 168, "name": "亚的斯亚贝巴", "country": "埃塞俄比亚", "continent": "非洲",
    "currency": "ETB",
    "description": "埃塞俄比亚首都，非洲联盟总部所在地。海拔2400米，全年气候温和。非洲增长最快的经济体之一，人口超过500万。",
    "professions": {
        "软件工程师": 8000, "医生/医学博士": 12000, "财务分析师": 6000,
        "市场经理": 7000, "平面设计师": 4000, "数据科学家": 7500,
        "销售经理": 6000, "人力资源经理": 5500, "教师": 3000,
        "护士": 2500, "律师": 8000, "建筑师": 5500,
        "厨师": 2000, "记者": 3000, "机械工程师": 5500,
        "药剂师": 4500, "会计师": 4500, "产品经理": 6500,
        "UI/UX设计师": 5000, "大学教授": 6000, "牙医": 9000,
        "公交司机": 2000, "电工": 2500, "政府/NGO行政": 4000,
        "数字游民": 85000,
    },
    "costModerate": 650, "costBudget": 380,
    "bigMacPrice": None, "housePrice": 500, "monthlyRent": 250,
    "annualWorkHours": 2100, "paidLeaveDays": 16, "internetSpeedMbps": 20,
    "airQuality": 60, "aqiSource": "EPA",
    "doctorsPerThousand": 0.1, "hospitalBedsPerThousand": 0.3,
    "uhcCoverageIndex": 34, "lifeExpectancy": 66.6, "outOfPocketPct": 32.0,
    "numbeoSafetyIndex": 45.0, "homicideRate": 7.6, "gpiScore": 2.80,
    "gallupLawOrder": 55, "wpsIndex": 0.505,
    "pressFreedomScore": 35, "democracyIndex": 3.27,
    "corruptionPerceptionIndex": 37, "govEffectiveness": 30.2,
    "wjpRuleLaw": 0.38, "internetFreedomScore": 18, "mipexScore": None,
    "directFlightCities": 60,
    "timezone": "Africa/Addis_Ababa",
    "climate": {
        "type": "temperate", "avgTempC": 16.0, "annualRainMm": 1089,
        "sunshineHours": 2500, "summerAvgC": 16.0, "winterAvgC": 16.0, "humidityPct": 55,
        "monthlyHighC": [23, 24, 25, 25, 25, 23, 20, 20, 22, 23, 23, 23],
        "monthlyLowC": [7, 8, 10, 11, 10, 10, 10, 10, 9, 7, 6, 6],
        "monthlyRainMm": [13, 30, 60, 82, 85, 135, 260, 240, 100, 30, 8, 5],
    },
},
]

for nc in NEW_CITIES:
    cities.append(nc)
    print(f"Added: {nc['name']}({nc['id']}) [{nc['country']}]")

d["cities"] = cities
d["lastUpdated"] = "2026-04-14"
with open(SOT, "w") as f:
    json.dump(d, f, indent=2, ensure_ascii=False)
    f.write("\n")
print(f"\n✅ SOT updated: {len(cities)} cities")
