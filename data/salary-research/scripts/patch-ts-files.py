#!/usr/bin/env python3
"""
patch-ts-files.py — Add/remove cities from all TS data files
Handles: constants.ts, citySlug.ts, i18n.ts, cityIntros.ts, cityLanguages.ts
"""
import re

DELETE_IDS = {108, 139, 133, 134, 142, 157, 158}

def patch_file(path, patches):
    """Apply text patches to a file."""
    with open(path, "r") as f:
        content = f.read()
    for desc, old, new in patches:
        if old in content:
            content = content.replace(old, new, 1)
            print(f"  ✓ {desc}")
        else:
            print(f"  ✗ Could not find: {desc}")
    with open(path, "w") as f:
        f.write(content)

def delete_ids_from_record(content, ids):
    """Remove lines containing specific IDs from object literals."""
    lines = content.split("\n")
    filtered = []
    for line in lines:
        # Match lines like "  108: ..." or "  139: ..." 
        m = re.match(r'^(\s+)(\d+):', line)
        if m and int(m.group(2)) in ids:
            continue
        filtered.append(line)
    return "\n".join(filtered)

# ═══════════════════════════════════════════════════════════════
# 1. constants.ts
# ═══════════════════════════════════════════════════════════════
print("\n=== constants.ts ===")
with open("lib/constants.ts", "r") as f:
    c = f.read()

# Delete IDs from REGIONS
for old_ids in [
    '108, ',  # 仁川 from eastAsia
    ', 139',  # 横滨 from eastAsia  
    ', 133, 134',  # 圣何塞, 尔湾 from northAmerica
    '142, ',  # 普拉亚 from latinAmerica
    ', 157, 158',  # 坎昆, 巴亚尔塔 from latinAmerica
]:
    c = c.replace(old_ids, '')

# Add new IDs to REGIONS
# Europe: add 162, 163, 164
c = c.replace(
    '146, 149] },',
    '146, 149, 162, 163, 164] },'
)
# northAmerica (Caribbean): add 165
c = c.replace(
    '9, 40, 41, 127, 135] },',
    '9, 40, 41, 127, 135, 165] },'
)
# latinAmerica: add 166
c = c.replace(
    '148, 152] },',  
    '148, 152, 166] },'
)
# africa: add 167, 168
c = c.replace(
    '131, 160] },',
    '131, 160, 167, 168] },'
)

# Delete IDs from CITY_FLAG_EMOJIS
c = delete_ids_from_record(c, DELETE_IDS)

# Add new flags (before the closing })
c = c.replace(
    '  160: "🇲🇦", 161: "🇳🇿",\n};',
    '  160: "🇲🇦", 161: "🇳🇿",\n  162: "🇱🇹", 163: "🇱🇻", 164: "🇨🇾",\n  165: "🇩🇴", 166: "🇪🇨", 167: "🇬🇭", 168: "🇪🇹",\n};'
)

# Add to CITY_COUNTRY  
c = c.replace(
    '160: "摩洛哥", 161: "新西兰" };',
    '160: "摩洛哥", 161: "新西兰", 162: "立陶宛", 163: "拉脱维亚", 164: "塞浦路斯", 165: "多米尼加", 166: "厄瓜多尔", 167: "加纳", 168: "埃塞俄比亚" };'
)

# Also need to add COUNTRY_TRANSLATIONS for new countries
# And remove deleted city entries from CITY_COUNTRY
for did in DELETE_IDS:
    # Remove "108: "韩国", " patterns
    c = re.sub(rf'\s*{did}: "[^"]+",?', '', c)

with open("lib/constants.ts", "w") as f:
    f.write(c)
print("  ✓ Updated REGIONS, flags, CITY_COUNTRY")

# ═══════════════════════════════════════════════════════════════
# 2. citySlug.ts
# ═══════════════════════════════════════════════════════════════
print("\n=== citySlug.ts ===")
with open("lib/citySlug.ts", "r") as f:
    c = f.read()

