/**
 * Official languages for each city.
 *
 * Scope: all languages with formal official / constitutional status
 *        at national, state/regional, or city level that apply to this city.
 * Order: sorted by estimated number of speakers *within the city / local area*,
 *        most spoken first.
 *
 * Sources:
 *   - National constitutions & language laws
 *   - State / provincial official language acts
 *   - Census home-language data (SA Census 2011, India Census 2011,
 *     Singapore Census 2020, Swiss Federal Statistical Office, etc.)
 *
 * NOTE: This file is imported by CityDetailContent for display.
 */

import type { Locale } from "./types";

/** Localized language names: key = English name used in CITY_LANGUAGES */
export const LANGUAGE_NAME_TRANSLATIONS: Record<string, Record<Locale, string>> = {
  "Afrikaans":        { zh: "南非荷兰语", en: "Afrikaans",        ja: "アフリカーンス語", es: "Afrikáans" },
  "Arabic":           { zh: "阿拉伯语",   en: "Arabic",           ja: "アラビア語",       es: "Árabe" },
  "Aymara":           { zh: "艾马拉语",   en: "Aymara",           ja: "アイマラ語",       es: "Aimara" },
  "Azerbaijani":      { zh: "阿塞拜疆语", en: "Azerbaijani",      ja: "アゼルバイジャン語", es: "Azerbaiyano" },
  "Bengali":          { zh: "孟加拉语",   en: "Bengali",          ja: "ベンガル語",       es: "Bengalí" },
  "Bulgarian":        { zh: "保加利亚语", en: "Bulgarian",        ja: "ブルガリア語",     es: "Búlgaro" },
  "Burmese":          { zh: "缅甸语",     en: "Burmese",          ja: "ビルマ語",         es: "Birmano" },
  "Catalan":          { zh: "加泰罗尼亚语", en: "Catalan",        ja: "カタルーニャ語",   es: "Catalán" },
  "Chinese":          { zh: "中文",       en: "Chinese",          ja: "中国語",           es: "Chino" },
  "Croatian":         { zh: "克罗地亚语", en: "Croatian",         ja: "クロアチア語",     es: "Croata" },
  "Czech":            { zh: "捷克语",     en: "Czech",            ja: "チェコ語",         es: "Checo" },
  "Danish":           { zh: "丹麦语",     en: "Danish",           ja: "デンマーク語",     es: "Danés" },
  "Dutch":            { zh: "荷兰语",     en: "Dutch",            ja: "オランダ語",       es: "Neerlandés" },
  "English":          { zh: "英语",       en: "English",          ja: "英語",             es: "Inglés" },
  "Estonian":         { zh: "爱沙尼亚语", en: "Estonian",         ja: "エストニア語",     es: "Estonio" },
  "Filipino":         { zh: "菲律宾语",   en: "Filipino",         ja: "フィリピン語",     es: "Filipino" },
  "Finnish":          { zh: "芬兰语",     en: "Finnish",          ja: "フィンランド語",   es: "Finés" },
  "French":           { zh: "法语",       en: "French",           ja: "フランス語",       es: "Francés" },
  "Georgian":         { zh: "格鲁吉亚语", en: "Georgian",         ja: "ジョージア語",     es: "Georgiano" },
  "German":           { zh: "德语",       en: "German",           ja: "ドイツ語",         es: "Alemán" },
  "Greek":            { zh: "希腊语",     en: "Greek",            ja: "ギリシャ語",       es: "Griego" },
  "Hakka":            { zh: "客家话",     en: "Hakka",            ja: "客家語",           es: "Hakka" },
  "Hebrew":           { zh: "希伯来语",   en: "Hebrew",           ja: "ヘブライ語",       es: "Hebreo" },
  "Hindi":            { zh: "印地语",     en: "Hindi",            ja: "ヒンディー語",     es: "Hindi" },
  "Hungarian":        { zh: "匈牙利语",   en: "Hungarian",        ja: "ハンガリー語",     es: "Húngaro" },
  "Indonesian":       { zh: "印度尼西亚语", en: "Indonesian",     ja: "インドネシア語",   es: "Indonesio" },
  "Irish":            { zh: "爱尔兰语",   en: "Irish",            ja: "アイルランド語",   es: "Irlandés" },
  "Italian":          { zh: "意大利语",   en: "Italian",          ja: "イタリア語",       es: "Italiano" },
  "Japanese":         { zh: "日语",       en: "Japanese",         ja: "日本語",           es: "Japonés" },
  "Kannada":          { zh: "卡纳达语",   en: "Kannada",          ja: "カンナダ語",       es: "Canarés" },
  "Kazakh":           { zh: "哈萨克语",   en: "Kazakh",           ja: "カザフ語",         es: "Kazajo" },
  "Khmer":            { zh: "高棉语",     en: "Khmer",            ja: "クメール語",       es: "Jemer" },
  "Korean":           { zh: "韩语",       en: "Korean",           ja: "韓国語",           es: "Coreano" },
  "Luxembourgish":    { zh: "卢森堡语",   en: "Luxembourgish",    ja: "ルクセンブルク語", es: "Luxemburgués" },
  "Malay":            { zh: "马来语",     en: "Malay",            ja: "マレー語",         es: "Malayo" },
  "Mandarin":         { zh: "普通话",     en: "Mandarin",         ja: "北京官話",         es: "Mandarín" },
  "Marathi":          { zh: "马拉地语",   en: "Marathi",          ja: "マラーティー語",   es: "Maratí" },
  "Mongolian":        { zh: "蒙古语",     en: "Mongolian",        ja: "モンゴル語",       es: "Mongol" },
  "Māori":            { zh: "毛利语",     en: "Māori",            ja: "マオリ語",         es: "Maorí" },
  "Ndebele":          { zh: "恩德贝莱语", en: "Ndebele",          ja: "ンデベレ語",       es: "Ndebele" },
  "Nepali":           { zh: "尼泊尔语",   en: "Nepali",           ja: "ネパール語",       es: "Nepalí" },
  "Northern Sotho":   { zh: "北索托语",   en: "Northern Sotho",   ja: "北ソト語",         es: "Sotho sept." },
  "Norwegian":        { zh: "挪威语",     en: "Norwegian",        ja: "ノルウェー語",     es: "Noruego" },
  "Persian":          { zh: "波斯语",     en: "Persian",          ja: "ペルシア語",       es: "Persa" },
  "Polish":           { zh: "波兰语",     en: "Polish",           ja: "ポーランド語",     es: "Polaco" },
  "Portuguese":       { zh: "葡萄牙语",   en: "Portuguese",       ja: "ポルトガル語",     es: "Portugués" },
  "Punjabi":          { zh: "旁遮普语",   en: "Punjabi",          ja: "パンジャーブ語",   es: "Panyabí" },
  "Quechua":          { zh: "克丘亚语",   en: "Quechua",          ja: "ケチュア語",       es: "Quechua" },
  "Romanian":         { zh: "罗马尼亚语", en: "Romanian",         ja: "ルーマニア語",     es: "Rumano" },
  "Romansh":          { zh: "罗曼什语",   en: "Romansh",          ja: "ロマンシュ語",     es: "Romanche" },
  "Russian":          { zh: "俄语",       en: "Russian",          ja: "ロシア語",         es: "Ruso" },
  "Serbian":          { zh: "塞尔维亚语", en: "Serbian",          ja: "セルビア語",       es: "Serbio" },
  "Sinhala":          { zh: "僧伽罗语",   en: "Sinhala",          ja: "シンハラ語",       es: "Cingalés" },
  "Slovak":           { zh: "斯洛伐克语", en: "Slovak",           ja: "スロバキア語",     es: "Eslovaco" },
  "Slovenian":        { zh: "斯洛文尼亚语", en: "Slovenian",     ja: "スロベニア語",     es: "Esloveno" },
  "Sotho":            { zh: "索托语",     en: "Sotho",            ja: "ソト語",           es: "Sotho" },
  "Spanish":          { zh: "西班牙语",   en: "Spanish",          ja: "スペイン語",       es: "Español" },
  "Swahili":          { zh: "斯瓦希里语", en: "Swahili",          ja: "スワヒリ語",       es: "Suajili" },
  "Swazi":            { zh: "斯威士语",   en: "Swazi",            ja: "スワジ語",         es: "Suazi" },
  "Swedish":          { zh: "瑞典语",     en: "Swedish",          ja: "スウェーデン語",   es: "Sueco" },
  "Taiwanese Hokkien": { zh: "闽南语",   en: "Taiwanese Hokkien", ja: "台湾語",          es: "Hokkien taiwanés" },
  "Tamil":            { zh: "泰米尔语",   en: "Tamil",            ja: "タミル語",         es: "Tamil" },
  "Telugu":           { zh: "泰卢固语",   en: "Telugu",           ja: "テルグ語",         es: "Telugu" },
  "Thai":             { zh: "泰语",       en: "Thai",             ja: "タイ語",           es: "Tailandés" },
  "Tsonga":           { zh: "聪加语",     en: "Tsonga",           ja: "ツォンガ語",       es: "Tsonga" },
  "Tswana":           { zh: "茨瓦纳语",   en: "Tswana",           ja: "ツワナ語",         es: "Setsuana" },
  "Turkish":          { zh: "土耳其语",   en: "Turkish",          ja: "トルコ語",         es: "Turco" },
  "Ukrainian":        { zh: "乌克兰语",   en: "Ukrainian",        ja: "ウクライナ語",     es: "Ucraniano" },
  "Urdu":             { zh: "乌尔都语",   en: "Urdu",             ja: "ウルドゥー語",     es: "Urdu" },
  "Uzbek":            { zh: "乌兹别克语", en: "Uzbek",            ja: "ウズベク語",       es: "Uzbeko" },
  "Venda":            { zh: "文达语",     en: "Venda",            ja: "ヴェンダ語",       es: "Venda" },
  "Vietnamese":       { zh: "越南语",     en: "Vietnamese",       ja: "ベトナム語",       es: "Vietnamita" },
  "Xhosa":            { zh: "科萨语",     en: "Xhosa",            ja: "コサ語",           es: "Xhosa" },
  "Zulu":             { zh: "祖鲁语",     en: "Zulu",             ja: "ズールー語",       es: "Zulú" },
};

