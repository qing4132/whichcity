#!/usr/bin/env node
/**
 * collect-bls.mjs — Collect salary data from US Bureau of Labor Statistics
 *
 * Downloads the OEWS (Occupational Employment and Wage Statistics) flat file
 * for all metro areas, then extracts median annual wages for our 24 professions
 * across 21 US metro areas.
 *
 * Data: Pre-tax annual median wage
 * Source: BLS OEWS (published annually, ~March for prior May reference period)
 * URL: https://www.bls.gov/oes/
 * License: Public domain (US government data)
 *
 * Usage: node data/salary-research/scripts/collect-bls.mjs
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../../..");
const RAW_DIR = join(__dirname, "../raw");
const MAPPINGS_DIR = join(__dirname, "../mappings");

mkdirSync(RAW_DIR, { recursive: true });

// ═══════════════════════════════════════════════════════════════
// Config
// ═══════════════════════════════════════════════════════════════

// BLS OEWS data URLs (try most recent first)
const BLS_URLS = [
  "https://www.bls.gov/oes/special-requests/oesm24ma.zip",  // May 2024
  "https://www.bls.gov/oes/special-requests/oesm23ma.zip",  // May 2023
];

// Our 24 professions → SOC codes (excluding 数字游民)
const PROFESSION_SOC = {
  "软件工程师": ["15-1252"],
  "医生/医学博士": ["29-1228", "29-1211", "29-1216", "29-1210"],
  "财务分析师": ["13-2051"],
  "市场经理": ["11-2021"],
  "平面设计师": ["27-1024"],
  "数据科学家": ["15-2051"],
  "销售经理": ["11-2022"],
  "人力资源经理": ["11-3121"],
  "教师": ["25-2031"],
  "护士": ["29-1141"],
  "律师": ["23-1011"],
  "建筑师": ["17-1011"],
  "厨师": ["35-1011"],
  "记者": ["27-3023"],
  "机械工程师": ["17-2141"],
  "药剂师": ["29-1051"],
  "会计师": ["13-2011"],
  "产品经理": ["11-2021"],  // uses Marketing Manager as proxy
  "UI/UX设计师": ["15-1255"],
  "大学教授": ["25-1099"],
  "牙医": ["29-1021"],
  "公交司机": ["53-3052"],
  "电工": ["47-2111"],
  "政府/NGO行政": ["13-1111"],
};

// City ID → MSA code
const CITY_MSA = {
  1: "35620", 11: "31080", 12: "41860", 13: "16980",
  34: "33100", 35: "47900", 36: "14460", 37: "42660",
  38: "19740", 39: "12420", 95: "12060", 96: "38060",
  97: "38900", 98: "41740", 99: "29820", 100: "45300",
  125: "26420", 126: "37980", 133: "41940", 134: "31080",
  73: "41980",
};

const CITY_NAMES = {
  1: "New York", 11: "Los Angeles", 12: "San Francisco", 13: "Chicago",
  34: "Miami", 35: "Washington DC", 36: "Boston", 37: "Seattle",
  38: "Denver", 39: "Austin", 95: "Atlanta", 96: "Phoenix",
  97: "Portland", 98: "San Diego", 99: "Las Vegas", 100: "Tampa",
  125: "Houston", 126: "Philadelphia", 133: "San Jose", 134: "Irvine (LA MSA)",
  73: "San Juan",
};

// ═══════════════════════════════════════════════════════════════
// Alternative: Use BLS website per-occupation pages (no download needed)
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch salary data from individual BLS occupation pages.
 * Each page lists wages by metro area.
 * URL pattern: https://www.bls.gov/oes/current/oes{code}.htm
 * where code = SOC without dash, e.g., 151252 for 15-1252
 */
