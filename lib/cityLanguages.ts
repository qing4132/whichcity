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
 * NOTE: This file is data-only. Not imported anywhere yet.
 */

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

  /* ────────────────────── Japan (5) ──────────────────────
     No de jure official language; Japanese is de facto official. */
  3:   ["Japanese"],  // Tokyo
  106: ["Japanese"],  // Osaka
  107: ["Japanese"],  // Nagoya
  138: ["Japanese"],  // Fukuoka
  139: ["Japanese"],  // Yokohama

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
  46:  ["Malay"],        // Kuala Lumpur — Bahasa Malaysia is official (Constitution Art. 152)
  47:  ["Vietnamese"],   // Ho Chi Minh City
  48:  ["Vietnamese"],   // Hanoi
  57:  ["Indonesian"],   // Jakarta — Bahasa Indonesia (Constitution Ch. XV Art. 36)
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
  29:  ["Greek"],       // Athens
  30:  ["Turkish"],     // Istanbul
  85:  ["Ukrainian"],   // Kyiv — Ukrainian is state lang (Constitution Art. 10)
  86:  ["Romanian"],    // Bucharest
  87:  ["Bulgarian"],   // Sofia
  88:  ["Croatian"],    // Zagreb
  89:  ["Serbian"],     // Belgrade
  90:  ["Hungarian"],   // Budapest
  91:  ["Slovak"],      // Bratislava
  92:  ["Slovenian"],   // Ljubljana
  121: ["Swedish"],     // Stockholm
  122: ["Danish"],      // Copenhagen
  124: ["Norwegian"],   // Oslo
  132: ["Russian"],     // Moscow
  137: ["Estonian"],    // Tallinn

  /* Spain (2) — Spanish (Castilian) is national official; Catalan is co-official in Catalonia. */
  20:  ["Spanish", "Catalan"],  // Barcelona — both co-official (Statute of Autonomy of Catalonia Art. 6)
  21:  ["Spanish"],             // Madrid

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
  32:  ["Portuguese"],  // São Paulo
  33:  ["Portuguese"],  // Rio de Janeiro
  62:  ["Spanish"],  // Buenos Aires
  63:  ["Spanish"],  // Santiago
  64:  ["Spanish"],  // Bogotá
  129: ["Spanish"],  // Medellín
  70:  ["Spanish"],  // San José (Costa Rica)
  71:  ["Spanish"],  // Panama City

  /* Peru (1) — Spanish, Quechua, Aymara are all official (Constitution Art. 48).
     In Lima: Spanish overwhelmingly dominant. */
  65:  ["Spanish", "Quechua", "Aymara"],  // Lima

  /* Puerto Rico (1) — Spanish + English are co-official (Language Act 1993). */
  73:  ["Spanish", "English"],  // San Juan — Spanish dominant
};
