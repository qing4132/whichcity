const fs = require('fs');

const cities = JSON.parse(fs.readFileSync('public/data/cities.json', 'utf8'));

// 查找所有标记为"其他"的城市
console.log('🔍 查找标记为"其他"的城市:\n');
const otherCities = cities.cities.filter(c => c.continent === '其他');

console.log(`发现 ${otherCities.length} 个城市:\n`);
otherCities.forEach((city, i) => {
  console.log(`${i + 1}. ${city.name} (${city.country})`);
});

// 查找重复的城市名
console.log('\n\n🔍 检查重复城市名:\n');
const cityNames = cities.cities.map(c => c.name);
const duplicates = {};
cityNames.forEach((name, idx) => {
  if (!duplicates[name]) {
    duplicates[name] = [];
  }
  duplicates[name].push(idx);
});

const duplicateNames = Object.entries(duplicates).filter(([name, indices]) => indices.length > 1);
console.log(`发现 ${duplicateNames.length} 个重复的城市:\n`);
duplicateNames.forEach(([name, indices]) => {
  console.log(`${name}:`);
  indices.forEach(idx => {
    const city = cities.cities[idx];
    console.log(`  - 位置 ${idx + 1}: ${city.country}`);
  });
});
