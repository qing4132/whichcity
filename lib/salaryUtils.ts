// 职业薪资数据处理工具
// Salary Data Utilities

export interface SalaryData {
  [city: string]: {
    [profession: string]: number;
  };
}

export interface ProfessionData {
  [profession: string]: {
    [city: string]: number;
  };
}

// 原始薪资数据 (年薪，单位：美元)
export const salaryDatabase: SalaryData = {
  '纽约': {
    '软件工程师': 185000,
    '医生': 245000,
    '财务分析师': 125000,
    '市场经理': 125000,
    '项目经理': 130000,
    '平面设计师': 65000,
    '数据科学家': 175000,
    '业务分析师': 115000,
    '销售经理': 135000,
    '人力资源经理': 115000,
  },
  '伦敦': {
    '软件工程师': 125000,
    '医生': 85000,
    '财务分析师': 75000,
    '市场经理': 68000,
    '项目经理': 72000,
    '平面设计师': 42000,
    '数据科学家': 110000,
    '业务分析师': 62000,
    '销售经理': 72000,
    '人力资源经理': 58000,
  },
  '东京': {
    '软件工程师': 98000,
    '医生': 110000,
    '财务分析师': 75000,
    '市场经理': 62000,
    '项目经理': 78000,
    '平面设计师': 38000,
    '数据科学家': 105000,
    '业务分析师': 68000,
    '销售经理': 82000,
    '人力资源经理': 62000,
  },
  '北京': {
    '软件工程师': 78000,
    '医生': 72000,
    '财务分析师': 58000,
    '市场经理': 48000,
    '项目经理': 58000,
    '平面设计师': 32000,
    '数据科学家': 88000,
    '业务分析师': 48000,
    '销售经理': 55000,
    '人力资源经理': 45000,
  },
  '上海': {
    '软件工程师': 95000,
    '医生': 88000,
    '财务分析师': 72000,
    '市场经理': 62000,
    '项目经理': 75000,
    '平面设计师': 42000,
    '数据科学家': 105000,
    '业务分析师': 62000,
    '销售经理': 72000,
    '人力资源经理': 58000,
  },
  '新加坡': {
    '软件工程师': 165000,
    '医生': 195000,
    '财务分析师': 115000,
    '市场经理': 105000,
    '项目经理': 120000,
    '平面设计师': 58000,
    '数据科学家': 155000,
    '业务分析师': 105000,
    '销售经理': 125000,
    '人力资源经理': 98000,
  },
  '苏黎世': {
    '软件工程师': 195000,
    '医生': 280000,
    '财务分析师': 140000,
    '市场经理': 125000,
    '项目经理': 150000,
    '平面设计师': 75000,
    '数据科学家': 180000,
    '业务分析师': 130000,
    '销售经理': 145000,
    '人力资源经理': 120000,
  },
  '悉尼': {
    '软件工程师': 145000,
    '医生': 175000,
    '财务分析师': 95000,
    '市场经理': 95000,
    '项目经理': 110000,
    '平面设计师': 62000,
    '数据科学家': 135000,
    '业务分析师': 95000,
    '销售经理': 115000,
    '人力资源经理': 85000,
  },
  '多伦多': {
    '软件工程师': 135000,
    '医生': 155000,
    '财务分析师': 85000,
    '市场经理': 85000,
    '项目经理': 95000,
    '平面设计师': 55000,
    '数据科学家': 125000,
    '业务分析师': 82000,
    '销售经理': 105000,
    '人力资源经理': 75000,
  },
  '迪拜': {
    '软件工程师': 155000,
    '医生': 205000,
    '财务分析师': 105000,
    '市场经理': 95000,
    '项目经理': 115000,
    '平面设计师': 52000,
    '数据科学家': 145000,
    '业务分析师': 98000,
    '销售经理': 125000,
    '人力资源经理': 88000,
  },
};

// 城市列表
export const cities = [
  '纽约',
  '伦敦',
  '东京',
  '北京',
  '上海',
  '新加坡',
  '苏黎世',
  '悉尼',
  '多伦多',
  '迪拜',
];

// 职业列表
export const professions = [
  '软件工程师',
  '医生',
  '财务分析师',
  '市场经理',
  '项目经理',
  '平面设计师',
  '数据科学家',
  '业务分析师',
  '销售经理',
  '人力资源经理',
];

// 英文职业名称映射
export const professionMap: { [key: string]: string } = {
  '软件工程师': 'Software Engineer',
  '医生': 'Doctor/Physician',
  '财务分析师': 'Financial Analyst',
  '市场经理': 'Marketing Manager',
  '项目经理': 'Project Manager',
  '平面设计师': 'Graphic Designer',
  '数据科学家': 'Data Scientist',
  '业务分析师': 'Business Analyst',
  '销售经理': 'Sales Manager',
  '人力资源经理': 'Human Resources Manager',
};

/**
 * 获取指定城市和职业的薪资
 * @param city - 城市名称
 * @param profession - 职业名称
 * @returns 年薪（美元）
 */
