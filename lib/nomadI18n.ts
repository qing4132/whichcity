/* Nomad-section i18n: visa names, tax descriptions, and visa notes */
type L3 = { zh: string; ja: string; es: string };
type L4 = { en: string; zh: string; ja: string; es: string };

// ── Visa name translations (22 unique) ──
const VN: Record<string, L3> = {
    "DE Rantau Nomad Pass": { zh: "DE Rantau 游牧通行证", ja: "DE Rantau ノマドパス", es: "Pase Nómada DE Rantau" },
    "Designated Activities (Digital Nomad)": { zh: "特定活动签证（数字游民）", ja: "特定活動ビザ（デジタルノマド）", es: "Actividades Designadas (Nómada Digital)" },
    "Destination Thailand Visa (DTV)": { zh: "泰国目的地签证（DTV）", ja: "タイ・デスティネーション・ビザ (DTV)", es: "Visa Destino Tailandia (DTV)" },
    "Digital Nomad Visa": { zh: "数字游民签证", ja: "デジタルノマドビザ", es: "Visa de Nómada Digital" },
    "Digital Nomad Visa (Announced, NOT YET IMPLEMENTED)": { zh: "数字游民签证（已公布，尚未实施）", ja: "デジタルノマドビザ（発表済み・未実施）", es: "Visa Nómada Digital (Anunciada, NO IMPLEMENTADA)" },
    "Digital Nomad Visa (D-visa)": { zh: "数字游民签证（D 签证）", ja: "デジタルノマドビザ (Dビザ)", es: "Visa Nómada Digital (Visa D)" },
    "Digital Nomad Visa (Ley Nómada Digital)": { zh: "数字游民签证（游民数字法）", ja: "デジタルノマドビザ（Ley Nómada Digital）", es: "Visa Nómada Digital (Ley Nómada Digital)" },
    "Digital Nomad Visa (Long-Term National Visa)": { zh: "数字游民签证（长期国家签证）", ja: "デジタルノマドビザ（長期国家ビザ）", es: "Visa Nómada Digital (Visa Nacional a Largo Plazo)" },
    "Digital Nomad Visa (Second Home Visa / B211A)": { zh: "数字游民签证（第二家园签证 / B211A）", ja: "デジタルノマドビザ（セカンドホーム / B211A）", es: "Visa Nómada Digital (Segunda Casa / B211A)" },
    "Digital Nomad Visa (Startup Law / Ley de Startups)": { zh: "数字游民签证（创业法）", ja: "デジタルノマドビザ（スタートアップ法）", es: "Visa Nómada Digital (Ley de Startups)" },
    "Digital Nomad Visa (decreto sostegni ter)": { zh: "数字游民签证（补充法令）", ja: "デジタルノマドビザ（decreto sostegni ter）", es: "Visa Nómada Digital (decreto sostegni ter)" },
    "Digital Nomad Visitor Visa": { zh: "数字游民访客签证", ja: "デジタルノマド訪問ビザ", es: "Visa de Visitante Nómada Digital" },
    "Dubai Virtual Working Programme / Remote Work Visa": { zh: "迪拜虚拟工作计划 / 远程工作签证", ja: "ドバイ仮想ワーキング / リモートワークビザ", es: "Programa Virtual de Dubái / Visa Trabajo Remoto" },
    "Remote Work / Digital Nomad Visa (D8)": { zh: "远程工作 / 数字游民签证（D8）", ja: "リモートワーク / デジタルノマドビザ (D8)", es: "Visa Trabajo Remoto / Nómada Digital (D8)" },
    "Remote Worker Visa (Short Stay Visa for Remote Workers)": { zh: "远程工作者签证（短期停留）", ja: "リモートワーカービザ（短期滞在）", es: "Visa Trabajador Remoto (Corta Estancia)" },
    "Remote work allowed on tourist status": { zh: "旅游签证允许远程工作", ja: "観光ステータスでリモートワーク可", es: "Trabajo remoto permitido con visa turista" },
    "Remotely from Georgia": { zh: "格鲁吉亚远程工作计划", ja: "Remotely from Georgia", es: "Remotely from Georgia" },
    "Svalbard Remote Worker Program": { zh: "斯瓦尔巴远程工作计划", ja: "スヴァールバル・リモートワーカー", es: "Programa Remoto de Svalbard" },
    "Temporary Resident Visa (used by nomads)": { zh: "临时居留签证（游民常用）", ja: "一時居住ビザ（ノマド利用可）", es: "Visa Residente Temporal (usada por nómadas)" },
    "VITEM XIV (Digital Nomad Visa)": { zh: "VITEM XIV（数字游民签证）", ja: "VITEM XIV（デジタルノマドビザ）", es: "VITEM XIV (Visa Nómada Digital)" },
    "White Card (Digital Nomad Residence Permit)": { zh: "白卡（数字游民居留许可）", ja: "ホワイトカード（ノマド居住許可）", es: "Tarjeta Blanca (Permiso Residencia Nómada)" },
    "Workation Visa (F-1-D)": { zh: "工作度假签证（F-1-D）", ja: "ワーケーションビザ (F-1-D)", es: "Visa Workation (F-1-D)" },
};

