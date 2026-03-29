const fs = require('fs');

const cities = JSON.parse(fs.readFileSync('public/data/cities.json', 'utf8'));
const professions = JSON.parse(fs.readFileSync('public/data/professions.json', 'utf8'));

// 创建职业列表
const allProfessions = professions.professions.map(p => p.nameZH);

console.log('▶ 检查数据完整性...\n');

// 检查城市数据
console.log('📊 城市数据检查:');
console.log('═'.repeat(80));

let missingCities = [];
let missingProfessions = [];
let incompleteCities = [];

cities.cities.forEach((city, idx) => {
  const issues = [];
  
  // 必填字段检查
  if (!city.name) issues.push('name');
  if (!city.country) issues.push('country');
  if (!city.continent) issues.push('continent');
  if (!city.averageIncome) issues.push('averageIncome');
  if (!city.costOfLiving) issues.push('costOfLiving');
  if (city.bigMacPrice === undefined || city.bigMacPrice === null) issues.push('bigMacPrice');
  if (!city.yearlySavings && city.yearlySavings !== 0) issues.push('yearlySavings');
  if (!city.description) issues.push('description');
  
  // 职业数据检查
  const profCount = city.professions ? Object.keys(city.professions).length : 0;
  const missingProfs = allProfessions.filter(p => !city.professions || !city.professions[p]);
  
  if (issues.length > 0) {
    incompleteCities.push({ 
      name: city.name, 
      missingFields: issues,
      idx: idx + 1
    });
  }
  
  if (missingProfs.length > 0) {
    missingProfessions.push({
      name: city.name,
      missingProfs: missingProfs,
      idx: idx + 1,
      hasCount: profCount
    });
  }
});

// 显示结果
if (incompleteCities.length > 0) {
  console.log('\n红旗: 缺少基本字段的城市:');
  incompleteCities.forEach(city => {
    console.log(`  #${city.idx} ${city.name}: 缺少 ${city.missingFields.join(', ')}`);
  });
} else {
  console.log('✅ 所有城市都有基本字段');
}

if (missingProfessions.length > 0) {
  console.log(`\n红旗: ${missingProfessions.length} 个城市缺少职业薪资数据:`);
  missingProfessions.forEach(city => {
    console.log(`  #${city.idx} ${city.name} (${city.hasCount}/10): 缺少 ${city.missingProfs.slice(0, 3).join(', ')}${city.missingProfs.length > 3 ? '...' : ''}`);
  });
} else {
  console.log('✅ 所有城市都有完整的10种职业数据');
}

// 汇总统计
console.log('\n📈 数据统计:');
console.log(`  总城市数: ${cities.cities.length}`);
console.log(`  有大洲信息: ${cities.cities.filter(c => c.continent).length}/${cities.cities.length}`);
console.log(`  有完整职业数据: ${cities.cities.filter(c => c.professions && Object.keys(c.professions).length === 10).length}/${cities.cities.length}`);
console.log(`  有描述: ${cities.cities.filter(c => c.description && c.description.length > 0).length}/${cities.cities.length}`);
