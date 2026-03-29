#!/usr/bin/env node
/**
 * Add 9 new fields to each city in cities.json:
 *
 * Card data (3):
 *   - monthlyRent: 1-bedroom city center rent (USD/month) — Numbeo
 *   - paidLeaveDays: statutory paid annual leave days — OECD / labor law
 *   - internetSpeedMbps: fixed broadband download speed — Ookla Speedtest
 *
 * Healthcare index sub-data (3):
 *   - hospitalBedsPerThousand: hospital beds per 1,000 — World Bank
 *   - uhcCoverageIndex: UHC service coverage index 0-100 — WHO
 *   - lifeExpectancy: life expectancy at birth — World Bank
 *
 * Institutional freedom index sub-data (3):
 *   - pressFreedomScore: press freedom score 0-100 — RSF (higher = freer)
 *   - democracyIndex: democracy index 0-10 — EIU
 *   - corruptionPerceptionIndex: CPI score 0-100 — Transparency International
 */
import { readFileSync, writeFileSync } from "fs";

// ─── RENT DATA (city-level, USD/month, 1-bedroom city center) ───
// Source: Numbeo Rent Index + cross-referenced with local listings
const RENT_BY_CITY = {
  1: 3200,   // New York
  2: 2100,   // London
  3: 1400,   // Tokyo
  4: 1100,   // Beijing
  5: 1300,   // Shanghai
  6: 2200,   // Sydney
  7: 2400,   // Singapore
  8: 1500,   // Paris
  9: 1800,   // Toronto
  10: 1900,  // Hong Kong
  11: 2500,  // Los Angeles
  12: 2800,  // San Francisco
  13: 1600,  // Chicago
  14: 1800,  // Dubai
  15: 1700,  // Amsterdam
  16: 2200,  // Zurich
  17: 1900,  // Geneva
  18: 1200,  // Munich
  19: 1100,  // Berlin
  20: 1100,  // Barcelona
  21: 1000,  // Madrid
  22: 1200,  // Milan
  23: 950,   // Rome
  24: 1100,  // Brussels
  25: 1000,  // Vienna
  26: 700,   // Prague
  27: 650,   // Warsaw
  28: 900,   // Lisbon
  29: 550,   // Athens
  30: 500,   // Istanbul
  31: 550,   // Mexico City
  32: 550,   // São Paulo
  33: 650,   // Rio de Janeiro
  34: 2000,  // Miami
  35: 1700,  // Washington DC
  36: 1500,  // Boston
  37: 1800,  // Seattle
  38: 1400,  // Denver
  39: 1600,  // Houston
  40: 1600,  // Vancouver
  41: 1400,  // Montreal
  42: 1800,  // Melbourne
  43: 1400,  // Brisbane
  44: 1300,  // Auckland
  45: 500,   // Bangkok
  46: 550,   // Kuala Lumpur
  47: 400,   // Hanoi
  48: 450,   // Ho Chi Minh City
  49: 250,   // Mumbai
  50: 200,   // Delhi
  51: 250,   // Bangalore
  52: 350,   // Nairobi
  53: 300,   // Cairo
  54: 200,   // Tehran
  55: 150,   // Karachi
  56: 180,   // Lahore
  57: 350,   // Jakarta
  58: 350,   // Manila
  59: 900,   // Seoul
  60: 600,   // Busan
  61: 800,   // Taipei
  62: 350,   // Buenos Aires
  63: 500,   // Santiago
  64: 350,   // Bogotá
  65: 300,   // Lima
  66: 250,   // Caracas
  67: 500,   // Johannesburg
  68: 600,   // Cape Town
  69: 450,   // Guadalajara
  70: 550,   // San José (Costa Rica)
  71: 800,   // Panama City
  72: 150,   // Havana
  73: 750,   // San Juan
  74: 400,   // Kingston
  75: 1500,  // Abu Dhabi
  76: 1600,  // Doha
  77: 700,   // Manama
  78: 800,   // Riyadh
  79: 650,   // Muscat
  80: 500,   // Beirut
  81: 400,   // Amman
  82: 1500,  // Tel Aviv
  83: 200,   // Hyderabad
  84: 200,   // Chennai
  85: 350,   // Kyiv
  86: 400,   // Bucharest
  87: 350,   // Sofia
  88: 500,   // Zagreb
  89: 350,   // Belgrade
  90: 500,   // Budapest
  91: 550,   // Bratislava
  92: 600,   // Ljubljana
  93: 1800,  // Dublin
  94: 1200,  // Edinburgh
  95: 1500,  // Austin
  96: 1400,  // Nashville
  97: 1300,  // Portland
  98: 1100,  // Minneapolis
  99: 1200,  // Atlanta
  100: 1100, // Philadelphia
  101: 700,  // Shenzhen
  102: 550,  // Guangzhou
  103: 450,  // Chengdu
  104: 400,  // Wuhan
  105: 500,  // Hangzhou
  106: 1000, // Osaka
  107: 550,  // Fukuoka
  108: 450,  // Daejeon
  109: 250,  // Phnom Penh
  110: 200,  // Yangon
  111: 200,  // Vientiane
  112: 350,  // Chiang Mai
  113: 300,  // Cebu
  114: 200,  // Dhaka
  115: 200,  // Colombo
  116: 150,  // Kathmandu
  117: 350,  // Almaty
  118: 250,  // Tashkent
  119: 400,  // Baku
  120: 250,  // Ulaanbaatar
};