export const CITY_LANGUAGES: Record<number, string[]> = {
  /* ────────────────────── USA (20 cities) ──────────────────────
     No federal official language; English is de facto.
     Most states have English as official by statute. */
  1:   ["English"],  // New York
  11:  ["English"],  // Los Angeles
  12:  ["English"],  // San Francisco
  13:  ["English"],  // Chicago
  34:  ["English"],  // Miami
  35:  ["English"],  // Washington DC
  36:  ["English"],  // Boston
  37:  ["English"],  // Seattle
  38:  ["English"],  // Denver
  39:  ["English"],  // Austin
  95:  ["English"],  // Atlanta
  96:  ["English"],  // Phoenix
  97:  ["English"],  // Portland
  98:  ["English"],  // San Diego
  99:  ["English"],  // Las Vegas
  100: ["English"],  // Tampa
  125: ["English"],  // Houston
  126: ["English"],  // Philadelphia
  133: ["English"],  // San Jose (US)
  134: ["English"],  // Irvine

  /* ────────────────────── UK (2) ────────────────────── */
  2:   ["English"],  // London
  94:  ["English"],  // Belfast — Irish & Ulster Scots have recognition (NI Act 2022) but English overwhelmingly dominant

  /* ────────────────────── Canada (5) ──────────────────────
     English + French are federal official (Official Languages Act). */
  9:   ["English", "French"],  // Toronto — English dominant
  40:  ["English", "French"],  // Vancouver — English dominant
  41:  ["French", "English"],  // Montreal — French dominant (Charter of the French Language)
  127: ["English", "French"],  // Calgary — English dominant
  135: ["English", "French"],  // Ottawa — bilingual national capital

  /* ────────────────────── Australia (4) ──────────────────────
     No constitutional official language; English is de facto. */
  6:   ["English"],  // Sydney
  42:  ["English"],  // Melbourne
  43:  ["English"],  // Brisbane
  128: ["English"],  // Perth

  /* ────────────────────── New Zealand (1) ──────────────────────
     English, Māori, NZ Sign Language are official (Māori Language Act 1987, NZSL Act 2006). */
  44:  ["English", "Māori"],  // Auckland — English dominant; NZSL omitted (non-spoken)

  /* ────────────────────── China mainland (7) ──────────────────────
     Putonghua (Standard Mandarin) is the national common language (国家通用语言文字法 2001). */
  4:   ["Chinese"],  // Beijing
  5:   ["Chinese"],  // Shanghai
  101: ["Chinese"],  // Guangzhou
  102: ["Chinese"],  // Shenzhen
  103: ["Chinese"],  // Chengdu
  104: ["Chinese"],  // Hangzhou
  105: ["Chinese"],  // Chongqing

  /* ────────────────────── Hong Kong (1) ──────────────────────
     Basic Law Art. 9: Chinese and English are both official.
     "Chinese" in HK context primarily means Cantonese (spoken) + Traditional Chinese (written). */
  10:  ["Chinese", "English"],  // Hong Kong — Cantonese dominant

  /* ────────────────────── Taiwan (1) ──────────────────────
     Development of National Languages Act 2019: Mandarin, Taiwanese Hokkien,
     Hakka, and 16 indigenous languages are all "national languages."
     Mandarin is the de facto primary language of gov & education. */
  61:  ["Mandarin", "Taiwanese Hokkien", "Hakka"],  // Taipei — sorted by Taipei usage

  /* ────────────────────── Japan (6) ──────────────────────
     No de jure official language; Japanese is de facto official. */
  3:   ["Japanese"],  // Tokyo
  106: ["Japanese"],  // Osaka
  107: ["Japanese"],  // Nagoya
  138: ["Japanese"],  // Fukuoka
  139: ["Japanese"],  // Yokohama
  159: ["Japanese"],  // Kyoto

  /* ────────────────────── South Korea (3) ──────────────────────
     Korean is the official language (Framework Act on the National Language). */
  59:  ["Korean"],   // Seoul
  60:  ["Korean"],   // Busan
  108: ["Korean"],   // Incheon

  /* ────────────────────── Singapore (1) ──────────────────────
     Constitution Art. 153A: 4 official languages. Malay is the national language.
     By home usage (Census 2020): English 48% > Mandarin 30% > Malay 9% > Tamil 3%. */
  7:   ["English", "Mandarin", "Malay", "Tamil"],  // Singapore

  /* ────────────────────── India (5) ──────────────────────
     Federal: Hindi + English (Official Languages Act 1963).
     Each state has additional official language(s).
     Sorted by local city usage. */
  49:  ["Kannada", "Hindi", "English"],              // Bangalore — Karnataka state lang: Kannada
  50:  ["Marathi", "Hindi", "English"],              // Mumbai — Maharashtra state lang: Marathi
  51:  ["Hindi", "Punjabi", "Urdu", "English"],      // New Delhi — Delhi NCT official: Hindi, Punjabi, Urdu + federal English
  83:  ["Telugu", "Urdu", "Hindi", "English"],       // Hyderabad — Telangana state langs: Telugu, Urdu
  84:  ["Marathi", "Hindi", "English"],              // Pune — Maharashtra state lang: Marathi

  /* ────────────────────── Pakistan (2) ──────────────────────
     Urdu (national) + English (official) per Constitution Art. 251. */
  55:  ["Urdu", "English"],  // Karachi
  56:  ["Urdu", "English"],  // Islamabad

  /* ────────────────────── Bangladesh (1) ──────────────────────
     Bengali is the state language (Constitution Art. 3). */
  114: ["Bengali"],  // Dhaka

  /* ────────────────────── Sri Lanka (1) ──────────────────────
     Sinhala + Tamil are official (Constitution Art. 18-19). */
  115: ["Sinhala", "Tamil"],  // Colombo — Sinhala majority locally

  /* ────────────────────── Nepal (1) ──────────────────────
     Nepali is the official language (Constitution Art. 7). */
  116: ["Nepali"],  // Kathmandu

  /* ────────────────────── Southeast Asia ────────────────────── */
  45:  ["Thai"],         // Bangkok — Thai is national language (Constitution)
  112: ["Thai"],         // Chiang Mai
  147: ["Thai"],         // Phuket
  46:  ["Malay"],        // Kuala Lumpur — Bahasa Malaysia is official (Constitution Art. 152)
  150: ["Malay"],        // Penang
  47:  ["Vietnamese"],   // Ho Chi Minh City
  48:  ["Vietnamese"],   // Hanoi
  141: ["Vietnamese"],   // Da Nang
  57:  ["Indonesian"],   // Jakarta — Bahasa Indonesia (Constitution Ch. XV Art. 36)
  140: ["Indonesian"],   // Bali
  58:  ["Filipino", "English"],  // Manila — both official (Constitution Art. XIV Sec. 7)
  109: ["Khmer"],        // Phnom Penh — Khmer is official (Constitution Art. 5)
  110: ["Burmese"],      // Yangon — Myanmar language is official (Constitution Art. 450)

  /* ────────────────────── Central Asia (4) ────────────────────── */
  117: ["Russian", "Kazakh"],    // Almaty — Kazakh is state lang, Russian is "interethnic" (Constitution Art. 7); Russian dominant locally in Almaty
  118: ["Uzbek"],                // Tashkent — Uzbek is state lang (Constitution Art. 4); Russian widely spoken but not co-official
  119: ["Azerbaijani"],          // Baku — Azerbaijani is state lang (Constitution Art. 21)
  120: ["Mongolian"],            // Ulaanbaatar — Mongolian is state lang (Constitution Art. 8)

  /* ────────────────────── Middle East & North Africa ────────────────────── */
  14:  ["Arabic"],   // Dubai — Arabic is official (UAE Constitution Art. 7)
  75:  ["Arabic"],   // Abu Dhabi
  76:  ["Arabic"],   // Doha — Arabic is official (Qatar Constitution Art. 1)
  77:  ["Arabic"],   // Manama — Arabic is official (Bahrain Constitution Art. 2)
  78:  ["Arabic"],   // Riyadh — Arabic is official (Saudi Basic Law Art. 1)
  79:  ["Arabic"],   // Muscat — Arabic is official (Oman Basic Law Art. 2)
  80:  ["Arabic"],   // Beirut — Arabic is official (Lebanon Constitution Art. 11)
  81:  ["Arabic"],   // Amman — Arabic is official (Jordan Constitution Art. 2)
  53:  ["Arabic"],   // Cairo — Arabic is official (Egypt Constitution Art. 2)
  54:  ["Persian"],  // Tehran — Persian/Farsi is official (Iran Constitution Art. 15)
  82:  ["Hebrew"],   // Tel Aviv — Hebrew is official (Basic Law 2018); Arabic has "special status"

  /* ────────────────────── Africa ────────────────────── */
  52:  ["Swahili", "English"],  // Nairobi — both official (Kenya Constitution Art. 7)

  /* South Africa (2) — 11 official languages (Constitution Sec. 6).
     Sorted by home-language share in each city's province (Census 2011). */
  67:  ["Zulu", "English", "Afrikaans", "Sotho", "Tswana", "Tsonga", "Northern Sotho", "Xhosa", "Ndebele", "Venda", "Swazi"],  // Johannesburg (Gauteng)
  68:  ["Afrikaans", "Xhosa", "English", "Zulu", "Sotho", "Tswana", "Northern Sotho", "Tsonga", "Ndebele", "Swazi", "Venda"],  // Cape Town (Western Cape)

  131: ["English"],  // Lagos — English is official (Nigeria Constitution Sec. 55)

  /* ────────────────────── Europe ────────────────────── */
  8:   ["French"],      // Paris
  15:  ["Dutch"],       // Amsterdam
  18:  ["German"],      // Munich
  19:  ["German"],      // Berlin
  25:  ["German"],      // Vienna — German is official (Austrian Constitution Art. 8)
  26:  ["Czech"],       // Prague
  27:  ["Polish"],      // Warsaw
  28:  ["Portuguese"],  // Lisbon
  143: ["Portuguese"],  // Porto
  29:  ["Greek"],       // Athens
  30:  ["Turkish"],     // Istanbul
  85:  ["Ukrainian"],   // Kyiv — Ukrainian is state lang (Constitution Art. 10)
  86:  ["Romanian"],    // Bucharest
  87:  ["Bulgarian"],   // Sofia
  88:  ["Croatian"],    // Zagreb
  146: ["Croatian"],    // Split
  89:  ["Serbian"],     // Belgrade
  90:  ["Hungarian"],   // Budapest
  91:  ["Slovak"],      // Bratislava
  92:  ["Slovenian"],   // Ljubljana
  121: ["Swedish"],     // Stockholm
  122: ["Danish"],      // Copenhagen
  124: ["Norwegian"],   // Oslo
  132: ["Russian"],     // Moscow
  137: ["Estonian"],    // Tallinn

  /* Spain (4) — Spanish (Castilian) is national official; regional co-officials vary. */
  20:  ["Spanish", "Catalan"],  // Barcelona — both co-official (Statute of Autonomy of Catalonia Art. 6)
  21:  ["Spanish"],             // Madrid
  144: ["Spanish", "Catalan"],  // Valencia — Valencian (Catalan variety) co-official (Statute of Autonomy Art. 6)
  149: ["Spanish"],             // Las Palmas

  /* Italy (2) */
  22:  ["Italian"],  // Milan
  23:  ["Italian"],  // Rome

  /* Belgium (1) — 3 national official languages: Dutch, French, German.
     Brussels-Capital Region is officially bilingual (French + Dutch). */
  24:  ["French", "Dutch"],  // Brussels — French ~90% > Dutch ~10% locally

  /* Switzerland (2) — 4 national official languages (Constitution Art. 4).
     Cantonal official language determines local dominance. */
  16:  ["German", "French", "Italian", "Romansh"],  // Zurich — German cantonal; sorted by national usage
  17:  ["French", "German", "Italian", "Romansh"],  // Geneva — French cantonal

  /* Ireland (1) — Irish is first official, English second (Constitution Art. 8). */
  93:  ["English", "Irish"],  // Dublin — English overwhelmingly dominant; Irish constitutionally first but minority spoken

  /* Finland (1) — Finnish + Swedish are national languages (Constitution Sec. 17).
     Helsinki is a bilingual municipality. */
  123: ["Finnish", "Swedish"],  // Helsinki — Finnish ~80% > Swedish ~6%

  /* Luxembourg (1) — 3 official: Luxembourgish, French, German (Language Law 1984). */
  136: ["Luxembourgish", "French", "German"],  // Luxembourg City

  /* Georgia (1) */
  130: ["Georgian"],  // Tbilisi — Georgian is state lang (Constitution Art. 2)

  /* ────────────────────── Latin America & Caribbean ────────────────────── */
  31:  ["Spanish"],  // Mexico City
  69:  ["Spanish"],  // Guadalajara
  142: ["Spanish"],  // Playa del Carmen
  157: ["Spanish"],  // Cancún
  158: ["Spanish"],  // Puerto Vallarta
  32:  ["Portuguese"],  // São Paulo
  33:  ["Portuguese"],  // Rio de Janeiro
  152: ["Portuguese"],  // Florianópolis
  62:  ["Spanish"],  // Buenos Aires
  63:  ["Spanish"],  // Santiago
  64:  ["Spanish"],  // Bogotá
  129: ["Spanish"],  // Medellín
  148: ["Spanish"],  // Montevideo
  70:  ["Spanish"],  // San José (Costa Rica)
  71:  ["Spanish"],  // Panama City

  /* Peru (2) — Spanish, Quechua, Aymara are all official (Constitution Art. 48). */
  65:  ["Spanish", "Quechua", "Aymara"],  // Lima

  /* Puerto Rico (1) — Spanish + English are co-official (Language Act 1993). */
  73:  ["Spanish", "English"],  // San Juan — Spanish dominant

  /* ────────────────────── Morocco (1) ────────────────────── */
  /* Arabic + Amazigh are official (Constitution Art. 5); French is de facto lingua franca in business/education. */
  160: ["Arabic", "French"],  // Casablanca — Darija (Moroccan Arabic) dominant; French widely used in commerce

  /* ────────────────────── New Zealand (additional) ────────────────────── */
  161: ["English", "Māori"],  // Wellington — same official languages as Auckland
};
