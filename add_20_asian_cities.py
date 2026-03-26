import json

with open("public/data/cities.json", "r") as f:
    data = json.load(f)

# Reference: Beijing's professions for scaling
ref = None
for c in data["cities"]:
    if c["id"] == 4:
        ref = c
        break

def make_city(cid, name, country, continent, avg_income, cost_moderate, bigmac,
              house_price, aqi, doctors, desc, prof_scale, cost_comfort_ratio=1.6,
              cost_budget_ratio=0.45, cost_minimal_ratio=0.28):
    profs = {}
    for k, v in ref["professions"].items():
        profs[k] = round(v * prof_scale)

    cost_comfort = round(cost_moderate * cost_comfort_ratio)
    cost_budget = round(cost_moderate * cost_budget_ratio)
    cost_minimal = round(cost_moderate * cost_minimal_ratio)
    yearly_savings = round(avg_income - cost_moderate * 12)

    return {
        "id": cid,
        "name": name,
        "country": country,
        "averageIncome": avg_income,
        "costOfLiving": cost_moderate,
        "bigMacPrice": bigmac,
        "currency": "USD",
        "description": desc,
        "yearlySavings": yearly_savings,
        "continent": continent,
        "professions": profs,
        "housePrice": house_price,
        "airQuality": aqi,
        "costComfort": cost_comfort,
        "costModerate": cost_moderate,
        "costBudget": cost_budget,
        "costMinimal": cost_minimal,
        "doctorsPerThousand": doctors,
    }

# --- 20 New Asian Cities (IDs 101-120) ---
# Chinese cities: AQI values are US EPA equivalent (AQICN raw * 1.4)

new_cities = [
    # Chinese cities (5)
    make_city(101, "广州", "中国", "亚洲", 52000, 1600, 3.25, 5200, 120, 3.2,
        "中国南方经济重镇，珠三角核心城市。制造业和贸易发达，美食文化丰富。气候炎热潮湿。", 0.88),
    make_city(102, "深圳", "中国", "亚洲", 60000, 1800, 3.30, 7800, 95, 2.8,
        "中国科技创新之都，腾讯、华为等巨头总部所在地。年轻、活力四射的现代化城市。", 1.02),
    make_city(103, "成都", "中国", "亚洲", 42000, 1200, 3.15, 2800, 115, 3.5,
        "中国西南中心城市，以美食和休闲文化闻名。新兴科技中心，生活成本相对较低。", 0.72),
    make_city(104, "杭州", "中国", "亚洲", 55000, 1650, 3.22, 5500, 100, 3.3,
        "阿里巴巴总部所在地，中国电商与互联网产业重镇。西湖闻名世界，宜居城市。", 0.94),
    make_city(105, "重庆", "中国", "亚洲", 38000, 1100, 3.12, 2200, 110, 2.9,
        "中国西南最大直辖市，山城地形独特。制造业和物流中心，生活成本较低，美食丰富。", 0.65),

    # Japan (2)
    make_city(106, "大阪", "日本", "亚洲", 58000, 2200, 3.68, 4800, 38, 2.6,
        "日本第二大都市圈，商业与美食之都。生活成本低于东京，文化独特热情奔放。", 0.82),
    make_city(107, "名古屋", "日本", "亚洲", 52000, 1900, 3.65, 3200, 35, 2.5,
        "日本中部工业重镇，丰田汽车总部所在地。生活成本适中，制造业就业机会丰富。", 0.75),

    # South Korea (1)
    make_city(108, "仁川", "韩国", "亚洲", 42000, 1600, 3.98, 3800, 55, 2.4,
        "韩国第三大城市，首尔都市圈西部门户。仁川国际机场所在地，经济自由区发展迅速。", 0.70),

    # Southeast Asia (5)
    make_city(109, "金边", "柬埔寨", "亚洲", 12000, 650, 3.20, 1800, 75, 0.2,
        "柬埔寨首都，东南亚新兴经济体。房地产和旅游业增长迅速，生活成本极低。", 0.20),
    make_city(110, "仰光", "缅甸", "亚洲", 8000, 500, 2.80, 800, 85, 0.7,
        "缅甸最大城市和经济中心。历史建筑丰富，生活成本极低但基础设施有待发展。", 0.14),
    make_city(111, "万象", "老挝", "亚洲", 9000, 550, 2.90, 900, 60, 0.4,
        "老挝首都，湄公河畔宁静城市。经济正在快速发展，生活节奏缓慢，成本极低。", 0.15),
    make_city(112, "清迈", "泰国", "亚洲", 18000, 750, 4.35, 1500, 70, 0.8,
        "泰国北部文化中心，数字游民圣地。生活成本低廉，气候宜人，寺庙文化丰富。", 0.30),
    make_city(113, "达沃", "菲律宾", "亚洲", 14000, 600, 3.10, 1100, 45, 0.6,
        "菲律宾南部最大城市，棉兰老岛经济中心。气候宜人，水果丰富，生活成本极低。", 0.24),

    # South Asia (3)
    make_city(114, "达卡", "孟加拉国", "亚洲", 10000, 500, 2.50, 1200, 170, 0.5,
        "孟加拉国首都，全球人口最密集城市之一。服装制造业中心，生活成本极低但空气质量差。", 0.17),
    make_city(115, "科伦坡", "斯里兰卡", "亚洲", 16000, 650, 3.00, 1400, 65, 1.0,
        "斯里兰卡商业首都，印度洋贸易枢纽。旅游和IT服务业增长，生活成本较低。", 0.27),
    make_city(116, "加德满都", "尼泊尔", "亚洲", 8500, 450, 2.60, 700, 135, 0.3,
        "尼泊尔首都，喜马拉雅山脚下的古城。旅游业为主，生活成本极低但空气质量季节性差。", 0.14),

    # Central/North Asia (4)
    make_city(117, "阿拉木图", "哈萨克斯坦", "亚洲", 22000, 900, 3.20, 1600, 80, 3.3,
        "哈萨克斯坦最大城市和经济中心。前首都，天山脚下，IT和金融业发展迅速。", 0.38),
    make_city(118, "塔什干", "乌兹别克斯坦", "亚洲", 12000, 550, 2.50, 800, 75, 2.4,
        "乌兹别克斯坦首都，中亚最大城市。丝绸之路历史名城，经济改革中快速发展。", 0.20),
    make_city(119, "巴库", "阿塞拜疆", "亚洲", 18000, 750, 3.00, 1500, 65, 3.5,
        "阿塞拜疆首都，里海沿岸石油之城。现代化建筑与古城并存，能源经济为主。", 0.30),
    make_city(120, "乌兰巴托", "蒙古", "亚洲", 14000, 700, 3.50, 1000, 155, 3.0,
        "蒙古首都，全球最寒冷首都之一。采矿业驱动经济，冬季空气污染严重。", 0.24),
]

data["cities"].extend(new_cities)

with open("public/data/cities.json", "w") as f:
    json.dump(data, f, ensure_ascii=False, indent=6)

print(f"Added {len(new_cities)} cities. Total: {len(data['cities'])}")
for c in new_cities:
    print(f"  ID {c['id']}: {c['name']} ({c['country']}) AQI={c['airQuality']} Income=${c['averageIncome']}")
