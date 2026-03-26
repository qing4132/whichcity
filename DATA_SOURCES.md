# 数据来源与方法论 — Data Sources & Methodology

## 概述

本项目城市数据为 **AI 辅助估算值**，基于多种公开数据源交叉参考而成，**不保证准确性**。
以下文档记录了每项数据的来源途径、获取方式与估算方法，供贡献者和用户参考。

---

## 数据字段来源

| 字段 | 来源 | 获取方式 |
|------|------|----------|
| `averageIncome` | ERI / SalaryExpert、BLS、PayScale、OECD | 综合估算各城市中等收入水平（USD） |
| `professions{}` | 同上 + Robert Half、Hays、智联招聘、JobStreet | 按职业查询各城市年薪中位数 |
| `costOfLiving` / `costModerate` | Numbeo、Expatistan、各国统计局 | 单人月生活开支（适度水平，USD） |
| `costComfort` / `costBudget` / `costMinimal` | 基于 `costModerate` 按比例计算 | comfort×1.6, budget×0.45, minimal×0.28 |
| `bigMacPrice` | The Economist Big Mac Index (2025-01) | 各国麦当劳巨无霸单品售价（USD） |
| `housePrice` | Global Property Guide、各地房产指数 | 城市中心区域每平米均价（USD/m²） |
| `airQuality` (AQI) | IQAir 世界空气质量报告 2024、AQICN | US EPA AQI 标准值 |
| `doctorsPerThousand` | WHO 全球卫生人力统计 / World Bank (CC BY-4.0) | 每千人执业医师数 |
| `description` | AI 生成 | 城市简介文本 |

---

## 巨无霸价格说明

- **数据来源**: The Economist Big Mac Index (https://github.com/TheEconomist/big-mac-data)
- 同一国家内各城市巨无霸价格基本一致（麦当劳全国统一定价策略）
- 部分城市所在国家无麦当劳（古巴、伊朗、柬埔寨、缅甸、老挝、孟加拉国、尼泊尔、蒙古），其 `bigMacPrice` 字段为 **`null`**
  - 前端显示「无麦当劳」标签（i18n key: `noMcDonalds`）
  - 巨无霸模式下，这些城市的收入/支出/储蓄/房价等转换值均显示「无麦当劳」
  - 对比页面中 `bigMacPrice` 为 null 的城市不参与该指标的胜负判定
- 参考数据时间点: 2025 年 1 月

---

## AQI 转换说明

- 中国大陆城市 AQI 原始数据来自 AQICN (aqicn.org)
- AQICN 默认使用中国 AQI（HJ 633-2012）标准
- 转换为 US EPA AQI 的系数: **× 1.4**
  - 依据: 中国 AQI 以 PM₁₀ 为主要指标，US EPA 以 PM₂.₅ 为主；
    两者在对应浓度区间的标度差异约为 1.4 倍
- 非中国城市 AQI 已直接采用 US EPA 标准值，无需转换

---

## 20 座新增亚洲城市（ID 101–120）的数据方法

这批城市由 `add_20_asian_cities.py` 脚本生成，方法如下:

### 收入与生活成本
- `averageIncome`、`costModerate`、`bigMacPrice`、`housePrice`、`airQuality`、`doctorsPerThousand`
  均为手动查询公开数据后填入的估算值
- 参考了 Numbeo、Expatistan、World Bank、IQAir 等来源

### 职业薪资
- 以北京（ID 4）的职业薪资为基准，乘以城市系数 `prof_scale` 统一缩放
- **局限**: 各职业统一使用相同系数，未能反映不同城市间职业结构的差异
- 例: 广州 `prof_scale = 0.88` → 所有职业收入 = 北京对应职业 × 0.88

### 各城市 prof_scale 参考

| 城市 | prof_scale | 说明 |
|------|-----------|------|
| 广州 | 0.88 | 珠三角核心，薪资接近北京 |
| 深圳 | 1.02 | 科技之都，略高于北京 |
| 成都 | 0.72 | 西南中心，薪资较低 |
| 杭州 | 0.94 | 互联网重镇 |
| 重庆 | 0.65 | 内陆城市 |
| 大阪 | 0.82 | 日本第二城（基准：北京） |
| 名古屋 | 0.75 | 日本中部 |
| 仁川 | 0.70 | 首尔都市圈 |
| 金边 | 0.20 | 东南亚新兴 |
| 仰光 | 0.14 | 缅甸最大城市 |
| 万象 | 0.15 | 老挝首都 |
| 清迈 | 0.30 | 泰国北部 |
| 达沃 | 0.24 | 菲律宾南部 |
| 达卡 | 0.17 | 孟加拉国首都 |
| 科伦坡 | 0.27 | 斯里兰卡商业首都 |
| 加德满都 | 0.14 | 尼泊尔首都 |
| 阿拉木图 | 0.38 | 哈萨克斯坦经济中心 |
| 塔什干 | 0.20 | 乌兹别克斯坦首都 |
| 巴库 | 0.30 | 阿塞拜疆首都 |
| 乌兰巴托 | 0.24 | 蒙古首都 |

---

## 已知局限与注意事项

1. **收入数据非真实美元汇率换算** — 数据集使用的是经调整的参考值，主要用于城市间横向对比，
   不应与各国官方统计局发布的平均薪资直接比较
2. **职业薪资统一缩放** — 20 座新城市的各职业薪资是北京的等比例缩放，
   未能反映各城市独有的行业结构和职业薪资差异
3. **部分城市无麦当劳** — 古巴(哈瓦那)、伊朗(德黑兰)、柬埔寨(金边)、缅甸(仰光)、老挝(万象)、孟加拉国(达卡)、尼泊尔(加德满都)、蒙古(乌兰巴托)
   的 `bigMacPrice` 为 `null`，不做估算；前端以「无麦当劳」标签替代数值展示
4. **数据时效性** — 基准数据来自 2024–2025 年，经济波动与汇率变化可能导致数据过时

---

## 数据修正记录

| 日期 | 内容 |
|------|------|
| 2025-06 | 修正 5 座中国新城市 AQI（AQICN raw × 1.4 → US EPA） |
| 2025-06 | 修正 9 座城市巨无霸价格（与现有数据集内部一致性对齐） |
| 2025-06 | 修正 add_aqi.py / add_20_asian_cities.py 中 AQICN 转换系数注释 |

---

## 如何改进数据

欢迎通过 [GitHub Issues](https://github.com/qing4132/citycompare/issues) 提交数据修正建议，请附上:
- 城市名称与字段
- 修正后的数值
- 数据来源链接
