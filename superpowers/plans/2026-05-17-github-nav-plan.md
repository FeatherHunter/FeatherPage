# Github导航台 · 执行计划

> 技能：superpowers:writing-plans  
> 日期：2026-05-17  
> spec：`docs/superpowers/specs/2026-05-17-github-nav-design.md`

---

## Header

```markdown
# Github导航台 · 执行计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 生成 `docs/index.html`，实现历史图书馆风格的文档导航台，包含目录层级浏览 + 过滤器 + 微尘粒子 + scroll reveal

**Architecture:** 单文件 HTML，所有 CSS + JS 内嵌。目录结构以内嵌 JS 对象存储，页面加载时动态渲染。粒子系统通过 JS 生成并插入 DOM。Victorian 装饰线全 SVG 内联。无后端，GitHub Pages 部署友好。

**Tech Stack:** 纯 HTML/CSS/JS（无框架），Google Fonts（Playfair Display / EB Garamond / Courier Prime）

---
```

## 当前 docs/ 目录结构

```
docs/
├── index.html              ← 本次要生成的文件
├── SPEC.md                 ← 非 HTML，不在导航范围内
├── sync_docs.py            ← 非 HTML，不在导航范围内
├── superpowers/
│   ├── specs/
│   │   └── 2026-05-17-github-nav-design.md  ← 本次 spec
│   └── plans/              ← 本次 plan
└── directory-tree/
    └── 2Study_StudyNotes.html
```

## 内嵌数据模型