// ─── PAID LEAVE (country-level, statutory minimum days) ───
// Source: OECD, ILO, national labor laws
const PAID_LEAVE_BY_COUNTRY = {
  "美国": 0,            // No federal mandate
  "英国": 28,           // 5.6 weeks
  "日本": 10,           // Labor Standards Act
  "中国": 5,            // 1-10 yrs service = 5 days
  "中国香港": 7,        // After 1 year
  "中国台湾": 7,
  "韩国": 15,
  "新加坡": 7,
  "澳大利亚": 20,
  "新西兰": 20,
  "加拿大": 10,
  "法国": 25,
  "荷兰": 20,
  "瑞士": 20,
  "德国": 20,
  "西班牙": 22,
  "意大利": 20,
  "比利时": 20,
  "奥地利": 25,
  "捷克": 20,
  "波兰": 20,
  "葡萄牙": 22,
  "希腊": 20,
  "土耳其": 14,
  "墨西哥": 12,
  "巴西": 30,
  "阿联酋": 30,
  "泰国": 6,
  "马来西亚": 8,
  "越南": 12,
  "印度": 15,
  "肯尼亚": 21,
  "埃及": 21,
  "伊朗": 26,
  "巴基斯坦": 14,
  "印度尼西亚": 12,
  "菲律宾": 5,
  "阿根廷": 14,
  "智利": 15,
  "哥伦比亚": 15,
  "秘鲁": 30,
  "委内瑞拉": 15,
  "南非": 15,
  "哥斯达黎加": 14,
  "巴拿马": 30,
  "古巴": 22,
  "波多黎各": 0,       // US territory
  "牙买加": 10,
  "卡塔尔": 21,
  "巴林": 30,
  "沙特阿拉伯": 21,
  "阿曼": 30,
  "黎巴嫩": 15,
  "约旦": 14,
  "以色列": 12,
  "乌克兰": 24,
  "罗马尼亚": 20,
  "保加利亚": 20,
  "克罗地亚": 20,
  "塞尔维亚": 20,
  "匈牙利": 20,
  "斯洛伐克": 20,
  "斯洛文尼亚": 20,
  "爱尔兰": 20,
  "柬埔寨": 18,
  "缅甸": 10,
  "老挝": 15,
  "孟加拉国": 10,
  "斯里兰卡": 14,
  "尼泊尔": 13,
  "哈萨克斯坦": 24,
  "乌兹别克斯坦": 15,
  "阿塞拜疆": 21,
  "蒙古": 15,
};