# Delete old IDs
c = delete_ids_from_record(c, DELETE_IDS)

# Delete old slugs
for slug in ["incheon", "yokohama", "san-jose-ca", "irvine", "playa-del-carmen", "cancun", "puerto-vallarta"]:
    c = re.sub(rf'\s*"{slug}": \d+,?\n?', '\n', c)

# Add new slugs to CITY_SLUGS (find the end of the object)
c = c.replace(
    '  161: "wellington",',
    '  161: "wellington",\n  162: "vilnius", 163: "riga", 164: "nicosia",\n  165: "santo-domingo", 166: "quito", 167: "accra", 168: "addis-ababa",'
)

# Add new reverse slugs to SLUG_TO_ID
c = c.replace(
    '  "wellington": 161,',
    '  "wellington": 161,\n  "vilnius": 162, "riga": 163, "nicosia": 164,\n  "santo-domingo": 165, "quito": 166, "accra": 167, "addis-ababa": 168,'
)

with open("lib/citySlug.ts", "w") as f:
    f.write(c)
print("  ✓ Updated CITY_SLUGS, SLUG_TO_ID")

# ═══════════════════════════════════════════════════════════════
# 3. i18n.ts — CITY_NAME_TRANSLATIONS + COUNTRY_TRANSLATIONS
# ═══════════════════════════════════════════════════════════════
print("\n=== i18n.ts ===")
with open("lib/i18n.ts", "r") as f:
    c = f.read()

# Delete old city name translations
c = delete_ids_from_record(c, DELETE_IDS)

# Add new city name translations (find 161:)
new_names = """  162: { zh: "维尔纽斯", en: "Vilnius", ja: "ビリニュス", es: "Vilna" },
  163: { zh: "里加", en: "Riga", ja: "リガ", es: "Riga" },
  164: { zh: "尼科西亚", en: "Nicosia", ja: "ニコシア", es: "Nicosia" },
  165: { zh: "圣多明各", en: "Santo Domingo", ja: "サントドミンゴ", es: "Santo Domingo" },
  166: { zh: "基多", en: "Quito", ja: "キト", es: "Quito" },
  167: { zh: "阿克拉", en: "Accra", ja: "アクラ", es: "Acra" },
  168: { zh: "亚的斯亚贝巴", en: "Addis Ababa", ja: "アディスアベバ", es: "Adís Abeba" },"""

# Find the 161 line and add after it
c = c.replace(
    '  161: { zh: "惠灵顿", en: "Wellington",',
    '  161: { zh: "惠灵顿", en: "Wellington",'
)
# Look for the pattern after 161's entry
idx_161 = c.find('161: {')
if idx_161 > 0:
    # Find the end of the 161 line
    end_161 = c.index('\n', idx_161)
    c = c[:end_161+1] + new_names + "\n" + c[end_161+1:]
    print("  ✓ Added CITY_NAME_TRANSLATIONS")

# Add COUNTRY_TRANSLATIONS for new countries
new_country_trans = [
    ('"立陶宛"', '{ en: "Lithuania", ja: "リトアニア", es: "Lituania" }'),
    ('"拉脱维亚"', '{ en: "Latvia", ja: "ラトビア", es: "Letonia" }'),
    ('"塞浦路斯"', '{ en: "Cyprus", ja: "キプロス", es: "Chipre" }'),
    ('"多米尼加"', '{ en: "Dominican Republic", ja: "ドミニカ共和国", es: "República Dominicana" }'),
    ('"厄瓜多尔"', '{ en: "Ecuador", ja: "エクアドル", es: "Ecuador" }'),
    ('"加纳"', '{ en: "Ghana", ja: "ガーナ", es: "Ghana" }'),
    ('"埃塞俄比亚"', '{ en: "Ethiopia", ja: "エチオピア", es: "Etiopía" }'),
]