// ── Tax string translations (12 unique) ──
const TX: Record<string, L3> = {
    "0%": { zh: "0%", ja: "0%", es: "0%" },
    "0% on foreign-sourced income": { zh: "境外收入免税", ja: "海外所得非課税", es: "0% ingresos extranjeros" },
    "0% if <183 days; 50% tax reduction program for 7 years if resident": { zh: "停留<183 天免税；居民享 7 年 50%减税", ja: "183日未満0%；居住者7年間50%減税", es: "0% si <183 días; 50% reducción 7 años si residente" },
    "0-27%": { zh: "0-27%", ja: "0-27%", es: "0-27%" },
    "10%": { zh: "10%", ja: "10%", es: "10%" },
    "15%": { zh: "15%", ja: "15%", es: "15%" },
    "15-33%": { zh: "15-33%", ja: "15-33%", es: "15-33%" },
    "19-24%": { zh: "19-24%", ja: "19-24%", es: "19-24%" },
    "20%": { zh: "20%", ja: "20%", es: "20%" },
    "20% (standard rate; details unclear for nomad visitors)": { zh: "20%（标准税率，游民适用待确认）", ja: "20%（標準税率；ノマド詳細不明）", es: "20% (tasa estándar; detalles poco claros)" },
    "20% flat if staying >183 days (worldwide income)": { zh: "停留>183 天按全球收入征 20%", ja: "183日超で全世界所得20%", es: "20% fijo si >183 días (ingreso mundial)" },
    "6%-35% on income paid/remitted in Korea; tax treaties may exempt": { zh: "韩国汇入收入 6%-35%；税收协定可免", ja: "韓国送金所得6%-35%；条約で免除あり", es: "6%-35% ingresos remitidos; tratados pueden eximir" },
};

