---
description: "Data quality guard rules for city data files. Use when editing cities.json, taxData, constants, i18n city entries, or adding new cities."
applyTo: "public/data/cities.json,lib/taxData.ts,lib/constants.ts,lib/citySlug.ts,lib/cityIntros.ts,lib/cityLanguages.ts,lib/i18n.ts"
---

# 数据质量守则

编辑上述数据文件时，必须遵循以下规则：

## cities.json
- `professions` 的值必须是**年薪 USD**（不是月薪、不是本地货币）
- `averageIncome` 应为 professions 中位数
- 安全指数 `safetyIndex` 必须等于 5 项子指标按 30/25/20/15/10 加权平均（numbeo/homicide/gpi/gallup/wps，缺失权重重分配）
- `safetyConfidence`: 5个子指标全有=high, 缺1=medium, 缺2+=low（healthcare/governance同理）
- `governanceIndex` 使用 CPI/GovEffectiveness/WJP/PressFreedom(RSF)/MIPEX，权重 25/25/20/15/15
- `climate.annualRainMm` 应等于 `monthlyRainMm` 之和
- `monthlyHighC[m]` 必须 >= `monthlyLowC[m]`
- 每个城市必须恰好有 25 个 profession 键

## 跨文件一致性
- 新增城市必须**同时**更新：cities.json, CITY_FLAG_EMOJIS, CITY_COUNTRY, REGIONS, CITY_SLUGS, CITY_NAME_TRANSLATIONS, CITY_INTROS, CITY_LANGUAGES
- cities.json 中的 `country`（中文）必须与 taxData.ts 的 COUNTRY_TAX 键严格匹配

## 验证
- 完成数据编辑后运行：`node scripts/validate-data.mjs`
- 完成代码编辑后运行：`npx tsc --noEmit`
