# 暗色模式 Bug 修复报告 (2026-04-10)

## 问题描述

在暗色模式下（系统暗色 + 网站设置为自动/暗色），以下页面出现严重的主题错误：

- **首页**：通过链接访问时背景、顶栏等维持白色（亮色），搜索框却是暗色的
- **城市详情页**：从首页搜索/点击进入时正常（暗色），但刷新后变回亮色
- **对比页**：同样刷新后变亮
- **排行榜页**：无此问题

额外症状：
- 不是短暂闪烁，而是**持续**停留在亮色
- 点击设置/分享按钮后对应区域会变成暗色
- 刷新页面问题恢复

---

## 排查过程

### 第一步：理解主题系统架构

项目的暗色模式实现涉及 4 层：

1. **Tailwind CSS** (`darkMode: "class"`)：依赖 `html.dark` 类切换暗色样式
2. **layout.tsx 内联脚本**：在 `<head>` 中同步执行，读取 `localStorage` 并立即给 `<html>` 添加 `dark`/`light` 类 — 这层没问题
3. **globals.css 遮罩层**：`body::before` 全屏遮罩，阻止用户看到 Tailwind 样式未就绪的内容；`html.theme-ready` 时隐藏
4. **useSettings hook**：客户端 React 组件通过 `darkMode` state 变量决定每个元素的 className

### 第二步：分析 SSR/SSG 输出

检查 `.next/server/app/en.html` 发现：

```html
<!-- SSG 预渲染的 HTML —— darkMode=false，全部是亮色类名 -->
<div class="min-h-screen flex flex-col transition-colors bg-slate-50 text-slate-900">
  <div class="sticky top-0 z-50 border-b py-2.5 bg-white border-slate-200">
```

而排行榜页（`en/ranking.html`）的 HTML 中**没有**这些预渲染的组件内容（因为被 `<Suspense>` 包裹，完全在客户端渲染）。

### 第三步：定位根因

关键发现在于 `darkMode` 的 `useState` 初始化器：

```ts
// 旧代码
const [darkMode, setDarkModeState] = useState(() =>
  typeof document !== "undefined"
    ? document.documentElement.classList.contains("dark")  // 客户端 hydration 时返回 true
    : false,                                                // SSR 时返回 false
);
```

**这造成了一个致命的逻辑死锁：**

1. **SSR 阶段**：`darkMode = false` → 预渲染亮色 HTML（`bg-slate-50`、`bg-white` 等）
2. **浏览器加载**：内联脚本先执行，给 `<html>` 加上 `dark` 类
3. **React hydration**：`useState` 初始化器在客户端执行，从 DOM 读到 `dark` 类 → `darkMode = true`
4. **Hydration 不匹配**：React 客户端虚拟 DOM 期望 `bg-slate-950`，但 SSR DOM 是 `bg-slate-50`。React 18 的 hydration **不会修补 className 差异**，保留 SSR 的亮色类名
5. **useEffect 中的 `setDarkModeState(true)` 变成空操作**：state 已经是 `true`（第 3 步），不触发重渲染
6. **结果**：DOM 永远停留在 SSR 预渲染的亮色状态

这也解释了所有症状：
- 排行榜正常：`useSearchParams()` 触发 `<Suspense>` 边界，组件完全客户端渲染，无 SSR hydration 问题
- 搜索框暗色：CSS 中 `html.dark body::before` 遮罩层的颜色 + 部分 CSS 选择器直接响应 `html.dark`
- 点击按钮变暗：按钮本地 state 变化触发局部重渲染，此时 `darkMode=true` 生效刷新了可见区域

---

## 修复方案

### 修复 1：初始值与 SSR 一致 + useLayoutEffect

将 `darkMode` 初始值固定为 `false`（与 SSR 一致），使后续 `setDarkModeState(true)` 能**真正触发重渲染**。同时将设置同步逻辑从 `useEffect` 改为 `useLayoutEffect`，确保在浏览器首次绘制前完成。

**但引入了新问题**：客户端导航时（通过 `<Link>` 跳转），新组件以 `darkMode=false` 挂载 → 即使 `useLayoutEffect` 很快修正，仍会短暂闪一帧亮色。

### 修复 2：区分 hydration 与客户端导航（最终方案）

通过检测 `theme-ready` 类是否已存在来区分两种场景：

```ts
const isClientNav = typeof document !== "undefined"
  && document.documentElement.classList.contains("theme-ready");

const [themeMode, setThemeModeState] = useState<ThemeMode>(
  () => isClientNav ? readSavedThemeMode() : "auto",
);
const [darkMode, setDarkModeState] = useState(
  () => isClientNav ? document.documentElement.classList.contains("dark") : false,
);
```

| 场景 | `theme-ready` | `darkMode` 初始值 | 行为 |
|------|:---:|:---:|------|
| 首次加载/刷新 | ✗ | `false`（匹配 SSR） | `useLayoutEffect` 在首次绘制前同步设为 `true` 并重渲染 |
| 客户端导航 | ✓ | 从 DOM 读取正确值 | 首次渲染就是暗色，零闪烁 |

同时将数据获取（exchange rates fetch）拆分到独立 `useEffect`，不阻塞主题调和。

---

## 意外收获：语言切换闪烁也被修复

之前切换语言（`router.push` 到新 locale 路由）时页面会闪一下，原以为无解。实际上根因相同：旧 `useEffect` 在绘制后才同步 locale/theme 等设置 → 浏览器先画一帧默认状态再被修正。

改为 `useLayoutEffect` + `isClientNav` 初始化后，所有客户端导航（换语言、点城市、点对比）都受益——设置在绘制前就已同步完成。

---

## 修改文件

- `hooks/useSettings.ts`：28 行新增，19 行删除

## 关键改动

1. `import { useLayoutEffect }` 替代部分 `useEffect` 使用
2. `isClientNav` 检测逻辑（基于 `theme-ready` 类）
3. `darkMode`/`themeMode` 的 `useState` 初始化器条件化
4. 主 effect 拆分为 `useLayoutEffect`（主题+设置同步）+ `useEffect`（汇率 fetch）