async function fetchFromBLSPages() {
  const results = {};
  const allSOCs = new Set();

  for (const [prof, codes] of Object.entries(PROFESSION_SOC)) {
    for (const code of codes) allSOCs.add(code);
  }

  console.log(`Fetching ${allSOCs.size} BLS occupation pages...\n`);

  const msaCodes = new Set(Object.values(CITY_MSA));
  const socData = {}; // soc → msa → {annual_median, hourly_median, employment}

  for (const soc of allSOCs) {
    const urlCode = soc.replace("-", "");
    const url = `https://www.bls.gov/oes/current/oes${urlCode}.htm`;

    console.log(`  Fetching SOC ${soc}: ${url}`);
    try {
      const resp = await fetch(url, {
        headers: { "User-Agent": "WhichCity-Research/1.0 (academic research)" },
      });
      if (!resp.ok) {
        console.log(`    ✗ HTTP ${resp.status}`);
        continue;
      }
      const html = await resp.text();

      // Parse: look for metro area table rows
      // Format varies but generally has MSA code in links and wage data in table cells
      socData[soc] = {};

      // Extract data using regex on the HTML table
      // The metro area table has rows like: <a href="...">New York-Newark-Jersey City</a> ... median wage
      // Let's parse more carefully
      
      // Find lines with MSA wage data — they contain MSA codes in links
      for (const msa of msaCodes) {
        // Look for the MSA code or area name in the page
        const msaPattern = new RegExp(
          `oes_${msa}\\.htm[^>]*>([^<]+)<\\/a>.*?`,
          "i"
        );
        
        // Alternative: find wage data rows — BLS pages have consistent table format
        // The "Metropolitan and nonmetropolitan area" section has rows with:
        // Area name | Employment | Mean hourly | Mean annual | Median hourly | Median annual
        // Let's find rows containing our MSA via area link patterns
        const rowPattern = new RegExp(
          `oes_${msa}[^"]*"[^>]*>([^<]+)<\\/a>` +
          `(?:<\\/td>\\s*<td[^>]*>\\s*)?` +
          `[\\s\\S]*?` +
          `(?:(?:class="datavalue"|align="right")[^>]*>\\s*\\$?([\\d,\\.]+|\\*+)\\s*<)` +
          `[\\s\\S]*?` +
          `(?:(?:class="datavalue"|align="right")[^>]*>\\s*\\$?([\\d,\\.]+|\\*+)\\s*<)` +
          `[\\s\\S]*?` +
          `(?:(?:class="datavalue"|align="right")[^>]*>\\s*\\$?([\\d,\\.]+|\\*+)\\s*<)` +
          `[\\s\\S]*?` +
          `(?:(?:class="datavalue"|align="right")[^>]*>\\s*\\$?([\\d,\\.]+|\\*+)\\s*<)` +
          `[\\s\\S]*?` +
          `(?:(?:class="datavalue"|align="right")[^>]*>\\s*\\$?([\\d,\\.]+|\\*+)\\s*<)`,
          "i"
        );
        // This regex is too fragile. Let me use a simpler line-by-line approach.
      }

      // Simpler approach: just extract ALL numbers near MSA references
      // Actually, the cleanest way is to find the wage data table and parse it
      
      // BLS pages have a table with id="table2" or similar for metro data
      // Let's extract all <tr> rows containing our MSA codes
      
      for (const msa of msaCodes) {
        // Find the section containing this MSA
        const idx = html.indexOf(`oes_${msa}`);
        if (idx === -1) continue;
        
        // Extract the surrounding table row (find the enclosing <tr>...</tr>)
        const trStart = html.lastIndexOf("<tr", idx);
        const trEnd = html.indexOf("</tr>", idx);
        if (trStart === -1 || trEnd === -1) continue;
        
        const rowHtml = html.slice(trStart, trEnd + 5);
        
        // Extract all numbers from <td> cells
        const cellValues = [];
        const cellPattern = /<td[^>]*>\s*\$?([\d,]+(?:\.\d+)?|\*+)\s*<\/td>/gi;
        let cellMatch;
        while ((cellMatch = cellPattern.exec(rowHtml)) !== null) {
          const val = cellMatch[1].replace(/,/g, "");
          cellValues.push(val === "***" || val.includes("*") ? null : parseFloat(val));
        }
        
        // BLS OEWS metro table columns (typical order):
        // Employment | Employment RSE | Mean hourly | Mean annual | Annual mean RSE | 10th pct | 25th pct | Median | 75th pct | 90th pct
        // The median annual is typically the 8th numeric column (index 7)
        // But let's be smarter: the median is between 25th and 75th percentile
        
        if (cellValues.length >= 6) {
          // Find the largest number that looks like an annual wage (> 10000)
          const annualValues = cellValues.filter(v => v !== null && v > 10000);
          
          // The mean annual and median annual are both large numbers
          // Let's just store all values and figure out the layout
          socData[soc][msa] = {
            rawCells: cellValues,
            cellCount: cellValues.length,
          };
        }
      }

      // Small delay to be respectful
      await new Promise(r => setTimeout(r, 500));
      
    } catch (err) {
      console.log(`    ✗ Error: ${err.message}`);
    }
  }

  return socData;
}

