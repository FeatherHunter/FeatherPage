# SkillBoard 双端布局重构实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构 SkillBoard 布局——桌面端侧边栏导航 + 移动端双层底部 Tab，实现单手操作友好

**Architecture:** 桌面端（>768px）侧边栏固定，移动端（≤768px）底部双层 Tab，内容区自适应

**Tech Stack:** 纯 CSS 改动（style.css），HTML 结构不变，JS 逻辑不变

---

## 文件结构

| 文件 | 改动 |
|------|------|
| `docs/skillboard/style.css` | 侧边栏 + 移动端底部 Tab + 响应式断点 |
| `docs/skillboard/index.html` | 不改动（结构已支持） |

---

## 任务分解

### Task 1: 桌面端侧边栏布局

**文件:** `docs/skillboard/style.css`

- [ ] **Step 1: 添加侧边栏基础样式**

```css
/* 侧边栏 */
.app-sidebar {
  position: fixed;
  left: 0;
  top: 0;
  width: 200px;
  height: 100vh;
  background: #18181B;
  display: flex;
  flex-direction: column;
  padding: 16px 0;
  z-index: 100;
}

/* logo 区域 */
.sidebar-logo {
  padding: 0 16px 16px;
  border-bottom: 1px solid #27272A;
  margin-bottom: 16px;
}

/* nav 项 */
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  color: #A1A1AA;
  text-decoration: none;
  border-radius: 0;
  transition: all 0.15s;
}

.sidebar-nav-item:hover {
  background: #27272A;
  color: #FFFFFF;
}

.sidebar-nav-item.active {
  background: rgba(37, 99, 235, 0.1);
  color: #2563EB;
  border-left: 3px solid #2563EB;
}
```

- [ ] **Step 2: 调整主内容区 margin**

```css
.app-main {
  margin-left: 200px;  /* 侧边栏宽度 */
  padding: 24px;
  min-height: 100vh;
}
```

- [ ] **Step 3: 调整 header（桌面端隐藏顶部 nav）**

```css
.app-header {
  display: none;  /* 桌面端隐藏顶部 nav */
}

/* 移动端保留顶部 nav */
@media (max-width: 768px) {
  .app-header {
    display: flex;
  }
  .app-sidebar {
    display: none;
  }
  .app-main {
    margin-left: 0;
  }
}
```

- [ ] **Step 4: 隐藏底部 footer**

```css
.app-footer {
  display: none;
}

@media (max-width: 768px) {
  .app-footer {
    display: block;
  }
}
```

---

### Task 2: 移动端双层底部 Tab

**文件:** `docs/skillboard/style.css`

- [ ] **Step 1: 底部 Tab 容器**

```css
@media (max-width: 768px) {
  .mobile-bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #FFFFFF;
    border-top: 1px solid #E4E4E7;
    display: flex;
    flex-direction: column;
    z-index: 100;
  }

  /* 模块选择行 */
  .nav-module-row {
    display: flex;
    height: 56px;
    justify-content: space-around;
    align-items: center;
  }

  /* 内部 Tab 行 */
  .nav-internal-row {
    display: flex;
    height: 48px;
    justify-content: flex-start;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding: 0 8px;
    gap: 8px;
  }

  /* Tab 项 */
  .mobile-nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 48px;
    height: 100%;
    padding: 0 12px;
    color: #64748B;
    font-size: 10px;
    gap: 4px;
    white-space: nowrap;
    border-radius: 8px;
    transition: all 0.15s;
  }

  .mobile-nav-item.active {
    color: #2563EB;
    background: rgba(37, 99, 235, 0.1);
  }

  .mobile-nav-item svg {
    width: 20px;
    height: 20px;
  }

  /* 内部 Tab pills */
  .mobile-internal-tab {
    height: 32px;
    padding: 0 16px;
    border-radius: 16px;
    font-size: 12px;
    display: flex;
    align-items: center;
    white-space: nowrap;
  }

  .mobile-internal-tab.active {
    background: #2563EB;
    color: #FFFFFF;
  }
}
```

- [ ] **Step 2: 内容区底部留出 Tab 空间**

```css
@media (max-width: 768px) {
  .app-main {
    padding-bottom: 108px; /* 56px + 48px + 4px */
  }
}
```

---

### Task 3: 验证与同步

- [ ] **Step 1: Playwright 截图验证桌面端布局**
- [ ] **Step 2: Playwright 截图验证移动端布局（模拟 375px）**
- [ ] **Step 3: 同步到 `src/` 源码目录**
- [ ] **Step 4: Git 提交**

---

## 验证步骤

### 桌面端验证（1280px+）
1. 打开 `http://localhost:8089/`
2. 确认左侧有深色侧边栏
3. 确认顶部无横向 nav tabs
4. 确认内容区正常显示

### 移动端验证（375px）
1. DevTools 切换到移动端模拟
2. 确认底部有双层 Tab
3. 确认内容区可正常滚动

---

## 执行选项

**1. Subagent-Driven（推荐）** - 我 dispatch subagent 按任务执行，你审批每步

**2. Inline Execution** - 我在当前 session 按任务逐步执行

选择哪个？