// ── Note templates (shared by multiple cities) ──
const NT: Record<string, L4> = {
    no_visa: { en: "No dedicated nomad visa.", zh: "无专门游民签证。", ja: "専用のノマドビザはありません。", es: "No hay visa dedicada para nómadas." },
    us_b1b2: { en: "B-1/B-2 tourist visa does not allow remote work.", zh: "B-1/B-2 旅游签证不允许远程工作。", ja: "B-1/B-2観光ビザではリモートワークは認められていません。", es: "La visa de turista B-1/B-2 no permite trabajo remoto." },
    cn_none: { en: "No digital nomad visa program.", zh: "无数字游民签证项目。", ja: "デジタルノマド向けのビザ制度はありません。", es: "No existe programa de visa para nómadas digitales." },
    ca_remote: { en: "Remote work allowed on tourist visa, but must not serve Canadian clients and cannot be the primary purpose of entry.", zh: "持旅游签可远程办公，但不能服务加拿大客户，且工作不能是入境的主要目的。", ja: "観光ビザでのリモートワークは可能ですが、カナダの顧客向け業務や、入国の主目的としての就労は認められません。", es: "Se permite trabajo remoto con visa de turista, pero no puede atender clientes canadienses ni ser el motivo principal de entrada." },
    jp_2024: { en: "Launched March 2024. Applicants must be from visa-exempt or tax treaty countries. Health insurance ≥¥10M required.", zh: "2024 年 3 月推出。申请人须来自免签国或税收协定国，需购买保额≥1000 万日元的医疗保险。", ja: "2024年3月開始。ビザ免除国または租税条約国の国民が対象で、保険金額1000万円以上の医療保険が必要です。", es: "Lanzada en marzo de 2024. Los solicitantes deben ser de países exentos de visa o con tratado fiscal. Se requiere seguro médico ≥¥10M." },
    th_dtv: { en: "5-year multiple-entry visa. Each stay up to 180 days, extendable by 180 days. Requires 500,000 THB (~$14,000) in savings. SMART Visa also available for skilled workers.", zh: "5 年多次入境，每次可停留 180 天并延期 180 天。需 50 万泰铢（约$14,000）存款证明。高技能人才也可申请 SMART 签证。", ja: "5年間有効のマルチエントリービザで、1回の滞在は最長180日＋180日延長可能。50万バーツ（約$14,000）の残高証明が必要。高スキル人材にはSMART Visaもあります。", es: "Visa de 5 años con entradas múltiples. Cada estancia hasta 180 días, extensible 180 días más. Se requieren 500,000 THB (~$14,000) en ahorros. También existe la SMART Visa para profesionales cualificados." },
    es_beckham: { en: "Initially 12 months, renewable up to 5 years. Reduced tax rate under the Beckham Law.", zh: "首次签发 12 个月，最长可续至 5 年。可享受「贝克汉姆法」减税优惠。", ja: "初回12ヶ月、最長5年まで更新可能。「ベッカム法」による減税優遇が適用されます。", es: "12 meses iniciales, renovable hasta 5 años. Tipo impositivo reducido bajo la Ley Beckham." },
    br_vitem: { en: "Valid for 1 year, renewable for another year. Requires $1,500/month income or $18,000 in savings.", zh: "有效期 1 年，可续签 1 年。需月收入≥$1,500 或存款≥$18,000。", ja: "有効期間1年、さらに1年更新可能。月収$1,500以上、または預金$18,000以上が必要です。", es: "Válida por 1 año, renovable otro año. Se requiere un ingreso de $1,500/mes o $18,000 en ahorros." },
    it_pending: { en: "Legislated in March 2022, but implementation details remain unpublished.", zh: "2022 年 3 月已立法通过，但具体实施细则至今未公布。", ja: "2022年3月に法制化されましたが、具体的な実施細則はまだ公表されていません。", es: "Aprobada por ley en marzo de 2022, pero los detalles de implementación aún no se han publicado." },
    in_tourist: { en: "e-Tourist visa is limited to tourism and does not allow work.", zh: "电子旅游签证仅限观光，不允许工作。", ja: "電子観光ビザ（e-Tourist visa）は観光目的のみで、就労は認められていません。", es: "La visa electrónica de turista solo permite turismo, no trabajo." },
    kr_company: { en: "Only for remote workers employed by a company. Freelancers are not eligible. Valid up to 2 years.", zh: "仅限受雇于企业的远程工作者，自由职业者不符合条件。有效期最长 2 年。", ja: "企業に所属するリモートワーカー限定で、フリーランサーは対象外です。有効期間は最長2年。", es: "Solo para trabajadores remotos empleados por una empresa. Los freelancers no son elegibles. Válida hasta 2 años." },
    vn_evisa: { en: "Tourist e-visa allows stays of up to 90 days.", zh: "旅游电子签证最长可停留 90 天。", ja: "観光用の電子ビザ（e-visa）で最長90日間滞在できます。", es: "La visa electrónica de turismo permite estancias de hasta 90 días." },
    pt_popular: { en: "Applications open since October 2022. First 6 months are tax-free.", zh: "2022 年 10 月起可申请，入境前 6 个月免征所得税。", ja: "2022年10月から申請受付中。最初の6ヶ月間は所得税が免除されます。", es: "Solicitudes abiertas desde octubre de 2022. Los primeros 6 meses están exentos de impuestos." },
    mx_temp: { en: "Nomad-friendly temporary resident visa available. 180-day tourist visa also commonly used.", zh: "可申请对游民友好的临时居民签证，也可持 180 天旅游签入境。", ja: "ノマドに適した一時居住ビザがあり、180日間の観光ビザも広く利用されています。", es: "Hay una visa de residente temporal apta para nómadas. También se usa comúnmente la visa de turista de 180 días." },
    co_2yr: { en: "Valid for up to 2 years.", zh: "有效期最长 2 年。", ja: "有効期間は最長2年。", es: "Válida hasta 2 años." },
    za_pending: { en: "Announced in 2024 but not yet implemented. Details still under development.", zh: "2024 年已宣布但尚未正式实施，细则仍在制定中。", ja: "2024年に発表されましたが、まだ実施されていません。詳細は策定中です。", es: "Anunciada en 2024 pero aún no implementada. Los detalles siguen en desarrollo." },
    de_freelancer: { en: "Freelancer visa available, but requires demonstrating a connection to the German market.", zh: "可申请自由职业者签证，但需证明与德国有业务关联。", ja: "フリーランサービザがありますが、ドイツ市場との業務上の関連を証明する必要があります。", es: "Existe la visa de freelancer, pero requiere demostrar una conexión con el mercado alemán." },
    kh_biz: { en: "Nomads commonly use the business visa (EB type).", zh: "游民通常使用商务签证（EB 类）入境。", ja: "ノマドは一般的にビジネスビザ（EB類）を利用して入国しています。", es: "Los nómadas suelen usar la visa de negocios (tipo EB)." },
    pe_tourist: { en: "Tourist stay of up to 183 days.", zh: "可凭旅游身份停留最长 183 天。", ja: "観光目的で最長183日間滞在できます。", es: "Estancia turística de hasta 183 días." },
    my_pass: { en: "3-12 month pass, renewable for another 12 months. Limited to digital and tech professions.", zh: "通行证有效期 3-12 个月，可续签 12 个月。仅限数字和科技类职业申请。", ja: "3〜12ヶ月のパスで、さらに12ヶ月更新可能。デジタル・テック系の職種に限定されています。", es: "Pase de 3 a 12 meses, renovable por otros 12. Solo para profesiones digitales y tecnológicas." },
    uk_remote: { en: "Remote work for non-UK clients allowed on tourist status.", zh: "持旅游身份可为非英国客户远程工作。", ja: "観光ステータスで、英国外のクライアント向けリモートワークが認められています。", es: "Se permite trabajo remoto para clientes no británicos con estatus de turista." },
    id_b211a: { en: "5-year tax-free nomad visa plan announced in June 2022. B211A visa commonly used by nomads.", zh: "2022 年 6 月宣布 5 年免税游民签证计划，目前游民多使用 B211A 签证入境。", ja: "2022年6月に5年間の免税ノマドビザ計画が発表されました。現在はB211Aビザが広く利用されています。", es: "Plan de visa nómada de 5 años libre de impuestos anunciado en junio de 2022. La visa B211A es la más utilizada por nómadas." },
    bg_bansko: { en: "Popular nomad destination, but no formal visa program.", zh: "热门游民目的地，但暂无正式签证项目。", ja: "人気のノマド拠点ですが、正式なビザ制度はありません。", es: "Destino popular entre nómadas, pero sin programa formal de visa." },
    hr_exempt: { en: "Valid up to 1 year. Foreign income is tax-exempt. For non-EU nationals only. In effect since January 2021.", zh: "有效期最长 1 年，境外收入免税，仅限非欧盟公民申请。2021 年 1 月起实施。", ja: "最長1年有効。海外からの収入は非課税で、非EU国籍者のみ対象。2021年1月から実施。", es: "Válida hasta 1 año. Los ingresos extranjeros están exentos de impuestos. Solo para ciudadanos no comunitarios. Vigente desde enero de 2021." },
    eu_member: { en: "EU member state. EU citizens can live and work freely.", zh: "欧盟成员国，欧盟公民可自由居住和工作。", ja: "EU加盟国のため、EU市民は自由に居住・就労できます。", es: "Estado miembro de la UE. Los ciudadanos comunitarios pueden vivir y trabajar libremente." },
    // Unique single-city notes
    sg_onepass: { en: "ONE Pass and Tech.Pass available for high-income earners.", zh: "高收入者可申请 ONE Pass 或 Tech.Pass。", ja: "高収入者向けにONE PassやTech.Passがあります。", es: "ONE Pass y Tech.Pass disponibles para personas con altos ingresos." },
    fr_talent: { en: "Passeport Talent visa available for freelancers.", zh: "自由职业者可申请 Passeport Talent 签证。", ja: "フリーランサーはPasseport Talentビザを申請できます。", es: "La visa Passeport Talent está disponible para freelancers." },
    nl_daft: { en: "Orientation visa and DAFT treaty available for entrepreneurs.", zh: "创业者可通过 DAFT 条约或 Orientation 签证入境。", ja: "起業家向けにOrientation visaやDAFT条約制度があります。", es: "Visa de orientación y tratado DAFT disponibles para emprendedores." },
    cz_zivno: { en: "Some nomads use the Živno visa (trade license) for long-term stays.", zh: "部分游民使用 Živno 签证（营业执照类）长期居留。", ja: "一部のノマドはŽivnoビザ（営業許可証）を利用して長期滞在しています。", es: "Algunos nómadas usan la visa Živno (licencia comercial) para estancias prolongadas." },
    gr_extend: { en: "Extendable to a total of 2 years.", zh: "可延长至总计 2 年。", ja: "合計2年まで延長可能。", es: "Extensible hasta un total de 2 años." },
    tr_guide: { en: "Full details not yet collected.", zh: "具体细则尚未完整收集。", ja: "詳細はまだ完全に収集されていません。", es: "Los detalles completos aún no se han recopilado." },
    uae_virtual: { en: "Valid for 1 year. Requires $5,000/month income and an employment confirmation letter. 0% income tax.", zh: "有效期 1 年，需月收入≥$5,000 并提供雇佣证明信，所得税为 0%。", ja: "有効期間1年。月収$5,000以上と雇用確認書が必要。所得税は0%。", es: "Válida por 1 año. Se requiere un ingreso de $5,000/mes y carta de empleo. Impuesto sobre la renta: 0%." },
    ph_announced: { en: "Announced in May 2023, valid for 1 year.", zh: "2023 年 5 月宣布推出，有效期 1 年。", ja: "2023年5月に発表。有効期間は1年。", es: "Anunciada en mayo de 2023, válida por 1 año." },
    tw_2025: { en: "Launched January 2025, valid for 180 days. Requires prior nomad visa experience, 6-month average savings ≥$10,000, and annual income $20,000–$40,000 (varies by age).", zh: "2025 年 1 月推出，有效期 180 天。需有其他国家游民签证经历，近 6 个月平均存款≥$10,000，年收入$20,000-$40,000（因年龄而异）。", ja: "2025年1月開始、有効期間180日。他国でのノマドビザ経験、直近6ヶ月の平均預金$10,000以上、年収$20,000〜$40,000（年齢による）が必要です。", es: "Lanzada en enero de 2025, válida por 180 días. Requiere experiencia previa con visa nómada, depósitos promedio de $10,000 en 6 meses y salario de $20,000–$40,000/año (según edad)." },
    ar_6mo: { en: "Valid for 6 months, renewable for another 6 months. Launched May 2022.", zh: "有效期 6 个月，可续签 6 个月。2022 年 5 月推出。", ja: "有効期間6ヶ月、さらに6ヶ月更新可能。2022年5月開始。", es: "Válida por 6 meses, renovable otros 6. Lanzada en mayo de 2022." },
    cr_1yr: { en: "Valid for 1 year, renewable for another year. Requires $3,000/month income ($5,000 for families). Law passed August 2021.", zh: "有效期 1 年，可续签 1 年。需月收入≥$3,000（家庭≥$5,000）。2021 年 8 月立法通过。", ja: "有効期間1年、さらに1年更新可能。月収$3,000以上（家族は$5,000以上）が必要。2021年8月に法制化。", es: "Válida por 1 año, renovable otro año. Se requiere un ingreso de $3,000/mes (familias $5,000). Ley aprobada en agosto de 2021." },
    pa_guide: { en: "Details limited.", zh: "已被 VisaGuide 收录。", ja: "詳細は限定的。", es: "Información limitada." },
    pr_act60: { en: "US territory. Act 60 offers tax incentives for those who relocate, but it is not a nomad visa.", zh: "属于美国领土。Act 60 为迁入者提供税收优惠，但并非游民签证。", ja: "米国の領土です。Act 60は移住者向けの税制優遇を提供しますが、ノマドビザではありません。", es: "Territorio de EE. UU. La Ley 60 ofrece incentivos fiscales para quienes se trasladen, pero no es una visa nómada." },
    bh_notfound: { en: "No dedicated nomad visa found.", zh: "不存在专门游民签证。", ja: "専用のノマドビザは確認されていません。", es: "No se encontró una visa dedicada para nómadas." },
    il_discussed: { en: "A nomad visa has been discussed but not implemented.", zh: "曾讨论推出游民签证，但尚未实施。", ja: "ノマドビザの導入が議論されましたが、まだ実施されていません。", es: "Se ha discutido una visa nómada, pero no se ha implementado." },
    ua_conflict: { en: "Was a popular nomad destination before the 2022 conflict.", zh: "2022 年冲突前曾是热门游民目的地。", ja: "2022年の紛争前はノマドに人気の目的地でした。", es: "Era un destino popular para nómadas antes del conflicto de 2022." },
    ro_6mo: { en: "Valid for 6 months, renewable for another 6 months. Requires 3+ years of work experience and income ≥3× Romania's average gross salary. First 6 months tax-free.", zh: "有效期 6 个月，可续签 6 个月。需 3 年以上工作经验，且收入≥罗马尼亚平均工资的 3 倍。入境前 6 个月免税。", ja: "有効期間6ヶ月、さらに6ヶ月延長可能。3年以上の職歴とルーマニア平均総給の3倍以上の収入が必要。最初の6ヶ月は非課税。", es: "Válida por 6 meses, renovable otros 6. Requiere más de 3 años de experiencia laboral e ingresos ≥3× el salario bruto medio rumano. Primeros 6 meses libres de impuestos." },
    rs_90day: { en: "90-day visa-free stay available for many nationalities.", zh: "多数国籍可免签停留 90 天。", ja: "多くの国籍が90日間のビザ免除で滞在できます。", es: "Estancia de 90 días sin visa para muchas nacionalidades." },
    hu_1yr: { en: "Valid for 1 year, renewable for another year. First 6 months tax-free.", zh: "有效期 1 年，可续签 1 年。据 VisaGuide，入境前 6 个月可免税。", ja: "有効期間1年、さらに1年更新可能。最初の6ヶ月間は非課税。", es: "Válida por 1 año, renovable otro año. Los primeros 6 meses están exentos de impuestos." },
    kz_30day: { en: "30-day visa-free entry for many nationalities.", zh: "多数国籍可免签停留 30 天。", ja: "多くの国籍が30日間のビザ免除で入国できます。", es: "Entrada sin visa de 30 días para muchas nacionalidades." },
    fi_considered: { en: "A nomad visa has been considered but not implemented.", zh: "曾考虑推出游民签证，但尚未实施。", ja: "ノマドビザの導入が検討されましたが、まだ実施されていません。", es: "Se ha considerado una visa nómada, pero no se ha implementado." },
    no_svalbard: { en: "Svalbard is visa-free by treaty but has limited infrastructure. Mainland Norway has no nomad visa.", zh: "斯瓦尔巴群岛依国际条约免签，但基础设施有限。挪威本土无游民签证。", ja: "スヴァールバルは条約によりビザ不要ですが、インフラが限られています。ノルウェー本土には専用のノマドビザはありません。", es: "Svalbard no requiere visa por tratado, pero la infraestructura es limitada. Noruega continental no tiene visa nómada." },
    ge_suspended: { en: "Program appears suspended as of January 2025. Only open to citizens of 95 visa-free countries.", zh: "截至 2025 年 1 月该项目疑似已暂停，且仅限 95 个免签国公民申请。", ja: "2025年1月時点でプログラムは一時停止の模様。ビザ免除対象の95カ国の国民のみ申請可能。", es: "El programa parece suspendido desde enero de 2025. Solo para ciudadanos de 95 países con exención de visa." },
    ee_reapply: { en: "Cannot be extended, but you can reapply after expiration.", zh: "不可延期，但到期后可重新申请。", ja: "延長はできませんが、有効期限後に再申請が可能です。", es: "No es extensible, pero se puede volver a solicitar tras su expiración." },
    uy_90day: { en: "90-day visa-free stay for strong passports. Temporary residency for remote workers available via consulate.", zh: "强护照可免签停留 90 天，也可通过领事馆申请远程工作者临时居留。", ja: "強いパスポートなら90日間ビザ免除で滞在可能。領事館を通じてリモートワーカー向けの一時居住を申請できます。", es: "Estancia de 90 días sin visa para pasaportes fuertes. Se puede solicitar residencia temporal para trabajadores remotos a través del consulado." },
    ma_90day: { en: "90-day visa-free entry for US/EU/UK passports. 3-month extension possible at local police station.", zh: "美/欧/英护照可免签停留 90 天，可在当地警局延期 3 个月。", ja: "米国/EU/英国のパスポートで90日間ビザ免除。地元の警察署で3ヶ月の延長が可能です。", es: "Entrada sin visa de 90 días para pasaportes de EE. UU./UE/Reino Unido. Extensión de 3 meses posible en la comisaría local." },
};

