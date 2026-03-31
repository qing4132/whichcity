"use client";
/* eslint-disable react/no-unescaped-entities */

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CostTier, IncomeMode } from "@/lib/types";
import { POPULAR_CURRENCIES } from "@/lib/constants";
import { CITY_SLUGS } from "@/lib/citySlug";
import { LANGUAGE_LABELS, PROFESSION_TRANSLATIONS } from "@/lib/i18n";
import { useSettings } from "@/hooks/useSettings";

export default function MethodologyContent() {
  const router = useRouter();
  const { locale, darkMode, t } = useSettings();

  const bg = darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900";
  const navBg = darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200";
  const selectCls = `text-xs rounded px-1.5 py-1 border ${darkMode ? "bg-slate-800 border-slate-600 text-slate-200" : "bg-white border-slate-300 text-slate-700"}`;
  const cardBg = darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100";
  const subCls = darkMode ? "text-slate-400" : "text-slate-500";
  const headCls = darkMode ? "text-white" : "text-slate-900";
  const linkCls = darkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-500";
  const tableBorder = darkMode ? "border-slate-700" : "border-slate-200";
  const tableHead = darkMode ? "bg-slate-700/50" : "bg-slate-50";
  const warnBg = darkMode ? "bg-amber-900/30 border-amber-700 text-amber-200" : "bg-amber-50 border-amber-200 text-amber-800";

  const s = useSettings();
  const professions = Object.keys(PROFESSION_TRANSLATIONS);
  if (!s.ready) return null;

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
      <P>本站覆盖全球 134 座城市，涵盖 42 项原始数据字段和 4 项综合指数。所有薪资和费用均以美元 (USD) 为基准存储和计算，用户可在界面上选择 30 种货币显示。</P>
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
        ["汇率（30 种）", "静态快照", "—", "2026 年 3 月"],
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
      <P><strong>缺失数据处理</strong>：若某子指标数据缺失（如巨无霸价格为 null），该子指标得分取 50（中位值），权重保持不变。可信度根据缺失数量评定：0 缺失 → high，1–2 缺失 → medium，3+ 缺失 → low。</P>

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
      <P>1. 税前 USD → 当地货币（按固定汇率）→ 2. 扣除社保/公积金 → 3. 扣除职工费用（如法国 10%、德国 Werbungskosten）→ 4. 计算应税所得 → 5. 套用累进税率 → 6. 扣除地方税（美国各州、加拿大各省）→ 7. 得到税后当地货币 → USD。</P>
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
      <P>排名页提供 5 大类共 22 项指标的全球城市排行，用户可切换职业和消费档位。</P>
      <P><strong>排名规则</strong>：使用密集排名（Dense Ranking）——并列排名相同，后续跳跃。例如：若两城并列第 1，下一名为第 3。</P>
      <P><strong>排序方向</strong>：高优型（收入、储蓄、安全等）按降序排列；低优型（支出、AQI、工时等）按升序排列。缺失数据排在最后。</P>
      <P><strong>配色规则</strong>：每项指标的第 1 名获得金色🥇标记。综合指数（生活压力、安全等）使用可展开的子指标详情。</P>

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
      <P>综合指数显示可信度标签："⚠ 可信度低" 表示该城市有 3 项以上子指标缺失；"部分数据缺失" 表示 1–2 项子指标缺失。缺失子指标在展开详情中以 * 号标记。</P>
      <H3>AQI (CN) 标注</H3>
      <P>中国大陆城市的 AQI 使用中国国标，界面中标注为 "AQI (CN)"，其余城市使用 US EPA 标准标注为 "AQI"。两种标准在不同污染物浓度下的数值差异较大。</P>
      <H3>货币转换</H3>
      <P>界面上的所有金额均可换算为 30 种货币显示。汇率为静态快照（2026 年 3 月），不实时更新。</P>
      <H3>缺失数据显示</H3>
      <P>缺失数据统一显示为 "—"。</P>

      <H2 id="disclaimer">⚠️ 免责声明</H2>

      <H3>数据准确性</H3>
      <P>本站所有数据仅供参考，不构成任何投资、移民、就业或税务建议。薪资数据为税前中位数估算，个人实际收入受经验、谈判力、公司规模、合同类型等因素影响可能有显著差异。生活成本因个人消费习惯差异较大。建议用户结合多个来源交叉验证。</P>

      <H3>税务声明</H3>
      <P>税后收入计算为简化模型，未考虑全部免税额、家庭状况、投资收入、雇主代缴、地方附加税等因素。外籍优惠方案有时间限制和资格要求，本站未做资格验证。请咨询专业税务顾问获取个人建议。</P>

      <H3>汇率声明</H3>
      <P>汇率为静态快照，不代表实时市场汇率。汇率波动可能导致显示金额与实际兑换金额存在差异。</P>

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
      <P>本站设计和代码开源于 GitHub。数据来源的版权归各原始发布机构所有。World Bank 数据遵循 CC BY-4.0 协议。Numbeo 数据基于其公开页面。The Economist Big Mac Index 数据遵循其编辑许可。</P>

      <H3>法律</H3>
      <P>本站不承担因使用本站数据做出的任何决策所导致的直接或间接损失。使用本站即表示您同意上述免责条款。</P>

      <P>最后更新：2026 年 3 月</P>

      <H3>反馈与源码</H3>
      <P>本站开源于 <a href="https://github.com/qing4132/citycompare" target="_blank" rel="noopener noreferrer" className={linkCls}>GitHub</a>。如有数据纠错或功能建议，欢迎 <a href="https://github.com/qing4132/citycompare/issues" target="_blank" rel="noopener noreferrer" className={linkCls}>提交 Issue</a> 或发送邮件至 <a href="mailto:qing4132@users.noreply.github.com" className={linkCls}>qing4132@users.noreply.github.com</a>。</P>
    </>);
  }

  /* ══════════════════════════════════════════════════════════
     English content
     ══════════════════════════════════════════════════════════ */
  function renderEn() {
    return (<>
      <H2 id="data-overview">📊 Data Overview</H2>
      <P>This site covers 134 cities worldwide with 42 raw data fields and 4 composite indices. All salaries and costs are stored and computed in USD. Users can display values in 30 currencies.</P>
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
        ["Exchange Rates (30)", "Static snapshot", "—", "March 2026"],
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
      <P><strong>Missing data</strong>: Missing sub-indicators default to score 50 (midpoint). Confidence: 0 missing = high, 1–2 = medium, 3+ = low.</P>

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
      <P>Gross USD → Local currency → Social deductions → Employment deductions → Taxable income → Progressive brackets → Local/state tax → Net local → Net USD.</P>
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
      <P>22 metrics across 5 categories. Dense ranking with ties (e.g., 1,1,3). Higher-is-better metrics sorted descending; lower-is-better sorted ascending. Missing values sorted last.</P>

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
      <P>"⚠ Low confidence": 3+ sub-indicators missing. "Partial data missing": 1–2 missing. Missing sub-indicators marked with * in expanded view.</P>
      <H3>Currency Conversion</H3>
      <P>All amounts convertible to 30 currencies. Rates are a static snapshot (March 2026), not real-time.</P>
      <H3>Missing Data</H3>
      <P>Displayed as "—" throughout.</P>

      <H2 id="disclaimer">⚠️ Disclaimers</H2>

      <H3>Data Accuracy</H3>
      <P>All data is for reference only and does not constitute investment, immigration, employment, or tax advice. Salary figures are median gross estimates; actual income varies significantly by experience, negotiation, company, and contract type. Living costs depend heavily on personal habits. Cross-reference with multiple sources is recommended.</P>

      <H3>Tax Disclaimer</H3>
      <P>After-tax calculations are simplified models. Not considered: full personal allowances, family status, investment income, employer contributions, local surcharges (except US state/Canadian provincial tax), time limits on expat schemes. Consult a qualified tax advisor.</P>

      <H3>Exchange Rates</H3>
      <P>Static snapshot, not real-time. Currency fluctuations may cause displayed amounts to differ from actual conversion rates.</P>

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
      <P>Site design and code are open-source on GitHub. Data source copyrights belong to their original publishers. World Bank data: CC BY-4.0. Numbeo data based on public pages. The Economist Big Mac Index under editorial license.</P>

      <H3>Legal</H3>
      <P>This site assumes no liability for direct or indirect losses resulting from decisions made based on this data. By using this site, you agree to these terms.</P>

      <P>Last updated: March 2026</P>

      <H3>Feedback & Source Code</H3>
      <P>This site is open-source on <a href="https://github.com/qing4132/citycompare" target="_blank" rel="noopener noreferrer" className={linkCls}>GitHub</a>. For data corrections or feature suggestions, please <a href="https://github.com/qing4132/citycompare/issues" target="_blank" rel="noopener noreferrer" className={linkCls}>open an issue</a> or email <a href="mailto:qing4132@users.noreply.github.com" className={linkCls}>qing4132@users.noreply.github.com</a>.</P>
    </>);
  }

  /* ══════════════════════════════════════════════════════════
     Japanese (abbreviated — same structure, translated)
     ══════════════════════════════════════════════════════════ */
  function renderJa() {
    return (<>
      <H2 id="data-overview">📊 データ概要</H2>
      <P>本サイトは世界134都市をカバーし、42項目の生データと4つの総合指数を提供します。すべての給与とコストはUSD基準で保存・計算され、30通貨で表示可能です。</P>
      <Table headers={["カテゴリ", "ソース", "粒度", "データ年"]} rows={[
        ["給与（26職種）", "ERI/SalaryExpert, BLS, PayScale, OECD, Robert Half, Hays, 智联招聘, JobStreet", "都市×職種", "2024–2025"],
        ["生活費（標準/節約）", "Numbeo, Expatistan, 各国統計局", "都市", "2024–2025"],
        ["住宅価格（m²あたり）", "Global Property Guide, 各地不動産指数", "都市", "2024–2025"],
        ["月額家賃（中心1BR）", "Numbeo Rent Index", "都市", "2024–2025"],
        ["ビッグマック価格", "The Economist", "国", "2025年1月"],
        ["年間労働時間", "OECD/ILO", "国平均", "2024"],
        ["有給休暇", "各国労働法, OECD", "国", "2024"],
        ["通信速度", "Ookla Speedtest", "都市", "2025 Q1"],
        ["大気質 (AQI)", "IQAir 2024, US EPA基準", "都市", "2024"],
        ["医師数/千人", "WHO/World Bank (CC BY-4.0)", "国", "2022–2024"],
        ["病床数/千人", "WHO/World Bank", "国", "2022–2024"],
        ["UHCカバレッジ", "WHO/World Bank", "国", "2021"],
        ["平均寿命", "WHO/World Bank", "国", "2022"],
        ["直行便都市数", "OAG, FlightConnections.com", "都市", "2025"],
        ["安全指数（4コンポーネント）", "Numbeo, UNODC, IEP, Gallup", "都市/国", "2024–2025"],
        ["制度的自由（3コンポーネント）", "RSF, EIU, TI", "国", "2024"],
        ["気候（月次）", "WMO 1991–2020, 各国気象局", "都市", "1991–2020基準"],
        ["為替レート（30通貨）", "静的スナップショット", "—", "2026年3月"],
      ]} />

      <H2 id="income">💰 収入データ</H2>
      <P>26職種の税引前年収（USD）。ソース：ERI/SalaryExpert、BLS、PayScale、OECD等。3つの表示モード：税前（Gross）、税後（Net）、外国人税後（ExpatNet）。</P>

      <H2 id="cost">🛒 生活費</H2>
      <P>標準消費と節約消費の2段階（USD/月）。ソース：Numbeo、Expatistan。</P>

      <H2 id="housing">🏠 住宅データ</H2>
      <P>m²あたり価格、中心1BR家賃、購入年数 = (価格×70m²) ÷ 年間貯蓄。貯蓄≤0なら「N/A」。</P>

      <H2 id="work">💼 労働指標</H2>
      <P>年間労働時間（OECD/ILO）、時給 = 年収÷労働時間、有給休暇日数、ビッグマック購買力。</P>

      <H2 id="environment">🌍 環境指標</H2>
      <P>AQI: 米国EPA基準。中国本土はAQI(CN)で表示（基準が異なるため直接比較不可）。通信速度: Ookla。直行便: OAG。</P>

      <H2 id="climate">🌤 気候データ</H2>
      <P>WMO 1991–2020常年値、各国気象局データ。月次の最高/最低気温と降水量を含む。</P>

      <H2 id="indices">📐 総合指数</H2>
      <P>4つの総合指数（0–100）：生活プレッシャー（低い方が良い, 30%貯蓄率+25%ビッグマック購買力+25%労働時間逆数+20%購入年数逆数）、安全指数（35%Numbeo+30%殺人率逆数+20%GPI逆数+15%Gallup）、医療指数（35%医師+25%病床+25%UHC+15%寿命）、制度的自由（35%報道自由+35%民主主義+30%腐敗認識）。欠損データは中間値50で補完。</P>

      <H2 id="tax">🧾 税後計算</H2>
      <P>79か国/地域の税制をカバー。累進税率、社会保険料、就業控除を含む簡易推定。外国人優遇：オランダ30%ルーリング、スペインベッカム法、イタリアImpatriati、ポルトガルNHR 2.0、ポーランド19%、シンガポールCPF免除。</P>

      <H2 id="ranking">🏅 ランキング</H2>
      <P>22指標を5カテゴリで密集ランキング。同点はタイ処理。欠損は最後尾。</P>

      <H2 id="compare">⚖️ 都市比較</H2>
      <P>2–3都市を16データ+6気候指標で比較。行ごとに最良値の都市が勝ち（緑色表示）。気候指標は勝敗に含まず。</P>

      <H2 id="detail">📄 都市詳細</H2>
      <P>類似都市：21次元正規化ユークリッド距離で最も近い6都市を推薦。公用語：法的地位のある言語のみ、推定話者数降順。</P>

      <H2 id="display">🎨 表示ルール</H2>
      <P>上位20%→緑、下位20%→赤、中間→灰色。信頼度ラベル：欠損3+→低信頼。通貨は静的レート。欠損は「—」表示。</P>

      <H2 id="disclaimer">⚠️ 免責事項</H2>
      <P>すべてのデータは参考情報であり、投資・移民・雇用・税務アドバイスではありません。給与は中央値推定であり実際と異なります。税後計算は簡易モデルです。為替レートは静的スナップショットです。総合指数は公開データに基づく合成指標であり公式評価ではありません。中国本土のAQIは中国基準で米国EPA基準と直接比較できません。都市の分類は地理的・実質的行政管轄に基づき、領土主権に関する立場を表しません。港澳台のデータはそれぞれの統計機関から取得しています。本サイトのデータに基づく決定から生じるいかなる損失についても責任を負いません。</P>
      <P>最終更新：2026年3月</P>

      <H3>フィードバックとソースコード</H3>
      <P>本サイトは <a href="https://github.com/qing4132/citycompare" target="_blank" rel="noopener noreferrer" className={linkCls}>GitHub</a> でオープンソースです。データの訂正や機能の提案は <a href="https://github.com/qing4132/citycompare/issues" target="_blank" rel="noopener noreferrer" className={linkCls}>Issue</a> または <a href="mailto:qing4132@users.noreply.github.com" className={linkCls}>メール</a>でお願いします。</P>
    </>);
  }

  /* ══════════════════════════════════════════════════════════
     Spanish (abbreviated — same structure, translated)
     ══════════════════════════════════════════════════════════ */
  function renderEs() {
    return (<>
      <H2 id="data-overview">📊 Visión general de datos</H2>
      <P>Este sitio cubre 134 ciudades con 42 campos de datos y 4 índices compuestos. Todos los salarios se almacenan en USD. Se pueden mostrar en 30 monedas.</P>
      <Table headers={["Categoría", "Fuente", "Granularidad", "Año"]} rows={[
        ["Salarios (26 profesiones)", "ERI/SalaryExpert, BLS, PayScale, OECD, Robert Half, Hays, Zhilian, JobStreet", "Ciudad × Profesión", "2024–2025"],
        ["Coste de vida (Estándar/Económico)", "Numbeo, Expatistan, Oficinas Nacionales de Estadística", "Ciudad", "2024–2025"],
        ["Precio vivienda por m²", "Global Property Guide, Índices locales", "Ciudad", "2024–2025"],
        ["Alquiler mensual (1BR centro)", "Numbeo Rent Index", "Ciudad", "2024–2025"],
        ["Precio Big Mac", "The Economist", "País", "Ene 2025"],
        ["Horas laborales anuales", "OECD/ILO", "País promedio", "2024"],
        ["Días de vacaciones pagadas", "Legislación laboral, OECD", "País", "2024"],
        ["Velocidad de Internet", "Ookla Speedtest", "Ciudad", "2025 Q1"],
        ["Calidad del aire (AQI)", "IQAir 2024, estándar US EPA", "Ciudad", "2024"],
        ["Médicos/1.000 hab.", "OMS/Banco Mundial (CC BY-4.0)", "País", "2022–2024"],
        ["Camas hosp./1.000 hab.", "OMS/Banco Mundial", "País", "2022–2024"],
        ["Cobertura UHC", "OMS/Banco Mundial", "País", "2021"],
        ["Esperanza de vida", "OMS/Banco Mundial", "País", "2022"],
        ["Ciudades con vuelos directos", "OAG, FlightConnections.com", "Ciudad", "2025"],
        ["Índice de seguridad (4 comp.)", "Numbeo, ONUDD, IEP, Gallup", "Ciudad/País", "2024–2025"],
        ["Libertad institucional (3 comp.)", "RSF, EIU, TI", "País", "2024"],
        ["Clima (mensual)", "OMM 1991–2020, servicios meteorológicos", "Ciudad", "Base 1991–2020"],
        ["Tipos de cambio (30)", "Instantánea estática", "—", "Marzo 2026"],
      ]} />

      <H2 id="income">💰 Datos salariales</H2>
      <P>Salario bruto anual (USD) para 26 profesiones. Fuentes: ERI/SalaryExpert, BLS, PayScale, OECD, etc. Tres modos: bruto, neto (impuestos locales), neto expatriado (con incentivos fiscales).</P>

      <H2 id="cost">🛒 Coste de vida</H2>
      <P>Dos niveles: Estándar y Económico (USD/mes). Fuentes: Numbeo, Expatistan.</P>

      <H2 id="housing">🏠 Vivienda</H2>
      <P>Precio por m², alquiler 1BR centro, años para comprar = (precio×70m²) ÷ ahorro anual. Si ahorro ≤ 0: "N/A".</P>

      <H2 id="work">💼 Indicadores laborales</H2>
      <P>Horas anuales (OECD/ILO), salario por hora, días de vacaciones, poder adquisitivo Big Mac.</P>

      <H2 id="environment">🌍 Medio ambiente</H2>
      <P>AQI: estándar US EPA. China continental usa AQI(CN), no directamente comparable. Internet: Ookla. Vuelos directos: OAG.</P>

      <H2 id="climate">🌤 Datos climáticos</H2>
      <P>Normales climatológicas OMM 1991–2020 y servicios meteorológicos nacionales. Datos mensuales de temperatura y precipitación.</P>

      <H2 id="indices">📐 Índices compuestos</H2>
      <P>4 índices (0–100): Presión vital (menor=mejor, 30% tasa ahorro + 25% poder Big Mac + 25% horas inv. + 20% años compra inv.), Seguridad (35% Numbeo + 30% homicidio inv. + 20% GPI inv. + 15% Gallup), Sanidad (35% médicos + 25% camas + 25% UHC + 15% esperanza vida), Libertad institucional (35% prensa + 35% democracia + 30% percepción corrupción). Datos faltantes se compensan con puntuación 50.</P>

      <H2 id="tax">🧾 Cálculo fiscal</H2>
      <P>Motor fiscal cubre 79 países/territorios. Incluye: tramos progresivos, cotizaciones sociales, deducciones laborales. Esquemas para expatriados: Holanda 30% Ruling, España Ley Beckham, Italia Impatriati, Portugal NHR 2.0, Polonia 19%, Singapur exención CPF.</P>

      <H2 id="ranking">🏅 Sistema de ranking</H2>
      <P>22 indicadores en 5 categorías. Ranking denso con empates. Datos faltantes al final.</P>

      <H2 id="compare">⚖️ Comparación de ciudades</H2>
      <P>Comparar 2–3 ciudades en 16 datos + 6 clima. Ganador = mejor valor por fila (verde). Indicadores climáticos excluidos del recuento de victorias.</P>

      <H2 id="detail">📄 Página de detalle</H2>
      <P>Ciudades similares: distancia euclidiana normalizada 21D, top 6. Idiomas oficiales: solo con estatus legal, ordenados por hablantes estimados.</P>

      <H2 id="display">🎨 Reglas de visualización</H2>
      <P>Top 20% → verde, Bottom 20% → rojo, medio → gris. Confianza: 3+ faltantes → baja. Moneda con tasa estática. Faltantes: "—".</P>

      <H2 id="disclaimer">⚠️ Descargos de responsabilidad</H2>
      <P>Todos los datos son solo de referencia y no constituyen asesoramiento de inversión, inmigración, empleo o fiscal. Los salarios son estimaciones medianas brutas. Los cálculos fiscales son modelos simplificados. Los tipos de cambio son instantáneas estáticas. Los índices compuestos son indicadores sintéticos, no evaluaciones oficiales. El AQI de China continental usa estándar chino, no comparable directamente con EPA. La clasificación de ciudades es geográfica y administrativa, sin representar posiciones sobre soberanía. Los datos de Hong Kong, Macao y Taiwán provienen de sus autoridades estadísticas respectivas. Este sitio no asume responsabilidad por decisiones basadas en estos datos.</P>
      <P>Última actualización: marzo 2026</P>

      <H3>Comentarios y código fuente</H3>
      <P>Este sitio es de código abierto en <a href="https://github.com/qing4132/citycompare" target="_blank" rel="noopener noreferrer" className={linkCls}>GitHub</a>. Para correcciones o sugerencias, <a href="https://github.com/qing4132/citycompare/issues" target="_blank" rel="noopener noreferrer" className={linkCls}>abre un issue</a> o envía un correo a <a href="mailto:qing4132@users.noreply.github.com" className={linkCls}>qing4132@users.noreply.github.com</a>.</P>
    </>);
  }

  return (
    <div className={`min-h-screen transition-colors ${bg}`}>
      {/* Nav */}
      <div className={`sticky top-0 z-50 border-b px-4 py-2.5 ${navBg}`}>
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Link href="/" className={`text-xs px-2 py-1 rounded border transition ${darkMode ? "bg-slate-800 border-slate-600 text-blue-300 hover:bg-slate-700" : "bg-white border-slate-300 text-blue-700 hover:bg-blue-50"}`}>{t("navHome")}</Link>
            <Link href="/ranking" className={`text-xs px-2 py-1 rounded border transition ${darkMode ? "bg-slate-800 border-slate-600 text-amber-300 hover:bg-slate-700" : "bg-white border-slate-300 text-amber-700 hover:bg-amber-50"}`}>{t("navRanking")}</Link>
            <button onClick={() => { const slugs = Object.values(CITY_SLUGS); router.push(`/city/${slugs[Math.floor(Math.random() * slugs.length)]}`); }}
              className={`text-xs px-2 py-1 rounded border transition ${darkMode ? "bg-slate-800 border-slate-600 text-emerald-300 hover:bg-slate-700" : "bg-white border-slate-300 text-emerald-700 hover:bg-emerald-50"}`}>
              {t("navRandomCity")}
            </button>
            <Link href="/compare" className={`text-xs px-2 py-1 rounded border transition ${darkMode ? "bg-slate-800 border-slate-600 text-violet-300 hover:bg-slate-700" : "bg-white border-slate-300 text-violet-700 hover:bg-violet-50"}`}>{t("navCompare")}</Link>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
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
            <button onClick={() => s.setDarkMode(!darkMode)} className={`text-xs px-2 py-1 rounded border ${darkMode ? "bg-slate-800 border-slate-600 text-yellow-300" : "bg-white border-slate-300 text-slate-600"}`}>
              {darkMode ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className={`text-2xl font-bold mb-6 ${headCls}`}>{title}</h1>

        {/* Table of Contents */}
        <nav className={`rounded-xl border p-4 mb-8 ${cardBg}`}>
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
    </div>
  );
}
