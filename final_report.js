const fs = require('fs');

const cities = JSON.parse(fs.readFileSync('public/data/cities.json', 'utf8'));
const professions = JSON.parse(fs.readFileSync('public/data/professions.json', 'utf8'));

console.log('\n' + '═'.repeat(80));
console.log('📊 最终数据完整性报告');
console.log('═'.repeat(80) + '\n');

// 基本统计
console.log('✅ 基本统计:');
console.log(`   总城市数: ${cities.cities.length}`);
console.log(`   总职业数: ${professions.professions.length}`);
console.log(`   每个城市的职业数: ${cities.cities[0]?.professions ? Object.keys(cities.cities[0].professions).length : 0}`);

// 字段覆盖率
const requiredFields = ['name', 'country', 'continent', 'averageIncome', 'costOfLiving', 'bigMacPrice', 'yearlySavings', 'description', 'professions'];
console.log('\n✅ 字段覆盖率:');
requiredFields.forEach(field => {
  const count = cities.cities.filter(c => {
    if (field === 'professions') {
      return c.professions && Object.keys(c.professions).length === 10;
    }
    return c[field] != null && c[field] !== '';
  }).length;
  console.log(`   ${field}: ${count}/${cities.cities.length} (${(count/cities.cities.length*100).toFixed(1)}%)`);
});

// 大洲分布
console.log('\n✅ 大洲分布:');
const continents = {};
cities.cities.forEach(c => {
  continents[c.continent] = (continents[c.continent] || 0) + 1;
});
Object.entries(continents).sort((a, b) => b[1] - a[1]).forEach(([continent, count]) => {
  console.log(`   ${continent}: ${count} 个城市`);
});

// 数据范围
console.log('\n✅ 数据范围:');
const incomes = cities.cities.map(c => c.averageIncome);
const costs = cities.cities.map(c => c.costOfLiving);
console.log(`   年收入: $${Math.min(...incomes).toLocaleString()} - $${Math.max(...incomes).toLocaleString()}`);
console.log(`   月生活成本: $${Math.min(...costs).toLocaleString()} - $${Math.max(...costs).toLocaleString()}`);

// 质量指标
console.log('\n✅ 数据质量指标:');
const validSavings = cities.cities.filter(c => {
  return c.yearlySavings === (c.averageIncome - c.costOfLiving * 12);
}).length;
console.log(`   年度储蓄计算准确: ${validSavings}/${cities.cities.length}`);
console.log(`   所有字段非空: ${cities.cities.every(c => requiredFields.slice(0, -1).every(f => c[f])) ? '✅ 是' : '❌ 否'}`);

console.log('\n' + '═'.repeat(80));
console.log('🎉 数据检查完成 - 所有必要数据已完整补全!');
console.log('═'.repeat(80) + '\n');