// ── City ID → note template key ──
const CN: Record<number, string> = {
    // US cities
    1: "us_b1b2", 11: "us_b1b2", 12: "us_b1b2", 13: "us_b1b2", 34: "us_b1b2", 35: "us_b1b2",
    36: "us_b1b2", 37: "us_b1b2", 38: "us_b1b2", 39: "us_b1b2", 95: "us_b1b2", 96: "us_b1b2",
    97: "us_b1b2", 98: "us_b1b2", 99: "us_b1b2", 100: "us_b1b2", 125: "us_b1b2", 126: "us_b1b2",
    133: "us_b1b2", 134: "us_b1b2",
    // China
    4: "cn_none", 5: "cn_none", 101: "cn_none", 102: "cn_none", 103: "cn_none", 104: "cn_none", 105: "cn_none",
    // Canada
    9: "ca_remote", 40: "ca_remote", 41: "ca_remote", 127: "ca_remote", 135: "ca_remote",
    // Japan
    3: "jp_2024", 106: "jp_2024", 107: "jp_2024", 138: "jp_2024", 139: "jp_2024", 159: "jp_2024",
    // Thailand
    45: "th_dtv", 112: "th_dtv", 147: "th_dtv", 153: "th_dtv", 154: "th_dtv",
    // Spain
    20: "es_beckham", 21: "es_beckham", 144: "es_beckham", 149: "es_beckham",
    // Brazil
    32: "br_vitem", 33: "br_vitem", 152: "br_vitem",
    // Italy
    22: "it_pending", 23: "it_pending",
    // India
    49: "in_tourist", 50: "in_tourist", 51: "in_tourist", 83: "in_tourist", 84: "in_tourist",
    // Korea
    59: "kr_company", 60: "kr_company", 108: "kr_company",
    // Vietnam
    47: "vn_evisa", 48: "vn_evisa", 141: "vn_evisa",
    // Portugal
    28: "pt_popular", 143: "pt_popular",
    // Mexico
    31: "mx_temp", 69: "mx_temp", 142: "mx_temp", 157: "mx_temp", 158: "mx_temp",
    // Colombia
    64: "co_2yr", 129: "co_2yr",
    // South Africa
    67: "za_pending", 68: "za_pending",
    // Germany
    18: "de_freelancer", 19: "de_freelancer",
    // Cambodia
    109: "kh_biz", 155: "kh_biz",
    // Peru
    65: "pe_tourist", 156: "pe_tourist",
    // Malaysia
    46: "my_pass", 150: "my_pass",
    // UK
    2: "uk_remote", 94: "uk_remote",
    // Indonesia
    57: "id_b211a", 140: "id_b211a",
    // Bulgaria
    87: "bg_bansko", 145: "bg_bansko",
    // Croatia
    88: "hr_exempt", 146: "hr_exempt",
    // EU small
    91: "eu_member", 92: "eu_member",
    // UAE
    14: "uae_virtual", 75: "uae_virtual",
    // Unique
    7: "sg_onepass", 8: "fr_talent", 15: "nl_daft", 26: "cz_zivno", 29: "gr_extend",
    30: "tr_guide", 58: "ph_announced", 61: "tw_2025", 62: "ar_6mo", 70: "cr_1yr",
    71: "pa_guide", 73: "pr_act60", 77: "bh_notfound", 82: "il_discussed", 85: "ua_conflict",
    86: "ro_6mo", 89: "rs_90day", 90: "hu_1yr", 117: "kz_30day", 123: "fi_considered",
    124: "no_svalbard", 130: "ge_suspended", 137: "ee_reapply", 148: "uy_90day", 151: "ma_90day",
    // Plain "No dedicated nomad visa."
    6: "no_visa", 10: "no_visa", 16: "no_visa", 17: "no_visa", 24: "no_visa", 25: "no_visa",
    27: "no_visa", 42: "no_visa", 43: "no_visa", 44: "no_visa", 52: "no_visa", 53: "no_visa",
    54: "no_visa", 55: "no_visa", 56: "no_visa", 63: "no_visa", 76: "no_visa", 78: "no_visa",
    79: "no_visa", 80: "no_visa", 81: "no_visa", 93: "no_visa", 110: "no_visa", 114: "no_visa",
    115: "no_visa", 116: "no_visa", 118: "no_visa", 119: "no_visa", 120: "no_visa", 121: "no_visa",
    122: "no_visa", 128: "no_visa", 131: "no_visa", 132: "no_visa", 136: "no_visa",
};

