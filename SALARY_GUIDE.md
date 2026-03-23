# 职业薪资数据使用指南

## 概述

本项目包含10个全球主要城市（纽约、伦敦、东京、北京、上海、新加坡、苏黎世、悉尼、多伦多、迪拜）的10种职业（软件工程师、医生、财务分析师、市场经理、项目经理、平面设计师、数据科学家、业务分析师、销售经理、人力资源经理）的薪资数据。

## 文件结构

### 1. **professions.json**
JSON格式的职业薪资数据库，包含每个城市每种职业的年薪信息。

```json
{
  "professions": [
    {
      "id": 1,
      "name": "Software Engineer",
      "nameZH": "软件工程师",
      "salaries": {
        "纽约": 185000,
        "伦敦": 125000,
        ...
      }
    }
  ]
}
```

### 2. **salaries.csv**
CSV格式的薪资数据表，适合用于数据分析和导入到电子表格应用。

格式：
```
City,Software Engineer,Doctor/Physician,...
New York,185000,245000,...
London,125000,85000,...
```

### 3. **salary-summary.md**
详细的文档，包含：
- 按城市的完整薪资数据
- 按职业类别的对比表格
- 关键数据分析和排名

### 4. **salaryUtils.ts**
TypeScript工具库，提供了丰富的函数接口

## 使用方法

### 在React/Next.js组件中使用

#### 基础用法

```typescript
import { getSalary, cities, professions } from '@/lib/salaryUtils';

export default function SalaryComparison() {
  const salary = getSalary('纽约', '软件工程师');
  // 输出: 185000

  return (
    <div>
      <h2>纽约 - 软件工程师年薪</h2>
      <p>${salary?.toLocaleString()}</p>
    </div>
  );
}
```

#### 获取城市所有职业薪资

```typescript
import { getCitySalaries, formatSalary } from '@/lib/salaryUtils';

export default function CityDetail({ city }: { city: string }) {
  const salaries = getCitySalaries(city);

  return (
    <div>
      <h2>{city} - 职业薪资一览</h2>
      {salaries && Object.entries(salaries).map(([profession, salary]) => (
        <div key={profession}>
          <span>{profession}</span>
          <span>{formatSalary(salary)}</span>
        </div>
      ))}
    </div>
  );
}
```

#### 比较两个城市

```typescript
import { compareCities } from '@/lib/salaryUtils';

export default function CityComparison() {
  const comparison = compareCities('纽约', '北京');

  return (
    <div>
      <h2>城市对比</h2>
      <p>{comparison.city1}: {formatSalary(comparison.city1Average || 0)}</p>
      <p>{comparison.city2}: {formatSalary(comparison.city2Average || 0)}</p>
      <p>差异: {comparison.percentDifference}</p>
    </div>
  );
}
```

#### 获取最高和最低薪资城市

```typescript
import { getHighestSalaryCity, getLowestSalaryCity } from '@/lib/salaryUtils';

export default function ProfessionRanking({ profession }: { profession: string }) {
  const highest = getHighestSalaryCity(profession);
  const lowest = getLowestSalaryCity(profession);

  return (
    <div>
      <h2>{profession} - 薪资排名</h2>
      <p>最高: {highest?.city} - {formatSalary(highest?.salary || 0)}</p>
      <p>最低: {lowest?.city} - {formatSalary(lowest?.salary || 0)}</p>
    </div>
  );
}
```

#### 获取排序列表

```typescript
import { getSortedCitiesByAverage, getSortedProfessionsByAverage } from '@/lib/salaryUtils';

export default function Rankings() {
  const citiesByAverage = getSortedCitiesByAverage();
  const professionsByAverage = getSortedProfessionsByAverage();

  return (
    <div>
      <h2>薪资排名</h2>
      
      <h3>城市排名（按平均薪资）</h3>
      {citiesByAverage.map(({ city, salary }) => (
        <div key={city}>
          {city}: {formatSalary(salary || 0)}
        </div>
      ))}

      <h3>职业排名（按平均薪资）</h3>
      {professionsByAverage.map(({ profession, salary }) => (
        <div key={profession}>
          {profession}: {formatSalary(salary || 0)}
        </div>
      ))}
    </div>
  );
}
```

#### 导出数据

```typescript
import { exportAsJSON, exportAsCSV } from '@/lib/salaryUtils';

export default function DataExport() {
  const handleExportJSON = () => {
    const json = exportAsJSON();
    downloadFile(json, 'salaries.json', 'application/json');
  };

  const handleExportCSV = () => {
    const csv = exportAsCSV();
    downloadFile(csv, 'salaries.csv', 'text/csv');
  };

  return (
    <div>
      <button onClick={handleExportJSON}>导出为JSON</button>
      <button onClick={handleExportCSV}>导出为CSV</button>
    </div>
  );
}

function downloadFile(content: string, filename: string, type: string) {
  const element = document.createElement('a');
  element.setAttribute('href', `data:${type};charset=utf-8,${encodeURIComponent(content)}`);
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}
```

