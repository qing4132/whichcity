# City Compare - 城市对比工具

一个 Next.js 应用程序，用于比较世界主要城市的平均收入和生活成本。

## 功能特性

- 📊 对比 10 个世界主要城市
- 💰 展示每个城市的平均年收入
- 🏠 展示每个城市的月生活成本
- 📈 计算生活成本占收入的百分比
- 🎨 现代化的用户界面，使用 Tailwind CSS
- ⚡ 快速响应的 React 组件

## 项目结构

```
citycompare/
├── app/
│   ├── layout.tsx          # 根布局
│   ├── page.tsx            # 主页面
│   └── globals.css         # 全局样式
├── components/
│   └── CityComparison.tsx   # 城市对比组件
├── public/
│   └── data/
│       └── cities.json     # 城市数据
├── package.json            # 项目依赖
├── tsconfig.json           # TypeScript 配置
├── tailwind.config.ts      # Tailwind CSS 配置
├── next.config.ts          # Next.js 配置
└── README.md               # 项目说明
```

## 城市数据

数据存储在 `public/data/cities.json` 中，包含以下 10 个城市：

1. 纽约 (美国)
2. 伦敦 (英国)
3. 东京 (日本)
4. 北京 (中国)
5. 上海 (中国)
6. 悉尼 (澳大利亚)
7. 新加坡
8. 巴黎 (法国)
9. 多伦多 (加拿大)
10. 香港 (中国香港)

每个城市包含以下信息：
- `id`: 城市编号
- `name`: 城市名称
- `country`: 国家/地区
- `averageIncome`: 平均年收入（美元）
- `costOfLiving`: 月生活成本（美元）
- `currency`: 货币代码

## 安装及运行

### 前置要求
- Node.js 18.0 或更高版本
- npm 或 yarn 包管理器

### 安装步骤

1. 克隆或进入项目目录
```bash
cd citycompare
```

2. 安装依赖
```bash
npm install
```

3. 运行开发服务器
```bash
npm run dev
```

应用程序将在 [http://localhost:3000](http://localhost:3000) 启动。

### 构建生产版本

```bash
npm run build
npm start
```

## 使用说明

1. 打开应用程序后，你会看到城市对比工具界面
2. 从第一个下拉框选择第一个城市
3. 从第二个下拉框选择第二个城市
4. 点击"对比城市"按钮
5. 查看两个城市的详细对比信息，包括：
   - 平均年收入
   - 月生活成本
   - 年生活成本
   - 生活成本占收入的百分比
   - 对比分析

## 技术栈

- **框架**: Next.js 15
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **包管理器**: npm
- **代码质量**: ESLint

## 开发指南

- 使用 TypeScript 确保类型安全
- 遵循 ESLint 配置保持代码质量
- 使用 Tailwind CSS 进行样式设计
- 使用 Next.js App Router 进行路由管理

## 许可证

MIT License

## 作者

City Compare Team