// ── Legal income per visa program (original currency per law) ──
// Sources: official visa pages, VisaGuide.World, verified 2025-07
type Cur = "EUR" | "USD" | "JPY" | "KRW";
type Per = "mo" | "yr";
const curName: Record<Cur, Record<string, string>> = {
    EUR: { zh: "欧元", en: "euros", ja: "ユーロ", es: "euros" },
    USD: { zh: "美元", en: "dollars", ja: "ドル", es: "dólares" },
    JPY: { zh: "日元", en: "yen", ja: "円", es: "yenes" },
    KRW: { zh: "韩元", en: "won", ja: "ウォン", es: "wones" },
};
const perName: Record<Per, Record<string, string>> = {
    mo: { zh: "/月", en: "/mo", ja: "/月", es: "/mes" },
    yr: { zh: "/年", en: "/yr", ja: "/年", es: "/año" },
};
function fmtLegal(amount: number, cur: Cur, per: Per, locale: string): string {
    const wan = (n: number) => n >= 10000 && n % 10000 === 0 ? `${n / 10000}万` : `${n}`;
    const num = locale === "zh" || locale === "ja" ? wan(amount)
        : locale === "es" ? amount.toLocaleString("es-ES")
            : amount.toLocaleString("en-US");
    const sep = locale === "ja" ? "" : " ";
    return `${num}${sep}${curName[cur][locale]}${perName[per][locale]}`;
}
const LI: { ids: number[]; amount: number; cur: Cur; per: Per }[] = [
    { ids: [3, 106, 107, 138, 139, 159], amount: 10_000_000, cur: "JPY", per: "yr" },   // Japan DN: ¥10,000,000/yr
    { ids: [14, 75], amount: 3_500, cur: "USD", per: "mo" },   // UAE: $3,500/mo
    { ids: [20, 21, 144, 149], amount: 2_646, cur: "EUR", per: "mo" },   // Spain Ley Startups: 200% SMI
    { ids: [28, 143], amount: 3_280, cur: "EUR", per: "mo" },   // Portugal D8
    { ids: [29], amount: 3_500, cur: "EUR", per: "mo" },   // Greece DN
    { ids: [32, 33, 152], amount: 1_500, cur: "USD", per: "mo" },   // Brazil VITEM XIV
    { ids: [46, 150], amount: 24_000, cur: "USD", per: "yr" },   // Malaysia DE Rantau: $24k/yr
    { ids: [59, 60, 108], amount: 84_960_000, cur: "KRW", per: "yr" },   // Korea F-1-D: ₩84,960,000/yr
    // South Africa (67, 68) excluded — visa not yet implemented
    { ids: [70], amount: 3_000, cur: "USD", per: "mo" },   // Costa Rica
    { ids: [86], amount: 3_700, cur: "EUR", per: "mo" },   // Romania DN: ~3× avg gross salary
    { ids: [90], amount: 3_000, cur: "EUR", per: "mo" },   // Hungary White Card
    { ids: [130], amount: 2_000, cur: "USD", per: "mo" },   // Georgia
    { ids: [137], amount: 4_500, cur: "EUR", per: "mo" },   // Estonia D-visa
];
const _liCache = new Map<number, { amount: number; cur: Cur; per: Per }>();
for (const p of LI) for (const id of p.ids) _liCache.set(id, p);