// ─── INTERNET SPEED (city-level, Mbps, fixed broadband download) ───
// Source: Ookla Speedtest Global Index (2025)
const SPEED_BY_CITY = {
  1: 220,   // New York
  2: 100,   // London
  3: 200,   // Tokyo
  4: 190,   // Beijing
  5: 210,   // Shanghai
  6: 90,    // Sydney
  7: 250,   // Singapore
  8: 180,   // Paris
  9: 120,   // Toronto
  10: 250,  // Hong Kong
  11: 180,  // Los Angeles
  12: 200,  // San Francisco
  13: 200,  // Chicago
  14: 180,  // Dubai
  15: 130,  // Amsterdam
  16: 170,  // Zurich
  17: 160,  // Geneva
  18: 120,  // Munich
  19: 110,  // Berlin
  20: 190,  // Barcelona
  21: 200,  // Madrid
  22: 120,  // Milan
  23: 100,  // Rome
  24: 100,  // Brussels
  25: 110,  // Vienna
  26: 100,  // Prague
  27: 130,  // Warsaw
  28: 140,  // Lisbon
  29: 70,   // Athens
  30: 60,   // Istanbul
  31: 70,   // Mexico City
  32: 80,   // São Paulo
  33: 75,   // Rio de Janeiro
  34: 200,  // Miami
  35: 210,  // Washington DC
  36: 190,  // Boston
  37: 220,  // Seattle
  38: 200,  // Denver
  39: 180,  // Houston
  40: 130,  // Vancouver
  41: 120,  // Montreal
  42: 85,   // Melbourne
  43: 80,   // Brisbane
  44: 110,  // Auckland
  45: 200,  // Bangkok
  46: 110,  // Kuala Lumpur
  47: 90,   // Hanoi
  48: 95,   // Ho Chi Minh City
  49: 60,   // Mumbai
  50: 65,   // Delhi
  51: 70,   // Bangalore
  52: 25,   // Nairobi
  53: 40,   // Cairo
  54: 30,   // Tehran
  55: 20,   // Karachi
  56: 25,   // Lahore
  57: 35,   // Jakarta
  58: 80,   // Manila
  59: 200,  // Seoul
  60: 190,  // Busan
  61: 170,  // Taipei
  62: 55,   // Buenos Aires
  63: 130,  // Santiago
  64: 40,   // Bogotá
  65: 50,   // Lima
  66: 15,   // Caracas
  67: 40,   // Johannesburg
  68: 45,   // Cape Town
  69: 60,   // Guadalajara
  70: 55,   // San José
  71: 70,   // Panama City
  72: 5,    // Havana
  73: 150,  // San Juan
  74: 30,   // Kingston
  75: 160,  // Abu Dhabi
  76: 170,  // Doha
  77: 100,  // Manama
  78: 120,  // Riyadh
  79: 80,   // Muscat
  80: 30,   // Beirut
  81: 50,   // Amman
  82: 110,  // Tel Aviv
  83: 65,   // Hyderabad
  84: 60,   // Chennai
  85: 70,   // Kyiv
  86: 140,  // Bucharest
  87: 130,  // Sofia
  88: 80,   // Zagreb
  89: 90,   // Belgrade
  90: 150,  // Budapest
  91: 100,  // Bratislava
  92: 95,   // Ljubljana
  93: 110,  // Dublin
  94: 100,  // Edinburgh
  95: 190,  // Austin
  96: 180,  // Nashville
  97: 170,  // Portland
  98: 190,  // Minneapolis
  99: 180,  // Atlanta
  100: 190, // Philadelphia
  101: 200, // Shenzhen
  102: 180, // Guangzhou
  103: 160, // Chengdu
  104: 150, // Wuhan
  105: 190, // Hangzhou
  106: 180, // Osaka
  107: 170, // Fukuoka
  108: 180, // Daejeon
  109: 30,  // Phnom Penh
  110: 20,  // Yangon
  111: 25,  // Vientiane
  112: 150, // Chiang Mai
  113: 70,  // Cebu
  114: 35,  // Dhaka
  115: 30,  // Colombo
  116: 25,  // Kathmandu
  117: 60,  // Almaty
  118: 50,  // Tashkent
  119: 55,  // Baku
  120: 30,  // Ulaanbaatar
};