/**
 * Alternative approach: Use BLS API (public, no key needed for small requests)
 * Series ID format for OEWS: OEUM{area_code}{occupation}{data_type}
 * area_code: 7-digit area code (MSA padded to 7)
 * occupation: 6-digit SOC with dash replaced
 * data_type: 04 = annual median wage
 *
 * But this format might not be correct for the current BLS API.
 * Let me try the flat file approach instead.
 */

/**
 * Approach 3: Fetch the OEWS Excel flat file and parse it
 */
async function fetchBLSFlatFile() {
  const cacheFile = join(RAW_DIR, "bls-oews-raw.xlsx");
  const csvCache = join(RAW_DIR, "bls-oews-metro.csv");
  
  // Try to download if not cached
  if (!existsSync(csvCache)) {
    for (const url of BLS_URLS) {
      console.log(`Trying to download: ${url}`);
      try {
        const zipFile = join(RAW_DIR, "oews-temp.zip");
        execSync(`curl -sL -o "${zipFile}" "${url}"`, { timeout: 60000 });
        
        // Check if download succeeded (file should be > 1MB)
        const stats = execSync(`ls -la "${zipFile}"`).toString();
        const size = parseInt(stats.split(/\s+/)[4]);
        if (size < 100000) {
          console.log(`  File too small (${size} bytes), trying next URL...`);
          continue;
        }
        
        console.log(`  Downloaded ${(size/1024/1024).toFixed(1)} MB`);
        
        // Unzip
        execSync(`cd "${RAW_DIR}" && unzip -o "${zipFile}" 2>/dev/null || true`);
        
        // Find the CSV/Excel file
        const files = execSync(`ls "${RAW_DIR}"/oesm* 2>/dev/null || true`).toString().trim();
        if (files) {
          console.log(`  Extracted: ${files.split("\n").join(", ")}`);
        }
        
        // Clean up
        execSync(`rm -f "${zipFile}"`);
        break;
      } catch (err) {
        console.log(`  ✗ Failed: ${err.message}`);
      }
    }
  }
  
  return existsSync(csvCache) || existsSync(join(RAW_DIR, "oesm24ma"));
}

// ═══════════════════════════════════════════════════════════════
// Main: Try the BLS public data API approach
// ═══════════════════════════════════════════════════════════════

/**
 * Use the BLS API v2 to get OEWS data
 * Endpoint: https://api.bls.gov/publicAPI/v2/timeseries/data/
 * 
 * OEWS series IDs: OEUM{area}{industry}{occupation}{datatype}
 * area: 7 digits (MSA code, 0-padded)
 * industry: 6 digits (000000 = all industries) 
 * occupation: 6 digits (SOC without dash)
 * datatype: 02 = hourly mean, 03 = annual mean, 04 = hourly median, 
 *           13 = annual median
 * 
 * But wait — OEWS series ID format might be different. Let me try:
 * https://api.bls.gov/publicAPI/v2/timeseries/data/OEUM0035620000000015125200000013
 */