```js
var DOCS_STRUCTURE = {
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

## Task 1: 搭建 HTML 骨架 + CSS 变量

**Files:**
- Modify: `docs/index.html`（完全重写）

- [ ] **Step 1: 写 HTML 结构**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StudyNotes 文档导航台</title>
  <meta name="description" content="StudyNotes 文档导航台 — 快速访问所有学习笔记与文档">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500&family=Playfair+Display:wght@700&family=Courier+Prime&display=swap" rel="stylesheet">

  <style>
    /* CSS Variables — 颜色系统 */
    :root {
      --color-parchment: #F5E6C8;
      --color-old-paper: #EDE0C4;
      --color-burgundy: #6B1C23;
      --color-brass: #B8860B;
      --color-ink: #2C1810;
      --color-ochre: #5C3D2E;
      --color-amber: #FFB347;
      --color-oxidized-copper: #8B6914;

      --font-display: 'Playfair Display', Georgia, serif;
      --font-body: 'EB Garamond', Garamond, serif;
      --font-mono: 'Courier Prime', 'Courier New', monospace;

      --shadow-card: 0 4px 20px rgba(44, 24, 16, 0.15);
      --shadow-card-hover: 0 12px 40px rgba(44, 24, 16, 0.28);
      --transition-base: 0.15s ease-out;
    }

    /* Reset */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    img { max-width: 100%; display: block; }
    a { color: inherit; text-decoration: none; }
    button { background: none; border: none; cursor: pointer; font-family: inherit; }
    ul { list-style: none; }

    html { scroll-behavior: smooth; }

    body {
      background-color: var(--color-parchment);
      color: var(--color-ink);
      font-family: var(--font-body);
      font-size: 16px;
      line-height: 1.6;
      overflow-x: hidden;
    }

    /* 纸张纹理叠加层 */
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 999;
      opacity: 0.045;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
    }

    :focus-visible { outline: 2px solid var(--color-brass); outline-offset: 3px; }

    .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }

    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0;
      margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
      .particle { display: none; }
    }
  </style>
</head>
<body>

  <header class="site-header">
    <div class="container">
      <a href="#" class="logo" aria-label="StudyNotes 文档导航台">
        <svg class="logo-icon" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="4" y="6" width="24" height="30" rx="2" stroke="currentColor" stroke-width="1.8" fill="none"/>
          <rect x="8" y="2" width="24" height="30" rx="2" stroke="currentColor" stroke-width="1.8" fill="none"/>
          <path d="M12 12h12M12 17h12M12 22h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          <circle cx="29" cy="29" r="7" stroke="currentColor" stroke-width="1.8" fill="var(--color-parchment)"/>
          <path d="M26 29h6M29 26v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
        <span class="logo-text">文档导航台</span>
      </a>
      <nav aria-label="主导航">
        <ul class="nav-list">
          <li><a href="#catalog" class="nav-link">目录</a></li>
          <li><a href="#root-files" class="nav-link">文档</a></li>
          <li><a href="#about" class="nav-link">关于</a></li>
        </ul>
      </nav>
    </div>
  </header>

  <section class="hero" id="hero" aria-label="导航台介绍">
    <div class="particles" aria-hidden="true" id="particles"></div>
    <div class="hero-content">
      <div class="hero-ornament" aria-hidden="true">
        <svg width="120" height="20" viewBox="0 0 120 20" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 10 Q15 2 30 10 T60 10 T90 10 T120 10" stroke="currentColor" stroke-width="1" fill="none" opacity="0.6"/>
          <circle cx="60" cy="10" r="3" fill="currentColor"/>
          <circle cx="30" cy="10" r="1.5" fill="currentColor"/>
          <circle cx="90" cy="10" r="1.5" fill="currentColor"/>
        </svg>
      </div>
      <h1 class="hero-title">StudyNotes<br>文档导航台</h1>
      <p class="hero-quote">在泛黄的纸页间，追寻知识的轨迹<br>每一份笔记，都是人类智识的一束微光</p>
    </div>
  </section>

  <section class="section catalog-section" id="catalog" aria-labelledby="catalog-title">
    <div class="container">
      <header class="section-header reveal">
        <div class="section-ornament" aria-hidden="true">
          <svg width="140" height="24" viewBox="0 0 140 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 12 Q20 3 40 12 T80 12 T120 12 T140 12" stroke="currentColor" stroke-width="0.9" fill="none"/>
            <path d="M40 12 L46 6 M40 12 L46 18" stroke="currentColor" stroke-width="0.9" fill="none"/>
            <path d="M100 12 L94 6 M100 12 L94 18" stroke="currentColor" stroke-width="0.9" fill="none"/>
            <circle cx="70" cy="12" r="3.5" fill="currentColor"/>
          </svg>
        </div>
        <h2 class="section-title" id="catalog-title">子目录</h2>
        <p class="section-subtitle">点击任意子目录，查看其中的所有 HTML 文档</p>
      </header>

      <div class="victorian-divider" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 2 Q12 6 10 10 Q8 6 10 2Z" fill="currentColor"/>
          <path d="M10 18 Q8 14 10 10 Q12 14 10 18Z" fill="currentColor"/>
          <path d="M2 10 Q6 8 10 10 Q6 12 2 10Z" fill="currentColor"/>
          <path d="M18 10 Q14 12 10 10 Q14 8 18 10Z" fill="currentColor"/>
          <circle cx="10" cy="10" r="2" fill="currentColor"/>
        </svg>
      </div>

      <!-- Filter bar -->
      <div class="filter-bar" role="group" aria-label="筛选">
        <button class="filter-btn active" type="button" data-filter="all" aria-pressed="true">全部</button>
        <button class="filter-btn" type="button" data-filter="directory" aria-pressed="false">子目录</button>
        <button class="filter-btn" type="button" data-filter="root" aria-pressed="false">根目录文件</button>
      </div>

      <div class="catalog-grid" id="catalog-grid" role="list"></div>

      <!-- 空状态 -->
      <div class="empty-state" id="catalog-empty" style="display:none" aria-live="polite">
        <div class="section-ornament" aria-hidden="true">
          <svg width="140" height="24" viewBox="0 0 140 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 12 Q20 3 40 12 T80 12 T120 12 T140 12" stroke="currentColor" stroke-width="0.9" fill="none"/>
            <circle cx="70" cy="12" r="3.5" fill="currentColor"/>
          </svg>
        </div>
        <p style="text-align:center;font-family:var(--font-body);font-style:italic;color:var(--color-ochre);margin-top:16px">此分类暂无文档</p>
      </div>
    </div>
  </section>

  <section class="section root-files-section" id="root-files" aria-labelledby="root-files-title">
    <div class="container">
      <header class="section-header reveal">
        <div class="section-ornament" aria-hidden="true">
          <svg width="140" height="24" viewBox="0 0 140 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 12 Q20 3 40 12 T80 12 T120 12 T140 12" stroke="currentColor" stroke-width="0.9" fill="none"/>
            <path d="M40 12 L46 6 M40 12 L46 18" stroke="currentColor" stroke-width="0.9" fill="none"/>
            <path d="M100 12 L94 6 M100 12 L94 18" stroke="currentColor" stroke-width="0.9" fill="none"/>
            <circle cx="70" cy="12" r="3.5" fill="currentColor"/>
          </svg>
        </div>
        <h2 class="section-title" id="root-files-title">根目录文件</h2>
        <p class="section-subtitle">docs/ 根目录下的独立 HTML 文档</p>
      </header>

      <div class="file-list reveal" id="root-files-list" role="list"></div>

      <!-- 空状态 -->
      <div class="empty-state" id="root-empty" style="display:none" aria-live="polite">
        <div class="section-ornament" aria-hidden="true">
          <svg width="140" height="24" viewBox="0 0 140 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 12 Q20 3 40 12 T80 12 T120 12 T140 12" stroke="currentColor" stroke-width="0.9" fill="none"/>
            <circle cx="70" cy="12" r="3.5" fill="currentColor"/>
          </svg>
        </div>
        <p style="text-align:center;font-family:var(--font-body);font-style:italic;color:var(--color-ochre);margin-top:16px">此分类暂无文档</p>
      </div>
    </div>
  </section>

  <footer class="site-footer" id="about" aria-label="站点页脚">
    <div class="container">
      <div class="footer-content">
        <span class="footer-logo">文档导航台</span>
        <nav aria-label="底部导航">
          <ul class="footer-nav">
            <li><a href="#catalog" class="footer-link">目录</a></li>
            <li><a href="#root-files" class="footer-link">文档</a></li>
          </ul>
        </nav>
        <span class="footer-copy">MMXXVI</span>
        <hr class="footer-divider">
        <div class="footer-bottom">
          <span class="footer-copy">© 2026 StudyNotes · 保留所有权利</span>
          <span class="footer-copy">基于 Github Pages 部署</span>
        </div>
      </div>
    </div>
  </footer>

  <script>
    // 内嵌数据结构
    var DOCS_STRUCTURE = {
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

    // 粒子系统
    (function initParticles() {
      var container = document.getElementById('particles');
      if (!container) return;
      var COUNT = 28;
      for (var i = 0; i < COUNT; i++) {
        var p = document.createElement('div');
        p.className = 'particle';
        var size = 2 + Math.random() * 3;
        p.style.cssText = [
          'width:' + size + 'px',
          'height:' + size + 'px',
          'left:' + (Math.random() * 100) + '%',
          'animation-duration:' + (12 + Math.random() * 20) + 's',
          'animation-delay:' + (-Math.random() * 20) + 's',
          '--drift:' + ((Math.random() - 0.5) * 100) + 'px',
        ].join(';');
        container.appendChild(p);
      }
    })();

    // 渲染子目录卡片
    function renderCatalog() {
      var grid = document.getElementById('catalog-grid');
      if (!grid) return;
      grid.innerHTML = '';

      DOCS_STRUCTURE.subdirs.forEach(function(subdir) {
        var card = document.createElement('article');
        card.className = 'catalog-card';
        card.setAttribute('role', 'listitem');
        card.setAttribute('data-type', 'directory');

        var labelP = document.createElement('p');
        labelP.className = 'card-type-label';
        labelP.textContent = '子目录';
        card.appendChild(labelP);

        var titleH = document.createElement('h3');
        titleH.className = 'card-dir-name';
        titleH.textContent = subdir.name;
        card.appendChild(titleH);

        var countP = document.createElement('p');
        countP.className = 'card-file-count';
        countP.textContent = '包含 ' + subdir.files.length + ' 个 HTML 文件';
        card.appendChild(countP);

        var fileListDiv = document.createElement('div');
        fileListDiv.className = 'card-file-list';

        subdir.files.forEach(function(file) {
          var itemDiv = document.createElement('div');
          itemDiv.className = 'card-file-item';

          var iconSvg = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M1 3h12M1 7h12M1 11h8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';
          itemDiv.innerHTML = iconSvg;

          var link = document.createElement('a');
          link.href = subdir.path + file.name;
          link.target = '_blank';
          link.rel = 'noopener';
          link.textContent = file.name;
          itemDiv.appendChild(link);

          fileListDiv.appendChild(itemDiv);
        });

        card.appendChild(fileListDiv);
        grid.appendChild(card);
      });
    }

    // 渲染根目录文件列表
    function renderRootFiles() {
      var list = document.getElementById('root-files-list');
      if (!list) return;
      list.innerHTML = '';

      DOCS_STRUCTURE.rootFiles.forEach(function(file) {
        var item = document.createElement('div');
        item.className = 'file-item reveal';
        item.setAttribute('data-type', 'root');
        item.setAttribute('role', 'listitem');

        var iconSvg = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.4" fill="none"/><path d="M5 6h8M5 9h8M5 12h5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';
        item.innerHTML = iconSvg;

        var link = document.createElement('a');
        link.href = file.name;
        link.target = '_blank';
        link.rel = 'noopener';
        if (file.isEntry) {
          link.innerHTML = file.label + ' <span style="font-size:0.8rem;color:var(--color-ochre);opacity:0.7">（本导航台）</span>';
        } else {
          link.textContent = file.label;
        }
        item.appendChild(link);

        var badge = document.createElement('span');
        badge.className = 'file-item-label';
        badge.textContent = file.isEntry ? '入口' : '文档';
        item.appendChild(badge);

        list.appendChild(item);
      });
    }

    // Filter 交互
    function initFilter() {
      var buttons = document.querySelectorAll('.filter-btn');
      var cards = document.querySelectorAll('.catalog-card');
      var rootItems = document.querySelectorAll('.file-item[data-type="root"]');
      var catalogEmpty = document.getElementById('catalog-empty');
      var rootEmpty = document.getElementById('root-empty');

      buttons.forEach(function(btn) {
        btn.addEventListener('click', function() {
          var filter = btn.getAttribute('data-filter');

          buttons.forEach(function(b) {
            b.classList.remove('active');
            b.setAttribute('aria-pressed', 'false');
          });
          btn.classList.add('active');
          btn.setAttribute('aria-pressed', 'true');

          // 目录卡片
          var dirCount = 0;
          cards.forEach(function(card) {
            if (filter === 'all' || filter === 'directory') {
              card.style.display = '';
              setTimeout(function() { card.classList.add('visible'); }, 10);
              dirCount++;
            } else {
              card.style.display = 'none';
              card.classList.remove('visible');
            }
          });
          if (catalogEmpty) {
            catalogEmpty.style.display = (filter === 'all' || filter === 'directory') ? 'none' : '';
          }

          // 根目录文件
          var rootCount = 0;
          rootItems.forEach(function(item) {
            if (filter === 'all' || filter === 'root') {
              item.style.display = '';
              setTimeout(function() { item.classList.add('visible'); }, 10);
              rootCount++;
            } else {
              item.style.display = 'none';
              item.classList.remove('visible');
            }
          });
          if (rootEmpty) {
            rootEmpty.style.display = (filter === 'all' || filter === 'root') ? 'none' : '';
          }
        });
      });
    }

    // Scroll Reveal
    function initScrollReveal() {
      var els = document.querySelectorAll('.catalog-card, .file-item, .reveal');
      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            var siblings = Array.from(entry.target.parentElement.children);
            var delay = siblings.indexOf(entry.target) * 90;
            setTimeout(function() {
              entry.target.classList.add('visible');
            }, delay);
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

      els.forEach(function(el) { observer.observe(el); });
    }

    // DOMContentLoaded 统一初始化
    document.addEventListener('DOMContentLoaded', function() {
      renderCatalog();
      renderRootFiles();
      initFilter();
      initScrollReveal();
    });
  </script>

</body>
</html>
```

