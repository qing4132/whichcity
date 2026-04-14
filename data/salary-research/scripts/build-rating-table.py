#!/usr/bin/env python3
"""Generate salary confidence rating table for all cities."""
import json
from statistics import mean
from collections import defaultdict

d = json.load(open("data/salary-research/salary-estimates-v2.json"))["data"]
ratios_meta = json.load(open("data/salary-research/raw/country-specific-ratios.json"))
quality_map = ratios_meta.get("dataQuality", {})
numbeo = json.load(open("data/salary-research/raw/numbeo-salary-from-cache.json"))["data"]

CN_EN = {
    "美国":"US (BLS)","波多黎各":"Puerto Rico","英国":"United Kingdom","日本":"Japan",
    "中国":"China","中国香港":"Hong Kong","澳大利亚":"Australia","新加坡":"Singapore",
    "法国":"France","加拿大":"Canada","韩国":"South Korea","德国":"Germany",
    "瑞士":"Switzerland","荷兰":"Netherlands","比利时":"Belgium","奥地利":"Austria",
    "捷克":"Czech Republic","波兰":"Poland","葡萄牙":"Portugal","希腊":"Greece",
    "土耳其":"Turkey","墨西哥":"Mexico","巴西":"Brazil","泰国":"Thailand",
    "马来西亚":"Malaysia","越南":"Vietnam","印度":"India","肯尼亚":"Kenya",
    "埃及":"Egypt","伊朗":"Iran","巴基斯坦":"Pakistan","印度尼西亚":"Indonesia",
    "菲律宾":"Philippines","台湾":"Taiwan","阿根廷":"Argentina","智利":"Chile",
    "哥伦比亚":"Colombia","秘鲁":"Peru","南非":"South Africa","阿联酋":"UAE",
    "卡塔尔":"Qatar","巴林":"Bahrain","沙特阿拉伯":"Saudi Arabia","阿曼":"Oman",
    "黎巴嫩":"Lebanon","约旦":"Jordan","以色列":"Israel","乌克兰":"Ukraine",
    "罗马尼亚":"Romania","保加利亚":"Bulgaria","克罗地亚":"Croatia","塞尔维亚":"Serbia",
    "匈牙利":"Hungary","斯洛伐克":"Slovakia","斯洛文尼亚":"Slovenia","爱尔兰":"Ireland",
    "柬埔寨":"Cambodia","缅甸":"Myanmar","孟加拉国":"Bangladesh","斯里兰卡":"Sri Lanka",
    "尼泊尔":"Nepal","哈萨克斯坦":"Kazakhstan","乌兹别克斯坦":"Uzbekistan",
    "阿塞拜疆":"Azerbaijan","蒙古":"Mongolia","瑞典":"Sweden","丹麦":"Denmark",
    "芬兰":"Finland","挪威":"Norway","格鲁吉亚":"Georgia","尼日利亚":"Nigeria",
    "俄罗斯":"Russia","卢森堡":"Luxembourg","爱沙尼亚":"Estonia","新西兰":"New Zealand",
    "哥斯达黎加":"Costa Rica","巴拿马":"Panama","乌拉圭":"Uruguay","摩洛哥":"Morocco",
    "意大利":"Italy","西班牙":"Spain",
}

cs = defaultdict(lambda: {"confs":[],"tiers":[],"name":"","country":""})
for r in d:
    cs[r["cityId"]]["confs"].append(r["confidence"])
    cs[r["cityId"]]["tiers"].append(r["tier"])
    cs[r["cityId"]]["name"] = r["cityName"]
    cs[r["cityId"]]["country"] = r["country"]

GRADE = lambda c: "S" if c>=90 else "A" if c>=65 else "B" if c>=50 else "C" if c>=35 else "D"

rows = []
for cid, s in cs.items():
    avg = round(mean(s["confs"]))
    co = s["country"]
    en = CN_EN.get(co, co)
    dq = quality_map.get(en, "?")
    has_n = numbeo.get(str(cid), {}).get("netMonthlySalary_USD") is not None
    t = max(s["tiers"])
    
    notes = []
    if t == 1: notes.append("BLS官方直接数据")
    elif dq == "A": notes.append("国家统计局职业级数据+Numbeo")
    elif dq == "B": notes.append("国家统计局行业级数据+Numbeo")
    elif dq == "C": notes.append("ISCO大类+地区模式+Numbeo")
    elif dq == "D": notes.append("有限统计+地区模式")
    if not has_n: notes.append("⚠无Numbeo")
    if co in ("伊朗","黎巴嫩","阿根廷"): notes.append("⚠汇率极不稳定")
    if co == "缅甸": notes.append("⚠政变后数据中断")
    
    rows.append((cid, s["name"], co, avg, GRADE(avg), dq, "; ".join(notes)))

rows.sort(key=lambda x: -x[3])

print(f"{'#':>3} {'评级':>2} {'conf':>4} {'城市':<18} {'国家':<10} {'质量':>2} {'备注'}")
print("─"*95)
for i,(cid,name,co,avg,grade,dq,notes) in enumerate(rows,1):
    print(f"{i:>3}  {grade}   {avg:>3}  {name:<16} {co:<10}  {dq:>1}   {notes}")

print(f"\n{'─'*50}")
print("评级说明:")
print("  S (conf≥90): BLS直接官方调查，精确到城市×职业")
print("  A (conf 65-89): 发达国家统计局职业级数据+Numbeo城市基准")
print("  B (conf 50-64): 统计局行业数据或ISCO大类+Numbeo")
print("  C (conf 35-49): 地区模式推算+Numbeo")
print("  D (conf 20-34): 有限数据来源，仅供参考")
print()
print("数据质量标记:")
print("  A = 国家统计局发布了具体职业薪资数据")
print("  B = 有行业/部门级薪资数据，职业内推算")
print("  C = 有ISCO大类比率或地区薪资调查")
print("  D = 几乎无公开职业薪资统计")
print()
for g in ["S","A","B","C","D"]:
    c = sum(1 for r in rows if r[4]==g)
    print(f"  {g}: {c}城市")