async function fetchFromBLSApi() {
  const msaCodes = Object.entries(CITY_MSA);
  const results = {};
  
  // Build series IDs for all city × profession combinations
  const allSeries = [];
  
  for (const [cityId, msa] of msaCodes) {
    const paddedMsa = msa.padStart(7, "0");
    for (const [prof, socCodes] of Object.entries(PROFESSION_SOC)) {
      const soc = socCodes[0]; // Use primary SOC code
      const socClean = soc.replace("-", "");
      // OEWS series: OEUM + area(7) + industry(6, 000000=all) + occ(6) + datatype(2)
      const seriesId = `OEUM${paddedMsa}000000${socClean}00000013`; // 13 = annual median
      allSeries.push({ seriesId, cityId, prof, soc, msa });
    }
  }
  
  console.log(`Total series to request: ${allSeries.length}`);
  console.log(`Batching into groups of 50 (BLS API limit)...\n`);
  
  // BLS API: max 50 series per request, 25 requests/day without key
  const batchSize = 50;
  const batches = [];
  for (let i = 0; i < allSeries.length; i += batchSize) {
    batches.push(allSeries.slice(i, i + batchSize));
  }
  
  console.log(`${batches.length} batches needed (${allSeries.length} series)\n`);
  
  const allResults = [];
  
  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    const seriesIds = batch.map(s => s.seriesId);
    
    console.log(`Batch ${b + 1}/${batches.length}: ${seriesIds.length} series...`);
    
    try {
      const resp = await fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seriesid: seriesIds,
          startyear: "2023",
          endyear: "2024",
        }),
      });
      
      if (!resp.ok) {
        console.log(`  ✗ HTTP ${resp.status}`);
        continue;
      }
      
      const data = await resp.json();
      
      if (data.status !== "REQUEST_SUCCEEDED") {
        console.log(`  ✗ BLS API error: ${data.message?.[0] || data.status}`);
        // If rate limited, stop
        if (data.message?.[0]?.includes("threshold")) {
          console.log("  ⚠ Rate limit hit. Stopping API requests.");
          break;
        }
        continue;
      }
      
      // Process results
      let found = 0;
      for (const series of data.Results?.series || []) {
        const meta = batch.find(s => s.seriesId === series.seriesID);
        if (!meta) continue;
        
        // Get latest year data
        const latestData = series.data?.[0];
        if (latestData?.value && latestData.value !== "-") {
          found++;
          allResults.push({
            cityId: parseInt(meta.cityId),
            cityName: CITY_NAMES[meta.cityId],
            profession: meta.prof,
            soc: meta.soc,
            msa: meta.msa,
            annualMedian: parseFloat(latestData.value),
            year: latestData.year,
            period: latestData.period,
            seriesId: series.seriesID,
          });
        }
      }
      
      console.log(`  ✓ ${found}/${batch.length} series returned data`);
      
      // Respect rate limit
      await new Promise(r => setTimeout(r, 1000));
      
    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
    }
  }
  
  return allResults;
}

// ═══════════════════════════════════════════════════════════════
// Main execution
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log("═══ BLS OEWS Salary Data Collection ═══\n");
  
  // Try API approach first (most structured)
  console.log("Phase 1: Trying BLS API...\n");
  const apiResults = await fetchFromBLSApi();
  
  if (apiResults.length > 0) {
    // Save raw results
    const outputFile = join(RAW_DIR, "bls-oews-api-results.json");
    const output = {
      source: "US Bureau of Labor Statistics — OEWS",
      url: "https://www.bls.gov/oes/",
      collectedAt: new Date().toISOString(),
      method: "BLS Public API v2",
      dataType: "Pre-tax annual median wage (USD)",
      totalResults: apiResults.length,
      data: apiResults,
    };
    writeFileSync(outputFile, JSON.stringify(output, null, 2) + "\n");
    console.log(`\n✅ Saved ${apiResults.length} results → ${outputFile}`);
  } else {
    console.log("\nBLS API returned no data. Trying flat file download...\n");
    
    // Try flat file approach
    console.log("Phase 2: Trying BLS flat file download...\n");
    await fetchBLSFlatFile();
  }
  
  // Summary
  console.log("\n═══ Summary ═══");
  const cities = new Set(apiResults.map(r => r.cityId));
  const profs = new Set(apiResults.map(r => r.profession));
  console.log(`Cities with data: ${cities.size}`);
  console.log(`Professions with data: ${profs.size}`);
  console.log(`Total data points: ${apiResults.length}`);
  
  // Show coverage matrix
  console.log("\nCoverage matrix (✓ = has data):");
  const cityList = Object.entries(CITY_NAMES).map(([id, name]) => ({ id: parseInt(id), name }));
  const profList = Object.keys(PROFESSION_SOC);
  
  let missing = 0;
  for (const city of cityList) {
    const cityData = apiResults.filter(r => r.cityId === city.id);
    const found = cityData.length;
    missing += profList.length - found;
    if (found < profList.length) {
      const missingProfs = profList.filter(p => !cityData.find(d => d.profession === p));
      console.log(`  ${city.name}: ${found}/${profList.length} (missing: ${missingProfs.join(", ")})`);
    } else {
      console.log(`  ${city.name}: ${found}/${profList.length} ✓`);
    }
  }
  console.log(`\nTotal missing: ${missing}`);
}

main().catch(console.error);
