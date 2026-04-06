"use client";
/* eslint-disable react/no-unescaped-entities */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CostTier, IncomeMode } from "@/lib/types";
import { POPULAR_CURRENCIES } from "@/lib/constants";
import { CITY_SLUGS } from "@/lib/citySlug";
import { LANGUAGE_LABELS, PROFESSION_TRANSLATIONS } from "@/lib/i18n";
import { useSettings } from "@/hooks/useSettings";

export default function MethodologyContent({ locale: urlLocale }: { locale: string }) {
  const router = useRouter();
  const s = useSettings(urlLocale);
  const { locale, darkMode, themeMode, t } = s;
  const professions = Object.keys(PROFESSION_TRANSLATIONS);
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => { document.title = `${t("navMethodology")} | WhichCity`; }, [locale]);

  if (!s.ready) return null;

  const bg = darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900";
  const navBg = darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200";
  const selectCls = `text-xs rounded px-1.5 py-1 border ${darkMode ? "bg-slate-800 border-slate-600 text-slate-200" : "bg-white border-slate-300 text-slate-700"}`;
  const cardBg = darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100";
  const subCls = darkMode ? "text-slate-400" : "text-slate-500";
  const headCls = darkMode ? "text-white" : "text-slate-900";
  const linkCls = darkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-500";
  const tableBorder = darkMode ? "border-slate-700" : "border-slate-200";
  const tableHead = darkMode ? "bg-slate-700/50" : "bg-slate-50";
  const warnBg = darkMode ? "bg-amber-900/30 border-amber-700 text-amber-200" : "bg-amber-50 border-amber-200 text-amber-800";

  const content: Record<string, { title: string; toc: { id: string; label: string }[]; sections: JSX.Element }> = {
    zh: {
      title: "方法论、数据来源与免责声明",
      toc: [
        { id: "data-overview", label: "数据总览" },
        { id: "income", label: "薪资数据" },
        { id: "cost", label: "生活成本" },
        { id: "housing", label: "住房数据" },
        { id: "work", label: "工作指标" },
        { id: "environment", label: "环境指标" },
        { id: "climate", label: "气候数据" },
        { id: "indices", label: "综合指数" },
        { id: "tax", label: "税后计算" },
        { id: "ranking", label: "排名系统" },
        { id: "compare", label: "城市对比" },
        { id: "detail", label: "城市详情" },
        { id: "display", label: "显示规则" },
        { id: "disclaimer", label: "免责声明" },
        { id: "feedback", label: "反馈源码" },
      ],
      sections: renderZh(),
    },
    en: {
      title: "Methodology, Data Sources & Disclaimer",
      toc: [
        { id: "data-overview", label: "Data Overview" },
        { id: "income", label: "Income Data" },
        { id: "cost", label: "Cost of Living" },
        { id: "housing", label: "Housing Data" },
        { id: "work", label: "Work Metrics" },
        { id: "environment", label: "Environment" },
        { id: "climate", label: "Climate Data" },
        { id: "indices", label: "Composite Indices" },
        { id: "tax", label: "Tax Calculations" },
        { id: "ranking", label: "Ranking System" },
        { id: "compare", label: "City Comparison" },
        { id: "detail", label: "City Detail Page" },
        { id: "display", label: "Display Rules" },
        { id: "disclaimer", label: "Disclaimers" },
        { id: "feedback", label: "Feedback" },
      ],
      sections: renderEn(),
    },
    ja: {
      title: "方法論・データソース・免責事項",
      toc: [
        { id: "data-overview", label: "データ概要" },
        { id: "income", label: "収入データ" },
        { id: "cost", label: "生活費" },
        { id: "housing", label: "住宅データ" },
        { id: "work", label: "労働指標" },
        { id: "environment", label: "環境指標" },
        { id: "climate", label: "気候データ" },
        { id: "indices", label: "総合指数" },
        { id: "tax", label: "税後計算" },
        { id: "ranking", label: "ランキング" },
        { id: "compare", label: "都市比較" },
        { id: "detail", label: "都市詳細" },
        { id: "display", label: "表示ルール" },
        { id: "disclaimer", label: "免責事項" },
        { id: "feedback", label: "フィードバック" },
      ],
      sections: renderJa(),
    },
    es: {
      title: "Metodología, fuentes de datos y descargo",
      toc: [
        { id: "data-overview", label: "Visión general" },
        { id: "income", label: "Datos salariales" },
        { id: "cost", label: "Coste de vida" },
        { id: "housing", label: "Vivienda" },
        { id: "work", label: "Indicadores laborales" },
        { id: "environment", label: "Medio ambiente" },
        { id: "climate", label: "Datos climáticos" },
        { id: "indices", label: "Índices compuestos" },
        { id: "tax", label: "Cálculo fiscal" },
        { id: "ranking", label: "Sistema de ranking" },
        { id: "compare", label: "Comparación" },
        { id: "detail", label: "Página de detalle" },
        { id: "display", label: "Reglas de visualización" },
        { id: "disclaimer", label: "Descargos" },
        { id: "feedback", label: "Comentarios" },
      ],
      sections: renderEs(),
    },
  };

  const { title, toc, sections } = content[locale] || content.en;

  function H2({ id, children }: { id: string; children: React.ReactNode }) {
    return <h2 id={id} className={`text-xl font-bold mt-10 mb-4 scroll-mt-20 ${headCls}`}>{children}</h2>;
  }
  function H3({ children }: { children: React.ReactNode }) {
    return <h3 className={`text-base font-semibold mt-6 mb-2 ${headCls}`}>{children}</h3>;
  }
  function P({ children }: { children: React.ReactNode }) {
    return <p className={`text-sm leading-relaxed mb-3 ${subCls}`}>{children}</p>;
  }
  function Warn({ children }: { children: React.ReactNode }) {
    return <div className={`text-sm rounded-lg border px-4 py-3 my-4 ${warnBg}`}>{children}</div>;
  }
  function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
    return (
      <div className="overflow-x-auto my-4">
        <table className={`w-full text-sm border ${tableBorder}`}>
          <thead><tr className={tableHead}>{headers.map((h, i) => <th key={i} className={`px-3 py-2 text-left border-b font-semibold ${tableBorder} ${subCls}`}>{h}</th>)}</tr></thead>
          <tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} className={`px-3 py-2 border-b ${tableBorder} ${subCls}`}>{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════
     Chinese content
     ══════════════════════════════════════════════════════════ */
  function renderZh() {
    return (<>
      <H2 id="data-overview">📊 数据总览</H2>
      <P>本站覆盖全球 134 座城市，涵盖 23 类原始数据和 4 项综合指数。所有薪资和费用均以美元 (USD) 为基准存储和计算，用户可在界面上选择 10 种主流货币显示。</P>
      <Table headers={["数据类别", "来源", "粒度", "数据年份"]} rows={[
        ["薪资（26 种职业）", "ERI / SalaryExpert、BLS (美)、PayScale、OECD、Robert Half、Hays、智联招聘、JobStreet", "城市 × 职业", "2024–2025"],
        ["生活成本（标准/节俭）", "Numbeo、Expatistan、各国统计局", "城市", "2024–2025"],
        ["房价（每平方米）", "Global Property Guide、各地房产指数", "城市", "2024–2025"],
        ["月租（市中心一居）", "Numbeo Rent Index", "城市", "2024–2025"],
        ["巨无霸价格", "The Economist Big Mac Index", "国家", "2025 年 1 月"],
        ["年工时", "OECD Employment Outlook 2024、ILO ILOSTAT", "国家平均", "2024"],
        ["带薪假期", "各国劳动法、OECD", "国家/地区", "2024"],
        ["网速 (Mbps)", "Ookla Speedtest Global Index", "城市", "2025 Q1"],
        ["空气质量 (AQI)", "IQAir 2024 年度报告、US EPA 标准", "城市", "2024"],
        ["每千人医生数", "WHO 全球卫生人力、World Bank (CC BY-4.0)", "国家", "2022–2024"],
        ["每千人病床数", "WHO / World Bank", "国家", "2022–2024"],
        ["UHC 覆盖指数", "WHO / World Bank", "国家", "2021"],
        ["预期寿命", "WHO / World Bank", "国家", "2022"],
        ["直飞城市数", "OAG Aviation、FlightConnections.com", "城市", "2025"],
        ["Numbeo 安全指数", "Numbeo Safety Index", "城市", "2025"],
        ["谋杀率", "UNODC", "国家", "2022–2024"],
        ["全球和平指数", "IEP GPI", "国家", "2025"],
        ["Gallup 法治指数", "Gallup", "国家", "2024"],
        ["新闻自由", "RSF Press Freedom Index", "国家", "2024"],
        ["民主指数", "EIU Democracy Index", "国家", "2024"],
        ["清廉指数", "Transparency International CPI", "国家", "2024"],
        ["气候（月度）", "WMO 1991–2020 常年值、NOAA、各国气象局", "城市", "1991–2020 基准"],
        ["汇率（10 种可选）", "ExchangeRate-API（每日自动更新）", "—", "每日"],
      ]} />
      <Warn>所有数据均为该来源的官方公开数据或经授权引用数据。薪资数据为税前年薪中位数估算，不代表个人实际收入。</Warn>

      <H2 id="income">💰 薪资数据</H2>
      <P>每座城市提供 26 种职业的税前年薪 (USD)。职业涵盖软件工程师、数据科学家、产品经理、设计师、教师、护士、会计等。</P>
      <H3>数据采集方法</H3>
      <P>综合 ERI / SalaryExpert（全球一手数据）、美国劳工统计局 BLS（美国城市）、PayScale（用户自报）、OECD 数据库、Robert Half / Hays 薪资指南（职业调查）、智联招聘（中国城市），以及 JobStreet / Indeed / Glassdoor（东南亚城市）。对于每种职业 × 城市组合，取多个来源的中位数估算值。</P>
      <H3>收入模式</H3>
      <P>用户可选择三种模式：<strong>税前</strong>（Gross）— 不扣除；<strong>税后</strong>（Net）— 按当地居民税制扣除个税和社保；<strong>外籍税后</strong>（ExpatNet）— 应用适用的外籍人士优惠方案（如荷兰 30% 规则、西班牙贝克汉姆法等）。详见「税后计算」章节。</P>

      <H2 id="cost">🛒 生活成本</H2>
      <P>每座城市有两档月均生活费：<strong>标准消费</strong>（Moderate）和<strong>节俭消费</strong>（Budget）。均以美元/月为单位。</P>
      <P>标准消费包括合租或独租、餐饮、交通、娱乐、通信等综合开支，反映当地中等收入水平的生活方式。节俭消费反映有意控制支出的生活方式，通常为标准消费的 60–75%。</P>
      <P>来源：Numbeo、Expatistan 的城市级数据，经各国统计局物价指数校准。</P>

      <H2 id="housing">🏠 住房数据</H2>
      <P><strong>房价</strong>：每平方米价格 (USD/m²)，取城市中心与非中心的加权均值。来源：Global Property Guide 和各地房产指数。</P>
      <P><strong>月租</strong>：市中心一居室月租 (USD)。来源：Numbeo。</P>
      <P><strong>购房年数</strong>：按 70m² 住房面积，(房价 × 70) ÷ 年储蓄，其中年储蓄 = 年收入 − 月支出 × 12。若储蓄 ≤ 0 则显示 "N/A"。</P>

      <H2 id="work">💼 工作指标</H2>
      <P><strong>年工时</strong>：国家级平均年工时。来源：OECD Employment Outlook 2024 和 ILO ILOSTAT。部分国家数据缺失时标注 "—"。</P>
      <P><strong>时薪</strong>：运行时计算 = 年收入 ÷ 年工时。</P>
      <P><strong>带薪假期</strong>：国家法定年假天数。来源：各国劳动法规和 OECD 数据库。</P>
      <P><strong>巨无霸购买力</strong>：时薪 ÷ 当地巨无霸价格，衡量最基本的购买力。来源：The Economist 2025 年 1 月版。巨无霸价格以国家为粒度。</P>

      <H2 id="environment">🌍 环境指标</H2>
      <H3>空气质量 (AQI)</H3>
      <P>以美国 EPA AQI 标准为基准。多数城市数据来自 IQAir 2024 年度报告。<strong>中国大陆城市</strong>使用中国国标 AQI (CN)，数值通常高于 EPA 标准——界面中对中国城市特别标注 "AQI (CN)" 以区分。由于两种标准的对应关系复杂且非线性（尤其在 PM2.5 和 PM10 的对应上），本站不做统一转换，而是如实标注标准差异。</P>
      <H3>网速</H3>
      <P>固定宽带下行平均速率 (Mbps)，来源：Ookla Speedtest Global Index 2025 Q1 数据。</P>
      <H3>直飞城市数</H3>
      <P>从该城市主要机场可直飞的独立目的地城市数。来源：OAG Aviation Analytics 和 FlightConnections.com (2025)。</P>

      <H2 id="climate">🌤 气候数据</H2>
      <P>气候数据存储在代码中的 CITY_CLIMATE 对象。每座城市包含：气候类型（热带/温带/大陆性/干旱/地中海/海洋性）、年均温、年降水、日照时数、夏季均温、冬季均温、湿度百分比。</P>
      <P>月度数据（12 个月的日最高/最低温和降水量）来自 WMO Climate Normals 1991–2020、NOAA NCEI、各国气象局（JMA / CMA / KMA / BOM / AEMET / Météo-France / Met Office / DWD 等），以及 Wikipedia "Climate of [City]" 条目中引用的官方数据。</P>
      <P>南半球城市的月度顺序与北半球一致（1–12 月），夏季对应 12–2 月。</P>

      <H2 id="indices">📐 综合指数</H2>
      <P>本站有 4 个综合指数，每个归一化到 0–100 分，均由多个子指标加权计算。</P>

      <H3>1. 生活压力指数（越低越好）</H3>
      <P>衡量一座城市的综合生活压力。运行时计算，受职业和消费档位选择影响。</P>
      <Table headers={["子指标", "权重", "方向", "锚定范围"]} rows={[
        ["储蓄率 = (收入 − 支出×12) / 收入", "30%", "越高越好", "-30% ~ 85%"],
        ["巨无霸购买力 = 时薪 / 巨无霸价格", "25%", "越高越好", "1.0 ~ 22.0"],
        ["年工时（反向）", "25%", "越低越好", "1200h ~ 2500h"],
        ["购房年数（反向）", "20%", "越低越好", "3 年 ~ 120 年"],
      ]} />
      <P>每个子指标使用锚定归一化而非 min-max：先将原始值 clamp 到锚定范围内，再线性映射到 0–100。最终结果 = 100 − 加权和（反转：数值越大压力越大）。</P>
      <P><strong>缺失数据处理</strong>：若某子指标数据缺失（如巨无霸价格为 null），该子指标不参与计算，其权重按比例重新分配给其他可用子指标。可信度根据缺失量评定：0 缺失 → high，1–2 缺失 → medium，3+ 缺失 → low。</P>

      <H3>2. 安全指数（越高越安全）</H3>
      <Table headers={["子指标", "权重", "来源"]} rows={[
        ["Numbeo 安全指数", "35%", "Numbeo 2025"],
        ["谋杀率（反向归一化）", "30%", "UNODC 2022–2024"],
        ["全球和平指数（反向归一化）", "20%", "IEP GPI 2025"],
        ["Gallup 法治指数", "15%", "Gallup 2024"],
      ]} />
      <P>预计算存储于 cities.json。所有子指标归一化到 0–100，加权求和。缺失子指标的权重等比重新分配给已有指标。界面中用 * 号标记缺失项。</P>
      <P><strong>安全警告</strong>：处于武装冲突区、治理崩溃或信息封锁的城市会显示特别警告标签。</P>

      <H3>3. 医疗指数（越高越好）</H3>
      <Table headers={["子指标", "权重", "来源"]} rows={[
        ["每千人医生数", "35%", "WHO / World Bank"],
        ["每千人病床数", "25%", "WHO / World Bank"],
        ["UHC 覆盖指数", "25%", "WHO"],
        ["预期寿命", "15%", "WHO / World Bank"],
      ]} />
      <P>预计算存储于 cities.json，缺失子指标同样使用权重重新分配。</P>

      <H3>4. 制度自由指数（越高越好）</H3>
      <Table headers={["子指标", "权重", "来源"]} rows={[
        ["新闻自由 (RSF)", "35%", "RSF 2024"],
        ["民主指数 (EIU)", "35%", "EIU 2024"],
        ["清廉指数 (TI CPI)", "30%", "Transparency International 2024"],
      ]} />
      <P>预计算存储于 cities.json。这三项数据均为国家级指标，反映的是国家层面的制度环境而非城市本身。</P>

      <H2 id="tax">🧾 税后计算</H2>
      <P>税后收入计算引擎覆盖 79 个国家/地区的税制，包括累进税率、社保缴纳、就业扣除等。</P>
      <H3>计算流程</H3>
      <P>1. 税前 USD → 当地货币（按每日更新汇率，拉取失败时回退到上次成功的汇率）→ 2. 扣除社保/公积金 → 3. 扣除职工费用（如法国 10%、德国 Werbungskosten）→ 4. 计算应税所得 → 5. 套用累进税率 → 6. 扣除地方税（美国各州、加拿大各省）→ 7. 得到税后当地货币 → USD。</P>
      <P>日本特殊处理：额外加计 10% 住民税，使用独立的《给与所得控除》扣除表。韩国特殊处理：使用独立的《근로소득공제》扣除表。</P>
      <H3>外籍人士优惠方案</H3>
      <P>当用户选择「外籍税后」模式时，以下国家会自动应用当地的外籍优惠政策。若优惠后税后收入反而低于普通税后，系统自动回退到普通税后。</P>
      <Table headers={["国家", "方案", "类型", "说明"]} rows={[
        ["荷兰", "30% 规则 (30% Ruling)", "免税比例", "30% 收入免税"],
        ["西班牙", "贝克汉姆法 (Beckham Law)", "固定税率", "€600K 以下 24%，以上 47%"],
        ["意大利", "回归者减免 (Impatriati)", "免税比例", "50% 收入免税"],
        ["葡萄牙", "NHR 2.0 非常规居民", "固定税率", "20% 固定税率"],
        ["波兰", "19% 固定税率", "固定税率", "外国人可选 19%"],
        ["新加坡", "CPF 豁免", "免社保", "外籍免交 CPF"],
      ]} />
      <P>界面中当优惠方案被应用时，会在收入数字旁显示 "{`{scheme}`} 适用中" 标签。</P>
      <Warn>税后计算为简化估算，仅供参考。未考虑：个人免税额差异、家庭状况、投资收入、地方附加税（除美国州税/加拿大省税外）、时间限制（如荷兰 30% 规则最多 5 年）等因素。请以当地税务机关或专业税务顾问意见为准。</Warn>

      <H2 id="ranking">🏅 排名系统</H2>
      <P>排名页提供 5 大类共 16 项指标的全球城市排行，用户可切换职业和消费档位。</P>
      <P><strong>单选 / 多选模式</strong>：默认为单选模式，按单项指标排名。切换到多选模式后，可同时选择多项指标，系统对各项百分位排名取平均计算综合得分，按综合得分排行。</P>
      <P><strong>气候筛选</strong>：可按气候类型（热带、温带、大陆性、干旱、地中海、海洋性）和 5 项气候维度（年均温、冬夏温差、年降水、年均湿度、日照）筛选城市范围。维度按三分位阈值（p33/p66）划分为三档。气候筛选独立于排名指标，不影响得分计算。</P>
      <P><strong>排名规则</strong>：使用密集排名（Dense Ranking）——并列排名相同，后续跳跃。例如：若两城并列第 1，下一名为第 3。</P>
      <P><strong>排序方向</strong>：高优型（收入、储蓄、安全等）按降序排列；低优型（支出、AQI、工时等）按升序排列。缺失数据排在最后。</P>
      <P><strong>配色规则</strong>：每项指标的第 1 名获得金色🥇标记。综合指数（生活压力、安全等）使用可展开的子指标详情。</P>
      <P><strong>状态记忆</strong>：排名页的指标选择、单选/多选模式和气候筛选条件会保存到浏览器本地存储，下次访问时自动恢复。</P>

      <H2 id="compare">⚖️ 城市对比</H2>
      <P>对比页支持同时对比 2–3 座城市（窄屏为 2 座）。对比覆盖 16 项数据指标 + 6 项气候指标。</P>
      <P><strong>胜出判定</strong>：对于每项指标，取所有参与城市的最优值（高优型取最大，低优型取最小）。持有该最优值的城市获得该指标的胜出。若多城数值完全相同则全部胜出。「领先项」计数统计每座城市的总胜出数（不含气候指标）。</P>
      <P><strong>绿色高亮</strong>：每行中胜出城市的数值以绿色显示。气候类指标不参与胜负判定。</P>
      <P><strong>柱状图纵轴</strong>：对比页的气候柱状图共享统一的纵轴刻度（取所有城市的全局最大/最小值），便于直观对比。</P>

      <H2 id="detail">📄 城市详情页</H2>
      <H3>相似城市推荐</H3>
      <P>采用 21 维归一化欧氏距离算法。21 个维度包括：收入、支出、储蓄、房价、购房年数、月租、工时、时薪、年假、AQI、网速、直飞数、生活压力指数、医疗指数、自由指数、安全指数，以及 5 项气候指标（年均温、温差、年降水、湿度、日照）。维度使用 min-max 归一化，取距离最近的 6 座城市。</P>
      <H3>指标对比高亮</H3>
      <P>相似城市卡片中显示与当前城市相比的主要优势/劣势：绿色 ↑ 表示该城市相对更好，红色 ↓ 表示更差。对比项包括收入、支出、房价等，取百分比差异最显著的几项。</P>
      <H3>官方语言</H3>
      <P>显示该城市的官方语言（仅限国家/州/城市层面具有宪法或法律地位的语言），按城市内估算使用人数降序排列。</P>

      <H2 id="display">🎨 显示规则</H2>
      <H3>颜色标记（Tier 系统）</H3>
      <P>在排名页和城市详情页中，每项指标按百分位着色：前 20% → 绿色（emerald）、后 20% → 红色（rose）、中间 60% → 灰色。「前」和「后」根据指标方向定义：高优型指标中排名前 20% 为绿色，低优型指标中排名前 20% 也为绿色。</P>
      <H3>可信度标签</H3>
      <P>综合指数显示可信度标签：“⚠ 可信度低” 表示该城市缺失子指标的权重合计超过 1/3；“部分数据缺失” 表示有子指标缺失但权重合计未超过 1/3。缺失子指标在展开详情中以 * 号标记。</P>
      <H3>AQI (CN) 标注</H3>
      <P>中国大陆城市的 AQI 使用中国国标，界面中标注为 "AQI (CN)"，其余城市使用 US EPA 标准标注为 "AQI"。两种标准在不同污染物浓度下的数值差异较大。</P>
      <H3>货币转换</H3>
      <P>界面上的所有金额均可换算为 10 种主流货币显示。汇率通过 ExchangeRate-API 每日自动更新。</P>
      <H3>缺失数据显示</H3>
      <P>缺失数据统一显示为 "—"。</P>

      <H2 id="disclaimer">⚠️ 免责声明</H2>

      <H3>数据准确性</H3>
      <P>本站所有数据仅供参考，不构成任何投资、移民、就业或税务建议。薪资数据为税前中位数估算，个人实际收入受经验、谈判力、公司规模、合同类型等因素影响可能有显著差异。生活成本因个人消费习惯差异较大。建议用户结合多个来源交叉验证。</P>

      <H3>税务声明</H3>
      <P>税后收入计算为简化模型，未考虑全部免税额、家庭状况、投资收入、雇主代缴、地方附加税等因素。外籍优惠方案有时间限制和资格要求，本站未做资格验证。请咨询专业税务顾问获取个人建议。</P>

      <H3>汇率声明</H3>
      <P>汇率通过 ExchangeRate-API 每日自动更新，但不代表实时市场汇率。汇率波动可能导致显示金额与实际兑换金额存在差异。</P>

      <H3>指数与排名</H3>
      <P>综合指数（生活压力、安全、医疗、自由）为本站基于公开数据计算的合成指标，不代表任何官方评级。排名方法论基于公开数据源，权重分配反映编辑判断。不同权重可能产生不同排名。</P>

      <H3>制度自由指数</H3>
      <P>制度自由指数的三个子指标（新闻自由、民主指数、清廉指数）均为国际组织发布的国家级评估。这些评估反映发布机构的方法论和判断，本站仅做聚合和展示，不代表认同其全部结论。用户可展开查看各子指标的独立来源和数值。</P>

      <H3>空气质量标准差异</H3>
      <P>中国大陆城市使用中国国家标准 AQI (HJ 633-2012)，其余城市使用美国 EPA 标准。两种标准的计算方法、污染物阈值和健康等级划分不同，数值不具有直接可比性。本站不做标准间转换，以避免引入更大误差。</P>

      <H3>地区与主权</H3>
      <P>本站城市列表按地理位置和实际行政管辖划分，数据来源基于各城市的实际管辖经济体的统计体系。城市的分类和数据归属不代表对任何领土主权或政治地位的立场。港澳台城市的数据分别来自其各自的统计机构。</P>

      <H3>安全警告</H3>
      <P>部分城市标注有安全警告（武装冲突区、治理崩溃、信息封锁），这些标注基于公开国际报告。安全指数在此类城市的参考价值有限。</P>

      <H3>数据更新</H3>
      <P>数据更新周期约为每年一次。城市详情页底部标注的是最近一次数据更新时间。各数据来源的版本年份见「数据总览」表格。在两次更新之间，真实数据可能已发生变化。</P>

      <H3>版权与许可</H3>
      <P>数据来源的版权归各原始发布机构所有。World Bank 数据遵循 CC BY-4.0 协议。Numbeo 数据基于其公开页面。The Economist Big Mac Index 数据遵循其编辑许可。</P>

      <H3>法律</H3>
      <P>本站不承担因使用本站数据做出的任何决策所导致的直接或间接损失。使用本站即表示您同意上述免责条款。</P>

      <P>最后更新：2026 年 3 月</P>

      <H2 id="feedback">💬 反馈源码</H2>
      <P>本站开源于 <a href="https://github.com/qing4132/whichcity" target="_blank" rel="noopener noreferrer" className={linkCls}>GitHub</a>。如有数据纠错或功能建议，欢迎 <a href="https://github.com/qing4132/whichcity/issues" target="_blank" rel="noopener noreferrer" className={linkCls}>提交 Issue</a> 或发送邮件至 <a href="mailto:qing4132@users.noreply.github.com" className={linkCls}>qing4132@users.noreply.github.com</a>。</P>
    </>);
  }

  /* ══════════════════════════════════════════════════════════
     English content
     ══════════════════════════════════════════════════════════ */
  function renderEn() {
    return (<>
      <H2 id="data-overview">📊 Data Overview</H2>
      <P>This site covers 134 cities worldwide with 23 data categories and 4 composite indices. All salaries and costs are stored and computed in USD. Users can display values in 10 major currencies.</P>
      <Table headers={["Category", "Source", "Granularity", "Data Year"]} rows={[
        ["Salaries (26 professions)", "ERI / SalaryExpert, BLS (US), PayScale, OECD, Robert Half, Hays, Zhilian, JobStreet", "City × Profession", "2024–2025"],
        ["Cost of Living (Standard/Budget)", "Numbeo, Expatistan, National Statistics Offices", "City", "2024–2025"],
        ["House Price per m²", "Global Property Guide, Local Indices", "City", "2024–2025"],
        ["Monthly Rent (1BR center)", "Numbeo Rent Index", "City", "2024–2025"],
        ["Big Mac Price", "The Economist Big Mac Index", "Country", "Jan 2025"],
        ["Annual Work Hours", "OECD Employment Outlook 2024, ILO ILOSTAT", "Country avg", "2024"],
        ["Paid Leave Days", "National labor law, OECD", "Country", "2024"],
        ["Internet Speed (Mbps)", "Ookla Speedtest Global Index", "City", "2025 Q1"],
        ["Air Quality (AQI)", "IQAir 2024 Annual, US EPA standard", "City", "2024"],
        ["Doctors per 1,000", "WHO Global Health, World Bank (CC BY-4.0)", "Country", "2022–2024"],
        ["Hospital Beds per 1,000", "WHO / World Bank", "Country", "2022–2024"],
        ["UHC Coverage Index", "WHO / World Bank", "Country", "2021"],
        ["Life Expectancy", "WHO / World Bank", "Country", "2022"],
        ["Direct Flight Cities", "OAG Aviation, FlightConnections.com", "City", "2025"],
        ["Numbeo Safety Index", "Numbeo Safety Index", "City", "2025"],
        ["Homicide Rate", "UNODC", "Country", "2022–2024"],
        ["Global Peace Index", "IEP GPI", "Country", "2025"],
        ["Gallup Law & Order", "Gallup", "Country", "2024"],
        ["Press Freedom", "RSF Press Freedom Index", "Country", "2024"],
        ["Democracy Index", "EIU Democracy Index", "Country", "2024"],
        ["Corruption Perception", "Transparency International CPI", "Country", "2024"],
        ["Climate (Monthly)", "WMO Normals 1991–2020, NOAA, National Met Agencies", "City", "1991–2020 baseline"],
        ["Exchange Rates (10 selectable)", "ExchangeRate-API (auto-updated daily)", "—", "Daily"],
      ]} />
      <Warn>All data comes from official public sources or authorized data. Salary figures are median gross annual estimates, not individual offers.</Warn>

      <H2 id="income">💰 Income Data</H2>
      <P>Each city has gross annual salaries (USD) for 26 professions including software engineer, data scientist, product manager, designer, teacher, nurse, accountant, etc.</P>
      <H3>Collection Method</H3>
      <P>Aggregated from ERI/SalaryExpert (global primary), BLS (US cities), PayScale (user-reported), OECD, Robert Half/Hays salary guides, Zhilian (China), and JobStreet/Indeed/Glassdoor (Southeast Asia). For each profession×city, we use the median estimate across sources.</P>
      <H3>Income Modes</H3>
      <P>Users can choose: <strong>Gross</strong> — no deductions; <strong>Net</strong> — local resident tax/social deductions; <strong>Expat Net</strong> — applies eligible expatriate tax schemes (e.g., Netherlands 30% Ruling, Spain Beckham Law). See Tax Calculations section.</P>

      <H2 id="cost">🛒 Cost of Living</H2>
      <P>Two tiers: <strong>Moderate</strong> (standard lifestyle) and <strong>Budget</strong> (frugal, ~60-75% of moderate). Both in USD/month. Sources: Numbeo, Expatistan, calibrated with national statistics price indices.</P>

      <H2 id="housing">🏠 Housing Data</H2>
      <P><strong>House Price</strong>: USD/m², weighted average of city center and suburbs. <strong>Monthly Rent</strong>: 1-bedroom city center (Numbeo). <strong>Years to Buy</strong>: (price × 70m²) ÷ annual savings. Displays "N/A" if savings ≤ 0.</P>

      <H2 id="work">💼 Work Metrics</H2>
      <P><strong>Annual Work Hours</strong>: Country-level average (OECD/ILO). <strong>Hourly Wage</strong>: income ÷ work hours. <strong>Paid Leave</strong>: Statutory days by law. <strong>Big Mac Power</strong>: hourly wage ÷ Big Mac price (The Economist, Jan 2025).</P>

      <H2 id="environment">🌍 Environment</H2>
      <H3>Air Quality (AQI)</H3>
      <P>US EPA AQI standard for most cities (IQAir 2024). <strong>Mainland China cities use China's national AQI standard (HJ 633-2012)</strong>, marked as "AQI (CN)" in the UI. The two standards differ in calculation methods, pollutant thresholds, and health categories — values are not directly comparable. We do not convert between standards to avoid introducing larger errors.</P>
      <H3>Internet Speed</H3>
      <P>Fixed broadband average download (Mbps). Source: Ookla Speedtest Global Index 2025 Q1.</P>
      <H3>Direct Flights</H3>
      <P>Unique destination cities with direct flights from major airports. Source: OAG Aviation, FlightConnections.com (2025).</P>

      <H2 id="climate">🌤 Climate Data</H2>
      <P>Stored in CITY_CLIMATE. Each city: climate type (tropical/temperate/continental/arid/mediterranean/oceanic), annual averages (temp, rain, sunshine, humidity, summer/winter temps), and monthly data (12 months × high/low/rain).</P>
      <P>Sources: WMO Climate Normals 1991–2020, NOAA NCEI, national meteorological services (JMA, CMA, KMA, BOM, AEMET, Météo-France, Met Office, DWD, etc.). Southern hemisphere cities use calendar-month order (Jan–Dec).</P>

      <H2 id="indices">📐 Composite Indices</H2>
      <P>Four composite indices, each normalized to 0–100.</P>
      <H3>1. Life Pressure Index (lower = better)</H3>
      <Table headers={["Sub-indicator", "Weight", "Direction", "Anchor Range"]} rows={[
        ["Savings Rate = (income − cost×12) / income", "30%", "Higher = better", "-30% ~ 85%"],
        ["Big Mac Power = hourly wage / Big Mac price", "25%", "Higher = better", "1.0 ~ 22.0"],
        ["Annual Work Hours (inverted)", "25%", "Lower = better", "1200h ~ 2500h"],
        ["Years to Buy Home (inverted)", "20%", "Lower = better", "3 ~ 120 years"],
      ]} />
      <P>Uses anchored normalization (not min-max): values clamped to anchor range, then linearly scaled to 0–100. Final = 100 − weighted sum (inverted: higher = more pressure).</P>
      <P><strong>Missing data</strong>: Missing sub-indicators are excluded and their weights redistributed proportionally to available sub-indicators. Confidence: 0 missing = high, 1–2 = medium, 3+ = low.</P>

      <H3>2. Safety Index (higher = safer)</H3>
      <Table headers={["Sub-indicator", "Weight", "Source"]} rows={[
        ["Numbeo Safety Index", "35%", "Numbeo 2025"],
        ["Homicide Rate (inverted)", "30%", "UNODC 2022–2024"],
        ["Global Peace Index (inverted)", "20%", "IEP GPI 2025"],
        ["Gallup Law & Order Index", "15%", "Gallup 2024"],
      ]} />
      <P>Pre-computed. Missing sub-indicator weights are redistributed proportionally. Marked with * in the UI.</P>

      <H3>3. Healthcare Index (higher = better)</H3>
      <Table headers={["Sub-indicator", "Weight", "Source"]} rows={[
        ["Doctors per 1,000", "35%", "WHO / World Bank"],
        ["Hospital Beds per 1,000", "25%", "WHO / World Bank"],
        ["UHC Coverage Index", "25%", "WHO"],
        ["Life Expectancy", "15%", "WHO / World Bank"],
      ]} />

      <H3>4. Institutional Freedom Index (higher = better)</H3>
      <Table headers={["Sub-indicator", "Weight", "Source"]} rows={[
        ["Press Freedom (RSF)", "35%", "RSF 2024"],
        ["Democracy Index (EIU)", "35%", "EIU 2024"],
        ["Corruption Perception (TI CPI)", "30%", "Transparency Intl 2024"],
      ]} />
      <P>All three are country-level metrics reflecting national institutional environment, not city-specific conditions.</P>

      <H2 id="tax">🧾 Tax Calculations</H2>
      <P>Tax engine covers 79 countries/territories with progressive brackets, social contributions, and employment deductions.</P>
      <H3>Calculation Flow</H3>
      <P>Gross USD → Local currency (using daily auto-updated exchange rates; falls back to last successful rate if API is unavailable) → Social deductions → Employment deductions → Taxable income → Progressive brackets → Local/state tax → Net local → Net USD.</P>
      <P>Special: Japan adds 10% resident tax + employment income deduction schedule. Korea uses 근로소득공제 schedule.</P>
      <H3>Expatriate Tax Schemes</H3>
      <Table headers={["Country", "Scheme", "Type", "Details"]} rows={[
        ["Netherlands", "30% Ruling", "Exemption", "30% of income tax-exempt"],
        ["Spain", "Beckham Law", "Flat rate", "24% under €600K, 47% above"],
        ["Italy", "Impatriati Regime", "Exemption", "50% of income tax-exempt"],
        ["Portugal", "NHR 2.0", "Flat rate", "20% flat rate"],
        ["Poland", "19% Flat Rate", "Flat rate", "Optional 19% for foreigners"],
        ["Singapore", "CPF Exemption", "No social", "Foreigners exempt from CPF"],
      ]} />
      <Warn>Tax calculations are simplified estimates. Not considered: personal allowance variations, family status, investment income, employer-side contributions, time limits on expat schemes. Consult a qualified tax advisor for personal advice.</Warn>

      <H2 id="ranking">🏅 Ranking System</H2>
      <P>16 metrics across 5 categories. Users can switch profession and cost tier.</P>
      <P><strong>Single / Multi mode</strong>: Default is single-select mode, ranking by one metric. In multi-select mode, multiple metrics can be chosen; the system averages their percentile ranks to compute a composite score.</P>
      <P><strong>Climate filter</strong>: Filter cities by climate type (tropical, temperate, continental, arid, Mediterranean, oceanic) and 5 climate dimensions (avg temp, seasonal diff, rainfall, humidity, sunshine). Dimensions are split into 3 tiers at p33/p66 percentile thresholds. Climate filtering is independent of ranking metrics and does not affect score calculation.</P>
      <P><strong>Ranking rules</strong>: Dense ranking with ties (e.g., 1,1,3). Higher-is-better metrics sorted descending; lower-is-better sorted ascending. Missing values sorted last.</P>
      <P><strong>State persistence</strong>: Metric selection, single/multi mode, and climate filter settings are saved to browser local storage and restored on next visit.</P>

      <H2 id="compare">⚖️ City Comparison</H2>
      <P>Compare 2–3 cities across 16 data metrics + 6 climate metrics. Winner = best value per row (max for higher-is-better, min for lower-is-better). Ties: all matching cities win. "Leading" count excludes climate metrics. Winner values shown in green.</P>
      <P>Climate charts share unified Y-axis scale across all compared cities for visual comparability.</P>

      <H2 id="detail">📄 City Detail Page</H2>
      <H3>Similar Cities</H3>
      <P>21-dimensional normalized Euclidean distance. Dimensions: income, cost, savings, house price, years-to-buy, rent, work hours, hourly wage, paid leave, AQI, internet, flights, life pressure, healthcare, freedom, safety, + 5 climate (avg temp, temp range, rain, humidity, sunshine). Min-max normalization. Returns closest 6 cities.</P>
      <H3>Highlight Comparison</H3>
      <P>Similar city cards show key advantages (green ↑) and disadvantages (red ↓) vs. current city, by percentage difference.</P>
      <H3>Official Languages</H3>
      <P>Only languages with constitutional/legal status at national, state, or city level. Sorted by estimated speaker count within the city (descending).</P>

      <H2 id="display">🎨 Display Rules</H2>
      <H3>Color Coding (Tier System)</H3>
      <P>Rankings and detail page: top 20% → green (emerald), bottom 20% → red (rose), middle 60% → gray. "Top" and "bottom" are defined by metric direction.</P>
      <H3>Confidence Labels</H3>
      <P>“⚠ Low confidence”: missing sub-indicators account for more than 1/3 of total weight. “Partial data missing”: some sub-indicators missing but total missing weight ≤ 1/3. Missing sub-indicators marked with * in expanded view.</P>
      <H3>Currency Conversion</H3>
      <P>All amounts convertible to 10 major currencies. Rates auto-updated daily via ExchangeRate-API.</P>
      <H3>Missing Data</H3>
      <P>Displayed as "—" throughout.</P>

      <H2 id="disclaimer">⚠️ Disclaimers</H2>

      <H3>Data Accuracy</H3>
      <P>All data is for reference only and does not constitute investment, immigration, employment, or tax advice. Salary figures are median gross estimates; actual income varies significantly by experience, negotiation, company, and contract type. Living costs depend heavily on personal habits. Cross-reference with multiple sources is recommended.</P>

      <H3>Tax Disclaimer</H3>
      <P>After-tax calculations are simplified models. Not considered: full personal allowances, family status, investment income, employer contributions, local surcharges (except US state/Canadian provincial tax), time limits on expat schemes. Consult a qualified tax advisor.</P>

      <H3>Exchange Rates</H3>
      <P>Rates auto-updated daily via ExchangeRate-API, but do not represent real-time market rates. Currency fluctuations may cause displayed amounts to differ from actual conversion rates.</P>

      <H3>Indices & Rankings</H3>
      <P>Composite indices (life pressure, safety, healthcare, freedom) are synthetic indicators calculated from public data, not official ratings. Ranking methodology reflects editorial weight choices; different weights would produce different rankings.</P>

      <H3>Institutional Freedom Index</H3>
      <P>The three sub-indicators (press freedom, democracy index, corruption perception) are country-level assessments by international organizations. This site aggregates and displays them without endorsing all conclusions. Users can expand to see individual sources and values.</P>

      <H3>AQI Standard Differences</H3>
      <P>Mainland China cities use China's national AQI (HJ 633-2012); other cities use US EPA. The two standards differ in methods, thresholds, and categories — values are not directly comparable. No conversion is applied.</P>

      <H3>Territories & Sovereignty</H3>
      <P>Cities are classified by geographic location and de facto administrative jurisdiction. Data is sourced from the statistical system of each city's governing economy. Classification does not represent a position on territorial sovereignty or political status. Hong Kong, Macau, and Taiwan data come from their respective statistical authorities.</P>

      <H3>Safety Warnings</H3>
      <P>Some cities are flagged with safety warnings (active conflict, extreme instability, data blocked) based on public international reports. Safety index reliability is limited for such cities.</P>

      <H3>Data Freshness</H3>
      <P>Data is updated approximately annually. The last update date is shown in page footers. Source version years are listed in the Data Overview table. Between updates, real-world conditions may have changed.</P>

      <H3>Copyright & License</H3>
      <P>Data source copyrights belong to their original publishers. World Bank data: CC BY-4.0. Numbeo data based on public pages. The Economist Big Mac Index under editorial license.</P>

      <H3>Legal</H3>
      <P>This site assumes no liability for direct or indirect losses resulting from decisions made based on this data. By using this site, you agree to these terms.</P>

      <P>Last updated: March 2026</P>

      <H2 id="feedback">💬 Feedback & Source Code</H2>
      <P>This site is open-source on <a href="https://github.com/qing4132/whichcity" target="_blank" rel="noopener noreferrer" className={linkCls}>GitHub</a>. For data corrections or feature suggestions, please <a href="https://github.com/qing4132/whichcity/issues" target="_blank" rel="noopener noreferrer" className={linkCls}>open an issue</a> or email <a href="mailto:qing4132@users.noreply.github.com" className={linkCls}>qing4132@users.noreply.github.com</a>.</P>
    </>);
  }

  /* ══════════════════════════════════════════════════════════
     Japanese (abbreviated — same structure, translated)
     ══════════════════════════════════════════════════════════ */
  function renderJa() {
    return (<>
      <H2 id="data-overview">📊 データ概要</H2>
      <P>本サイトは世界134都市をカバーし、23カテゴリのデータと4つの総合指数を提供します。すべての給与とコストはUSD基準で保存・計算され、10種の主要通貨で表示可能です。</P>
      <Table headers={["カテゴリ", "ソース", "粒度", "データ年"]} rows={[
        ["給与（26職種）", "ERI/SalaryExpert, BLS, PayScale, OECD, Robert Half, Hays, 智联招聘, JobStreet", "都市×職種", "2024–2025"],
        ["生活費（標準/節約）", "Numbeo, Expatistan, 各国統計局", "都市", "2024–2025"],
        ["住宅価格（m²あたり）", "Global Property Guide, 各地不動産指数", "都市", "2024–2025"],
        ["月額家賃（中心1BR）", "Numbeo Rent Index", "都市", "2024–2025"],
        ["ビッグマック価格", "The Economist", "国", "2025年1月"],
        ["年間労働時間", "OECD/ILO", "国平均", "2024"],
        ["有給休暇", "各国労働法, OECD", "国", "2024"],
        ["通信速度 (Mbps)", "Ookla Speedtest Global Index", "都市", "2025 Q1"],
        ["大気質 (AQI)", "IQAir 2024, US EPA基準", "都市", "2024"],
        ["医師数/千人", "WHO/World Bank (CC BY-4.0)", "国", "2022–2024"],
        ["病床数/千人", "WHO/World Bank", "国", "2022–2024"],
        ["UHCカバレッジ", "WHO/World Bank", "国", "2021"],
        ["平均寿命", "WHO/World Bank", "国", "2022"],
        ["直行便都市数", "OAG, FlightConnections.com", "都市", "2025"],
        ["Numbeo安全指数", "Numbeo Safety Index", "都市", "2025"],
        ["殺人率", "UNODC", "国", "2022–2024"],
        ["世界平和度指数", "IEP GPI", "国", "2025"],
        ["Gallup法と秩序", "Gallup", "国", "2024"],
        ["報道の自由", "RSF Press Freedom Index", "国", "2024"],
        ["民主主義指数", "EIU Democracy Index", "国", "2024"],
        ["腐敗認識指数", "Transparency International CPI", "国", "2024"],
        ["気候（月次）", "WMO 1991–2020, 各国気象局", "都市", "1991–2020基準"],
        ["為替レート（10通貨選択可）", "ExchangeRate-API（毎日自動更新）", "—", "毎日"],
      ]} />
      <Warn>すべてのデータは公式公開データまたは正規ライセンスに基づいています。給与データは税引前年収中央値の推定であり、個人の実際の収入とは異なります。</Warn>

      <H2 id="income">💰 収入データ</H2>
      <P>各都市26職種の税引前年収（USD）。ソフトウェアエンジニア、データサイエンティスト、プロダクトマネージャー、デザイナー、教師、看護師、会計士等。</P>
      <H3>データ収集方法</H3>
      <P>ERI/SalaryExpert（グローバル一次データ）、米国BLS（米国都市）、PayScale（ユーザー報告）、OECD、Robert Half/Hays（職種調査）、智联招聘（中国都市）、JobStreet/Indeed/Glassdoor（東南アジア）を統合。職種×都市の組み合わせごとに複数ソースの中央値を推定。</P>
      <H3>収入モード</H3>
      <P>3つのモード：<strong>税前</strong>（Gross）— 控除なし。<strong>税後</strong>（Net）— 現地居住者の所得税・社会保険を控除。<strong>外国人税後</strong>（ExpatNet）— 外国人優遇税制を適用（オランダ30%ルーリング、スペインベッカム法等）。詳細は「税後計算」を参照。</P>

      <H2 id="cost">🛒 生活費</H2>
      <P>各都市2段階の月額生活費：<strong>標準消費</strong>（Moderate）と<strong>節約消費</strong>（Budget）。USD/月単位。</P>
      <P>標準消費は共同住居または単独賃貸、食事、交通、娯楽、通信等を含み、現地の中間所得層のライフスタイルを反映。節約消費は意識的に支出を抑えたスタイルで、通常は標準の60–75%。</P>
      <P>ソース：Numbeo、Expatistanの都市レベルデータ。各国統計局の物価指数で校正。</P>

      <H2 id="housing">🏠 住宅データ</H2>
      <P><strong>住宅価格</strong>：m²あたり価格（USD/m²）、都心部と郊外の加重平均。ソース：Global Property Guide、各地不動産指数。</P>
      <P><strong>月額家賃</strong>：都心部1BR（USD）。ソース：Numbeo。</P>
      <P><strong>購入年数</strong>：70m²住宅基準。(価格×70) ÷ 年間貯蓄。貯蓄≤0なら「N/A」。</P>

      <H2 id="work">💼 労働指標</H2>
      <P><strong>年間労働時間</strong>：国レベルの平均年間労働時間。ソース：OECD Employment Outlook 2024、ILO ILOSTAT。</P>
      <P><strong>時給</strong>：ランタイム計算 = 年収 ÷ 年間労働時間。</P>
      <P><strong>有給休暇</strong>：国の法定年間有給日数。ソース：各国労働法規、OECD。</P>
      <P><strong>ビッグマック購買力</strong>：時給 ÷ ビッグマック現地価格。基本的な購買力の指標。ソース：The Economist 2025年1月。国レベルのデータ。</P>

      <H2 id="environment">🌍 環境指標</H2>
      <H3>大気質 (AQI)</H3>
      <P>米国EPA AQI基準。IQAir 2024年次レポートから。<strong>中国本土の都市</strong>は中国国家基準AQI (CN)を使用 — EPA基準より数値が高い傾向。UIでは「AQI (CN)」と表示。2つの基準間の変換は非線形のため実施せず、基準の違いを明示。</P>
      <H3>通信速度</H3>
      <P>固定回線下り平均速度（Mbps）。ソース：Ookla Speedtest Global Index 2025 Q1。</P>
      <H3>直行便都市数</H3>
      <P>主要空港からの直行便目的地都市数。ソース：OAG Aviation Analytics、FlightConnections.com (2025)。</P>

      <H2 id="climate">🌤 気候データ</H2>
      <P>CITY_CLIMATEオブジェクトに格納。各都市：気候タイプ（熱帯/温帯/大陸性/乾燥/地中海/海洋性）、年平均気温、年降水量、日照時間、夏季平均気温、冬季平均気温、湿度（%）。</P>
      <P>月次データ（12ヶ月の日最高/最低気温と降水量）はWMO Climate Normals 1991–2020、NOAA NCEI、各国気象局（JMA/CMA/KMA/BOM/AEMET/Météo-France/Met Office/DWD等）、Wikipedia「Climate of [City]」記事の公式データから取得。</P>
      <P>南半球の都市も月順は1–12月で統一。夏季は12–2月に相当。</P>

      <H2 id="indices">📐 総合指数</H2>
      <P>4つの総合指数。各指数は0–100に正規化され、複数のサブ指標の加重合計で算出。</P>

      <H3>1. 生活プレッシャー指数（低い方が良い）</H3>
      <P>都市の総合的な生活負担を測定。ランタイム計算で職業・消費レベルの選択に依存。</P>
      <Table headers={["サブ指標", "ウェイト", "方向", "アンカー範囲"]} rows={[
        ["貯蓄率 = (収入 − 支出×12) / 収入", "30%", "高い方が良い", "-30% ~ 85%"],
        ["ビッグマック購買力 = 時給 / ビッグマック価格", "25%", "高い方が良い", "1.0 ~ 22.0"],
        ["年間労働時間（逆転）", "25%", "低い方が良い", "1200h ~ 2500h"],
        ["購入年数（逆転）", "20%", "低い方が良い", "3年 ~ 120年"],
      ]} />
      <P>各サブ指標はアンカー正規化（min-maxではなく）：値をアンカー範囲にクランプし、0–100にリニアマッピング。最終値 = 100 − 加重合計（反転：値が大きいほどプレッシャーが高い）。</P>
      <P><strong>欠損データ処理</strong>：サブ指標データが欠損の場合、そのサブ指標は計算から除外され、ウェイトは他の利用可能なサブ指標に比例配分されます。信頼度：0欠損 → high、欠損ウェイト合計 {'<'} 1/3 → medium、≥ 1/3 → low。</P>

      <H3>2. 安全指数（高い方が安全）</H3>
      <Table headers={["サブ指標", "ウェイト", "ソース"]} rows={[
        ["Numbeo安全指数", "35%", "Numbeo 2025"],
        ["殺人率（逆転正規化）", "30%", "UNODC 2022–2024"],
        ["世界平和度指数（逆転正規化）", "20%", "IEP GPI 2025"],
        ["Gallup法と秩序指数", "15%", "Gallup 2024"],
      ]} />
      <P>事前計算してcities.jsonに格納。全サブ指標を0–100に正規化し加重合計。欠損サブ指標のウェイトは既存指標に比例再配分。UIで*マーク表示。</P>
      <P><strong>安全警告</strong>：武力紛争地域、ガバナンス崩壊、情報封鎖の都市には特別警告ラベルを表示。</P>

      <H3>3. 医療指数（高い方が良い）</H3>
      <Table headers={["サブ指標", "ウェイト", "ソース"]} rows={[
        ["千人あたり医師数", "35%", "WHO/World Bank"],
        ["千人あたり病床数", "25%", "WHO/World Bank"],
        ["UHCカバレッジ指数", "25%", "WHO"],
        ["平均寿命", "15%", "WHO/World Bank"],
      ]} />
      <P>事前計算。欠損サブ指標は同様にウェイト再配分。</P>

      <H3>4. 制度的自由指数（高い方が良い）</H3>
      <Table headers={["サブ指標", "ウェイト", "ソース"]} rows={[
        ["報道の自由 (RSF)", "35%", "RSF 2024"],
        ["民主主義指数 (EIU)", "35%", "EIU 2024"],
        ["腐敗認識指数 (TI CPI)", "30%", "Transparency International 2024"],
      ]} />
      <P>事前計算。3つとも国レベルの指標で、国の制度環境を反映し都市固有ではない。</P>

      <H2 id="tax">🧾 税後計算</H2>
      <P>税後収入計算エンジンは79か国/地域の税制をカバー。累進税率、社会保険料、就業控除を含む。</P>
      <H3>計算フロー</H3>
      <P>1. 税前USD → 現地通貨（毎日自動更新レートを使用。API失敗時は前回のレートにフォールバック）→ 2. 社会保険/年金控除 → 3. 就業控除（フランス10%、ドイツWerbungskosten等）→ 4. 課税所得計算 → 5. 累進税率適用 → 6. 地方税（米国州税、カナダ州税）→ 7. 税後現地通貨 → USD。</P>
      <P>日本特殊処理：住民税10%追加、独自の給与所得控除表を使用。韓国特殊処理：独自の근로소득공제表を使用。</P>
      <H3>外国人優遇税制</H3>
      <P>「外国人税後」モード選択時、以下の国で外国人優遇策を自動適用。優遇後の税後収入が通常税後より低い場合は自動的に通常税後にフォールバック。</P>
      <Table headers={["国", "制度", "タイプ", "詳細"]} rows={[
        ["オランダ", "30%ルーリング", "免税割合", "所得の30%が非課税"],
        ["スペイン", "ベッカム法", "定額税率", "€60万以下24%、超過47%"],
        ["イタリア", "Impatriatiレジーム", "免税割合", "所得の50%が非課税"],
        ["ポルトガル", "NHR 2.0", "定額税率", "20%定額税率"],
        ["ポーランド", "19%定額税率", "定額税率", "外国人は19%選択可"],
        ["シンガポール", "CPF免除", "社保免除", "外国人はCPF免除"],
      ]} />
      <Warn>税後計算は簡易推定です。考慮していない要素：個人控除の差異、家族状況、投資収入、雇用主負担、外国人優遇の期限制限等。個人のアドバイスは専門の税務アドバイザーにご相談ください。</Warn>

      <H2 id="ranking">🏅 ランキング</H2>
      <P>5カテゴリ16指標のグローバル都市ランキング。職業・消費レベル切替可能。</P>
      <P><strong>単一選択 / 複数選択モード</strong>：デフォルトは単一選択モードで、1つの指標でランキング。複数選択モードでは複数指標を選択でき、各指標のパーセンタイル順位の平均で総合スコアを算出。</P>
      <P><strong>気候フィルター</strong>：気候タイプ（熱帯、温帯、大陸性、乾燥、地中海性、海洋性）と5つの気候次元（年平均気温、季節差、年降水量、湿度、日照）で都市を絞り込み可能。次元はp33/p66パーセンタイル閾値で3段階に分割。気候フィルターはランキング指標と独立し、スコア計算に影響しない。</P>
      <P><strong>ランキングルール</strong>：密集ランキング（Dense Ranking）— 同点は同順位、次はジャンプ。例：2都市が1位の場合、次は3位。</P>
      <P><strong>ソート方向</strong>：高い方が良い指標（収入、貯蓄、安全等）は降順。低い方が良い指標（支出、AQI、労働時間等）は昇順。欠損データは最後尾。</P>
      <P><strong>色分け</strong>：各指標の1位は金色🥇マーク。総合指数（生活プレッシャー、安全等）は展開可能なサブ指標詳細付き。</P>
      <P><strong>状態保存</strong>：指標選択、単一/複数モード、気候フィルター設定はブラウザのローカルストレージに保存され、次回訪問時に自動復元。</P>

      <H2 id="compare">⚖️ 都市比較</H2>
      <P>2–3都市の同時比較（狭画面は2都市）。16データ指標 + 6気候指標。</P>
      <P><strong>勝敗判定</strong>：各指標で最優値を持つ都市が勝ち（高優型は最大、低優型は最小）。同値は全勝ち。「リード数」は気候指標を除いた勝ち数。</P>
      <P><strong>緑色ハイライト</strong>：各行の勝者の値を緑色表示。気候指標は勝敗に含まず。</P>
      <P><strong>棒グラフY軸</strong>：気候チャートは全比較都市で統一Y軸スケール（グローバル最大/最小値）。</P>

      <H2 id="detail">📄 都市詳細ページ</H2>
      <H3>類似都市レコメンド</H3>
      <P>21次元正規化ユークリッド距離。21次元：収入、支出、貯蓄、住宅価格、購入年数、家賃、労働時間、時給、有給、AQI、通信速度、直行便数、生活プレッシャー指数、医療指数、自由指数、安全指数 + 5気候指標（年平均気温、温度差、年降水量、湿度、日照）。min-max正規化で最も近い6都市を返す。</P>
      <H3>指標比較ハイライト</H3>
      <P>類似都市カードに現在の都市との比較を表示：緑色↑ = 相対的に良い、赤色↓ = 悪い。収入・支出・住宅価格等のパーセンテージ差が大きい項目を表示。</P>
      <H3>公用語</H3>
      <P>国・州・都市レベルで憲法または法律上の地位を持つ言語のみ。都市内の推定話者数降順。</P>

      <H2 id="display">🎨 表示ルール</H2>
      <H3>色分け（Tierシステム）</H3>
      <P>ランキング・詳細ページ：上位20% → 緑色（emerald）、下位20% → 赤色（rose）、中間60% → 灰色。「上位」「下位」は指標の方向で定義。</P>
      <H3>信頼度ラベル</H3>
      <P>「⚠ 信頼性低」: 欠損サブ指標のウェイト合計が1/3超。「一部データ欠落」: 欠損あるがウェイト合計1/3以下。欠損サブ指標は展開詳細で*マーク表示。</P>
      <H3>AQI (CN) 表記</H3>
      <P>中国本土の都市はAQI (CN)（中国国家基準）、その他はAQI（US EPA基準）。2つの基準は異なる計算方法・閾値のため数値の直接比較不可。</P>
      <H3>通貨換算</H3>
      <P>すべての金額は10種の主要通貨で表示可能。ExchangeRate-APIで毎日自動更新。</P>
      <H3>欠損データ表示</H3>
      <P>欠損データは「—」で統一表示。</P>

      <H2 id="disclaimer">⚠️ 免責事項</H2>

      <H3>データの正確性</H3>
      <P>本サイトのすべてのデータは参考情報であり、投資・移民・雇用・税務のアドバイスではありません。給与データは税引前中央値の推定であり、経験・交渉力・会社規模・契約タイプ等により実際の収入と大きく異なる場合があります。生活費は個人の消費習慣により大きく変動します。複数のソースでクロスチェックすることを推奨します。</P>

      <H3>税務免責</H3>
      <P>税後計算は簡易モデルであり、すべての控除額・家族状況・投資収入・雇用主負担・地方追加税・外国人優遇の期限等は考慮していません。専門の税務アドバイザーにご相談ください。</P>

      <H3>為替レート免責</H3>
      <P>為替レートはExchangeRate-APIで毎日自動更新されますが、リアルタイムの市場レートではありません。為替変動により表示額と実際の換算額に差が生じる場合があります。</P>

      <H3>指数とランキング</H3>
      <P>総合指数（生活プレッシャー・安全・医療・自由）は公開データに基づく合成指標であり、公式評価ではありません。ランキング方法は編集判断によるウェイト配分に基づいており、ウェイトが異なれば順位も変わります。</P>

      <H3>制度的自由指数</H3>
      <P>3つのサブ指標（報道の自由・民主主義指数・腐敗認識指数）は国際機関の国レベル評価です。本サイトは集約・表示のみで、その結論すべてを支持するものではありません。</P>

      <H3>AQI基準の違い</H3>
      <P>中国本土は中国国家基準AQI (HJ 633-2012)、その他は米国EPA基準。計算方法・汚染物質閾値・健康等級の区分が異なり、数値の直接比較は不可能。基準間の変換は誤差増大を避けるため実施せず。</P>

      <H3>地域と主権</H3>
      <P>都市は地理的位置と実質的な行政管轄に基づいて分類。各都市の実際の統治経済体の統計体系をデータソースとする。分類は領土主権や政治的地位に関する立場を表しません。香港・マカオ・台湾のデータはそれぞれの統計機関から取得。</P>

      <H3>安全警告</H3>
      <P>一部の都市には安全警告（武力紛争・ガバナンス崩壊・情報封鎖）を表示。公開国際レポートに基づく。これらの都市では安全指数の参考価値が限定的。</P>

      <H3>データ更新</H3>
      <P>データ更新は年1回程度。各データソースのバージョン年はデータ概要表を参照。更新間に実際のデータが変化している可能性があります。</P>

      <H3>著作権とライセンス</H3>
      <P>データソースの著作権は各発行機関に帰属。World BankデータはCC BY-4.0。NumbeoデータはNumbeoの公開ページに基づく。The Economist Big Mac IndexはThe Economistの編集ライセンスに準拠。</P>

      <H3>法的事項</H3>
      <P>本サイトのデータに基づく決定から生じる直接的・間接的損失について一切の責任を負いません。本サイトの利用により上記の免責条項に同意したものとみなされます。</P>

      <P>最終更新：2026年3月</P>

      <H2 id="feedback">💬 フィードバックとソースコード</H2>
      <P>本サイトは <a href="https://github.com/qing4132/whichcity" target="_blank" rel="noopener noreferrer" className={linkCls}>GitHub</a> でオープンソースです。データの訂正や機能の提案は <a href="https://github.com/qing4132/whichcity/issues" target="_blank" rel="noopener noreferrer" className={linkCls}>Issue</a> または <a href="mailto:qing4132@users.noreply.github.com" className={linkCls}>メール</a>でお願いします。</P>
    </>);
  }

  /* ══════════════════════════════════════════════════════════
     Spanish (abbreviated — same structure, translated)
     ══════════════════════════════════════════════════════════ */
  function renderEs() {
    return (<>
      <H2 id="data-overview">📊 Visión general de datos</H2>
      <P>Este sitio cubre 134 ciudades con 23 categorías de datos y 4 índices compuestos. Todos los salarios se almacenan en USD. Se pueden mostrar en 10 monedas principales.</P>
      <Table headers={["Categoría", "Fuente", "Granularidad", "Año"]} rows={[
        ["Salarios (26 profesiones)", "ERI/SalaryExpert, BLS, PayScale, OECD, Robert Half, Hays, Zhilian, JobStreet", "Ciudad × Profesión", "2024–2025"],
        ["Coste de vida (Estándar/Económico)", "Numbeo, Expatistan, Oficinas Nacionales de Estadística", "Ciudad", "2024–2025"],
        ["Precio vivienda por m²", "Global Property Guide, Índices locales", "Ciudad", "2024–2025"],
        ["Alquiler mensual (1BR centro)", "Numbeo Rent Index", "Ciudad", "2024–2025"],
        ["Precio Big Mac", "The Economist", "País", "Ene 2025"],
        ["Horas laborales anuales", "OECD/ILO", "País promedio", "2024"],
        ["Días de vacaciones pagadas", "Legislación laboral, OECD", "País", "2024"],
        ["Velocidad de Internet (Mbps)", "Ookla Speedtest Global Index", "Ciudad", "2025 Q1"],
        ["Calidad del aire (AQI)", "IQAir 2024, estándar US EPA", "Ciudad", "2024"],
        ["Médicos/1.000 hab.", "OMS/Banco Mundial (CC BY-4.0)", "País", "2022–2024"],
        ["Camas hosp./1.000 hab.", "OMS/Banco Mundial", "País", "2022–2024"],
        ["Cobertura UHC", "OMS/Banco Mundial", "País", "2021"],
        ["Esperanza de vida", "OMS/Banco Mundial", "País", "2022"],
        ["Ciudades con vuelos directos", "OAG, FlightConnections.com", "Ciudad", "2025"],
        ["Índice Numbeo de seguridad", "Numbeo Safety Index", "Ciudad", "2025"],
        ["Tasa de homicidio", "ONUDD", "País", "2022–2024"],
        ["Índice de Paz Global", "IEP GPI", "País", "2025"],
        ["Gallup Ley y Orden", "Gallup", "País", "2024"],
        ["Libertad de prensa", "RSF Press Freedom Index", "País", "2024"],
        ["Índice de democracia", "EIU Democracy Index", "País", "2024"],
        ["Percepción de corrupción", "Transparency International CPI", "País", "2024"],
        ["Clima (mensual)", "OMM 1991–2020, servicios meteorológicos", "Ciudad", "Base 1991–2020"],
        ["Tipos de cambio (10 seleccionables)", "ExchangeRate-API (actualizado diariamente)", "—", "Diario"],
      ]} />
      <Warn>Todos los datos provienen de fuentes oficiales públicas o con licencia autorizada. Los datos salariales son estimaciones medianas brutas anuales y no representan ingresos individuales reales.</Warn>

      <H2 id="income">💰 Datos salariales</H2>
      <P>Salario bruto anual (USD) para 26 profesiones por ciudad: ingeniero de software, científico de datos, gerente de producto, diseñador, profesor, enfermero, contador, etc.</P>
      <H3>Método de recopilación</H3>
      <P>ERI/SalaryExpert (datos primarios globales), BLS de EE.UU. (ciudades estadounidenses), PayScale (autoreporte), OECD, Robert Half/Hays (encuestas profesionales), Zhilian (China), JobStreet/Indeed/Glassdoor (Sudeste Asiático). Para cada combinación profesión × ciudad se estima la mediana de múltiples fuentes.</P>
      <H3>Modos de ingreso</H3>
      <P>Tres modos: <strong>Bruto</strong> (Gross) — sin deducciones. <strong>Neto</strong> (Net) — impuestos locales y seguridad social. <strong>Neto expatriado</strong> (ExpatNet) — con régimen fiscal para expatriados (Holanda 30% Ruling, España Ley Beckham, etc.). Ver sección «Cálculo fiscal».</P>

      <H2 id="cost">🛒 Coste de vida</H2>
      <P>Dos niveles mensuales por ciudad: <strong>Estándar</strong> (Moderate) y <strong>Económico</strong> (Budget). En USD/mes.</P>
      <P>El estándar incluye vivienda compartida o individual, alimentación, transporte, entretenimiento y comunicaciones, reflejando un estilo de vida de ingreso medio local. El económico refleja un estilo consciente del gasto, típicamente 60–75% del estándar.</P>
      <P>Fuentes: Numbeo, Expatistan a nivel de ciudad, calibrados con índices de precios nacionales.</P>

      <H2 id="housing">🏠 Vivienda</H2>
      <P><strong>Precio</strong>: por m² (USD/m²), promedio ponderado centro/periferia. Fuente: Global Property Guide e índices inmobiliarios locales.</P>
      <P><strong>Alquiler</strong>: 1BR centro ciudad (USD). Fuente: Numbeo.</P>
      <P><strong>Años para comprar</strong>: vivienda de 70m². (precio × 70) ÷ ahorro anual. Si ahorro ≤ 0: «N/A».</P>

      <H2 id="work">💼 Indicadores laborales</H2>
      <P><strong>Horas anuales</strong>: promedio nacional. Fuente: OECD Employment Outlook 2024, ILO ILOSTAT.</P>
      <P><strong>Salario por hora</strong>: calculado en tiempo real = ingreso anual ÷ horas anuales.</P>
      <P><strong>Vacaciones pagadas</strong>: días legales anuales por país. Fuente: legislación laboral, OECD.</P>
      <P><strong>Poder adquisitivo Big Mac</strong>: salario por hora ÷ precio local del Big Mac. Indicador básico de poder adquisitivo. Fuente: The Economist, enero 2025. Datos a nivel de país.</P>

      <H2 id="environment">🌍 Medio ambiente</H2>
      <H3>Calidad del aire (AQI)</H3>
      <P>Basado en el estándar US EPA AQI. La mayoría de datos provienen del informe anual IQAir 2024. <strong>Ciudades de China continental</strong> usan el estándar nacional chino AQI (CN), que suele mostrar valores más altos que el EPA — se marca como «AQI (CN)» en la interfaz. No se realiza conversión entre estándares debido a la relación no lineal compleja.</P>
      <H3>Velocidad de Internet</H3>
      <P>Velocidad media de descarga de banda ancha fija (Mbps). Fuente: Ookla Speedtest Global Index 2025 Q1.</P>
      <H3>Destinos con vuelo directo</H3>
      <P>Número de ciudades destino con vuelo directo desde los principales aeropuertos. Fuente: OAG Aviation Analytics, FlightConnections.com (2025).</P>

      <H2 id="climate">🌤 Datos climáticos</H2>
      <P>Almacenados en CITY_CLIMATE. Cada ciudad: tipo climático (tropical/templado/continental/árido/mediterráneo/oceánico), temperatura media anual, precipitación, horas de sol, temperatura media verano/invierno, humedad (%).</P>
      <P>Datos mensuales (temperatura máx/mín diaria y precipitación × 12 meses) del WMO Climate Normals 1991–2020, NOAA NCEI, servicios meteorológicos nacionales (JMA/CMA/KMA/BOM/AEMET/Météo-France/Met Office/DWD, etc.) y artículos de Wikipedia «Climate of [City]» con datos oficiales citados.</P>
      <P>Ciudades del hemisferio sur mantienen el orden mensual 1–12; el verano corresponde a dic–feb.</P>

      <H2 id="indices">📐 Índices compuestos</H2>
      <P>4 índices compuestos, cada uno normalizado a 0–100 y calculado como suma ponderada de sub-indicadores.</P>

      <H3>1. Índice de presión vital (menor = mejor)</H3>
      <P>Mide la presión de vida integral de una ciudad. Se calcula en tiempo real y depende de la profesión y nivel de consumo seleccionados.</P>
      <Table headers={["Sub-indicador", "Peso", "Dirección", "Rango ancla"]} rows={[
        ["Tasa de ahorro = (ingreso − gasto×12) / ingreso", "30%", "Mayor = mejor", "-30% ~ 85%"],
        ["Poder Big Mac = salario/hora / precio Big Mac", "25%", "Mayor = mejor", "1.0 ~ 22.0"],
        ["Horas laborales (invertido)", "25%", "Menor = mejor", "1200h ~ 2500h"],
        ["Años para comprar (invertido)", "20%", "Menor = mejor", "3 ~ 120 años"],
      ]} />
      <P>Cada sub-indicador usa normalización anclada (no min-max): los valores se limitan al rango ancla y se mapean linealmente a 0–100. Resultado final = 100 − suma ponderada (invertido: mayor valor = más presión).</P>
      <P><strong>Datos faltantes</strong>: si un sub-indicador falta, se excluye del cálculo y su peso se redistribuye proporcionalmente entre los sub-indicadores disponibles. Confianza: 0 faltantes → high, peso faltante {'<'} 1/3 → medium, ≥ 1/3 → low.</P>

      <H3>2. Índice de seguridad (mayor = más seguro)</H3>
      <Table headers={["Sub-indicador", "Peso", "Fuente"]} rows={[
        ["Índice Numbeo de seguridad", "35%", "Numbeo 2025"],
        ["Tasa de homicidio (normalización invertida)", "30%", "ONUDD 2022–2024"],
        ["Índice de Paz Global (normalización invertida)", "20%", "IEP GPI 2025"],
        ["Gallup Ley y Orden", "15%", "Gallup 2024"],
      ]} />
      <P>Pre-calculado y almacenado en cities.json. Todos los sub-indicadores normalizados a 0–100, suma ponderada. Sub-indicadores faltantes redistribuyen su peso proporcionalmente. Marcados con * en la interfaz.</P>
      <P><strong>Advertencia de seguridad</strong>: ciudades en zonas de conflicto armado, colapso de gobernanza o bloqueo informativo muestran etiquetas de advertencia especiales.</P>

      <H3>3. Índice sanitario (mayor = mejor)</H3>
      <Table headers={["Sub-indicador", "Peso", "Fuente"]} rows={[
        ["Médicos por 1.000 hab.", "35%", "OMS/Banco Mundial"],
        ["Camas por 1.000 hab.", "25%", "OMS/Banco Mundial"],
        ["Índice UHC", "25%", "OMS"],
        ["Esperanza de vida", "15%", "OMS/Banco Mundial"],
      ]} />
      <P>Pre-calculado. Sub-indicadores faltantes usan redistribución de peso proporcional.</P>

      <H3>4. Índice de libertad institucional (mayor = mejor)</H3>
      <Table headers={["Sub-indicador", "Peso", "Fuente"]} rows={[
        ["Libertad de prensa (RSF)", "35%", "RSF 2024"],
        ["Índice de democracia (EIU)", "35%", "EIU 2024"],
        ["Percepción de corrupción (TI CPI)", "30%", "Transparency International 2024"],
      ]} />
      <P>Pre-calculado. Los tres son indicadores a nivel de país que reflejan el entorno institucional nacional, no condiciones específicas de la ciudad.</P>

      <H2 id="tax">🧾 Cálculo fiscal</H2>
      <P>Motor fiscal cubre 79 países/territorios con tramos progresivos, cotizaciones sociales y deducciones laborales.</P>
      <H3>Flujo de cálculo</H3>
      <P>1. Bruto USD → Moneda local (tipo de cambio diario actualizado automáticamente; si la API no está disponible, se usa el último tipo exitoso) → 2. Cotizaciones sociales → 3. Deducciones laborales (Francia 10%, Alemania Werbungskosten) → 4. Base imponible → 5. Tramos progresivos → 6. Impuestos locales (estados de EE.UU., provincias de Canadá) → 7. Neto en moneda local → USD.</P>
      <P>Japón: impuesto de residencia 10% adicional + tabla de deducción de ingresos de empleo. Corea: tabla de 근로소득공제.</P>
      <H3>Regímenes para expatriados</H3>
      <P>En modo «Neto expatriado», se aplican automáticamente los siguientes regímenes. Si el neto con régimen es menor que el neto normal, se revierte automáticamente al cálculo normal.</P>
      <Table headers={["País", "Régimen", "Tipo", "Detalle"]} rows={[
        ["Países Bajos", "30% Ruling", "Exención", "30% del ingreso exento"],
        ["España", "Ley Beckham", "Tipo fijo", "24% hasta €600K, 47% superior"],
        ["Italia", "Régimen Impatriati", "Exención", "50% del ingreso exento"],
        ["Portugal", "NHR 2.0", "Tipo fijo", "20% tipo fijo"],
        ["Polonia", "19% Tipo fijo", "Tipo fijo", "19% opcional para extranjeros"],
        ["Singapur", "Exención CPF", "Sin cotización social", "Extranjeros exentos de CPF"],
      ]} />
      <Warn>Los cálculos fiscales son estimaciones simplificadas. No considerado: variaciones de deducciones personales, situación familiar, ingresos de inversión, contribuciones del empleador, límites temporales de regímenes para expatriados. Consulte a un asesor fiscal cualificado.</Warn>

      <H2 id="ranking">🏅 Sistema de ranking</H2>
      <P>16 indicadores en 5 categorías. Se puede cambiar profesión y nivel de consumo.</P>
      <P><strong>Modo único / múltiple</strong>: Por defecto, modo de selección única, clasificando por un indicador. En modo de selección múltiple, se pueden elegir varios indicadores; el sistema promedia sus rangos percentiles para calcular una puntuación compuesta.</P>
      <P><strong>Filtro climático</strong>: Filtra ciudades por tipo de clima (tropical, templado, continental, árido, mediterráneo, oceánico) y 5 dimensiones climáticas (temp. media, diferencia estacional, lluvia, humedad, sol). Las dimensiones se dividen en 3 niveles en los umbrales p33/p66. El filtro climático es independiente de los indicadores de ranking y no afecta el cálculo de puntuación.</P>
      <P><strong>Reglas</strong>: Ranking denso (Dense Ranking) — empates comparten posición, el siguiente salta. Ejemplo: si dos ciudades empatan en el 1°, la siguiente es 3°.</P>
      <P><strong>Dirección de ordenación</strong>: Mayor-es-mejor (ingresos, ahorros, seguridad) en orden descendente; menor-es-mejor (gastos, AQI, horas) en orden ascendente. Datos faltantes al final.</P>
      <P><strong>Colores</strong>: El 1° de cada indicador recibe marca dorada 🥇. Los índices compuestos tienen sub-indicadores expandibles.</P>
      <P><strong>Persistencia</strong>: La selección de indicadores, el modo único/múltiple y los filtros climáticos se guardan en el almacenamiento local del navegador y se restauran en la próxima visita.</P>

      <H2 id="compare">⚖️ Comparación de ciudades</H2>
      <P>2–3 ciudades simultáneas (2 en pantalla estrecha). 16 datos + 6 clima.</P>
      <P><strong>Determinación del ganador</strong>: para cada indicador, la ciudad con el mejor valor gana (máximo para mayor-es-mejor, mínimo para menor-es-mejor). Si hay empate, todas ganan. «Liderazgo» cuenta victorias excluyendo indicadores climáticos.</P>
      <P><strong>Resaltado verde</strong>: el valor del ganador se muestra en verde. Los indicadores climáticos no participan en la determinación de victorias.</P>
      <P><strong>Eje Y de gráficos</strong>: los gráficos climáticos comparten un eje Y unificado (máx/mín global) para comparación visual.</P>

      <H2 id="detail">📄 Página de detalle</H2>
      <H3>Ciudades similares</H3>
      <P>Distancia euclidiana normalizada de 21 dimensiones: ingreso, gasto, ahorro, precio vivienda, años para comprar, alquiler, horas de trabajo, salario/hora, vacaciones, AQI, internet, vuelos, presión vital, sanidad, libertad, seguridad + 5 clima (temp. media, rango térmico, precipitación, humedad, horas de sol). Normalización min-max, devuelve las 6 más cercanas.</P>
      <H3>Comparación destacada</H3>
      <P>Las tarjetas de ciudades similares muestran ventajas (verde ↑) y desventajas (rojo ↓) vs. la ciudad actual, por diferencia porcentual.</P>
      <H3>Idiomas oficiales</H3>
      <P>Solo idiomas con estatus constitucional/legal a nivel nacional, estatal o municipal. Ordenados por número estimado de hablantes en la ciudad (descendente).</P>

      <H2 id="display">🎨 Reglas de visualización</H2>
      <H3>Código de colores (sistema Tier)</H3>
      <P>Ranking y página de detalle: top 20% → verde (emerald), bottom 20% → rojo (rose), medio 60% → gris. «Top» y «bottom» se definen según la dirección del indicador.</P>
      <H3>Etiquetas de confianza</H3>
      <P>«⚠ Baja confianza»: el peso total de sub-indicadores faltantes supera 1/3. «Datos parciales»: hay faltantes pero el peso total ≤ 1/3. Sub-indicadores faltantes marcados con * en la vista expandida.</P>
      <H3>Nota AQI (CN)</H3>
      <P>Ciudades de China continental usan AQI (CN) (estándar nacional chino); el resto usa AQI (US EPA). Los métodos, umbrales y categorías difieren — los valores no son directamente comparables.</P>
      <H3>Conversión de moneda</H3>
      <P>Todos los importes se pueden mostrar en 10 monedas principales. Tipos actualizados diariamente via ExchangeRate-API.</P>
      <H3>Datos faltantes</H3>
      <P>Se muestran como «—» en toda la interfaz.</P>

      <H2 id="disclaimer">⚠️ Descargos de responsabilidad</H2>

      <H3>Precisión de datos</H3>
      <P>Todos los datos son solo de referencia y no constituyen asesoramiento de inversión, inmigración, empleo o fiscal. Los salarios son estimaciones medianas brutas; el ingreso real varía significativamente según experiencia, negociación, empresa y tipo de contrato. Los costes de vida dependen de hábitos personales. Se recomienda verificar con múltiples fuentes.</P>

      <H3>Aviso fiscal</H3>
      <P>Los cálculos fiscales son modelos simplificados. No considerado: deducciones personales completas, situación familiar, ingresos de inversión, contribuciones del empleador, recargos locales, límites temporales de regímenes para expatriados. Consulte a un asesor fiscal cualificado.</P>

      <H3>Tipos de cambio</H3>
      <P>Los tipos de cambio se actualizan diariamente via ExchangeRate-API, pero no representan tipos de mercado en tiempo real. Las fluctuaciones cambiarias pueden causar diferencias entre los importes mostrados y los tipos de cambio reales.</P>

      <H3>Índices y rankings</H3>
      <P>Los índices compuestos (presión vital, seguridad, sanidad, libertad) son indicadores sintéticos calculados a partir de datos públicos, no calificaciones oficiales. La metodología de ranking refleja decisiones editoriales de ponderación; pesos diferentes producirían rankings diferentes.</P>

      <H3>Índice de libertad institucional</H3>
      <P>Los tres sub-indicadores (libertad de prensa, democracia, percepción de corrupción) son evaluaciones a nivel de país por organizaciones internacionales. Este sitio agrega y muestra sin respaldar todas sus conclusiones.</P>

      <H3>Diferencias en estándares AQI</H3>
      <P>China continental usa el estándar nacional AQI (HJ 633-2012); el resto usa US EPA. Los métodos de cálculo, umbrales y categorías de salud difieren — los valores no son directamente comparables. No se realiza conversión para evitar mayor error.</P>

      <H3>Territorios y soberanía</H3>
      <P>Las ciudades se clasifican por ubicación geográfica y jurisdicción administrativa de facto. Los datos provienen del sistema estadístico de la economía que administra cada ciudad. La clasificación no representa una posición sobre soberanía territorial o estatus político. Los datos de Hong Kong, Macao y Taiwán provienen de sus respectivas autoridades estadísticas.</P>

      <H3>Advertencias de seguridad</H3>
      <P>Algunas ciudades muestran advertencias de seguridad (conflicto armado, colapso de gobernanza, bloqueo informativo) basadas en informes internacionales públicos. El índice de seguridad tiene valor de referencia limitado en estas ciudades.</P>

      <H3>Actualización de datos</H3>
      <P>Los datos se actualizan aproximadamente una vez al año. Los años de versión de cada fuente se indican en la tabla de datos general. Entre actualizaciones, los datos reales pueden haber cambiado.</P>

      <H3>Derechos de autor y licencias</H3>
      <P>Los derechos de autor de las fuentes de datos pertenecen a sus respectivas instituciones. Datos del Banco Mundial bajo CC BY-4.0. Datos de Numbeo basados en sus páginas públicas. Big Mac Index de The Economist bajo su licencia editorial.</P>

      <H3>Legal</H3>
      <P>Este sitio no asume responsabilidad por pérdidas directas o indirectas resultantes de decisiones basadas en estos datos. El uso de este sitio implica la aceptación de estos términos.</P>

      <P>Última actualización: marzo 2026</P>

      <H2 id="feedback">💬 Comentarios y código fuente</H2>
      <P>Este sitio es de código abierto en <a href="https://github.com/qing4132/whichcity" target="_blank" rel="noopener noreferrer" className={linkCls}>GitHub</a>. Para correcciones o sugerencias, <a href="https://github.com/qing4132/whichcity/issues" target="_blank" rel="noopener noreferrer" className={linkCls}>abre un issue</a> o envía un correo a <a href="mailto:qing4132@users.noreply.github.com" className={linkCls}>qing4132@users.noreply.github.com</a>.</P>
    </>);
  }

  return (
    <div className={`min-h-screen transition-colors ${bg}`}>
      {/* Nav */}
      <div className={`sticky top-0 z-50 border-b py-2.5 ${navBg}`}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Link href={`/${locale}`} className={`text-xs px-2 py-1 rounded border transition ${darkMode ? "bg-slate-800 border-slate-600 text-blue-300 hover:bg-slate-700" : "bg-white border-slate-300 text-blue-700 hover:bg-blue-50"}`}>{t("navHome")}</Link>
              <Link href={`/${locale}/ranking`} className={`text-xs px-2 py-1 rounded border transition ${darkMode ? "bg-slate-800 border-slate-600 text-amber-300 hover:bg-slate-700" : "bg-white border-slate-300 text-amber-700 hover:bg-amber-50"}`}>{t("navRanking")}</Link>
              <button onClick={() => { const slugs = Object.values(CITY_SLUGS); router.push(`/${locale}/city/${slugs[Math.floor(Math.random() * slugs.length)]}`); }}
                className={`text-xs px-2 py-1 rounded border transition ${darkMode ? "bg-slate-800 border-slate-600 text-emerald-300 hover:bg-slate-700" : "bg-white border-slate-300 text-emerald-700 hover:bg-emerald-50"}`}>
                {t("navRandomCity")}
              </button>
              <Link href={`/${locale}/compare`} className={`text-xs px-2 py-1 rounded border transition ${darkMode ? "bg-slate-800 border-slate-600 text-violet-300 hover:bg-slate-700" : "bg-white border-slate-300 text-violet-700 hover:bg-violet-50"}`}>{t("navCompare")}</Link>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setNavOpen(v => !v)}
                className={`min-[1080px]:hidden text-xs px-2 py-1 rounded border transition ${darkMode ? "bg-slate-800 border-slate-600 text-slate-300" : "bg-white border-slate-300 text-slate-500"}`}>
                <svg className={`w-3.5 h-3.5 transition-transform duration-300 ${navOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
              </button>
              <div className="hidden min-[1080px]:flex items-center gap-2">
                <select value={s.profession} onChange={e => s.setProfession(e.target.value)} className={selectCls}>
                  {professions.map(p => <option key={p} value={p}>{s.getProfessionLabel(p)}</option>)}
                </select>
                <select value={s.costTier} onChange={e => s.setCostTier(e.target.value as CostTier)} className={selectCls}>
                  {(["moderate", "budget"] as const).map(tier => <option key={tier} value={tier}>{t(`costTier${tier.charAt(0).toUpperCase()}${tier.slice(1)}`)}</option>)}
                </select>
                <select value={s.incomeMode} onChange={e => s.setIncomeMode(e.target.value as IncomeMode)} className={selectCls}>
                  <option value="gross">{t("incomeModeGross")}</option>
                  <option value="net">{t("incomeModeNet")}</option>
                  <option value="expatNet">{t("incomeModeExpatNet")}</option>
                </select>
                <select value={locale} onChange={e => s.setLocale(e.target.value as any)} className={selectCls}>
                  {(Object.keys(LANGUAGE_LABELS) as any[]).map(lang => <option key={lang} value={lang}>{LANGUAGE_LABELS[lang]}</option>)}
                </select>
                <select value={s.currency} onChange={e => s.setCurrency(e.target.value)} className={selectCls}>
                  {POPULAR_CURRENCIES.map(cur => <option key={cur} value={cur}>{cur}</option>)}
                </select>
                <select value={themeMode} onChange={e => s.setThemeMode(e.target.value as "auto"|"light"|"dark")} className={selectCls}>
                  <option value="auto">{t("themeAuto")}</option>
                  <option value="light">{t("dayMode")}</option>
                  <option value="dark">{t("nightMode")}</option>
                </select>
              </div>
            </div>
          </div>
          <div className={`min-[1080px]:hidden grid transition-[grid-template-rows] duration-300 ease-in-out ${navOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
            <div className="overflow-hidden min-h-0">
              <div className="flex items-center gap-2 flex-wrap pt-2">
                <select value={s.profession} onChange={e => s.setProfession(e.target.value)} className={selectCls}>
                  {professions.map(p => <option key={p} value={p}>{s.getProfessionLabel(p)}</option>)}
                </select>
                <select value={s.costTier} onChange={e => s.setCostTier(e.target.value as CostTier)} className={selectCls}>
                  {(["moderate", "budget"] as const).map(tier => <option key={tier} value={tier}>{t(`costTier${tier.charAt(0).toUpperCase()}${tier.slice(1)}`)}</option>)}
                </select>
                <select value={s.incomeMode} onChange={e => s.setIncomeMode(e.target.value as IncomeMode)} className={selectCls}>
                  <option value="gross">{t("incomeModeGross")}</option>
                  <option value="net">{t("incomeModeNet")}</option>
                  <option value="expatNet">{t("incomeModeExpatNet")}</option>
                </select>
                <select value={locale} onChange={e => s.setLocale(e.target.value as any)} className={selectCls}>
                  {(Object.keys(LANGUAGE_LABELS) as any[]).map(lang => <option key={lang} value={lang}>{LANGUAGE_LABELS[lang]}</option>)}
                </select>
                <select value={s.currency} onChange={e => s.setCurrency(e.target.value)} className={selectCls}>
                  {POPULAR_CURRENCIES.map(cur => <option key={cur} value={cur}>{cur}</option>)}
                </select>
                <select value={themeMode} onChange={e => s.setThemeMode(e.target.value as "auto"|"light"|"dark")} className={selectCls}>
                  <option value="auto">{t("themeAuto")}</option>
                  <option value="light">{t("dayMode")}</option>
                  <option value="dark">{t("nightMode")}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-8">
        <h1 className={`text-2xl font-bold mb-6 ${headCls}`}>{title}</h1>

        {/* Table of Contents */}
        <nav className={`rounded-xl border shadow-sm p-4 mb-8 ${cardBg}`}>
          <p className={`text-xs font-semibold mb-2 ${subCls}`}>{locale === "zh" ? "目录" : locale === "ja" ? "目次" : locale === "es" ? "Índice" : "Contents"}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
            {toc.map(({ id, label }) => (
              <a key={id} href={`#${id}`} className={`text-sm px-2 py-1 rounded transition ${linkCls}`}>{label}</a>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div>{sections}</div>
      </div>

      {/* Footer */}
      <footer className={`px-4 py-5 text-center text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
        <div className={`max-w-5xl mx-auto border-t pt-4 ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
        <p>{t("dataSourcesDisclaimer")}</p>
        <p className="mt-1"><a href={`/${locale}/methodology`} className="underline hover:text-blue-500">{t("navMethodology")}</a> · <a href="https://github.com/qing4132/whichcity/issues" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-500">GitHub</a> · <a href="mailto:qing4132@users.noreply.github.com" className="underline hover:text-blue-500">{t("footerFeedback")}</a></p>
        </div>
      </footer>
    </div>
  );
}