// ─── HOSPITAL BEDS PER 1,000 (country-level) ───
// Source: World Bank (SH.MED.BEDS.ZS), latest available year
const BEDS_BY_COUNTRY = {
  "美国": 2.9,
  "英国": 2.5,
  "日本": 12.6,
  "中国": 4.3,
  "中国香港": 4.9,
  "中国台湾": 5.6,
  "韩国": 12.4,
  "新加坡": 2.5,
  "澳大利亚": 3.8,
  "新西兰": 2.6,
  "加拿大": 2.5,
  "法国": 5.9,
  "荷兰": 3.2,
  "瑞士": 4.6,
  "德国": 8.0,
  "西班牙": 3.0,
  "意大利": 3.2,
  "比利时": 5.6,
  "奥地利": 7.3,
  "捷克": 6.6,
  "波兰": 6.5,
  "葡萄牙": 3.5,
  "希腊": 4.2,
  "土耳其": 2.9,
  "墨西哥": 1.0,
  "巴西": 2.1,
  "阿联酋": 1.4,
  "泰国": 2.1,
  "马来西亚": 1.9,
  "越南": 2.6,
  "印度": 0.5,
  "肯尼亚": 1.4,
  "埃及": 1.6,
  "伊朗": 1.6,
  "巴基斯坦": 0.6,
  "印度尼西亚": 1.0,
  "菲律宾": 1.0,
  "阿根廷": 5.0,
  "智利": 2.1,
  "哥伦比亚": 1.7,
  "秘鲁": 1.6,
  "委内瑞拉": 0.9,
  "南非": 2.3,
  "哥斯达黎加": 1.1,
  "巴拿马": 2.3,
  "古巴": 5.3,
  "波多黎各": 2.9,
  "牙买加": 1.7,
  "卡塔尔": 1.3,
  "巴林": 2.0,
  "沙特阿拉伯": 2.2,
  "阿曼": 1.5,
  "黎巴嫩": 2.7,
  "约旦": 1.4,
  "以色列": 3.0,
  "乌克兰": 7.5,
  "罗马尼亚": 6.9,
  "保加利亚": 7.6,
  "克罗地亚": 5.5,
  "塞尔维亚": 5.6,
  "匈牙利": 7.0,
  "斯洛伐克": 5.8,
  "斯洛文尼亚": 4.4,
  "爱尔兰": 3.0,
  "柬埔寨": 0.8,
  "缅甸": 0.9,
  "老挝": 1.5,
  "孟加拉国": 0.8,
  "斯里兰卡": 4.2,
  "尼泊尔": 0.3,
  "哈萨克斯坦": 6.7,
  "乌兹别克斯坦": 4.0,
  "阿塞拜疆": 4.7,
  "蒙古": 7.0,
};

// ─── UHC SERVICE COVERAGE INDEX (country-level, 0-100) ───
// Source: WHO Global Health Observatory
const UHC_BY_COUNTRY = {
  "美国": 84,
  "英国": 87,
  "日本": 83,
  "中国": 82,
  "中国香港": 87,
  "中国台湾": 86,
  "韩国": 86,
  "新加坡": 86,
  "澳大利亚": 87,
  "新西兰": 87,
  "加拿大": 87,
  "法国": 87,
  "荷兰": 87,
  "瑞士": 87,
  "德国": 84,
  "西班牙": 82,
  "意大利": 82,
  "比利时": 85,
  "奥地利": 85,
  "捷克": 80,
  "波兰": 77,
  "葡萄牙": 83,
  "希腊": 77,
  "土耳其": 77,
  "墨西哥": 74,
  "巴西": 75,
  "阿联酋": 78,
  "泰国": 82,
  "马来西亚": 73,
  "越南": 73,
  "印度": 55,
  "肯尼亚": 48,
  "埃及": 57,
  "伊朗": 67,
  "巴基斯坦": 40,
  "印度尼西亚": 59,
  "菲律宾": 55,
  "阿根廷": 74,
  "智利": 75,
  "哥伦比亚": 76,
  "秘鲁": 65,
  "委内瑞拉": 55,
  "南非": 54,
  "哥斯达黎加": 75,
  "巴拿马": 72,
  "古巴": 80,
  "波多黎各": 84,
  "牙买加": 68,
  "卡塔尔": 70,
  "巴林": 72,
  "沙特阿拉伯": 74,
  "阿曼": 70,
  "黎巴嫩": 65,
  "约旦": 68,
  "以色列": 82,
  "乌克兰": 63,
  "罗马尼亚": 70,
  "保加利亚": 67,
  "克罗地亚": 76,
  "塞尔维亚": 68,
  "匈牙利": 74,
  "斯洛伐克": 77,
  "斯洛文尼亚": 82,
  "爱尔兰": 82,
  "柬埔寨": 55,
  "缅甸": 48,
  "老挝": 46,
  "孟加拉国": 48,
  "斯里兰卡": 63,
  "尼泊尔": 45,
  "哈萨克斯坦": 69,
  "乌兹别克斯坦": 66,
  "阿塞拜疆": 64,
  "蒙古": 60,
};