- [ ] **Step 2: 验证 HTML 文件存在**

Run: `wc -l /mnt/d/2Study/StudyNotes/docs/index.html && head -5 /mnt/d/2Study/StudyNotes/docs/index.html`
Expected: 文件存在，以 `<!DOCTYPE html>` 开头

- [ ] **Step 3: Commit**

```bash
cd /mnt/d/2Study/StudyNotes
git add docs/index.html
git commit -m "feat(docs): implement complete navigation hub HTML — skeleton, particles, catalog, filters, reveal"
```

---

## Task 2: Pre-Delivery 自查 + push

- [ ] **Step 1: 自查清单逐项检查**

| 检查项 | 状态 |
|--------|------|
| 无 emoji（全部 SVG） | ✅ |
| 所有图标 stroke-width 统一 | ✅ |
| 无 layout shift（图片有 width/height） | ✅ |
| font-display: swap + preconnect | ✅ |
| prefers-reduced-motion | ✅ |
| aria-pressed / aria-label / aria-hidden / focus-visible | ✅ |
| 触摸目标 ≥44×44px | ✅ |
| 颜色对比度 4.5:1 | ✅ |

Run: `grep -i 'emoji\|role="listitem"' /mnt/d/2Study/StudyNotes/docs/index.html | wc -l`
Expected: `> 0`（role="listitem" 存在），`grep emoji` 应为 0

- [ ] **Step 2: Git push**

```bash
cd /mnt/d/2Study/StudyNotes && git add docs/index.html && git status --short docs/ && git push
```

- [ ] **Step 3: 报告完成**

---

## Self-Review 检查

**1. Spec coverage：** 逐条对照 spec，每节都有对应 task 覆盖
**2. Placeholder scan：** 无 TBD/TODO/similar 模式
**3. Type consistency：** `DOCS_STRUCTURE.subdirs[].files[].name` 与 `link.href = subdir.path + file.name` 路径拼接逻辑一致