# WhichCity 数据源许可审计报告

> 审计日期：2026-04-15
> 状态：初始审计完成，部分来源待确认
> 本文档仅供内部参考，不构成法律意见

---

## 总览

| 风险等级 | 数量 | 数据源 |
|---------|------|--------|
| 🔴 CRITICAL | 5 | Numbeo, Ookla, Global Property Guide, UNODC, IEP (GPI) |
| 🟠 HIGH | 3 | Gallup, EIU, SalaryExpert/ERI |
| 🟡 MEDIUM | 5 | RSF, Freedom House, MIPEX, WJP, OECD |
| 🟢 LOW | 10 | World Bank, BLS, Eurostat, Big Mac Index, EPA, NOAA, ILO, TI (CPI), Georgetown WPS, OAG/FlightConnections |

---

## 🔴 CRITICAL — 明确禁止商用或抓取

### 1. Numbeo

- **使用字段**: costModerate, costBudget, monthlyRent, housePrice, numbeoSafetyIndex
- **获取方式**: Web scraping（Clash 代理轮换）
- **TOS 原文**: "Automated data collection methods (such as scraping or crawling) are **strictly prohibited** unless you have obtained prior written permission"
- **商业使用**: ❌ 仅 Personal / Academic / Journalism 免费
- **抓取允许**: ❌ 明确禁止
- **归属要求**: 即使免费用途也需 link back to Numbeo.com
- **API 定价**: Basic $260/mo (200K queries), Pro $480/mo, Enterprise $1250/mo; Data License Advantage $260/mo
- **当前违规**: 同时违反抓取禁令和商用禁令
- **影响**: 5 个 L1 核心字段，移除后产品核心功能失效
- **联系方式**: https://www.numbeo.com/common/api_more_info.jsp

### 2. Ookla Speedtest

- **使用字段**: internetSpeedMbps
- **获取方式**: 公开数据集
- **许可**: CC BY-**NC**-SA 4.0
- **商业使用**: ❌ NC 条款明确禁止
- **归属要求**: 需注明 "Speedtest® by Ookla®"
- **替代方案**: M-Lab NDT (Apache 2.0, 允许商用)
- **影响**: L3 补充字段，影响小

### 3. Global Property Guide

- **使用字段**: housePrice（部分来源）
- **获取方式**: Web scraping + 手工
- **TOS 原文**: "Reproducing, distributing, scraping, or reselling our content is **strictly prohibited**"; "personal, non-commercial purposes only"
- **商业使用**: ❌
- **影响**: 低——housePrice 主要来自 Numbeo，解决 Numbeo 许可后此问题连带解决

### 4. UNODC

- **使用字段**: homicideRate (安全指数权重 25%)
- **获取方式**: 公开数据集
- **TOS 原文** (un.org): "The United Nations grants permission to Users to visit the Site and to download and copy the information... for the User's **personal, non-commercial use, without any right to resell or redistribute them or to compile or create derivative works** therefrom"
- **商业使用**: ❌ 明确禁止再分发和衍生作品
- **替代方案**: WHO 凶杀死亡率通过 World Bank API 获取 (CC BY 4.0, 指标 VC.IHR.PSRC.P5)，数据同源但渠道合规
- **影响**: 高——安全指数最重要的子指标之一

### 5. IEP Global Peace Index (GPI)

- **使用字段**: gpiScore (安全指数权重 20%)
- **获取方式**: 公开数据集下载
- **许可**: CC BY-**NC**-SA 4.0
- **TOS 原文**: "For commercial use of our data by private companies, all downloads are considered commercial. Therefore, private companies must pay the Commercial License fee before downloading any datasets."
- **商业许可**: $2,000/3 年 (单份 GPI 报告含 3 年数据)
- **商业使用**: ❌ 除非付费
- **替代方案**: 无直接等效免费替代。可用 ACLED 冲突数据 (开放获取) + Uppsala 冲突数据 (CC BY) 构建近似指标
- **联系方式**: https://www.economicsandpeace.org/consulting/data-licensing/

---

## 🟠 HIGH — 专有数据，需要许可

### 6. Gallup (Law & Order Index)

- **使用字段**: gallupLawOrder (安全指数权重 15%)
- **获取方式**: 付费报告手工提取
- **许可**: "© Gallup, Inc. All rights reserved" — 专有数据
- **商业使用**: ❌ 未经授权不可使用
- **替代方案**: 移除该子指标，将 15% 权重重分配给其余安全子指标
- **影响**: 中——移除后安全指数精度略降

### 7. EIU Democracy Index

- **使用字段**: democracyIndex
- **获取方式**: 公开报告手工提取
- **许可**: "© Economist Enterprise EIU. All rights reserved" — 需要 licensing
- **商业使用**: ❌ 需付费许可（EIU 有专门的 Content Licensing 页面）
- **替代方案**: V-Dem (Varieties of Democracy), CC BY-SA 4.0, 允许商用
- **联系方式**: https://www.eiu.com/n/content-licensing-partnerships/

