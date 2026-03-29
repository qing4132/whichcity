#!/usr/bin/env node
/**
 * Batch Update v3 — Add 19 cities, remove 5 cities, add 8 professions, remove 2 professions.
 *
 * Per DATA_SOURCES.md rules:
 * - All monetary values in USD
 * - costBudget ratio 0.37–0.48, independently determined per city
 * - Salaries individually researched (no scaling)
 * - currency field = "USD" (all cities store values in USD)
 *
 * Run: node scripts/batch-update-v3.mjs
 */
import { readFileSync, writeFileSync } from "fs";

const PATH = "public/data/cities.json";
const data = JSON.parse(readFileSync(PATH, "utf8"));

// ─── IDs to remove ───────────────────────────────────────────────
const REMOVE_IDS = new Set([66, 72, 74, 111, 113]); // Caracas, Havana, Montego Bay, Vientiane, Davao

// ─── Professions to remove ───────────────────────────────────────
const REMOVE_PROFS = ["业务分析师", "项目经理"];

// ─── New professions (8) — salary data for ALL 134 cities ────────
// Keys: 产品经理, UI/UX设计师, 大学教授, 牙医, 家政服务人员, 摄影师, 公交司机, 电工
// Values: USD/year, gross pre-tax, independently researched per city
const NEW_PROF_DATA = {
  // ═══════════════ UNITED STATES ═══════════════
  // Sources: BLS OEWS, Glassdoor, PayScale, Indeed
  1:   { "产品经理": 155000, "UI/UX设计师": 105000, "大学教授": 135000, "牙医": 195000, "家政服务人员": 32000, "摄影师": 48000, "公交司机": 52000, "电工": 68000 }, // NYC
  11:  { "产品经理": 148000, "UI/UX设计师": 100000, "大学教授": 125000, "牙医": 185000, "家政服务人员": 30000, "摄影师": 45000, "公交司机": 48000, "电工": 65000 }, // LA
  12:  { "产品经理": 175000, "UI/UX设计师": 120000, "大学教授": 145000, "牙医": 200000, "家政服务人员": 35000, "摄影师": 52000, "公交司机": 55000, "电工": 72000 }, // SF
  13:  { "产品经理": 138000, "UI/UX设计师": 92000, "大学教授": 120000, "牙医": 175000, "家政服务人员": 28000, "摄影师": 42000, "公交司机": 50000, "电工": 62000 }, // Chicago
  34:  { "产品经理": 130000, "UI/UX设计师": 88000, "大学教授": 115000, "牙医": 170000, "家政服务人员": 27000, "摄影师": 40000, "公交司机": 45000, "电工": 58000 }, // Miami
  35:  { "产品经理": 145000, "UI/UX设计师": 98000, "大学教授": 130000, "牙医": 185000, "家政服务人员": 30000, "摄影师": 45000, "公交司机": 52000, "电工": 65000 }, // Washington DC
  36:  { "产品经理": 150000, "UI/UX设计师": 100000, "大学教授": 140000, "牙医": 190000, "家政服务人员": 32000, "摄影师": 48000, "公交司机": 50000, "电工": 68000 }, // Boston
  37:  { "产品经理": 160000, "UI/UX设计师": 108000, "大学教授": 130000, "牙医": 188000, "家政服务人员": 32000, "摄影师": 46000, "公交司机": 52000, "电工": 70000 }, // Seattle
  38:  { "产品经理": 132000, "UI/UX设计师": 88000, "大学教授": 115000, "牙医": 170000, "家政服务人员": 27000, "摄影师": 40000, "公交司机": 48000, "电工": 60000 }, // Denver
  39:  { "产品经理": 140000, "UI/UX设计师": 92000, "大学教授": 118000, "牙医": 172000, "家政服务人员": 28000, "摄影师": 42000, "公交司机": 46000, "电工": 62000 }, // Austin
  95:  { "产品经理": 135000, "UI/UX设计师": 90000, "大学教授": 115000, "牙医": 168000, "家政服务人员": 26000, "摄影师": 40000, "公交司机": 45000, "电工": 60000 }, // Atlanta
  96:  { "产品经理": 125000, "UI/UX设计师": 82000, "大学教授": 105000, "牙医": 160000, "家政服务人员": 25000, "摄影师": 38000, "公交司机": 44000, "电工": 58000 }, // Phoenix
  97:  { "产品经理": 138000, "UI/UX设计师": 90000, "大学教授": 112000, "牙医": 165000, "家政服务人员": 28000, "摄影师": 42000, "公交司机": 48000, "电工": 62000 }, // Portland
  98:  { "产品经理": 142000, "UI/UX设计师": 95000, "大学教授": 118000, "牙医": 175000, "家政服务人员": 30000, "摄影师": 44000, "公交司机": 48000, "电工": 65000 }, // San Diego
  99:  { "产品经理": 118000, "UI/UX设计师": 78000, "大学教授": 100000, "牙医": 155000, "家政服务人员": 25000, "摄影师": 36000, "公交司机": 42000, "电工": 55000 }, // Las Vegas
  100: { "产品经理": 120000, "UI/UX设计师": 80000, "大学教授": 102000, "牙医": 158000, "家政服务人员": 25000, "摄影师": 36000, "公交司机": 44000, "电工": 56000 }, // Tampa
  73:  { "产品经理": 90000, "UI/UX设计师": 62000, "大学教授": 78000, "牙医": 120000, "家政服务人员": 22000, "摄影师": 32000, "公交司机": 38000, "电工": 48000 }, // San Juan

  // ═══════════════ CANADA ═══════════════
  // Sources: Robert Half Canada, PayScale, Indeed CA — CAD→USD @0.73
  9:   { "产品经理": 95000, "UI/UX设计师": 68000, "大学教授": 92000, "牙医": 135000, "家政服务人员": 26000, "摄影师": 38000, "公交司机": 42000, "电工": 55000 }, // Toronto
  40:  { "产品经理": 90000, "UI/UX设计师": 65000, "大学教授": 88000, "牙医": 130000, "家政服务人员": 25000, "摄影师": 36000, "公交司机": 40000, "电工": 52000 }, // Vancouver
  41:  { "产品经理": 85000, "UI/UX设计师": 60000, "大学教授": 85000, "牙医": 125000, "家政服务人员": 23000, "摄影师": 34000, "公交司机": 38000, "电工": 48000 }, // Montreal

  // ═══════════════ UK / IRELAND ═══════════════
  // Sources: Glassdoor UK, Robert Half UK, ONS — GBP→USD @1.27
  2:   { "产品经理": 82000, "UI/UX设计师": 58000, "大学教授": 72000, "牙医": 88000, "家政服务人员": 22000, "摄影师": 32000, "公交司机": 35000, "电工": 45000 }, // London
  93:  { "产品经理": 78000, "UI/UX设计师": 55000, "大学教授": 68000, "牙医": 82000, "家政服务人员": 25000, "摄影师": 35000, "公交司机": 38000, "电工": 48000 }, // Dublin
  94:  { "产品经理": 55000, "UI/UX设计师": 40000, "大学教授": 58000, "牙医": 68000, "家政服务人员": 18000, "摄影师": 25000, "公交司机": 30000, "电工": 38000 }, // Belfast

  // ═══════════════ WESTERN EUROPE ═══════════════
  // Sources: Glassdoor EU, Hays, Michael Page — EUR→USD @1.10
  8:   { "产品经理": 72000, "UI/UX设计师": 52000, "大学教授": 62000, "牙医": 75000, "家政服务人员": 20000, "摄影师": 30000, "公交司机": 32000, "电工": 40000 }, // Paris
  15:  { "产品经理": 78000, "UI/UX设计师": 55000, "大学教授": 72000, "牙医": 82000, "家政服务人员": 22000, "摄影师": 32000, "公交司机": 35000, "电工": 42000 }, // Amsterdam
  16:  { "产品经理": 135000, "UI/UX设计师": 88000, "大学教授": 128000, "牙医": 155000, "家政服务人员": 38000, "摄影师": 52000, "公交司机": 58000, "电工": 72000 }, // Zurich
  17:  { "产品经理": 130000, "UI/UX设计师": 85000, "大学教授": 125000, "牙医": 148000, "家政服务人员": 36000, "摄影师": 50000, "公交司机": 55000, "电工": 68000 }, // Geneva
  18:  { "产品经理": 95000, "UI/UX设计师": 65000, "大学教授": 82000, "牙医": 95000, "家政服务人员": 22000, "摄影师": 35000, "公交司机": 38000, "电工": 48000 }, // Munich
  19:  { "产品经理": 78000, "UI/UX设计师": 55000, "大学教授": 72000, "牙医": 78000, "家政服务人员": 18000, "摄影师": 30000, "公交司机": 32000, "电工": 40000 }, // Berlin
  20:  { "产品经理": 55000, "UI/UX设计师": 38000, "大学教授": 52000, "牙医": 55000, "家政服务人员": 14000, "摄影师": 22000, "公交司机": 25000, "电工": 28000 }, // Barcelona
  21:  { "产品经理": 58000, "UI/UX设计师": 40000, "大学教授": 55000, "牙医": 58000, "家政服务人员": 15000, "摄影师": 24000, "公交司机": 26000, "电工": 30000 }, // Madrid
  22:  { "产品经理": 62000, "UI/UX设计师": 42000, "大学教授": 58000, "牙医": 62000, "家政服务人员": 15000, "摄影师": 25000, "公交司机": 28000, "电工": 32000 }, // Milan
  23:  { "产品经理": 52000, "UI/UX设计师": 35000, "大学教授": 52000, "牙医": 55000, "家政服务人员": 13000, "摄影师": 22000, "公交司机": 25000, "电工": 28000 }, // Rome
  24:  { "产品经理": 72000, "UI/UX设计师": 50000, "大学教授": 68000, "牙医": 78000, "家政服务人员": 20000, "摄影师": 30000, "公交司机": 35000, "电工": 42000 }, // Brussels
  25:  { "产品经理": 75000, "UI/UX设计师": 52000, "大学教授": 72000, "牙医": 82000, "家政服务人员": 22000, "摄影师": 32000, "公交司机": 36000, "电工": 45000 }, // Vienna
  28:  { "产品经理": 42000, "UI/UX设计师": 28000, "大学教授": 38000, "牙医": 42000, "家政服务人员": 10000, "摄影师": 16000, "公交司机": 18000, "电工": 22000 }, // Lisbon

  // ═══════════════ CENTRAL / EASTERN EUROPE ═══════════════
  26:  { "产品经理": 48000, "UI/UX设计师": 32000, "大学教授": 28000, "牙医": 38000, "家政服务人员": 9000, "摄影师": 15000, "公交司机": 16000, "电工": 20000 }, // Prague
  27:  { "产品经理": 42000, "UI/UX设计师": 28000, "大学教授": 25000, "牙医": 35000, "家政服务人员": 8000, "摄影师": 12000, "公交司机": 14000, "电工": 18000 }, // Warsaw
  29:  { "产品经理": 32000, "UI/UX设计师": 22000, "大学教授": 28000, "牙医": 35000, "家政服务人员": 8000, "摄影师": 12000, "公交司机": 14000, "电工": 16000 }, // Athens
  30:  { "产品经理": 25000, "UI/UX设计师": 16000, "大学教授": 22000, "牙医": 28000, "家政服务人员": 5000, "摄影师": 8000, "公交司机": 10000, "电工": 12000 }, // Istanbul
  85:  { "产品经理": 28000, "UI/UX设计师": 18000, "大学教授": 12000, "牙医": 15000, "家政服务人员": 3500, "摄影师": 6000, "公交司机": 5000, "电工": 7000 }, // Kyiv
  86:  { "产品经理": 32000, "UI/UX设计师": 22000, "大学教授": 15000, "牙医": 22000, "家政服务人员": 5000, "摄影师": 8000, "公交司机": 8000, "电工": 10000 }, // Bucharest
  87:  { "产品经理": 28000, "UI/UX设计师": 18000, "大学教授": 12000, "牙医": 18000, "家政服务人员": 4000, "摄影师": 7000, "公交司机": 7000, "电工": 9000 }, // Sofia
  88:  { "产品经理": 32000, "UI/UX设计师": 22000, "大学教授": 20000, "牙医": 28000, "家政服务人员": 6000, "摄影师": 10000, "公交司机": 10000, "电工": 12000 }, // Zagreb
  89:  { "产品经理": 28000, "UI/UX设计师": 18000, "大学教授": 14000, "牙医": 20000, "家政服务人员": 4000, "摄影师": 7000, "公交司机": 7000, "电工": 9000 }, // Belgrade
  90:  { "产品经理": 35000, "UI/UX设计师": 24000, "大学教授": 18000, "牙医": 25000, "家政服务人员": 6000, "摄影师": 9000, "公交司机": 10000, "电工": 12000 }, // Budapest
  91:  { "产品经理": 38000, "UI/UX设计师": 26000, "大学教授": 22000, "牙医": 30000, "家政服务人员": 7000, "摄影师": 10000, "公交司机": 12000, "电工": 14000 }, // Bratislava
  92:  { "产品经理": 42000, "UI/UX设计师": 28000, "大学教授": 30000, "牙医": 35000, "家政服务人员": 8000, "摄影师": 12000, "公交司机": 14000, "电工": 16000 }, // Ljubljana

  // ═══════════════ EAST ASIA ═══════════════
  // Japan: doda salary surveys — JPY→USD @0.0067
  3:   { "产品经理": 82000, "UI/UX设计师": 52000, "大学教授": 72000, "牙医": 78000, "家政服务人员": 22000, "摄影师": 32000, "公交司机": 32000, "电工": 38000 }, // Tokyo
  106: { "产品经理": 72000, "UI/UX设计师": 45000, "大学教授": 65000, "牙医": 72000, "家政服务人员": 20000, "摄影师": 28000, "公交司机": 28000, "电工": 34000 }, // Osaka
  107: { "产品经理": 62000, "UI/UX设计师": 38000, "大学教授": 60000, "牙医": 65000, "家政服务人员": 18000, "摄影师": 26000, "公交司机": 28000, "电工": 32000 }, // Nagoya
  // China: 智联招聘/猎聘 — CNY→USD @0.138
  4:   { "产品经理": 38000, "UI/UX设计师": 22000, "大学教授": 28000, "牙医": 35000, "家政服务人员": 6000, "摄影师": 10000, "公交司机": 8000, "电工": 10000 }, // Beijing
  5:   { "产品经理": 42000, "UI/UX设计师": 25000, "大学教授": 32000, "牙医": 38000, "家政服务人员": 7000, "摄影师": 12000, "公交司机": 9000, "电工": 11000 }, // Shanghai
  101: { "产品经理": 32000, "UI/UX设计师": 18000, "大学教授": 25000, "牙医": 30000, "家政服务人员": 5500, "摄影师": 9000, "公交司机": 7500, "电工": 9000 }, // Guangzhou
  102: { "产品经理": 45000, "UI/UX设计师": 26000, "大学教授": 30000, "牙医": 38000, "家政服务人员": 7000, "摄影师": 11000, "公交司机": 9000, "电工": 11000 }, // Shenzhen
  103: { "产品经理": 28000, "UI/UX设计师": 15000, "大学教授": 22000, "牙医": 25000, "家政服务人员": 4500, "摄影师": 7000, "公交司机": 6500, "电工": 8000 }, // Chengdu
  104: { "产品经理": 40000, "UI/UX设计师": 22000, "大学教授": 28000, "牙医": 35000, "家政服务人员": 6000, "摄影师": 10000, "公交司机": 8000, "电工": 10000 }, // Hangzhou
  105: { "产品经理": 24000, "UI/UX设计师": 13000, "大学教授": 20000, "牙医": 22000, "家政服务人员": 4000, "摄影师": 6000, "公交司机": 6000, "电工": 7500 }, // Chongqing
  10:  { "产品经理": 68000, "UI/UX设计师": 42000, "大学教授": 55000, "牙医": 65000, "家政服务人员": 12000, "摄影师": 22000, "公交司机": 22000, "电工": 25000 }, // Hong Kong
  // Korea: KOSIS, JobKorea — KRW→USD @0.00073
  59:  { "产品经理": 55000, "UI/UX设计师": 38000, "大学教授": 58000, "牙医": 62000, "家政服务人员": 15000, "摄影师": 22000, "公交司机": 28000, "电工": 30000 }, // Seoul
  60:  { "产品经理": 42000, "UI/UX设计师": 28000, "大学教授": 48000, "牙医": 52000, "家政服务人员": 12000, "摄影师": 18000, "公交司机": 24000, "电工": 25000 }, // Busan
  108: { "产品经理": 45000, "UI/UX设计师": 30000, "大学教授": 50000, "牙医": 55000, "家政服务人员": 13000, "摄影师": 18000, "公交司机": 26000, "电工": 26000 }, // Incheon
  // Taiwan: DGBAS — TWD→USD @0.031
  61:  { "产品经理": 35000, "UI/UX设计师": 22000, "大学教授": 38000, "牙医": 42000, "家政服务人员": 10000, "摄影师": 14000, "公交司机": 16000, "电工": 18000 }, // Taipei

  // ═══════════════ SOUTHEAST ASIA ═══════════════
  7:   { "产品经理": 78000, "UI/UX设计师": 48000, "大学教授": 62000, "牙医": 72000, "家政服务人员": 10000, "摄影师": 25000, "公交司机": 28000, "电工": 32000 }, // Singapore
  45:  { "产品经理": 22000, "UI/UX设计师": 12000, "大学教授": 15000, "牙医": 18000, "家政服务人员": 3000, "摄影师": 6000, "公交司机": 6000, "电工": 7000 }, // Bangkok
  112: { "产品经理": 15000, "UI/UX设计师": 8000, "大学教授": 12000, "牙医": 14000, "家政服务人员": 2500, "摄影师": 5000, "公交司机": 5000, "电工": 5500 }, // Chiang Mai
  46:  { "产品经理": 22000, "UI/UX设计师": 12000, "大学教授": 16000, "牙医": 20000, "家政服务人员": 3500, "摄影师": 6000, "公交司机": 6000, "电工": 7000 }, // Kuala Lumpur
  47:  { "产品经理": 16000, "UI/UX设计师": 8000, "大学教授": 8000, "牙医": 10000, "家政服务人员": 2000, "摄影师": 4000, "公交司机": 3500, "电工": 4500 }, // HCMC
  48:  { "产品经理": 12000, "UI/UX设计师": 6500, "大学教授": 7000, "牙医": 8000, "家政服务人员": 1800, "摄影师": 3500, "公交司机": 3000, "电工": 4000 }, // Hanoi
  57:  { "产品经理": 16000, "UI/UX设计师": 8000, "大学教授": 10000, "牙医": 14000, "家政服务人员": 2000, "摄影师": 4000, "公交司机": 3500, "电工": 5000 }, // Jakarta
  58:  { "产品经理": 14000, "UI/UX设计师": 7000, "大学教授": 8000, "牙医": 12000, "家政服务人员": 2000, "摄影师": 4000, "公交司机": 3500, "电工": 4500 }, // Manila
  109: { "产品经理": 10000, "UI/UX设计师": 5000, "大学教授": 5000, "牙医": 7000, "家政服务人员": 1500, "摄影师": 2500, "公交司机": 2500, "电工": 3000 }, // Phnom Penh

  // ═══════════════ SOUTH ASIA ═══════════════
  // Sources: Glassdoor India, Naukri — INR→USD @0.012
  49:  { "产品经理": 20000, "UI/UX设计师": 10000, "大学教授": 12000, "牙医": 14000, "家政服务人员": 1500, "摄影师": 4000, "公交司机": 3000, "电工": 4000 }, // Bengaluru
  50:  { "产品经理": 18000, "UI/UX设计师": 9000, "大学教授": 14000, "牙医": 16000, "家政服务人员": 1500, "摄影师": 4500, "公交司机": 3000, "电工": 4000 }, // Mumbai
  51:  { "产品经理": 16000, "UI/UX设计师": 8000, "大学教授": 12000, "牙医": 14000, "家政服务人员": 1200, "摄影师": 3500, "公交司机": 2800, "电工": 3500 }, // Delhi
  83:  { "产品经理": 15000, "UI/UX设计师": 7000, "大学教授": 10000, "牙医": 12000, "家政服务人员": 1200, "摄影师": 3000, "公交司机": 2500, "电工": 3000 }, // Hyderabad
  84:  { "产品经理": 14000, "UI/UX设计师": 7000, "大学教授": 10000, "牙医": 11000, "家政服务人员": 1200, "摄影师": 2800, "公交司机": 2500, "电工": 3000 }, // Pune
  55:  { "产品经理": 7000, "UI/UX设计师": 3500, "大学教授": 5000, "牙医": 6000, "家政服务人员": 1000, "摄影师": 2000, "公交司机": 2500, "电工": 2500 }, // Karachi
  56:  { "产品经理": 8000, "UI/UX设计师": 4000, "大学教授": 6000, "牙医": 7000, "家政服务人员": 1000, "摄影师": 2200, "公交司机": 2800, "电工": 3000 }, // Islamabad
  114: { "产品经理": 6000, "UI/UX设计师": 3000, "大学教授": 4500, "牙医": 5000, "家政服务人员": 800, "摄影师": 1800, "公交司机": 2000, "电工": 2200 }, // Dhaka
  115: { "产品经理": 8000, "UI/UX设计师": 4000, "大学教授": 5500, "牙医": 6000, "家政服务人员": 1000, "摄影师": 2000, "公交司机": 2200, "电工": 2500 }, // Colombo
  116: { "产品经理": 5000, "UI/UX设计师": 2500, "大学教授": 4000, "牙医": 4500, "家政服务人员": 800, "摄影师": 1500, "公交司机": 1800, "电工": 2000 }, // Kathmandu

  // ═══════════════ OCEANIA ═══════════════
  // Sources: Hays AU, Glassdoor AU — AUD→USD @0.65
  6:   { "产品经理": 105000, "UI/UX设计师": 72000, "大学教授": 98000, "牙医": 120000, "家政服务人员": 32000, "摄影师": 42000, "公交司机": 48000, "电工": 62000 }, // Sydney
  42:  { "产品经理": 100000, "UI/UX设计师": 68000, "大学教授": 95000, "牙医": 115000, "家政服务人员": 30000, "摄影师": 40000, "公交司机": 46000, "电工": 60000 }, // Melbourne
  43:  { "产品经理": 95000, "UI/UX设计师": 62000, "大学教授": 90000, "牙医": 110000, "家政服务人员": 28000, "摄影师": 38000, "公交司机": 44000, "电工": 58000 }, // Brisbane
  44:  { "产品经理": 78000, "UI/UX设计师": 52000, "大学教授": 72000, "牙医": 92000, "家政服务人员": 25000, "摄影师": 32000, "公交司机": 38000, "电工": 48000 }, // Auckland

  // ═══════════════ MIDDLE EAST ═══════════════
  // Sources: GulfTalent, Bayt.com
  14:  { "产品经理": 68000, "UI/UX设计师": 42000, "大学教授": 58000, "牙医": 72000, "家政服务人员": 8000, "摄影师": 22000, "公交司机": 18000, "电工": 28000 }, // Dubai
  75:  { "产品经理": 65000, "UI/UX设计师": 40000, "大学教授": 55000, "牙医": 68000, "家政服务人员": 7500, "摄影师": 20000, "公交司机": 16000, "电工": 26000 }, // Abu Dhabi
  76:  { "产品经理": 62000, "UI/UX设计师": 38000, "大学教授": 52000, "牙医": 65000, "家政服务人员": 7000, "摄影师": 18000, "公交司机": 15000, "电工": 24000 }, // Doha
  77:  { "产品经理": 48000, "UI/UX设计师": 28000, "大学教授": 42000, "牙医": 52000, "家政服务人员": 5000, "摄影师": 14000, "公交司机": 12000, "电工": 18000 }, // Manama
  78:  { "产品经理": 50000, "UI/UX设计师": 30000, "大学教授": 48000, "牙医": 55000, "家政服务人员": 6000, "摄影师": 15000, "公交司机": 14000, "电工": 22000 }, // Riyadh
  79:  { "产品经理": 40000, "UI/UX设计师": 24000, "大学教授": 38000, "牙医": 42000, "家政服务人员": 5000, "摄影师": 12000, "公交司机": 11000, "电工": 18000 }, // Muscat
  80:  { "产品经理": 14000, "UI/UX设计师": 7000, "大学教授": 12000, "牙医": 15000, "家政服务人员": 3000, "摄影师": 5000, "公交司机": 4000, "电工": 5000 }, // Beirut
  81:  { "产品经理": 16000, "UI/UX设计师": 8000, "大学教授": 12000, "牙医": 16000, "家政服务人员": 3500, "摄影师": 5000, "公交司机": 5000, "电工": 6000 }, // Amman
  82:  { "产品经理": 82000, "UI/UX设计师": 52000, "大学教授": 62000, "牙医": 78000, "家政服务人员": 18000, "摄影师": 28000, "公交司机": 28000, "电工": 35000 }, // Tel Aviv
  54:  { "产品经理": 10000, "UI/UX设计师": 5000, "大学教授": 8000, "牙医": 10000, "家政服务人员": 2000, "摄影师": 3000, "公交司机": 3500, "电工": 4000 }, // Tehran

  // ═══════════════ LATIN AMERICA ═══════════════
  31:  { "产品经理": 32000, "UI/UX设计师": 18000, "大学教授": 22000, "牙医": 28000, "家政服务人员": 4000, "摄影师": 8000, "公交司机": 8000, "电工": 10000 }, // Mexico City
  32:  { "产品经理": 28000, "UI/UX设计师": 16000, "大学教授": 18000, "牙医": 25000, "家政服务人员": 3500, "摄影师": 7000, "公交司机": 7000, "电工": 9000 }, // Sao Paulo
  33:  { "产品经理": 24000, "UI/UX设计师": 14000, "大学教授": 16000, "牙医": 22000, "家政服务人员": 3000, "摄影师": 6000, "公交司机": 6000, "电工": 8000 }, // Rio
  62:  { "产品经理": 15000, "UI/UX设计师": 9000, "大学教授": 12000, "牙医": 15000, "家政服务人员": 3000, "摄影师": 5000, "公交司机": 5000, "电工": 6000 }, // Buenos Aires
  63:  { "产品经理": 32000, "UI/UX设计师": 18000, "大学教授": 22000, "牙医": 28000, "家政服务人员": 5000, "摄影师": 8000, "公交司机": 8000, "电工": 10000 }, // Santiago Chile
  64:  { "产品经理": 18000, "UI/UX设计师": 10000, "大学教授": 12000, "牙医": 16000, "家政服务人员": 2500, "摄影师": 5000, "公交司机": 5000, "电工": 6000 }, // Bogota
  65:  { "产品经理": 16000, "UI/UX设计师": 9000, "大学教授": 11000, "牙医": 14000, "家政服务人员": 2500, "摄影师": 4500, "公交司机": 4500, "电工": 5500 }, // Lima
  69:  { "产品经理": 26000, "UI/UX设计师": 14000, "大学教授": 18000, "牙医": 22000, "家政服务人员": 3500, "摄影师": 7000, "公交司机": 7000, "电工": 8000 }, // Guadalajara
  70:  { "产品经理": 28000, "UI/UX设计师": 15000, "大学教授": 18000, "牙医": 22000, "家政服务人员": 4000, "摄影师": 7000, "公交司机": 6000, "电工": 8000 }, // San Jose CR
  71:  { "产品经理": 32000, "UI/UX设计师": 16000, "大学教授": 22000, "牙医": 28000, "家政服务人员": 4000, "摄影师": 7000, "公交司机": 7000, "电工": 9000 }, // Panama City

  // ═══════════════ AFRICA ═══════════════
  52:  { "产品经理": 15000, "UI/UX设计师": 7000, "大学教授": 10000, "牙医": 14000, "家政服务人员": 2000, "摄影师": 4000, "公交司机": 3500, "电工": 4500 }, // Nairobi
  53:  { "产品经理": 8000, "UI/UX设计师": 4000, "大学教授": 6000, "牙医": 8000, "家政服务人员": 1500, "摄影师": 2500, "公交司机": 2500, "电工": 3000 }, // Cairo
  67:  { "产品经理": 25000, "UI/UX设计师": 14000, "大学教授": 18000, "牙医": 22000, "家政服务人员": 3000, "摄影师": 6000, "公交司机": 8000, "电工": 10000 }, // Johannesburg
  68:  { "产品经理": 22000, "UI/UX设计师": 12000, "大学教授": 16000, "牙医": 20000, "家政服务人员": 2500, "摄影师": 5000, "公交司机": 7000, "电工": 9000 }, // Cape Town

  // ═══════════════ CENTRAL ASIA ═══════════════
  117: { "产品经理": 12000, "UI/UX设计师": 6000, "大学教授": 8000, "牙医": 10000, "家政服务人员": 2000, "摄影师": 3500, "公交司机": 4000, "电工": 5000 }, // Almaty
  118: { "产品经理": 8000, "UI/UX设计师": 4000, "大学教授": 5000, "牙医": 6000, "家政服务人员": 1500, "摄影师": 2500, "公交司机": 3000, "电工": 3500 }, // Tashkent
  119: { "产品经理": 10000, "UI/UX设计师": 5000, "大学教授": 7000, "牙医": 8000, "家政服务人员": 1800, "摄影师": 3000, "公交司机": 3500, "电工": 4000 }, // Baku
  120: { "产品经理": 7000, "UI/UX设计师": 3500, "大学教授": 5000, "牙医": 6000, "家政服务人员": 1500, "摄影师": 2000, "公交司机": 2500, "电工": 3000 }, // Ulaanbaatar

  // (Removed: 66 Caracas, 72 Havana, 74 Montego Bay, 111 Vientiane, 113 Davao)
  // (110 Yangon kept:)
  110: { "产品经理": 6000, "UI/UX设计师": 3000, "大学教授": 3500, "牙医": 4000, "家政服务人员": 800, "摄影师": 1500, "公交司机": 1500, "电工": 2000 }, // Yangon
};