// ─── LIFE EXPECTANCY AT BIRTH (country-level, years) ───
// Source: World Bank (SP.DYN.LE00.IN), latest available
const LIFE_EXP_BY_COUNTRY = {
  "美国": 77.5,
  "英国": 81.0,
  "日本": 84.5,
  "中国": 78.2,
  "中国香港": 85.3,
  "中国台湾": 81.0,
  "韩国": 83.7,
  "新加坡": 83.9,
  "澳大利亚": 83.3,
  "新西兰": 82.1,
  "加拿大": 82.0,
  "法国": 82.5,
  "荷兰": 81.5,
  "瑞士": 83.4,
  "德国": 80.6,
  "西班牙": 83.0,
  "意大利": 82.9,
  "比利时": 81.4,
  "奥地利": 81.6,
  "捷克": 78.3,
  "波兰": 76.5,
  "葡萄牙": 81.1,
  "希腊": 80.1,
  "土耳其": 76.0,
  "墨西哥": 75.0,
  "巴西": 75.3,
  "阿联酋": 78.7,
  "泰国": 78.7,
  "马来西亚": 76.2,
  "越南": 75.4,
  "印度": 70.8,
  "肯尼亚": 61.4,
  "埃及": 72.0,
  "伊朗": 76.7,
  "巴基斯坦": 67.3,
  "印度尼西亚": 71.7,
  "菲律宾": 71.1,
  "阿根廷": 76.5,
  "智利": 80.2,
  "哥伦比亚": 77.3,
  "秘鲁": 76.5,
  "委内瑞拉": 72.1,
  "南非": 64.9,
  "哥斯达黎加": 80.3,
  "巴拿马": 78.5,
  "古巴": 78.8,
  "波多黎各": 77.5,
  "牙买加": 75.2,
  "卡塔尔": 80.2,
  "巴林": 77.2,
  "沙特阿拉伯": 77.6,
  "阿曼": 78.2,
  "黎巴嫩": 78.9,
  "约旦": 74.5,
  "以色列": 82.6,
  "乌克兰": 73.6,
  "罗马尼亚": 74.2,
  "保加利亚": 73.6,
  "克罗地亚": 77.8,
  "塞尔维亚": 75.4,
  "匈牙利": 75.6,
  "斯洛伐克": 76.3,
  "斯洛文尼亚": 81.3,
  "爱尔兰": 82.0,
  "柬埔寨": 69.8,
  "缅甸": 67.1,
  "老挝": 68.9,
  "孟加拉国": 72.4,
  "斯里兰卡": 77.0,
  "尼泊尔": 70.8,
  "哈萨克斯坦": 73.2,
  "乌兹别克斯坦": 73.8,
  "阿塞拜疆": 73.0,
  "蒙古": 70.8,
};

// ─── PRESS FREEDOM SCORE (country-level, 0-100, higher=freer) ───
// Source: RSF World Press Freedom Index 2024
// NOTE: RSF publishes a score where LOWER = freer. We INVERT it: 100 - raw_score
const PRESS_FREEDOM_BY_COUNTRY = {
  "美国": 55,
  "英国": 70,
  "日本": 64,
  "中国": 9,
  "中国香港": 16,
  "中国台湾": 74,
  "韩国": 72,
  "新加坡": 40,
  "澳大利亚": 65,
  "新西兰": 78,
  "加拿大": 72,
  "法国": 68,
  "荷兰": 77,
  "瑞士": 82,
  "德国": 72,
  "西班牙": 66,
  "意大利": 56,
  "比利时": 75,
  "奥地利": 70,
  "捷克": 63,
  "波兰": 55,
  "葡萄牙": 80,
  "希腊": 58,
  "土耳其": 22,
  "墨西哥": 33,
  "巴西": 55,
  "阿联酋": 26,
  "泰国": 40,
  "马来西亚": 47,
  "越南": 15,
  "印度": 31,
  "肯尼亚": 55,
  "埃及": 14,
  "伊朗": 8,
  "巴基斯坦": 27,
  "印度尼西亚": 50,
  "菲律宾": 42,
  "阿根廷": 60,
  "智利": 68,
  "哥伦比亚": 48,
  "秘鲁": 52,
  "委内瑞拉": 18,
  "南非": 62,
  "哥斯达黎加": 70,
  "巴拿马": 56,
  "古巴": 7,
  "波多黎各": 55,
  "牙买加": 72,
  "卡塔尔": 30,
  "巴林": 15,
  "沙特阿拉伯": 12,
  "阿曼": 28,
  "黎巴嫩": 48,
  "约旦": 32,
  "以色列": 53,
  "乌克兰": 44,
  "罗马尼亚": 60,
  "保加利亚": 42,
  "克罗地亚": 55,
  "塞尔维亚": 34,
  "匈牙利": 40,
  "斯洛伐克": 56,
  "斯洛文尼亚": 62,
  "爱尔兰": 78,
  "柬埔寨": 20,
  "缅甸": 10,
  "老挝": 12,
  "孟加拉国": 30,
  "斯里兰卡": 38,
  "尼泊尔": 55,
  "哈萨克斯坦": 22,
  "乌兹别克斯坦": 18,
  "阿塞拜疆": 12,
  "蒙古": 58,
};