## API 参考

### 数据获取函数

| 函数名 | 参数 | 返回值 | 说明 |
|--------|------|--------|------|
| `getSalary(city, profession)` | 城市, 职业 | number \| null | 获取特定城市职业的年薪 |
| `getCitySalaries(city)` | 城市 | { [profession]: number } \| null | 获取城市所有职业薪资 |
| `getProfessionSalaries(profession)` | 职业 | { [city]: number } | 获取职业在所有城市的薪资 |
| `getAverageSalaryByCity(city)` | 城市 | number \| null | 计算城市平均薪资 |
| `getAverageSalaryByProfession(profession)` | 职业 | number \| null | 计算职业平均薪资 |
| `getHighestSalaryCity(profession)` | 职业 | { city, salary } \| null | 获取最高薪资的城市 |
| `getLowestSalaryCity(profession)` | 职业 | { city, salary } \| null | 获取最低薪资的城市 |
| `compareCities(city1, city2)` | 城市1, 城市2 | 比较对象 | 比较两个城市的薪资 |
| `formatSalary(salary)` | 薪资 | string | 格式化薪资为货币字符串 |
| `getSortedCitiesByAverage()` | - | 城市数组 | 获取按平均薪资排序的城市列表 |
| `getSortedProfessionsByAverage()` | - | 职业数组 | 获取按平均薪资排序的职业列表 |
| `exportAsJSON()` | - | string | 导出为JSON格式 |
| `exportAsCSV()` | - | string | 导出为CSV格式 |

### 数据常量

| 常量 | 说明 |
|------|------|
| `cities` | 10个城市的数组 |
| `professions` | 10种职业的数组 |
| `salaryDatabase` | 完整的薪资数据库 |
| `professionMap` | 中英文职业名称映射 |

## 代码示例

### 示例1：创建一个职业薪资对比组件

```typescript
'use client';

import { professions, getProfessionSalaries, formatSalary } from '@/lib/salaryUtils';
import { useState } from 'react';

export default function ProfessionComparison() {
  const [selectedProfession, setSelectedProfession] = useState(professions[0]);
  const salaries = getProfessionSalaries(selectedProfession);

  return (
    <div className="p-8">
      <select
        value={selectedProfession}
        onChange={(e) => setSelectedProfession(e.target.value)}
      >
        {professions.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      <table className="mt-4 w-full border">
        <thead>
          <tr>
            <th className="border p-2">城市</th>
            <th className="border p-2">年薪</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(salaries)
            .sort((a, b) => b[1] - a[1])
            .map(([city, salary]) => (
              <tr key={city}>
                <td className="border p-2">{city}</td>
                <td className="border p-2">{formatSalary(salary)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
```

### 示例2：创建一个城市薪资热力图

```typescript
'use client';

import { cities, getCitySalaries, getAverageSalaryByCity } from '@/lib/salaryUtils';

export default function SalaryHeatmap() {
  const citySalaries = cities.map((city) => ({
    city,
    average: getAverageSalaryByCity(city) || 0,
  }));

  const minSalary = Math.min(...citySalaries.map((c) => c.average));
  const maxSalary = Math.max(...citySalaries.map((c) => c.average));

  const getColor = (salary: number) => {
    const ratio = (salary - minSalary) / (maxSalary - minSalary);
    if (ratio > 0.75) return 'bg-red-500';
    if (ratio > 0.5) return 'bg-orange-500';
    if (ratio > 0.25) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="grid grid-cols-5 gap-4 p-8">
      {citySalaries.map(({ city, average }) => (
        <div
          key={city}
          className={`p-4 rounded text-white text-center ${getColor(average)}`}
        >
          <div className="font-bold">{city}</div>
          <div>${(average / 1000).toFixed(0)}K</div>
        </div>
      ))}
    </div>
  );
}
```

## 数据说明

- **数据年份**: 基于2025-2026年的市场调查
- **单位**: 美元（USD）
- **类型**: 年薪（Annual Salary）
- **税前**: 未计算当地税收
- **范围**: 薪资中位数，实际薪资可能因个人经验、学历、公司规模而异

## 常见问题

### Q: 如何添加新的城市或职业？
A: 编辑 `lib/salaryUtils.ts` 中的 `salaryDatabase` 对象，添加新的城市或职业数据，然后更新 `cities` 和 `professions` 数组。

### Q: 数据多久更新一次？
A: 建议每年更新一次，以保持准确性。

### Q: 为什么有些职业在某些城市的薪资特别高或特别低？
A: 这反映了各城市的经济发展水平、生活成本、人才需求等因素的差异。

### Q: 如何使用这些数据进行成本分析？
A: 结合 `cities.json` 中的生活成本数据，可以计算实际购买力（薪资减去生活成本）。

## 许可证

数据基于公开的薪资调查和市场研究，用于教育和信息目的。