// ── Public API ──
type Locale = "zh" | "en" | "ja" | "es";

/** Returns legal-currency income string, or null if no legal requirement exists */
export function getLegalIncome(cityId: number, locale: Locale): string | null {
    const p = _liCache.get(cityId);
    if (!p) return null;
    return fmtLegal(p.amount, p.cur, p.per, locale);
}

export function localizeVisaName(name: string | null, locale: Locale): string | null {
    if (!name || locale === "en") return name;
    return VN[name]?.[locale] ?? name;
}

export function localizeTax(tax: string | null, locale: Locale): string | null {
    if (!tax || locale === "en") return tax;
    return TX[tax]?.[locale] ?? tax;
}

export function localizeNote(cityId: number, note: string | null, locale: Locale): string | null {
    if (!note) return null;
    const key = CN[cityId];
    let result = key ? (NT[key]?.[locale] ?? note) : note;
    // Strip redundant "no visa" prefix — the visa field already shows "无"
    const pfx = [
        "No dedicated nomad visa. ", "No dedicated DN visa. ", "No DN visa. ",
        "No digital nomad visa program.", "No dedicated nomad visa found in sources.", "No dedicated nomad visa.",
        "无专门游民签证。", "无数字游民签证项目。", "不存在专门游民签证。",
        "専用ビザなし。", "デジタルノマドビザ制度なし。", "専用ノマドビザは確認されていない。",
        "Sin visa dedicada. ", "Sin programa de visa nómada digital.", "No se encontró visa dedicada para nómadas.", "Sin visa dedicada.",
    ];
    for (const p of pfx) {
        if (result.startsWith(p)) { result = result.slice(p.length).trim(); break; }
    }
    if (!result) return null;
    // Ensure ending punctuation
    if (!/[.。!！?？]$/.test(result)) result += (locale === "zh" || locale === "ja") ? "。" : ".";
    return result;
}