# Find the end of COUNTRY_TRANSLATIONS
ct_end = c.find('};', c.find('COUNTRY_TRANSLATIONS'))
if ct_end > 0:
    insert = "\n".join(f"  {k}: {v}," for k, v in new_country_trans)
    c = c[:ct_end] + insert + "\n" + c[ct_end:]
    print("  ✓ Added COUNTRY_TRANSLATIONS")

with open("lib/i18n.ts", "w") as f:
    f.write(c)

# ═══════════════════════════════════════════════════════════════
# 4. cityIntros.ts
# ═══════════════════════════════════════════════════════════════
print("\n=== cityIntros.ts ===")
with open("lib/cityIntros.ts", "r") as f:
    c = f.read()

# Delete old intros
c = delete_ids_from_record(c, DELETE_IDS)

# Add new intros
new_intros = '''  162: { zh: "立陶宛首都维尔纽斯是波罗的海地区的科技创新中心，生活成本远低于西欧，却拥有高品质的城市生活和丰富的文化遗产。", en: "Vilnius, the capital of Lithuania, is a tech innovation hub in the Baltics with costs far below Western Europe, high quality of life, and rich cultural heritage.", ja: "リトアニアの首都ビリニュスは、バルト地域のテクノロジー革新の中心地であり、西欧よりはるかに低い生活コストで、高い生活の質と豊かな文化遺産を享受できます。", es: "Vilna, la capital de Lituania, es un centro de innovación tecnológica en el Báltico con costos muy por debajo de Europa Occidental y una rica herencia cultural." },
  163: { zh: "拉脱维亚首都里加以新艺术建筑闻名于世，IT外包产业发达，是波罗的海地区重要的商业和文化中心。", en: "Riga, Latvia's capital, is famous for its Art Nouveau architecture, thriving IT outsourcing industry, and serves as a key business and cultural hub in the Baltics.", ja: "ラトビアの首都リガは、アール・ヌーヴォー建築で世界的に有名で、ITアウトソーシング産業が盛んなバルト地域の重要なビジネス・文化の中心地です。", es: "Riga, capital de Letonia, es famosa por su arquitectura Art Nouveau y su próspera industria de TI, siendo un centro clave de negocios y cultura en los países bálticos." },
  164: { zh: "塞浦路斯首都尼科西亚是地中海东部的金融和科技中心，12.5%的企业税率吸引了大量国际企业，全年阳光充沛。", en: "Nicosia, the capital of Cyprus, is a financial and tech hub in the eastern Mediterranean with a 12.5% corporate tax rate attracting international businesses and year-round sunshine.", ja: "キプロスの首都ニコシアは、地中海東部の金融・テクノロジーの中心地であり、12.5%の法人税率で国際企業を引きつけ、年間を通じて日光に恵まれています。", es: "Nicosia, capital de Chipre, es un centro financiero y tecnológico en el Mediterráneo oriental con una tasa corporativa del 12.5% que atrae empresas internacionales." },
  165: { zh: "多米尼加首都圣多明各是加勒比海地区最大的城市，近年因数字游民签证政策而成为远程工作者的热门目的地。", en: "Santo Domingo, capital of the Dominican Republic, is the largest city in the Caribbean and has become a popular destination for remote workers thanks to its digital nomad visa program.", ja: "ドミニカ共和国の首都サントドミンゴはカリブ海地域最大の都市で、デジタルノマドビザ制度により、リモートワーカーに人気の目的地となっています。", es: "Santo Domingo, capital de la República Dominicana, es la ciudad más grande del Caribe y se ha convertido en un destino popular para trabajadores remotos gracias a su visa de nómada digital." },
  166: { zh: "厄瓜多尔首都基多坐落于海拔2850米的安第斯山谷，使用美元为法定货币，生活成本极低，气候四季如春。", en: "Quito, Ecuador's capital, sits at 2,850m in the Andes valley. It uses the US dollar as legal tender, offers extremely low living costs, and enjoys spring-like weather year-round.", ja: "エクアドルの首都キトは、アンデス渓谷の標高2,850mに位置し、米ドルを法定通貨として使用、生活コストが極めて低く、年間を通じて春のような気候です。", es: "Quito, capital de Ecuador, se encuentra a 2.850m en el valle andino. Usa el dólar como moneda legal, ofrece costos de vida muy bajos y disfruta de un clima primaveral todo el año." },
  167: { zh: "加纳首都阿克拉是西非英语国家的经济中心，科技创业生态活跃，被称为'非洲硅谷'之一。", en: "Accra, Ghana's capital, is the economic center of English-speaking West Africa with a thriving tech startup ecosystem, often called one of 'Africa's Silicon Valleys'.", ja: "ガーナの首都アクラは、英語圏西アフリカの経済の中心地であり、活発なテックスタートアップのエコシステムを持ち、「アフリカのシリコンバレー」の一つと呼ばれています。", es: "Acra, capital de Ghana, es el centro económico del África occidental anglófona con un próspero ecosistema de startups tecnológicas, a menudo llamada uno de los 'Silicon Valley de África'." },
  168: { zh: "埃塞俄比亚首都亚的斯亚贝巴是非洲联盟总部所在地，海拔2400米全年气候温和，是非洲增长最快的经济体之一。", en: "Addis Ababa, Ethiopia's capital, hosts the African Union headquarters. At 2,400m altitude, it enjoys mild weather year-round and is one of Africa's fastest-growing economies.", ja: "エチオピアの首都アディスアベバは、アフリカ連合の本部所在地です。標高2,400mで年間を通じて穏やかな気候に恵まれ、アフリカで最も急成長している経済の一つです。", es: "Adís Abeba, capital de Etiopía, alberga la sede de la Unión Africana. A 2.400m de altitud, disfruta de un clima templado todo el año y es una de las economías de más rápido crecimiento de África." },'''