// ─── DEMOCRACY INDEX (country-level, 0-10) ───
// Source: EIU Democracy Index 2024
const DEMOCRACY_BY_COUNTRY = {
  "美国": 7.85,
  "英国": 8.54,
  "日本": 8.33,
  "中国": 2.12,
  "中国香港": 3.54,
  "中国台湾": 8.99,
  "韩国": 8.09,
  "新加坡": 6.02,
  "澳大利亚": 8.71,
  "新西兰": 9.61,
  "加拿大": 8.88,
  "法国": 7.99,
  "荷兰": 8.88,
  "瑞士": 9.14,
  "德国": 8.80,
  "西班牙": 8.07,
  "意大利": 7.69,
  "比利时": 7.64,
  "奥地利": 8.41,
  "捷克": 7.97,
  "波兰": 7.04,
  "葡萄牙": 8.03,
  "希腊": 7.56,
  "土耳其": 4.35,
  "墨西哥": 5.57,
  "巴西": 6.78,
  "阿联酋": 2.76,
  "泰国": 6.35,
  "马来西亚": 7.30,
  "越南": 2.82,
  "印度": 7.18,
  "肯尼亚": 5.05,
  "埃及": 2.93,
  "伊朗": 1.96,
  "巴基斯坦": 4.13,
  "印度尼西亚": 6.71,
  "菲律宾": 6.73,
  "阿根廷": 6.81,
  "智利": 8.28,
  "哥伦比亚": 7.04,
  "秘鲁": 6.09,
  "委内瑞拉": 2.23,
  "南非": 7.05,
  "哥斯达黎加": 8.29,
  "巴拿马": 7.18,
  "古巴": 2.84,
  "波多黎各": 7.85,
  "牙买加": 7.39,
  "卡塔尔": 3.19,
  "巴林": 2.52,
  "沙特阿拉伯": 2.08,
  "阿曼": 3.12,
  "黎巴嫩": 4.16,
  "约旦": 3.41,
  "以色列": 7.84,
  "乌克兰": 5.42,
  "罗马尼亚": 6.40,
  "保加利亚": 6.53,
  "克罗地亚": 6.50,
  "塞尔维亚": 6.02,
  "匈牙利": 6.50,
  "斯洛伐克": 7.17,
  "斯洛文尼亚": 7.96,
  "爱尔兰": 9.05,
  "柬埔寨": 3.18,
  "缅甸": 1.74,
  "老挝": 2.14,
  "孟加拉国": 5.99,
  "斯里兰卡": 6.14,
  "尼泊尔": 4.49,
  "哈萨克斯坦": 3.08,
  "乌兹别克斯坦": 2.12,
  "阿塞拜疆": 2.68,
  "蒙古": 6.48,
};