// ── VPN note translations (9 unique) ──
const VP: Record<string, L3> = {
    "VPN heavily restricted; most commercial VPNs blocked without special setup": { zh: "VPN 严格限制，大多数商用 VPN 被封锁。", ja: "VPN厳しく制限、多くの商用VPNがブロック。", es: "VPN muy restringido; la mayoría bloqueados." },
    "VPN legal for legitimate use; VoIP often blocked": { zh: "VPN 合法使用，VoIP 通话常被封锁。", ja: "VPN合法利用可、VoIP通話はブロックされがち。", es: "VPN legal para uso legítimo; VoIP bloqueado." },
    "Some VPN protocols blocked; most paid VPNs work": { zh: "部分 VPN 协议被封锁，付费 VPN 大多可用。", ja: "一部VPNプロトコルがブロック、有料VPNは概ね利用可。", es: "Algunos protocolos VPN bloqueados; VPN de pago funcionan." },
    "VPN usage illegal; heavily filtered": { zh: "VPN 使用违法，严格审查过滤。", ja: "VPN使用は違法、厳しくフィルタリング。", es: "Uso de VPN ilegal; filtrado estricto." },
    "Periodic social media blocks; VPN usage common": { zh: "社交媒体间歇性封锁，VPN 使用普遍。", ja: "SNSが断続的にブロック、VPN利用は一般的。", es: "Bloqueos periódicos de redes sociales; VPN común." },
    "Similar to UAE; VoIP restrictions": { zh: "与阿联酋类似，VoIP 受限。", ja: "UAEと同様、VoIP制限あり。", es: "Similar a EAU; restricciones de VoIP." },
    "VPN legal; some content blocked": { zh: "VPN 合法，部分内容被封锁。", ja: "VPN合法、一部コンテンツがブロック。", es: "VPN legal; algunos contenidos bloqueados." },
    "Internet shutdowns and VPN blocks during political crises": { zh: "政治危机期间断网并封锁 VPN。", ja: "政治危機時にインターネット遮断・VPNブロック。", es: "Cortes de internet y bloqueo de VPN en crisis políticas." },
    "Many VPN providers blocked since 2024": { zh: "2024 年起大量 VPN 服务被封锁。", ja: "2024年以降多くのVPNプロバイダーがブロック。", es: "Muchos proveedores VPN bloqueados desde 2024." },
};

export function localizeVpnNote(note: string | null, locale: Locale): string | null {
    if (!note) return null;
    let result = locale === "en" ? note : (VP[note]?.[locale] ?? note);
    if (!/[.。!！?？]$/.test(result)) result += (locale === "zh" || locale === "ja") ? "。" : ".";
    return result;
}