### 8. SalaryExpert / ERI

- **使用字段**: professions（部分城市薪资数据来源之一）
- **获取方式**: 手工研究查询
- **许可**: 商业数据提供商，专有数据
- **商业使用**: ❌ 未经许可不可商业再分发
- **风险缓解**: 如果仅作为多来源交叉验证参考（而非直接复制具体数值），且薪资数据混合了 BLS/Eurostat/Glassdoor/PayScale 等多个来源，风险可降低
- **建议**: 记录每个城市薪资的实际主要来源，确保不直接复制 SalaryExpert 独有数据表

---

## 🟡 MEDIUM — 条款不明确，需联系确认

### 9. RSF Press Freedom Index

- **使用字段**: pressFreedomScore (治理指数 15%, 自由指数 35%)
- **获取方式**: 公开 CSV 下载
- **许可**: TOS 页面返回 404，无法获取正式条款
- **商业使用**: ⚠️ 不明确——数据公开下载但未附带许可声明
- **联系方式**: rsf.org/en/contact

### 10. Freedom House

- **使用字段**: internetFreedomScore
- **获取方式**: 邮件请求数据文件
- **TOS 原文**: "All use of Freedom House content for commercial purposes must be formally approved by Freedom House prior to publication or any other use." / "Use of Freedom House content for noncommercial purposes is permitted"
- **商业使用**: ⚠️ 需事先邮件申请批准（非自动禁止）
- **联系方式**: press@freedomhouse.org（主题行: "Permission Request: [公司名], [项目]"）
- **数据请求**: research@freedomhouse.org（主题行: "FOTN Data Request"）

### 11. MIPEX

- **使用字段**: mipexScore (治理指数 15%)
- **获取方式**: 公开网站导出
- **许可**: "Copyright © 2025 MIPEX. All rights reserved." — 无明确开放许可
- **商业使用**: ⚠️ 不明确。EU Horizon 2020 资助项目数据通常倾向开放获取
- **联系方式**: mipex.eu/contact 或 Migration Policy Group

### 12. WJP Rule of Law Index

- **使用字段**: wjpRuleLaw (治理指数 20%)
- **获取方式**: 公开 CSV 下载
- **许可**: TOS 页面内容无法加载；"Rule of Law Index®" 是注册商标
- **商业使用**: ⚠️ 无法确认——数据免费下载但条款不明
- **联系方式**: worldjusticeproject.org/about-us/connect/contact

### 13. OECD

- **使用字段**: annualWorkHours, paidLeaveDays
- **获取方式**: 公开 API / 手工
- **TOS 原文**: "Data may be subject to restrictions beyond the scope of these Terms and Conditions, either because specific terms apply to those Data or because third parties may have ownership interests."
- **商业使用**: ⚠️ 需逐个检查数据集元数据。OECD 自有内容为 CC BY-NC-SA 3.0 IGO；ILO ILOSTAT 数据为 CC BY 4.0
- **建议**: 优先使用 ILO ILOSTAT 数据 (CC BY 4.0)
- **联系方式**: comrights@oecd.org

---

## 🟢 LOW — 明确允许商业使用或风险极低

### 14. World Bank (多个指标)

- **使用字段**: doctorsPerThousand, hospitalBedsPerThousand, lifeExpectancy, outOfPocketPct, govEffectiveness, uhcCoverageIndex
- **许可**: **CC BY 4.0** ✅
- **商业使用**: ✅ 明确允许
- **归属要求**: "The World Bank: [Dataset name]"
- **API**: 免费，无需认证

### 15. Transparency International CPI

- **使用字段**: corruptionPerceptionIndex (治理指数 25%, 自由指数 30%)
- **许可**: **CPI 数据集 CC BY 4.0** ✅（注意：网站一般内容为 CC BY-ND 4.0，但 CPI 数据集明确标注 CC BY 4.0）
- **TOS 原文**: "the CPI and datasets are licensed under CC BY 4.0, which means that it is even easier to use them"
- **商业使用**: ✅
- **归属要求**: "CONTENT TITLE (YEAR) by Transparency International is licensed under CC BY 4.0"
- **注意**: 网站 Terms of Use §10 声称 "not to use our website for any commercial or business purposes"，但这是网站使用条款，CC BY 4.0 数据许可独立且不可撤销

### 16. BLS (US Bureau of Labor Statistics)

- **使用字段**: professions（美国城市薪资）
- **许可**: **Public Domain** ✅
- **TOS 原文**: "everything that we publish... is in the public domain"
- **商业使用**: ✅ 无限制

### 17. Eurostat

- **使用字段**: professions（欧洲城市薪资）
- **许可**: EU Commission Decision 2011/833/EU — CC BY 4.0 等效 ✅
- **商业使用**: ✅

### 18. The Economist Big Mac Index