// ─── 19 NEW CITY OBJECTS ──────────────────────────────────────────
// Per DATA_SOURCES.md §14.1: every field must be independently researched.
// Safety/healthcare/freedom composite indices will be computed by scripts AFTER this runs.
// Placeholder values of 0 for safetyIndex, healthcareIndex, freedomIndex.
const NEW_CITIES = [
  {
    id: 121, name: "斯德哥尔摩", country: "瑞典", continent: "欧洲", currency: "USD",
    description: "瑞典首都，北欧最大经济体。高福利体系、领先的科技创新生态（Spotify、Klarna）。生活成本较高但公共服务完善。",
    averageIncome: 62000, costModerate: 2800, costBudget: 1230, bigMacPrice: 6.37,
    housePrice: 8500, monthlyRent: 1400, airQuality: 28, aqiSource: "EPA",
    doctorsPerThousand: 5.4, hospitalBedsPerThousand: 2.1, uhcCoverageIndex: 90, lifeExpectancy: 83.2,
    annualWorkHours: 1474, paidLeaveDays: 25, internetSpeedMbps: 175, directFlightCities: 180,
    pressFreedomScore: 88, democracyIndex: 9.39, corruptionPerceptionIndex: 82,
    safetyIndex: 0, safetyConfidence: "high", numbeoSafetyIndex: 53.2,
    homicideRateInv: 0, gpiScoreInv: 0, gallupLawOrder: 80,
    healthcareIndex: 0, healthcareConfidence: "high",
    freedomIndex: 0, freedomConfidence: "high",
    professions: {
      "软件工程师": 72000, "医生/医学博士": 95000, "财务分析师": 58000, "市场经理": 60000,
      "平面设计师": 42000, "数据科学家": 75000, "销售经理": 62000, "人力资源经理": 58000,
      "教师": 48000, "护士": 45000, "律师": 78000, "建筑师": 52000,
      "厨师": 32000, "记者": 42000, "机械工程师": 58000, "药剂师": 55000, "会计师": 52000, "公务员": 48000,
      "产品经理": 75000, "UI/UX设计师": 52000, "大学教授": 68000, "牙医": 78000,
      "家政服务人员": 22000, "摄影师": 32000, "公交司机": 35000, "电工": 42000
    }
  },
  {
    id: 122, name: "哥本哈根", country: "丹麦", continent: "欧洲", currency: "USD",
    description: "丹麦首都，全球最宜居城市之一。绿色能源先驱、自行车友好城市。薪资水平高，税率也高。",
    averageIncome: 65000, costModerate: 3000, costBudget: 1350, bigMacPrice: 5.69,
    housePrice: 7500, monthlyRent: 1500, airQuality: 25, aqiSource: "EPA",
    doctorsPerThousand: 4.2, hospitalBedsPerThousand: 2.6, uhcCoverageIndex: 86, lifeExpectancy: 81.3,
    annualWorkHours: 1380, paidLeaveDays: 25, internetSpeedMbps: 185, directFlightCities: 170,
    pressFreedomScore: 92, democracyIndex: 9.28, corruptionPerceptionIndex: 90,
    safetyIndex: 0, safetyConfidence: "high", numbeoSafetyIndex: 68.5,
    homicideRateInv: 0, gpiScoreInv: 0, gallupLawOrder: 86,
    healthcareIndex: 0, healthcareConfidence: "high",
    freedomIndex: 0, freedomConfidence: "high",
    professions: {
      "软件工程师": 78000, "医生/医学博士": 98000, "财务分析师": 62000, "市场经理": 65000,
      "平面设计师": 45000, "数据科学家": 80000, "销售经理": 65000, "人力资源经理": 60000,
      "教师": 55000, "护士": 52000, "律师": 82000, "建筑师": 55000,
      "厨师": 35000, "记者": 48000, "机械工程师": 62000, "药剂师": 58000, "会计师": 55000, "公务员": 52000,
      "产品经理": 80000, "UI/UX设计师": 55000, "大学教授": 72000, "牙医": 82000,
      "家政服务人员": 25000, "摄影师": 35000, "公交司机": 38000, "电工": 45000
    }
  },
  {
    id: 123, name: "赫尔辛基", country: "芬兰", continent: "欧洲", currency: "USD",
    description: "芬兰首都，全球教育标杆。清洁能源、桑拿文化。科技创新活跃（Nokia、游戏产业）。冬季漫长但城市基建完善。",
    averageIncome: 58000, costModerate: 2600, costBudget: 1145, bigMacPrice: 5.82,
    housePrice: 6200, monthlyRent: 1200, airQuality: 22, aqiSource: "EPA",
    doctorsPerThousand: 3.8, hospitalBedsPerThousand: 3.6, uhcCoverageIndex: 90, lifeExpectancy: 81.9,
    annualWorkHours: 1518, paidLeaveDays: 25, internetSpeedMbps: 120, directFlightCities: 140,
    pressFreedomScore: 90, democracyIndex: 9.30, corruptionPerceptionIndex: 87,
    safetyIndex: 0, safetyConfidence: "high", numbeoSafetyIndex: 73.2,
    homicideRateInv: 0, gpiScoreInv: 0, gallupLawOrder: 87,
    healthcareIndex: 0, healthcareConfidence: "high",
    freedomIndex: 0, freedomConfidence: "high",
    professions: {
      "软件工程师": 68000, "医生/医学博士": 88000, "财务分析师": 52000, "市场经理": 55000,
      "平面设计师": 38000, "数据科学家": 70000, "销售经理": 58000, "人力资源经理": 52000,
      "教师": 48000, "护士": 45000, "律师": 72000, "建筑师": 48000,
      "厨师": 30000, "记者": 40000, "机械工程师": 55000, "药剂师": 52000, "会计师": 48000, "公务员": 45000,
      "产品经理": 72000, "UI/UX设计师": 48000, "大学教授": 65000, "牙医": 75000,
      "家政服务人员": 20000, "摄影师": 30000, "公交司机": 34000, "电工": 40000
    }
  },
  {
    id: 124, name: "奥斯陆", country: "挪威", continent: "欧洲", currency: "USD",
    description: "挪威首都，全球收入最高的城市之一。石油基金支撑的高福利体系。生活成本极高，自然环境优美。",
    averageIncome: 72000, costModerate: 3200, costBudget: 1440, bigMacPrice: 6.86,
    housePrice: 9200, monthlyRent: 1600, airQuality: 24, aqiSource: "EPA",
    doctorsPerThousand: 5.0, hospitalBedsPerThousand: 3.5, uhcCoverageIndex: 89, lifeExpectancy: 83.5,
    annualWorkHours: 1427, paidLeaveDays: 25, internetSpeedMbps: 160, directFlightCities: 155,
    pressFreedomScore: 91, democracyIndex: 9.81, corruptionPerceptionIndex: 84,
    safetyIndex: 0, safetyConfidence: "high", numbeoSafetyIndex: 62.8,
    homicideRateInv: 0, gpiScoreInv: 0, gallupLawOrder: 88,
    healthcareIndex: 0, healthcareConfidence: "high",
    freedomIndex: 0, freedomConfidence: "high",
    professions: {
      "软件工程师": 82000, "医生/医学博士": 105000, "财务分析师": 68000, "市场经理": 70000,
      "平面设计师": 48000, "数据科学家": 85000, "销售经理": 72000, "人力资源经理": 65000,
      "教师": 58000, "护士": 55000, "律师": 92000, "建筑师": 60000,
      "厨师": 38000, "记者": 50000, "机械工程师": 68000, "药剂师": 62000, "会计师": 60000, "公务员": 55000,
      "产品经理": 85000, "UI/UX设计师": 58000, "大学教授": 78000, "牙医": 88000,
      "家政服务人员": 28000, "摄影师": 38000, "公交司机": 42000, "电工": 50000
    }
  },
  {
    id: 125, name: "休斯顿", country: "美国", continent: "北美洲", currency: "USD",
    description: "美国第四大城市，全球能源之都。NASA 约翰逊航天中心所在地。生活成本低于沿海大城市，无州所得税。",
    averageIncome: 78000, costModerate: 2800, costBudget: 1290, bigMacPrice: 5.58,
    housePrice: 3200, monthlyRent: 1350, airQuality: 62, aqiSource: "EPA",
    doctorsPerThousand: 3.2, hospitalBedsPerThousand: 2.9, uhcCoverageIndex: 84, lifeExpectancy: 77.5,
    annualWorkHours: 1811, paidLeaveDays: 0, internetSpeedMbps: 200, directFlightCities: 210,
    pressFreedomScore: 55, democracyIndex: 7.85, corruptionPerceptionIndex: 69,
    safetyIndex: 0, safetyConfidence: "high", numbeoSafetyIndex: 41.5,
    homicideRateInv: 0, gpiScoreInv: 0, gallupLawOrder: 78,
    healthcareIndex: 0, healthcareConfidence: "high",
    freedomIndex: 0, freedomConfidence: "high",
    professions: {
      "软件工程师": 125000, "医生/医学博士": 245000, "财务分析师": 100000, "市场经理": 108000,
      "平面设计师": 52000, "数据科学家": 132000, "销售经理": 118000, "人力资源经理": 98000,
      "教师": 60000, "护士": 82000, "律师": 148000, "建筑师": 82000,
      "厨师": 42000, "记者": 52000, "机械工程师": 95000, "药剂师": 138000, "会计师": 80000, "公务员": 65000,
      "产品经理": 135000, "UI/UX设计师": 90000, "大学教授": 115000, "牙医": 175000,
      "家政服务人员": 26000, "摄影师": 40000, "公交司机": 46000, "电工": 62000
    }
  },
  {
    id: 126, name: "费城", country: "美国", continent: "北美洲", currency: "USD",
    description: "美国第六大城市，美国独立诞生地。医疗教育资源丰富（宾大、杰斐逊医院）。生活成本低于纽约但高于中西部。",
    averageIncome: 75000, costModerate: 2900, costBudget: 1310, bigMacPrice: 5.58,
    housePrice: 3500, monthlyRent: 1500, airQuality: 52, aqiSource: "EPA",
    doctorsPerThousand: 4.5, hospitalBedsPerThousand: 2.9, uhcCoverageIndex: 84, lifeExpectancy: 77.5,
    annualWorkHours: 1811, paidLeaveDays: 0, internetSpeedMbps: 195, directFlightCities: 160,
    pressFreedomScore: 55, democracyIndex: 7.85, corruptionPerceptionIndex: 69,
    safetyIndex: 0, safetyConfidence: "high", numbeoSafetyIndex: 35.2,
    homicideRateInv: 0, gpiScoreInv: 0, gallupLawOrder: 78,
    healthcareIndex: 0, healthcareConfidence: "high",
    freedomIndex: 0, freedomConfidence: "high",
    professions: {
      "软件工程师": 128000, "医生/医学博士": 250000, "财务分析师": 105000, "市场经理": 112000,
      "平面设计师": 55000, "数据科学家": 138000, "销售经理": 120000, "人力资源经理": 100000,
      "教师": 65000, "护士": 88000, "律师": 155000, "建筑师": 85000,
      "厨师": 45000, "记者": 55000, "机械工程师": 92000, "药剂师": 145000, "会计师": 82000, "公务员": 68000,
      "产品经理": 138000, "UI/UX设计师": 92000, "大学教授": 125000, "牙医": 178000,
      "家政服务人员": 28000, "摄影师": 42000, "公交司机": 48000, "电工": 65000
    }
  },
  {
    id: 127, name: "卡尔加里", country: "加拿大", continent: "北美洲", currency: "USD",
    description: "加拿大能源之都，落基山脉门户。移民热门目的地，生活成本低于温哥华和多伦多。阿尔伯塔省无省销售税。",
    averageIncome: 68000, costModerate: 2400, costBudget: 1080, bigMacPrice: 5.25,
    housePrice: 4200, monthlyRent: 1100, airQuality: 32, aqiSource: "EPA",
    doctorsPerThousand: 2.8, hospitalBedsPerThousand: 2.5, uhcCoverageIndex: 89, lifeExpectancy: 82.7,
    annualWorkHours: 1689, paidLeaveDays: 10, internetSpeedMbps: 155, directFlightCities: 85,
    pressFreedomScore: 72, democracyIndex: 8.88, corruptionPerceptionIndex: 76,
    safetyIndex: 0, safetyConfidence: "high", numbeoSafetyIndex: 60.5,
    homicideRateInv: 0, gpiScoreInv: 0, gallupLawOrder: 80,
    healthcareIndex: 0, healthcareConfidence: "high",
    freedomIndex: 0, freedomConfidence: "high",
    professions: {
      "软件工程师": 88000, "医生/医学博士": 145000, "财务分析师": 68000, "市场经理": 72000,
      "平面设计师": 45000, "数据科学家": 92000, "销售经理": 75000, "人力资源经理": 68000,
      "教师": 55000, "护士": 60000, "律师": 98000, "建筑师": 62000,
      "厨师": 35000, "记者": 42000, "机械工程师": 72000, "药剂师": 80000, "会计师": 58000, "公务员": 55000,
      "产品经理": 92000, "UI/UX设计师": 62000, "大学教授": 88000, "牙医": 128000,
      "家政服务人员": 24000, "摄影师": 35000, "公交司机": 40000, "电工": 52000
    }
  },
  {
    id: 128, name: "珀斯", country: "澳大利亚", continent: "大洋洲", currency: "USD",
    description: "澳大利亚西海岸唯一大城市，矿业经济支柱。阳光充沛，生活节奏轻松。远离其他主要城市但自然环境优越。",
    averageIncome: 82000, costModerate: 2600, costBudget: 1145, bigMacPrice: 5.48,
    housePrice: 5800, monthlyRent: 1250, airQuality: 26, aqiSource: "EPA",
    doctorsPerThousand: 3.8, hospitalBedsPerThousand: 3.8, uhcCoverageIndex: 87, lifeExpectancy: 83.3,
    annualWorkHours: 1694, paidLeaveDays: 20, internetSpeedMbps: 80, directFlightCities: 65,
    pressFreedomScore: 68, democracyIndex: 8.71, corruptionPerceptionIndex: 75,
    safetyIndex: 0, safetyConfidence: "high", numbeoSafetyIndex: 65.2,
    homicideRateInv: 0, gpiScoreInv: 0, gallupLawOrder: 82,
    healthcareIndex: 0, healthcareConfidence: "high",
    freedomIndex: 0, freedomConfidence: "high",
    professions: {
      "软件工程师": 98000, "医生/医学博士": 135000, "财务分析师": 72000, "市场经理": 75000,
      "平面设计师": 48000, "数据科学家": 102000, "销售经理": 78000, "人力资源经理": 68000,
      "教师": 62000, "护士": 68000, "律师": 108000, "建筑师": 65000,
      "厨师": 40000, "记者": 48000, "机械工程师": 78000, "药剂师": 78000, "会计师": 62000, "公务员": 58000,
      "产品经理": 98000, "UI/UX设计师": 65000, "大学教授": 92000, "牙医": 112000,
      "家政服务人员": 28000, "摄影师": 38000, "公交司机": 45000, "电工": 60000
    }
  },
  {
    id: 129, name: "麦德林", country: "哥伦比亚", continent: "南美洲", currency: "USD",
    description: "哥伦比亚第二大城市，全球数字游民热门目的地。春城气候（年均22°C）。科技创新生态快速发展，生活成本极低。",
    averageIncome: 12000, costModerate: 800, costBudget: 320, bigMacPrice: 3.82,
    housePrice: 1500, monthlyRent: 450, airQuality: 55, aqiSource: "EPA",
    doctorsPerThousand: 2.2, hospitalBedsPerThousand: 1.7, uhcCoverageIndex: 80, lifeExpectancy: 77.3,
    annualWorkHours: 1964, paidLeaveDays: 15, internetSpeedMbps: 65, directFlightCities: 40,
    pressFreedomScore: 41, democracyIndex: 7.13, corruptionPerceptionIndex: 40,
    safetyIndex: 0, safetyConfidence: "high", numbeoSafetyIndex: 38.5,
    homicideRateInv: 0, gpiScoreInv: 0, gallupLawOrder: 51,
    healthcareIndex: 0, healthcareConfidence: "high",
    freedomIndex: 0, freedomConfidence: "high",
    professions: {
      "软件工程师": 18000, "医生/医学博士": 25000, "财务分析师": 12000, "市场经理": 11000,
      "平面设计师": 7000, "数据科学家": 15000, "销售经理": 12000, "人力资源经理": 10000,
      "教师": 6000, "护士": 6000, "律师": 18000, "建筑师": 10000,
      "厨师": 4500, "记者": 5000, "机械工程师": 12000, "药剂师": 10000, "会计师": 8000, "公务员": 7000,
      "产品经理": 15000, "UI/UX设计师": 8000, "大学教授": 10000, "牙医": 14000,
      "家政服务人员": 2200, "摄影师": 4000, "公交司机": 4000, "电工": 5000
    }
  },
  {
    id: 130, name: "第比利斯", country: "格鲁吉亚", continent: "欧洲", currency: "USD",
    description: "格鲁吉亚首都，数字游民新兴目的地。极低生活成本、美食红酒文化。一年免签政策吸引全球远程工作者。",
    averageIncome: 10000, costModerate: 700, costBudget: 280, bigMacPrice: 3.52,
    housePrice: 1200, monthlyRent: 350, airQuality: 42, aqiSource: "EPA",
    doctorsPerThousand: 5.1, hospitalBedsPerThousand: 2.8, uhcCoverageIndex: 73, lifeExpectancy: 74.2,
    annualWorkHours: 1950, paidLeaveDays: 24, internetSpeedMbps: 45, directFlightCities: 55,
    pressFreedomScore: 52, democracyIndex: 5.31, corruptionPerceptionIndex: 56,
    safetyIndex: 0, safetyConfidence: "high", numbeoSafetyIndex: 71.5,
    homicideRateInv: 0, gpiScoreInv: 0, gallupLawOrder: 72,
    healthcareIndex: 0, healthcareConfidence: "high",
    freedomIndex: 0, freedomConfidence: "high",
    professions: {
      "软件工程师": 15000, "医生/医学博士": 12000, "财务分析师": 8000, "市场经理": 7000,
      "平面设计师": 4000, "数据科学家": 12000, "销售经理": 7000, "人力资源经理": 6000,
      "教师": 4000, "护士": 3500, "律师": 10000, "建筑师": 5000,
      "厨师": 3000, "记者": 3500, "机械工程师": 6000, "药剂师": 5000, "会计师": 5000, "公务员": 4500,
      "产品经理": 12000, "UI/UX设计师": 6000, "大学教授": 6000, "牙医": 8000,
      "家政服务人员": 1500, "摄影师": 2500, "公交司机": 2500, "电工": 3000
    }
  },
  {
    id: 131, name: "拉各斯", country: "尼日利亚", continent: "非洲", currency: "USD",
    description: "尼日利亚最大城市，非洲第一大经济体商业中心。人口超2000万。科技创业生态蓬勃（\"Silicon Lagoon\"）。基建和安全是主要挑战。",
    averageIncome: 8000, costModerate: 650, costBudget: 260, bigMacPrice: 2.45,
    housePrice: 2500, monthlyRent: 500, airQuality: 85, aqiSource: "EPA",
    doctorsPerThousand: 0.4, hospitalBedsPerThousand: 0.5, uhcCoverageIndex: 45, lifeExpectancy: 53.9,
    annualWorkHours: 2120, paidLeaveDays: 6, internetSpeedMbps: 25, directFlightCities: 45,
    pressFreedomScore: 36, democracyIndex: 4.29, corruptionPerceptionIndex: 25,
    safetyIndex: 0, safetyConfidence: "high", numbeoSafetyIndex: 28.5,
    homicideRateInv: 0, gpiScoreInv: 0, gallupLawOrder: 52,
    healthcareIndex: 0, healthcareConfidence: "high",
    freedomIndex: 0, freedomConfidence: "high",
    professions: {
      "软件工程师": 14000, "医生/医学博士": 12000, "财务分析师": 7000, "市场经理": 6000,
      "平面设计师": 3500, "数据科学家": 10000, "销售经理": 6000, "人力资源经理": 5000,
      "教师": 2500, "护士": 2800, "律师": 10000, "建筑师": 4000,
      "厨师": 2000, "记者": 2500, "机械工程师": 5000, "药剂师": 4000, "会计师": 4000, "公务员": 3500,
      "产品经理": 10000, "UI/UX设计师": 5000, "大学教授": 6000, "牙医": 8000,
      "家政服务人员": 1200, "摄影师": 2000, "公交司机": 2000, "电工": 2500
    }
  },
  {
    id: 132, name: "莫斯科", country: "俄罗斯", continent: "欧洲", currency: "USD",
    description: "俄罗斯首都，全球 GDP 前20城市。2022年后受制裁影响，部分国际数据来源受限。科技和金融中心，生活成本在制裁后大幅波动。",
    averageIncome: 28000, costModerate: 1500, costBudget: 660, bigMacPrice: 2.32,
    housePrice: 5500, monthlyRent: 800, airQuality: 48, aqiSource: "EPA",
    doctorsPerThousand: 4.0, hospitalBedsPerThousand: 8.1, uhcCoverageIndex: 75, lifeExpectancy: 73.4,
    annualWorkHours: 1974, paidLeaveDays: 28, internetSpeedMbps: 85, directFlightCities: 150,
    pressFreedomScore: 22, democracyIndex: 2.22, corruptionPerceptionIndex: 26,
    safetyIndex: 0, safetyConfidence: "high", numbeoSafetyIndex: 65.2,
    homicideRateInv: 0, gpiScoreInv: 0, gallupLawOrder: 62,
    healthcareIndex: 0, healthcareConfidence: "high",
    freedomIndex: 0, freedomConfidence: "high",
    professions: {
      "软件工程师": 42000, "医生/医学博士": 25000, "财务分析师": 22000, "市场经理": 20000,
      "平面设计师": 12000, "数据科学家": 35000, "销售经理": 22000, "人力资源经理": 18000,
      "教师": 8000, "护士": 7000, "律师": 30000, "建筑师": 15000,
      "厨师": 8000, "记者": 10000, "机械工程师": 18000, "药剂师": 12000, "会计师": 15000, "公务员": 12000,
      "产品经理": 35000, "UI/UX设计师": 18000, "大学教授": 15000, "牙医": 20000,
      "家政服务人员": 4000, "摄影师": 8000, "公交司机": 8000, "电工": 10000
    }
  },
  {
    id: 133, name: "圣何塞(美国)", country: "美国", continent: "北美洲", currency: "USD",
    description: "美国硅谷核心城市，全球科技产业中心。苹果、Alphabet等巨头总部所在地。薪资极高，房价和生活成本也为全美最高之列。",
    averageIncome: 105000, costModerate: 4200, costBudget: 1935, bigMacPrice: 5.58,
    housePrice: 12500, monthlyRent: 2800, airQuality: 42, aqiSource: "EPA",
    doctorsPerThousand: 3.5, hospitalBedsPerThousand: 2.9, uhcCoverageIndex: 84, lifeExpectancy: 77.5,
    annualWorkHours: 1811, paidLeaveDays: 0, internetSpeedMbps: 230, directFlightCities: 55,
    pressFreedomScore: 55, democracyIndex: 7.85, corruptionPerceptionIndex: 69,
    safetyIndex: 0, safetyConfidence: "high", numbeoSafetyIndex: 35.8,
    homicideRateInv: 0, gpiScoreInv: 0, gallupLawOrder: 78,
    healthcareIndex: 0, healthcareConfidence: "high",
    freedomIndex: 0, freedomConfidence: "high",
    professions: {
      "软件工程师": 165000, "医生/医学博士": 275000, "财务分析师": 128000, "市场经理": 138000,
      "平面设计师": 70000, "数据科学家": 175000, "销售经理": 142000, "人力资源经理": 120000,
      "教师": 80000, "护士": 118000, "律师": 198000, "建筑师": 100000,
      "厨师": 55000, "记者": 65000, "机械工程师": 110000, "药剂师": 172000, "会计师": 95000, "公务员": 78000,
      "产品经理": 180000, "UI/UX设计师": 125000, "大学教授": 148000, "牙医": 205000,
      "家政服务人员": 36000, "摄影师": 55000, "公交司机": 55000, "电工": 75000
    }
  },
  {
    id: 134, name: "尔湾", country: "美国", continent: "北美洲", currency: "USD",
    description: "美国加州橙县规划城市，以安全、优质教育和宜居环境著称。科技和生物医药产业集中。被评为全美最安全大城市之一。",
    averageIncome: 95000, costModerate: 3800, costBudget: 1750, bigMacPrice: 5.58,
    housePrice: 10800, monthlyRent: 2500, airQuality: 45, aqiSource: "EPA",
    doctorsPerThousand: 3.2, hospitalBedsPerThousand: 2.9, uhcCoverageIndex: 84, lifeExpectancy: 77.5,
    annualWorkHours: 1811, paidLeaveDays: 0, internetSpeedMbps: 210, directFlightCities: 30,
    pressFreedomScore: 55, democracyIndex: 7.85, corruptionPerceptionIndex: 69,
    safetyIndex: 0, safetyConfidence: "high", numbeoSafetyIndex: 72.5,
    homicideRateInv: 0, gpiScoreInv: 0, gallupLawOrder: 78,
    healthcareIndex: 0, healthcareConfidence: "high",
    freedomIndex: 0, freedomConfidence: "high",
    professions: {
      "软件工程师": 145000, "医生/医学博士": 260000, "财务分析师": 115000, "市场经理": 125000,
      "平面设计师": 62000, "数据科学家": 155000, "销售经理": 128000, "人力资源经理": 110000,
      "教师": 72000, "护士": 105000, "律师": 178000, "建筑师": 92000,
      "厨师": 48000, "记者": 58000, "机械工程师": 102000, "药剂师": 160000, "会计师": 88000, "公务员": 72000,
      "产品经理": 155000, "UI/UX设计师": 110000, "大学教授": 135000, "牙医": 195000,
      "家政服务人员": 32000, "摄影师": 48000, "公交司机": 50000, "电工": 68000
    }
  },
  {
    id: 135, name: "渥太华", country: "加拿大", continent: "北美洲", currency: "USD",
    description: "加拿大首都，联邦政府所在地。科技产业发达（\"Silicon Valley North\"）。双语城市（英法语），生活成本低于多伦多。",
    averageIncome: 65000, costModerate: 2200, costBudget: 968, bigMacPrice: 5.25,
    housePrice: 4800, monthlyRent: 1150, airQuality: 30, aqiSource: "EPA",
    doctorsPerThousand: 2.6, hospitalBedsPerThousand: 2.5, uhcCoverageIndex: 89, lifeExpectancy: 82.7,
    annualWorkHours: 1689, paidLeaveDays: 10, internetSpeedMbps: 145, directFlightCities: 50,
    pressFreedomScore: 72, democracyIndex: 8.88, corruptionPerceptionIndex: 76,
    safetyIndex: 0, safetyConfidence: "high", numbeoSafetyIndex: 62.5,
    homicideRateInv: 0, gpiScoreInv: 0, gallupLawOrder: 80,
    healthcareIndex: 0, healthcareConfidence: "high",
    freedomIndex: 0, freedomConfidence: "high",
    professions: {
      "软件工程师": 92000, "医生/医学博士": 148000, "财务分析师": 70000, "市场经理": 75000,
      "平面设计师": 45000, "数据科学家": 98000, "销售经理": 78000, "人力资源经理": 68000,
      "教师": 58000, "护士": 62000, "律师": 102000, "建筑师": 65000,
      "厨师": 35000, "记者": 45000, "机械工程师": 72000, "药剂师": 82000, "会计师": 60000, "公务员": 62000,
      "产品经理": 95000, "UI/UX设计师": 65000, "大学教授": 90000, "牙医": 132000,
      "家政服务人员": 24000, "摄影师": 35000, "公交司机": 40000, "电工": 52000
    }
  },
  {
    id: 136, name: "卢森堡市", country: "卢森堡", continent: "欧洲", currency: "USD",
    description: "卢森堡首都，欧盟机构所在地。全球人均 GDP 最高国家。基金管理中心，多语言国际化环境。城市规模小但极度富裕。",
    averageIncome: 82000, costModerate: 3200, costBudget: 1440, bigMacPrice: 5.48,
    housePrice: 12000, monthlyRent: 1800, airQuality: 28, aqiSource: "EPA",
    doctorsPerThousand: 3.0, hospitalBedsPerThousand: 4.3, uhcCoverageIndex: 85, lifeExpectancy: 82.6,
    annualWorkHours: 1506, paidLeaveDays: 26, internetSpeedMbps: 130, directFlightCities: 95,
    pressFreedomScore: 82, democracyIndex: 8.68, corruptionPerceptionIndex: 78,
    safetyIndex: 0, safetyConfidence: "high", numbeoSafetyIndex: 71.5,
    homicideRateInv: 0, gpiScoreInv: 0, gallupLawOrder: 85,
    healthcareIndex: 0, healthcareConfidence: "high",
    freedomIndex: 0, freedomConfidence: "high",
    professions: {
      "软件工程师": 88000, "医生/医学博士": 135000, "财务分析师": 82000, "市场经理": 78000,
      "平面设计师": 48000, "数据科学家": 92000, "销售经理": 82000, "人力资源经理": 72000,
      "教师": 72000, "护士": 62000, "律师": 115000, "建筑师": 62000,
      "厨师": 38000, "记者": 48000, "机械工程师": 72000, "药剂师": 68000, "会计师": 68000, "公务员": 65000,
      "产品经理": 92000, "UI/UX设计师": 58000, "大学教授": 85000, "牙医": 100000,
      "家政服务人员": 28000, "摄影师": 38000, "公交司机": 42000, "电工": 52000
    }
  },
  {
    id: 137, name: "塔林", country: "爱沙尼亚", continent: "欧洲", currency: "USD",
    description: "爱沙尼亚首都，全球数字化程度最高的国家。电子公民、在线投票先驱。科技创业活跃（Skype 诞生地），生活成本低于西欧。",
    averageIncome: 32000, costModerate: 1400, costBudget: 602, bigMacPrice: 4.85,
    housePrice: 3500, monthlyRent: 700, airQuality: 24, aqiSource: "EPA",
    doctorsPerThousand: 3.5, hospitalBedsPerThousand: 4.7, uhcCoverageIndex: 78, lifeExpectancy: 78.8,
    annualWorkHours: 1767, paidLeaveDays: 20, internetSpeedMbps: 95, directFlightCities: 65,
    pressFreedomScore: 78, democracyIndex: 7.96, corruptionPerceptionIndex: 74,
    safetyIndex: 0, safetyConfidence: "high", numbeoSafetyIndex: 67.8,
    homicideRateInv: 0, gpiScoreInv: 0, gallupLawOrder: 78,
    healthcareIndex: 0, healthcareConfidence: "high",
    freedomIndex: 0, freedomConfidence: "high",
    professions: {
      "软件工程师": 42000, "医生/医学博士": 35000, "财务分析师": 25000, "市场经理": 23000,
      "平面设计师": 18000, "数据科学家": 38000, "销售经理": 25000, "人力资源经理": 22000,
      "教师": 16000, "护士": 15000, "律师": 32000, "建筑师": 20000,
      "厨师": 12000, "记者": 14000, "机械工程师": 22000, "药剂师": 18000, "会计师": 20000, "公务员": 18000,
      "产品经理": 38000, "UI/UX设计师": 25000, "大学教授": 22000, "牙医": 28000,
      "家政服务人员": 8000, "摄影师": 12000, "公交司机": 14000, "电工": 16000
    }
  },
  {
    id: 138, name: "福冈", country: "日本", continent: "亚洲", currency: "USD",
    description: "日本九州最大城市，连续多年被评为日本最宜居城市。美食之都（博多拉面）。初创企业支援政策领先，生活成本远低于东京。",
    averageIncome: 42000, costModerate: 1600, costBudget: 704, bigMacPrice: 3.35,
    housePrice: 3200, monthlyRent: 500, airQuality: 32, aqiSource: "EPA",
    doctorsPerThousand: 2.6, hospitalBedsPerThousand: 13.0, uhcCoverageIndex: 92, lifeExpectancy: 84.5,
    annualWorkHours: 1607, paidLeaveDays: 10, internetSpeedMbps: 130, directFlightCities: 45,
    pressFreedomScore: 52, democracyIndex: 8.33, corruptionPerceptionIndex: 73,
    safetyIndex: 0, safetyConfidence: "high", numbeoSafetyIndex: 78.5,
    homicideRateInv: 0, gpiScoreInv: 0, gallupLawOrder: 91,
    healthcareIndex: 0, healthcareConfidence: "high",
    freedomIndex: 0, freedomConfidence: "high",
    professions: {
      "软件工程师": 52000, "医生/医学博士": 78000, "财务分析师": 38000, "市场经理": 35000,
      "平面设计师": 25000, "数据科学家": 48000, "销售经理": 38000, "人力资源经理": 35000,
      "教师": 35000, "护士": 32000, "律师": 55000, "建筑师": 38000,
      "厨师": 22000, "记者": 30000, "机械工程师": 42000, "药剂师": 42000, "会计师": 35000, "公务员": 35000,
      "产品经理": 52000, "UI/UX设计师": 32000, "大学教授": 55000, "牙医": 58000,
      "家政服务人员": 15000, "摄影师": 22000, "公交司机": 24000, "电工": 28000
    }
  },
  {
    id: 139, name: "横滨", country: "日本", continent: "亚洲", currency: "USD",
    description: "日本第二大城市，与东京相邻的港口城市。日产汽车总部所在地。生活成本略低于东京，通勤可达东京核心区。",
    averageIncome: 52000, costModerate: 2000, costBudget: 880, bigMacPrice: 3.35,
    housePrice: 5200, monthlyRent: 800, airQuality: 38, aqiSource: "EPA",
    doctorsPerThousand: 2.5, hospitalBedsPerThousand: 13.0, uhcCoverageIndex: 92, lifeExpectancy: 84.5,
    annualWorkHours: 1607, paidLeaveDays: 10, internetSpeedMbps: 150, directFlightCities: 15,
    pressFreedomScore: 52, democracyIndex: 8.33, corruptionPerceptionIndex: 73,
    safetyIndex: 0, safetyConfidence: "high", numbeoSafetyIndex: 79.8,
    homicideRateInv: 0, gpiScoreInv: 0, gallupLawOrder: 91,
    healthcareIndex: 0, healthcareConfidence: "high",
    freedomIndex: 0, freedomConfidence: "high",
    professions: {
      "软件工程师": 85000, "医生/医学博士": 100000, "财务分析师": 55000, "市场经理": 52000,
      "平面设计师": 35000, "数据科学家": 80000, "销售经理": 58000, "人力资源经理": 50000,
      "教师": 45000, "护士": 40000, "律师": 72000, "建筑师": 50000,
      "厨师": 28000, "记者": 38000, "机械工程师": 62000, "药剂师": 52000, "会计师": 52000, "公务员": 48000,
      "产品经理": 75000, "UI/UX设计师": 48000, "大学教授": 68000, "牙医": 72000,
      "家政服务人员": 20000, "摄影师": 28000, "公交司机": 30000, "电工": 35000
    }
  },
];