export function getSalary(city: string, profession: string): number | null {
  return salaryDatabase[city]?.[profession] ?? null;
}

/**
 * 获取指定城市的所有职业薪资
 * @param city - 城市名称
 * @returns 职业-薪资映射对象
 */
export function getCitySalaries(city: string): { [profession: string]: number } | null {
  return salaryDatabase[city] ?? null;
}

/**
 * 获取指定职业在所有城市的薪资
 * @param profession - 职业名称
 * @returns 城市-薪资映射对象
 */
export function getProfessionSalaries(profession: string): { [city: string]: number } {
  const result: { [city: string]: number } = {};
  cities.forEach((city) => {
    const salary = getSalary(city, profession);
    if (salary !== null) {
      result[city] = salary;
    }
  });
  return result;
}

/**
 * 计算城市平均薪资
 * @param city - 城市名称
 * @returns 平均年薪
 */
export function getAverageSalaryByCity(city: string): number | null {
  const salaries = getCitySalaries(city);
  if (!salaries) return null;
  const values = Object.values(salaries);
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * 计算职业平均薪资
 * @param profession - 职业名称
 * @returns 平均年薪
 */
export function getAverageSalaryByProfession(profession: string): number | null {
  const salaries = getProfessionSalaries(profession);
  const values = Object.values(salaries);
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * 获取最高薪资的城市（对于指定职业）
 * @param profession - 职业名称
 * @returns { city: 城市名, salary: 薪资 }
 */
export function getHighestSalaryCity(profession: string): { city: string; salary: number } | null {
  const salaries = getProfessionSalaries(profession);
  const entries = Object.entries(salaries);
  if (entries.length === 0) return null;
  const [city, salary] = entries.reduce((max, current) =>
    current[1] > max[1] ? current : max
  );
  return { city, salary };
}

/**
 * 获取最低薪资的城市（对于指定职业）
 * @param profession - 职业名称
 * @returns { city: 城市名, salary: 薪资 }
 */
export function getLowestSalaryCity(profession: string): { city: string; salary: number } | null {
  const salaries = getProfessionSalaries(profession);
  const entries = Object.entries(salaries);
  if (entries.length === 0) return null;
  const [city, salary] = entries.reduce((min, current) =>
    current[1] < min[1] ? current : min
  );
  return { city, salary };
}

/**
 * 比较两个城市的薪资差异
 * @param city1 - 城市1
 * @param city2 - 城市2
 * @returns 比较结果
 */
export function compareCities(city1: string, city2: string): {
  city1: string;
  city2: string;
  city1Average: number | null;
  city2Average: number | null;
  difference: number;
  percentDifference: string;
} {
  const avg1 = getAverageSalaryByCity(city1);
  const avg2 = getAverageSalaryByCity(city2);

  if (avg1 === null || avg2 === null) {
    return {
      city1,
      city2,
      city1Average: avg1,
      city2Average: avg2,
      difference: 0,
      percentDifference: 'N/A',
    };
  }

  const difference = avg1 - avg2;
  const percentDifference = ((difference / avg2) * 100).toFixed(2);

  return {
    city1,
    city2,
    city1Average: avg1,
    city2Average: avg2,
    difference,
    percentDifference: `${percentDifference}%`,
  };
}

/**
 * 格式化薪资为货币字符串
 * @param salary - 薪资金额
 * @returns 格式化后的字符串
 */
export function formatSalary(salary: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(salary);
}

/**
 * 获取排序后的城市列表（按平均薪资从高到低）
 * @returns 城市列表
 */
export function getSortedCitiesByAverage(): Array<{ city: string; salary: number | null }> {
  return cities
    .map((city) => ({
      city,
      salary: getAverageSalaryByCity(city),
    }))
    .sort((a, b) => (b.salary ?? 0) - (a.salary ?? 0));
}

/**
 * 获取排序后的职业列表（按平均薪资从高到低）
 * @returns 职业列表
 */
export function getSortedProfessionsByAverage(): Array<{ profession: string; salary: number | null }> {
  return professions
    .map((profession) => ({
      profession,
      salary: getAverageSalaryByProfession(profession),
    }))
    .sort((a, b) => (b.salary ?? 0) - (a.salary ?? 0));
}

/**
 * 导出为JSON格式
 * @returns JSON字符串
 */
export function exportAsJSON(): string {
  return JSON.stringify(salaryDatabase, null, 2);
}

/**
 * 导出为CSV格式
 * @returns CSV字符串
 */
export function exportAsCSV(): string {
  // 创建表头
  const headers = ['City', ...professions].join(',');

  // 创建数据行
  const rows = cities.map((city) => {
    const salaries = getCitySalaries(city);
    const values = [city];
    professions.forEach((profession) => {
      values.push(String(salaries?.[profession] ?? 'N/A'));
    });
    return values.join(',');
  });

  return [headers, ...rows].join('\n');
}
