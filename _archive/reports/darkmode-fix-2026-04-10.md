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

---

## 第二阶段：Chrome / 手机 Safari 白色闪烁

### 新的问题

上述修复（修复 1 + 修复 2）彻底解决了页面**持续停留在亮色**的 bug，但在 Chrome 和手机版 Safari 中出现了新的症状：刷新首页/城市详情页/对比页时会有**短暂的白色闪烁**（约 1 帧）。桌面版 Safari 不受影响。排行榜页始终不闪。

### 排查过程

#### 尝试 1：内联 `<style>` 到 `<head>`

假设外部 CSS 加载前浏览器以默认白色背景渲染。在 `<head>` 中添加内联 `<style>` 定义 `html`/`body` 的暗色背景和 `body::before` 遮罩层。

**失败**：Next.js 将自己的 `<link rel="stylesheet">` 和 `<script>` 标签提升（hoist）到 `<head>` 最顶部，我们的内联 `<style>` 被推到了第 50+ 行。Chrome 在遇到外部 CSS link 后触发 speculative paint，此时内联样式还没被解析到。

#### 尝试 2：脚本移到 `<body>` 第一个子元素

将主题设置脚本从 `<head>` 移至 `<body>` 首位，通过 JS 动态创建 `<style>` 元素设 `visibility:hidden`。

**失败**：`document.createElement('style')` 是异步渲染的——Chrome 不保证动态创建的 style 在下一帧 paint 前生效。

#### 尝试 3：静态 SSR `<style>` 在 `<body>` 中

在 `<body>` 中放置静态 `<style>` 标签（作为 HTML 流的一部分），用 `visibility:hidden!important` 隐藏所有 SSG 内容，由 React 的 `theme-ready` 恢复。

**部分成功**：手机 Safari 闪烁修复，但 Chrome 仍闪。同时发现手机 Safari 切换主题时底部颜色不变——因为启动脚本设了 `html.style.backgroundColor` 行内样式，优先级高于 CSS class 切换。修复：`applyTheme()` 中清除行内 `backgroundColor`。

#### 尝试 4：`<html style="visibility:hidden">`

将 `visibility:hidden` 写在 `<html>` 标签的 `style` 属性上（文档第一个 token），在 `useLayoutEffect` 中 React 完成暗色重渲染后清除。

**失败**：反而让桌面 Safari 也开始闪了。因为 `visibility:hidden` 不影响背景色，用户看到的是白色空白等待 React hydrate 完成。

#### 关键转折：用户提供的线索

用户观察到：
- 首页刷新：**只有顶栏背景区域不闪**（不含按钮）
- 排行榜刷新：**完全不闪**
- 城市详情页刷新：**全部闪白**
- 对比页刷新：只有**对比导航按钮不闪**

**分析**：不闪的元素都是 SSR HTML 中**已存在**的 DOM 节点（由 `useLayoutEffect` 同步修正了 className）。闪的元素都是 `{!s.ready ? null : ...}` 条件渲染在 `ready=true` 后才挂载的**新 DOM 节点**。

排行榜完全不闪是因为 `<Suspense>` + `useSearchParams()` 使组件**完全在客户端渲染**，SSR HTML 中不包含任何组件内容。

#### 遮罩层时序问题

`body::before` 遮罩层定义在**外部 CSS** 中。在外部 CSS 加载完成前遮罩层不存在，亮色 SSR HTML 直接暴露。即使在 `<body>` 中放了内联 `<style>`，Chrome 仍可能在解析到它之前做了 speculative paint。

### 最终方案：`mounted` 状态（推广排行榜策略）

既然排行榜不闪是因为 SSR HTML 中**没有组件内容**，那就让所有页面都采用同样的策略：

```ts
// useSettings.ts
const [mounted, setMounted] = useState(() => isClientNav);

useLayoutEffect(() => {
  // ... sync theme + settings ...
  setMounted(true);
  document.documentElement.classList.add("theme-ready");
}, [applyTheme]);
```

```tsx
// 所有页面组件
if (!s.mounted) return null;
// ... 正常渲染（此时 darkMode 已是正确值）
```

| 页面 | SSR HTML | 首次客户端渲染 |
|------|:---:|:---:|
| 排行榜 | 空（Suspense） | `darkMode=true` ✓ |
| 首页/详情/对比/方法论 | 空（`!mounted → null`） | `darkMode=true` ✓ |

**效果**：
- SSR HTML 中不包含任何组件内容 → 无亮色 DOM 可闪
- 浏览器在 CSS 加载前只看到空白页面（背景由 `<meta name="color-scheme" content="light dark">` + `globals.css` 的 `@media (prefers-color-scheme: dark)` 控制为暗色）
- React hydrate 后 `useLayoutEffect` 同步设好 `darkMode=true` + `mounted=true` → 首次真实渲染就是暗色
- 所有浏览器（Chrome、Safari 桌面/手机）均无闪烁

---

## 附带修复：语言切换后设置面板弹出

### 问题

切换语言后（`router.push` 导航到新 locale），设置面板会先关闭再弹出（闪一下）。

### 原因

`settingsOpen` 初始为 `false`，通过 `useEffect`（绘制后异步执行）从 `sessionStorage` 读取并恢复为 `true` → 中间有一帧关闭状态。

### 修复

改为在 `useState` 初始化器中直接读取 `sessionStorage`。因为 `mounted` 方案下组件不参与 SSR hydration，在初始化器中读 `sessionStorage` 是安全的：

```ts
const [settingsOpen, setSettingsOpen] = useState(() => {
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("_settingsOpen")) {
        sessionStorage.removeItem("_settingsOpen");
        return true;
    }
    return false;
});
```

---

## 最终修改文件清单

- `hooks/useSettings.ts`：新增 `mounted` 状态，`useLayoutEffect` 中设 `mounted=true`，导出 `mounted`
- `components/HomeContent.tsx`：`if (!s.mounted) return null`
- `components/CityDetailContent.tsx`：`if (!s.mounted) return null`
- `components/CompareContent.tsx`：`if (!s.mounted) return null`
- `components/MethodologyContent.tsx`：`if (!s.mounted) return null`
- `components/NavBar.tsx`：`settingsOpen` 初始化器直接读 `sessionStorage`
- `app/[locale]/layout.tsx`：保留 `<body>` 内的主题设置脚本（设 `.dark` 类），移除所有 visibility/遮罩 hack
- `app/globals.css`：保留 `body::before` 遮罩层和 `theme-ready` 机制作为额外保险

## 经验总结

1. **SSR + 暗色模式**的根本矛盾：SSR 时无法知道用户主题偏好，必然输出亮色 HTML。任何在客户端修补暗色的方案都存在时序竞争。
2. **遮罩层方案不可靠**：`body::before` 在外部 CSS 中定义，加载时序不受控。内联到 `<head>` 的 CSS 又被 Next.js 的标签提升（hoist）推迟。
3. **visibility:hidden 方案不可靠**：隐藏了内容但背景色仍为白色，用户看到白色空白。
4. **唯一可靠方案**：不输出 SSR 内容。让组件在客户端渲染（通过 `mounted` 状态或 `<Suspense>`），首次渲染就使用正确的主题值。这是 Next.js 暗色模式的最佳实践。
5. **排行榜页是天然的参照**：它通过 `useSearchParams` 触发 `<Suspense>` 边界，天然实现了客户端渲染，始终不闪。把同样的策略推广到所有页面是正确方向。