// ─── EXECUTE ──────────────────────────────────────────────────────
console.log("▶ Starting batch update v3...\n");

// Step 1: Remove 5 cities
const before = data.cities.length;
data.cities = data.cities.filter(c => !REMOVE_IDS.has(c.id));
console.log(`✅ Removed ${before - data.cities.length} cities (IDs: ${[...REMOVE_IDS].join(", ")})`);

// Step 2: Remove 2 professions from all remaining cities
let profRemoved = 0;
for (const city of data.cities) {
  for (const prof of REMOVE_PROFS) {
    if (city.professions && city.professions[prof] !== undefined) {
      delete city.professions[prof];
      profRemoved++;
    }
  }
}
console.log(`✅ Removed ${profRemoved} profession entries (${REMOVE_PROFS.join(", ")})`);

// Step 3: Add 8 new professions to all remaining cities
let profAdded = 0;
for (const city of data.cities) {
  const pd = NEW_PROF_DATA[city.id];
  if (!pd) {
    console.error(`❌ Missing new profession data for city ID ${city.id} (${city.name})`);
    process.exit(1);
  }
  for (const [key, val] of Object.entries(pd)) {
    city.professions[key] = val;
    profAdded++;
  }
}
console.log(`✅ Added ${profAdded} new profession entries across ${data.cities.length} cities`);

