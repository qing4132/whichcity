---
description: "Redesign 指导文件。修改页面组件、NavBar、首页、排行榜、对比页、城市详情页时必须对照 REDESIGN.md 的硬约束部分检查。"
applyTo: "components/HomeContent.tsx,components/CityDetailContent.tsx,components/RankingContent.tsx,components/CompareContent.tsx,components/NavBar.tsx,hooks/useSettings.ts"
---

# Redesign 指导文件

修改上述文件时，必须对照 `REDESIGN.md` 中的**硬约束**（第一部分）：

## 硬约束（必须遵守）
- 现有 URL 结构不变，老链接不会 404
- cities.json 字段只增不删
- 城市详情页核心数据保持默认可见（不折叠），SEO 基础设施保留
- 功能层不做减法——可以改交互方式，但不删功能维度
- 删除功能需要明确理由，不能凭直觉猜测使用率

## 设计原则（方向性参考）
- 当前产品定位尚未完全确定——不要过度下注在单一假设上
- 改进方向是建立信息层级，不是删除数据
- 降低视觉权重优先于折叠，折叠优先于删除
- 无用户数据时，保留功能但可降低优先级展示

## 具体方案（仅供参考，不是规范）
- REDESIGN.md 第三部分的所有内容（页面方案、删除/弱化清单等）仅为参考素材
- 实施时结合实际情况选择性采纳

## 改动前检查
- 编码规范见 `RULES.md`
- 数据质量见 `data-quality.instructions.md`