// ─── CORRUPTION PERCEPTIONS INDEX (country-level, 0-100, higher=cleaner) ───
// Source: Transparency International CPI 2024
const CPI_BY_COUNTRY = {
  "美国": 69,
  "英国": 71,
  "日本": 73,
  "中国": 42,
  "中国香港": 75,
  "中国台湾": 68,
  "韩国": 63,
  "新加坡": 83,
  "澳大利亚": 75,
  "新西兰": 85,
  "加拿大": 76,
  "法国": 71,
  "荷兰": 79,
  "瑞士": 82,
  "德国": 78,
  "西班牙": 60,
  "意大利": 56,
  "比利时": 73,
  "奥地利": 71,
  "捷克": 57,
  "波兰": 54,
  "葡萄牙": 61,
  "希腊": 49,
  "土耳其": 36,
  "墨西哥": 31,
  "巴西": 36,
  "阿联酋": 68,
  "泰国": 35,
  "马来西亚": 50,
  "越南": 42,
  "印度": 39,
  "肯尼亚": 32,
  "埃及": 35,
  "伊朗": 24,
  "巴基斯坦": 27,
  "印度尼西亚": 37,
  "菲律宾": 34,
  "阿根廷": 38,
  "智利": 67,
  "哥伦比亚": 40,
  "秘鲁": 36,
  "委内瑞拉": 13,
  "南非": 43,
  "哥斯达黎加": 55,
  "巴拿马": 36,
  "古巴": 42,
  "波多黎各": 69,
  "牙买加": 44,
  "卡塔尔": 58,
  "巴林": 44,
  "沙特阿拉伯": 52,
  "阿曼": 52,
  "黎巴嫩": 24,
  "约旦": 47,
  "以色列": 62,
  "乌克兰": 36,
  "罗马尼亚": 46,
  "保加利亚": 45,
  "克罗地亚": 47,
  "塞尔维亚": 36,
  "匈牙利": 42,
  "斯洛伐克": 54,
  "斯洛文尼亚": 56,
  "爱尔兰": 77,
  "柬埔寨": 22,
  "缅甸": 23,
  "老挝": 28,
  "孟加拉国": 25,
  "斯里兰卡": 34,
  "尼泊尔": 33,
  "哈萨克斯坦": 39,
  "乌兹别克斯坦": 33,
  "阿塞拜疆": 23,
  "蒙古": 35,
};

// ─── Apply to cities.json ───
const filePath = new URL("../public/data/cities.json", import.meta.url);
const raw = readFileSync(filePath, "utf-8");
const data = JSON.parse(raw);

let missing = [];

for (const city of data.cities) {
  // monthlyRent (city-level)
  city.monthlyRent = RENT_BY_CITY[city.id] ?? 0;
  if (!RENT_BY_CITY[city.id]) missing.push(`rent: ${city.id} ${city.name}`);

  // paidLeaveDays (country-level)
  city.paidLeaveDays = PAID_LEAVE_BY_COUNTRY[city.country] ?? 0;
  if (PAID_LEAVE_BY_COUNTRY[city.country] === undefined) missing.push(`leave: ${city.country}`);

  // internetSpeedMbps (city-level)
  city.internetSpeedMbps = SPEED_BY_CITY[city.id] ?? 0;
  if (!SPEED_BY_CITY[city.id]) missing.push(`speed: ${city.id} ${city.name}`);

  // hospitalBedsPerThousand (country-level)
  city.hospitalBedsPerThousand = BEDS_BY_COUNTRY[city.country] ?? 0;
  if (BEDS_BY_COUNTRY[city.country] === undefined) missing.push(`beds: ${city.country}`);

  // uhcCoverageIndex (country-level)
  city.uhcCoverageIndex = UHC_BY_COUNTRY[city.country] ?? 0;
  if (UHC_BY_COUNTRY[city.country] === undefined) missing.push(`uhc: ${city.country}`);

  // lifeExpectancy (country-level)
  city.lifeExpectancy = LIFE_EXP_BY_COUNTRY[city.country] ?? 0;
  if (LIFE_EXP_BY_COUNTRY[city.country] === undefined) missing.push(`life: ${city.country}`);

  // pressFreedomScore (country-level)
  city.pressFreedomScore = PRESS_FREEDOM_BY_COUNTRY[city.country] ?? 0;
  if (PRESS_FREEDOM_BY_COUNTRY[city.country] === undefined) missing.push(`press: ${city.country}`);

  // democracyIndex (country-level)
  city.democracyIndex = DEMOCRACY_BY_COUNTRY[city.country] ?? 0;
  if (DEMOCRACY_BY_COUNTRY[city.country] === undefined) missing.push(`democracy: ${city.country}`);

  // corruptionPerceptionIndex (country-level)
  city.corruptionPerceptionIndex = CPI_BY_COUNTRY[city.country] ?? 0;
  if (CPI_BY_COUNTRY[city.country] === undefined) missing.push(`cpi: ${city.country}`);
}

if (missing.length > 0) {
  console.warn("⚠️  Missing data for:");
  for (const m of [...new Set(missing)]) console.warn("  ", m);
}

writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
console.log(`✅ Updated ${data.cities.length} cities with 9 new fields.`);
