# Github导航台 · 设计规格书

> 日期：2026-05-17
> 技能：Github导航台 SKILL.md v2.1
> 风格：历史图书馆数字档案

---

## 1. 概念与愿景

一座泛黄羊皮纸上的档案馆入口页，钨丝台灯在暗色书架间投下温暖光晕，维多利亚时代植物铜版画静默陈列其间。访客步入其中，如同翻开一本尘封已久的精装古籍——庄重、古老、沉静，却又在 GitHub Pages 的数字媒介中焕发新生。

访问者通过这个入口页，快速定位 docs/ 下的任何 HTML 文档。

---

## 2. 设计语言

### 色彩系统
| 角色 | Hex |
|------|-----|
| 背景（羊皮纸黄） | `#F5E6C8` |
| 次背景（旧纸米白） | `#EDE0C4` |
| 主色调（深勃艮第红） | `#6B1C23` |
| 强调色（黄铜金） | `#B8860B` |
| 文字主色（深棕黑） | `#2C1810` |
| 文字次色（暗赭石） | `#5C3D2E` |
| 高亮色（琥珀台灯） | `#FFB347` |
| 描边色（氧化古铜） | `#8B6914` |

### 字体
- **Display/标题**：Playfair Display（Google Fonts），fallback: Georgia, serif
- **正文**：EB Garamond（Google Fonts），fallback: Garamond, serif
- **标签/Code**：Courier Prime（Google Fonts），fallback: Courier New, monospace
- **字重**：Display 700 / 正文 400 / 标签 500
- **font-display**：swap（防 FOIT）

### 空间系统
- 间距基准：8px
- 页面最大宽度：1200px
- 容器内边距：0 24px

### 动效哲学
- **场景氛围**：微尘粒子漂浮（28个，random drift，12-32s 周期），钨丝灯 radial-gradient 光晕 pulse（4s）
- **入场动画**：Fade + translateY（20px→0），400ms ease-out，stagger 90ms per item
- **悬停反馈**：纸张微微翘起（perspective + rotateX 1-2deg），shadow 加深
- **打字机效果**：Hero 引述文字逐字显现（90ms/字 + random jitter）
- **节奏**：stagger 90ms per item，IntersectionObserver 触发
- **Reduced Motion**：`prefers-reduced-motion: reduce` 时关闭所有动画，粒子隐藏

### 视觉资源
- **纹理**：SVG feTurbulence 噪点叠加层（opacity 0.045，pointer-events: none）
- **装饰**：Victorian 植物铜版画 SVG 分隔线（内联，所有 SVG stroke-width 统一 0.8-1.8px）
- **图标**：全 SVG，不使用 emoji
- **图片**：picsum.photos 带 seed（历史感 sepia 滤镜）

---

## 3. 布局与结构

### 页面结构
```
[ Header: Logo + 导航（目录/文档/关于）]
[ Hero: 全屏氛围光效 + 粒子 + 标题 + 引述 ]
[ Filter Bar: 三个 pill 按钮（全部/子目录/根目录文件）]
[ Section: 子目录卡片网格 ]
[ Section: 根目录文件列表 ]
[ Footer: 版权 + 导航 ]
```

### 响应式
- Mobile first
- Breakpoints: 768px
- 卡片网格：移动端 1 列，桌面 auto-fill minmax(300px, 1fr)

### 目录结构（内嵌数据）
docs/ 当前结构：
```
docs/
├── index.html         ← 本导航台
├── SPEC.md            ← 非 HTML，不列出
├── sync_docs.py       ← 非 HTML，不列出
└── directory-tree/
    └── 2Study_StudyNotes.html
```

数据模型（内嵌于 JS）：
```js
const DOCS_STRUCTURE = {
  subdirs: [
    {
      name: "directory-tree",
      path: "directory-tree/",
      files: [
        { name: "2Study_StudyNotes.html", label: "目录树" }
      ]
    }
  ],
  rootFiles: [
    { name: "index.html", label: "本导航台", isEntry: true },
    { name: "directory-tree/2Study_StudyNotes.html", label: "目录树笔记" }
  ]
};
```

---

## 4. 功能与交互

### 目录浏览
- 页面加载时从内嵌数据结构渲染所有内容
- 每个子目录卡片底部列出该目录下的 HTML 文件，可点击
- 根目录文件列表直接显示

### 过滤交互
- 三个 Filter Pill 按钮：全部 / 子目录 / 根目录文件
- 点击后：对应类型的卡片/条目显示，其余隐藏（display none + remove visible class）
- `aria-pressed` 状态正确切换

### Hover / Focus
- 卡片 hover：translateY(-4px) + rotateX(1deg) + shadow 加深 + 边框变金
- 卡片 focus-within：2px 黄铜金 outline
- 链接 hover：颜色变为勃艮第红

### 空状态
- 如果某类型无内容，对应网格显示优雅的空状态提示文案（Victorian 分隔线装饰）

---

## 5. 组件清单

| 组件 | 状态 |
|------|------|
| Header Logo + Nav | default / hover（颜色→金） |
| Hero | 钨丝灯光晕 pulse / 粒子漂浮 / 打字机效果 |
| Victorian 分隔线 | 静态装饰 |
| Filter Pill 按钮 | default / active（勃艮第红底）/ hover / focus-visible |
| 子目录卡片 | default / hover（翘起）/ focus-within / visible（scroll reveal） |
| 目录卡内文件链接 | default / hover（颜色→红） |
| 根目录文件条目 | default / hover（translateX 4px + 边框变金） |
| Footer | 静态 |
| 空状态 | 优雅文案 + Victorian 装饰线 |

---

## 6. 技术方案

- **单文件 HTML**：所有 CSS + JS 内嵌，无外部 JS 依赖
- **字体**：`font-display: swap` + `preconnect`
- **动画**：纯 CSS `@keyframes` + JS IntersectionObserver，JS 生成粒子
- **无障碍**：`role="list"`, `aria-pressed`, `aria-label`, `aria-hidden`, `focus-visible` 全覆盖
- **性能**：无 layout shift（图片声明 width/height），粒子数量控制 24-28 个避免性能问题
- **Reduced Motion**：`@media (prefers-reduced-motion: reduce)` 关闭所有动画

---

## 7. 自查清单（Spec Self-Review）

1. **Placeholder scan**：无 TBD/TODO，内容完整
2. **Internal consistency**：数据模型与 UI 结构描述一致；颜色与 SPEC.md 一致
3. **Scope check**：单文件 HTML，实现边界清晰，无多余子系统
4. **Ambiguity check**：目录结构已精确列出当前 docs/ 内容；过滤逻辑已定义

---

## 8. 参考规范来源

- **SKILL.md**（Github导航台 v2.1）：功能规则、触发词、HTML 生成规则
- **SPEC.md**（docs/ 已有）：视觉风格详细定义（字体/色彩/动效/纹理）
- **taste-skill**：SVG 替代 emoji、无纯黑、动效完整
- **ui-ux-pro-max-skill Pre-Delivery Checklist**：无障碍 / 性能 / 触摸目标 / Reduced Motion
- **superpowers**：brainstorming → writing-plans → verification 完整流程