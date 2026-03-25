import json

with open('public/data/cities.json') as f:
    data = json.load(f)

us_ids = [1, 11, 12, 13, 34, 35, 36, 37, 38, 39, 95, 96, 97, 98, 99, 100]
cn_ids = [4, 5, 10]

print("=== US CITIES (USD/year) ===")
for cid in us_ids:
    c = next((x for x in data['cities'] if x['id'] == cid), None)
    if c:
        p = c['professions']
        sw = p.get('\u8f6f\u4ef6\u5de5\u7a0b\u5e08', 0)
        doc = p.get('\u533b\u751f/\u533b\u5b66\u535a\u58eb', 0)
        nurse = p.get('\u62a4\u58eb', 0)
        teacher = p.get('\u6559\u5e08', 0)
        lawyer = p.get('\u5f8b\u5e08', 0)
        acct = p.get('\u4f1a\u8ba1\u5e08', 0)
        chef = p.get('\u53a8\u5e08', 0)
        meche = p.get('\u673a\u68b0\u5de5\u7a0b\u5e08', 0)
        print(f"  {c['name']:10s} SW={sw:>7,}  Doc={doc:>7,}  Nurse={nurse:>6,}  Teacher={teacher:>6,}  Lawyer={lawyer:>7,}  Acct={acct:>6,}  Chef={chef:>6,}  MechE={meche:>6,}")

print()
print("=== CHINA/HK CITIES (USD/year) ===")
for cid in cn_ids:
    c = next((x for x in data['cities'] if x['id'] == cid), None)
    if c:
        p = c['professions']
        sw = p.get('\u8f6f\u4ef6\u5de5\u7a0b\u5e08', 0)
        doc = p.get('\u533b\u751f/\u533b\u5b66\u535a\u58eb', 0)
        nurse = p.get('\u62a4\u58eb', 0)
        teacher = p.get('\u6559\u5e08', 0)
        lawyer = p.get('\u5f8b\u5e08', 0)
        civil = p.get('\u516c\u52a1\u5458', 0)
        fa = p.get('\u8d22\u52a1\u5206\u6790\u5e08', 0)
        ds = p.get('\u6570\u636e\u79d1\u5b66\u5bb6', 0)
        print(f"  {c['name']:10s} SW={sw:>7,}  Doc={doc:>7,}  Nurse={nurse:>6,}  Teacher={teacher:>6,}  Lawyer={lawyer:>7,}  CivSvc={civil:>6,}  FA={fa:>6,}  DS={ds:>6,}")

print()
print("=== KEY OTHER CITIES ===")
for cid in [2, 3, 7, 16, 59, 61, 8, 6]:
    c = next((x for x in data['cities'] if x['id'] == cid), None)
    if c:
        p = c['professions']
        sw = p.get('\u8f6f\u4ef6\u5de5\u7a0b\u5e08', 0)
        doc = p.get('\u533b\u751f/\u533b\u5b66\u535a\u58eb', 0)
        nurse = p.get('\u62a4\u58eb', 0)
        teacher = p.get('\u6559\u5e08', 0)
        print(f"  {c['name']:10s} SW={sw:>7,}  Doc={doc:>7,}  Nurse={nurse:>6,}  Teacher={teacher:>6,}")