- **使用字段**: bigMacPrice
- **许可**: 代码 MIT License, 数据 **CC BY 4.0** ✅ (GitHub 公开仓库)
- **商业使用**: ✅

### 19. US EPA AirNow

- **使用字段**: airQuality (126 城市)
- **许可**: **Public Domain**（美国联邦政府数据）✅
- **商业使用**: ✅

### 20. NOAA / 气象数据

- **使用字段**: climate
- **许可**: **Public Domain**（美国政府数据）✅
- **商业使用**: ✅

### 21. ILO ILOSTAT

- **使用字段**: annualWorkHours（部分）
- **许可**: **CC BY 4.0** ✅
- **商业使用**: ✅

### 22. Georgetown WPS Index

- **使用字段**: wpsIndex (安全指数 10%)
- **许可**: 无明确许可声明，但数据免费公开下载 (Excel)，学术机构产出
- **商业使用**: ⚠️ 未明确但风险低——学术研究数据通常允许引用
- **联系方式**: giwps@georgetown.edu

### 23. OAG / FlightConnections

- **使用字段**: directFlightCities（单一数值——航线数量）
- **许可**: 事实性数据（航线数量）在美国版权法下不受版权保护（*Feist v. Rural Telephone* 判例）
- **商业使用**: ✅ 事实数据不可版权化
- **注意**: 如果系统性抓取 FlightConnections 的详细航线列表则可能有问题，但我们仅使用"直飞航线数量"这一个数字

---

## 按字段分类的许可状态

| 字段 | 当前来源 | 许可状态 | 替代方案 |
|------|---------|---------|---------|
| costModerate | Numbeo | 🔴 需许可 | Expatistan, Livingcost.org, 或自行构建 |
| costBudget | Numbeo (派生) | 🔴 需许可 | 同上 |
| monthlyRent | Numbeo | 🔴 需许可 | 同上 |
| housePrice | Numbeo + GPG | 🔴 需许可 | 同上 (Numbeo 许可可覆盖) |
| numbeoSafetyIndex | Numbeo | 🔴 需许可 | 替换为其他安全数据源 |
| homicideRate | UNODC | 🔴 禁止 | World Bank API (CC BY 4.0) 同源数据 |
| gpiScore | IEP | 🔴 NC | 移除或付费 $2K/3yr |
| gallupLawOrder | Gallup | 🟠 专有 | 移除，权重重分配 |
| democracyIndex | EIU | 🟠 需许可 | V-Dem (CC BY-SA 4.0) |
| internetSpeedMbps | Ookla | 🔴 NC | M-Lab NDT (Apache 2.0) |
| professions | BLS+Eurostat+SalaryExpert+其他 | 🟢/🟠 混合 | 确保以公开来源为主 |
| pressFreedomScore | RSF | 🟡 不明确 | 联系确认 |
| internetFreedomScore | Freedom House | 🟡 需申请 | 邮件申请商用许可 |
| mipexScore | MIPEX | 🟡 不明确 | 联系确认或移除 |
| wjpRuleLaw | WJP | 🟡 不明确 | 联系确认 |
| corruptionPerceptionIndex | TI | 🟢 CC BY 4.0 | — |
| govEffectiveness | World Bank | 🟢 CC BY 4.0 | — |
| doctorsPerThousand | World Bank | 🟢 CC BY 4.0 | — |
| hospitalBedsPerThousand | World Bank | 🟢 CC BY 4.0 | — |
| uhcCoverageIndex | World Bank/WHO | 🟢 CC BY 4.0 | — |
| lifeExpectancy | World Bank | 🟢 CC BY 4.0 | — |
| outOfPocketPct | World Bank | 🟢 CC BY 4.0 | — |
| bigMacPrice | The Economist | 🟢 CC BY 4.0 | — |
| airQuality | EPA / IQAir | 🟢 Public Domain | — |
| annualWorkHours | OECD/ILO | 🟡/🟢 | 优先用 ILO (CC BY 4.0) |
| paidLeaveDays | OECD/各国劳动法 | 🟡/🟢 | 公开法律信息 |
| directFlightCities | OAG/FC | 🟢 事实数据 | — |
| wpsIndex | Georgetown | 🟢 低风险 | — |
| climate | NOAA | 🟢 Public Domain | — |

---

## 行动优先级

1. **Numbeo** [最高]: 决定购买许可或寻找替代方案
2. **UNODC → World Bank**: 改从 World Bank API 获取同源数据 (零成本)
3. **Ookla → M-Lab**: 替换数据源 (零成本)
4. **EIU → V-Dem**: 替换数据源 (零成本)
5. **IEP GPI**: 决定移除或付费
6. **Gallup**: 移除并重分配权重
7. **Freedom House / RSF / MIPEX / WJP**: 逐一发邮件申请许可
8. **SalaryExpert**: 审查薪资数据主要来源，确保以公开来源为主