# Find the last entry pattern and add after
idx_161i = c.rfind('161:')
if idx_161i > 0:
    end_161i = c.index('\n', idx_161i)
    c = c[:end_161i+1] + new_intros + "\n" + c[end_161i+1:]
    print("  ✓ Added city intros")

with open("lib/cityIntros.ts", "w") as f:
    f.write(c)

# ═══════════════════════════════════════════════════════════════
# 5. cityLanguages.ts
# ═══════════════════════════════════════════════════════════════
print("\n=== cityLanguages.ts ===")
with open("lib/cityLanguages.ts", "r") as f:
    c = f.read()

c = delete_ids_from_record(c, DELETE_IDS)

# Add new city languages (find the end of CITY_LANGUAGES object)
new_langs = '''  162: ["Lithuanian", "Russian", "Polish"],  // Vilnius
  163: ["Latvian", "Russian"],              // Riga
  164: ["Greek", "Turkish", "English"],     // Nicosia
  165: ["Spanish"],                         // Santo Domingo
  166: ["Spanish", "Quechua"],              // Quito
  167: ["English", "Akan", "Twi"],          // Accra
  168: ["Amharic", "Oromo", "English"],     // Addis Ababa'''

# Find end of the CITY_LANGUAGES object
cl_end = c.rfind('};')
if cl_end > 0:
    c = c[:cl_end] + new_langs + "\n" + c[cl_end:]
    print("  ✓ Added city languages")

with open("lib/cityLanguages.ts", "w") as f:
    f.write(c)

# Also add language name i18n for new languages
# Check if these languages already exist in LANGUAGE_NAMES
for lang in ["Lithuanian", "Latvian", "Akan", "Twi", "Amharic", "Oromo", "Quechua"]:
    if lang not in c:
        print(f"  ⚠ Need to add LANGUAGE_NAMES for: {lang}")

print("\n✅ All TS files patched!")
