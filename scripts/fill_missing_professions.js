const fs = require('fs');

const cities = JSON.parse(fs.readFileSync('public/data/cities.json', 'utf8'));
const professions = JSON.parse(fs.readFileSync('public/data/professions.json', 'utf8'));

// 有职业数据的原始城市（前10个）
const baseCities = ['纽约', '伦敦', '东京', '北京', '上海', '新加坡', '苏黎世', '悉尼', '多伦多', '迪拜'];
const professionNames = professions.professions.map(p => p.nameZH);

// 创建基础城市的职业薪资表
const baseProfessionData = {};
baseCities.forEach(cityName => {
  const cityData = cities.cities.find(c => c.name === cityName);
  if (cityData && cityData.professions) {
    baseProfessionData[cityName] = cityData.professions;
  }
});

// 创建职业到城市的映射，用于查找趋势
const professionByCity = {};
professionNames.forEach(profName => {
  professionByCity[profName] = {};
  baseCities.forEach(cityName => {
    if (baseProfessionData[cityName] && baseProfessionData[cityName][profName]) {
      professionByCity[profName][cityName] = baseProfessionData[cityName][profName];
    }
  });
});

// 为缺失职业的城市估算薪资
// 策略：使用该城市的平均收入与基础城市的职业薪资比例
cities.cities.forEach(city => {
  if (!city.professions || Object.keys(city.professions).length === 0) {
    city.professions = {};
  }
  
  // 对于没有的职业，需要进行估算
  const missingProfs = professionNames.filter(p => !city.professions[p]);
  
  if (missingProfs.length > 0) {
    missingProfs.forEach(profName => {
      // 获取该职业在基础城市中的薪资范围
      const profSalaries = [];
      baseCities.forEach(baseCityName => {
        if (baseProfessionData[baseCityName] && baseProfessionData[baseCityName][profName]) {
          profSalaries.push({
            city: baseCityName,
            salary: baseProfessionData[baseCityName][profName],
            avgIncome: cities.cities.find(c => c.name === baseCityName).averageIncome
          });
        }
      });
      
      if (profSalaries.length > 0) {
        // 计算职业薪资与平均收入的平均比例
        const ratios = profSalaries.map(s => s.salary / s.avgIncome);
        const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
        
        // 为当前城市估算该职业的薪资
        const estimatedSalary = Math.round(city.averageIncome * avgRatio);
        city.professions[profName] = estimatedSalary;
      }
    });
  }
});

// 保存更新后的数据
fs.writeFileSync('public/data/cities.json', JSON.stringify(cities, null, 2));
console.log('✅ 已为所有100个城市补全职业薪资数据');
console.log(`   基于职业薪资与城市平均收入的比例进行估算`);
console.log(`   总计填充: ${cities.cities.filter(c => c.professions && Object.keys(c.professions).length > 0).length} 个城市`);