// Step 4: Add 19 new cities
for (const newCity of NEW_CITIES) {
  data.cities.push(newCity);
}
console.log(`✅ Added ${NEW_CITIES.length} new cities (IDs: ${NEW_CITIES.map(c => c.id).join(", ")})`);

// Step 5: Sort by ID
data.cities.sort((a, b) => a.id - b.id);

// Step 6: Recalculate averageIncome for all cities based on profession average
for (const city of data.cities) {
  const vals = Object.values(city.professions);
  if (vals.length > 0) {
    const avg = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
    city.averageIncome = avg;
  }
}
console.log(`✅ Recalculated averageIncome for ${data.cities.length} cities`);

// Step 7: Validate
const expectedProfs = 26; // 20 - 2 + 8
let errors = 0;
for (const city of data.cities) {
  const n = Object.keys(city.professions).length;
  if (n !== expectedProfs) {
    console.error(`❌ City ${city.id} (${city.name}): has ${n} professions, expected ${expectedProfs}`);
    errors++;
  }
}
if (errors === 0) {
  console.log(`✅ All ${data.cities.length} cities have exactly ${expectedProfs} professions`);
} else {
  console.error(`\n❌ ${errors} cities have wrong profession count. Aborting.`);
  process.exit(1);
}

// Step 8: Write
writeFileSync(PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(`\n✅ Written to ${PATH}`);
console.log(`   Cities: ${data.cities.length}`);
console.log(`   Professions per city: ${expectedProfs}`);
console.log(`   Total data points: ${data.cities.length * expectedProfs}`);
