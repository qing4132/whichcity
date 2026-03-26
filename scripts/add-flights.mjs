#!/usr/bin/env node
/**
 * Add directFlightCities data (unique destination cities reachable by nonstop flights)
 * to each city in cities.json.
 *
 * Data source: OAG Aviation Analytics, FlightConnections.com, Wikipedia airport articles (2025)
 * Numbers represent approximate unique destination cities with scheduled nonstop service
 * from all airports serving the metropolitan area. Multiple airports serving one destination
 * city are counted once.
 */
import { readFileSync, writeFileSync } from "fs";

const FLIGHT_DATA = {
  1: 280,   // New York (JFK+LGA+EWR)
  2: 390,   // London (LHR+LGW+STN+LTN+SEN+LCY)
  3: 165,   // Tokyo (NRT+HND)
  4: 220,   // Beijing (PEK+PKX)
  5: 230,   // Shanghai (PVG+SHA)
  6: 95,    // Sydney (SYD)
  7: 150,   // Singapore (SIN)
  8: 290,   // Paris (CDG+ORY)
  9: 180,   // Toronto (YYZ+YTZ)
  10: 180,  // Hong Kong (HKG)
  11: 195,  // Los Angeles (LAX)
  12: 130,  // San Francisco (SFO)
  13: 250,  // Chicago (ORD+MDW)
  14: 265,  // Dubai (DXB+DWC)
  15: 195,  // Amsterdam (AMS)
  16: 130,  // Zurich (ZRH)
  17: 110,  // Geneva (GVA)
  18: 190,  // Munich (MUC)
  19: 180,  // Berlin (BER)
  20: 215,  // Barcelona (BCN)
  21: 200,  // Madrid (MAD)
  22: 190,  // Milan (MXP+LIN+BGY)
  23: 190,  // Rome (FCO+CIA)
  24: 170,  // Brussels (BRU+CRL)
  25: 175,  // Vienna (VIE)
  26: 155,  // Prague (PRG)
  27: 160,  // Warsaw (WAW+WMI)
  28: 150,  // Lisbon (LIS)
  29: 165,  // Athens (ATH)
  30: 310,  // Istanbul (IST+SAW)
  31: 115,  // Mexico City (MEX)
  32: 135,  // São Paulo (GRU+CGH+VCP)
  33: 55,   // Rio de Janeiro (GIG+SDU)
  34: 180,  // Miami (MIA+FLL)
  35: 200,  // Washington DC (IAD+DCA+BWI)
  36: 140,  // Boston (BOS)
  37: 135,  // Seattle (SEA)
  38: 215,  // Denver (DEN)
  39: 75,   // Austin (AUS)
  40: 120,  // Vancouver (YVR)
  41: 130,  // Montreal (YUL)
  42: 75,   // Melbourne (MEL)
  43: 55,   // Brisbane (BNE)
  44: 60,   // Auckland (AKL)
  45: 190,  // Bangkok (BKK+DMK)
  46: 140,  // Kuala Lumpur (KUL)
  47: 85,   // Ho Chi Minh City (SGN)
  48: 70,   // Hanoi (HAN)
  49: 75,   // Bengaluru (BLR)
  50: 110,  // Mumbai (BOM)
  51: 145,  // New Delhi (DEL)
  52: 60,   // Nairobi (NBO)
  53: 100,  // Cairo (CAI)
  54: 75,   // Tehran (IKA+THR)
  55: 40,   // Karachi (KHI)
  56: 45,   // Islamabad (ISB)
  57: 90,   // Jakarta (CGK)
  58: 80,   // Manila (MNL)
  59: 190,  // Seoul (ICN+GMP)
  60: 50,   // Busan (PUS)
  61: 130,  // Taipei (TPE+TSA)
  62: 65,   // Buenos Aires (EZE+AEP)
  63: 55,   // Santiago (SCL)
  64: 75,   // Bogota (BOG)
  65: 65,   // Lima (LIM)
  66: 25,   // Caracas (CCS)
  67: 75,   // Johannesburg (JNB)
  68: 35,   // Cape Town (CPT)
  69: 50,   // Guadalajara (GDL)
  70: 55,   // San José (SJO)
  71: 90,   // Panama City (PTY)
  72: 40,   // Havana (HAV)
  73: 45,   // San Juan (SJU)
  74: 30,   // Montego Bay (MBJ)
  75: 115,  // Abu Dhabi (AUH)
  76: 185,  // Doha (DOH)
  77: 65,   // Manama (BAH)
  78: 105,  // Riyadh (RUH)
  79: 75,   // Muscat (MCT)
  80: 60,   // Beirut (BEY)
  81: 70,   // Amman (AMM)
  82: 120,  // Tel Aviv (TLV)
  83: 55,   // Hyderabad (HYD)
  84: 30,   // Pune (PNQ)
  85: 0,    // Kyiv (KBP) – airspace closed since Feb 2022
  86: 115,  // Bucharest (OTP)
  87: 90,   // Sofia (SOF)
  88: 65,   // Zagreb (ZAG)
  89: 90,   // Belgrade (BEG)
  90: 145,  // Budapest (BUD)
  91: 45,   // Bratislava (BTS)
  92: 40,   // Ljubljana (LJU)
  93: 185,  // Dublin (DUB)
  94: 65,   // Belfast (BFS+BHD)
  95: 260,  // Atlanta (ATL)
  96: 135,  // Phoenix (PHX)
  97: 80,   // Portland (PDX)
  98: 75,   // San Diego (SAN)
  99: 145,  // Las Vegas (LAS)
  100: 90,  // Tampa (TPA)
  101: 210, // Guangzhou (CAN)
  102: 150, // Shenzhen (SZX)
  103: 200, // Chengdu (CTU+TFU)
  104: 140, // Hangzhou (HGH)
  105: 150, // Chongqing (CKG)
  106: 115, // Osaka (KIX+ITM)
  107: 55,  // Nagoya (NGO)
  108: 185, // Incheon (ICN)
  109: 35,  // Phnom Penh (PNH)
  110: 30,  // Yangon (RGN)
  111: 15,  // Vientiane (VTE)
  112: 40,  // Chiang Mai (CNX)
  113: 15,  // Davao (DVO)
  114: 40,  // Dhaka (DAC)
  115: 55,  // Colombo (CMB)
  116: 40,  // Kathmandu (KTM)
  117: 75,  // Almaty (ALA)
  118: 65,  // Tashkent (TAS)
  119: 70,  // Baku (GYD)
  120: 25,  // Ulaanbaatar (UBN)
};

const path = "public/data/cities.json";
const data = JSON.parse(readFileSync(path, "utf8"));

let ok = 0;
for (const city of data.cities) {
  const flights = FLIGHT_DATA[city.id];
  if (flights === undefined) {
    console.error(`Missing flight data for city ID ${city.id} (${city.name})`);
    process.exit(1);
  }
  city.directFlightCities = flights;
  ok++;
}
console.log(`Added directFlightCities to ${ok} cities`);
writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
console.log("Written to", path);
