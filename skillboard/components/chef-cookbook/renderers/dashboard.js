/**
 * 渲染仪表盘视图
 * 显示：食谱总数 / 各类统计 / 最近烹饪记录
 */
export async function renderDashboardView(panel, db) {
    const shadow = panel.getShadow();
    const content = shadow.getElementById('view-content');
    // ── 查询：食谱总数 & 状态分布 ──────────────────
    const [totalResult, statusResult, recentResult] = await Promise.all([
        db.exec("SELECT COUNT(*) as total FROM recipes WHERE status != '已废弃'", {}),
        db.exec("SELECT status, COUNT(*) as count FROM recipes WHERE status != '已废弃' GROUP BY status ORDER BY count DESC", {}),
        db.exec(`SELECT rh.recipe_id, r.name as recipe_name, rh.cook_date, rh.rating
       FROM recipe_history rh
       JOIN recipes r ON rh.recipe_id = r.id
       ORDER BY rh.cook_date DESC LIMIT 5`, {}),
    ]);
    const total = (totalResult.rows || [])[0]?.['total'] ?? 0;
    // 状态分布
    const statusRows = (statusResult.rows || []);
    const statusCounts = {};
    statusRows.forEach(r => { statusCounts[r['status'] || '未知'] = Number(r['count'] || 0); });
    // 最近烹饪
    const recentRows = (recentResult.rows || []);
    // ── 配色 ────────────────────────────────────────
    const STATUS_COLORS = {
        '未做': '#94A3B8',
        '已做': '#3B82F6',
        '熟练': '#10B981',
        '已废弃': '#EF4444',
    };
    const STATUS_LABELS = {
        '未做': '未做过',
        '已做': '已做过',
        '熟练': '熟练',
        '已废弃': '已废弃',
    };
    // ── 状态条 ─────────────────────────────────────
    const allStatuses = ['未做', '已做', '熟练'];
    const totalActive = allStatuses.reduce((s, k) => s + (statusCounts[k] || 0), 0);
    const statusBars = allStatuses.map((k, i) => {
        const count = statusCounts[k] || 0;
        const pct = totalActive > 0 ? (count / totalActive * 100).toFixed(1) : '0';
        const color = STATUS_COLORS[k] || '#94A3B8';
        return `
      <div class="category-bar-row">
        <span class="category-name">${STATUS_LABELS[k] || k}</span>
        <div class="category-bar-track">
          <div class="category-bar-fill" style="width:${pct}%;background:${color}"></div>
        </div>
        <span class="category-pct">${pct}%</span>
      </div>`;
    }).join('');
    // ── 最近烹饪卡片 ──────────────────────────────
    const recentCards = recentRows.length ? recentRows.map(r => `
    <div class="dash-card" data-recipe="${r['recipe_id']}">
      <div class="dash-card-label">${r['recipe_name'] || '未知菜名'}</div>
      <div class="dash-card-value neutral">${r['cook_date'] || '—'}</div>
      <div class="dash-card-unit">评分: ${r['rating'] ?? '—'}</div>
    </div>`).join('') : '<div class="empty-state"><p>暂无烹饪记录</p></div>';
    // ── 渲染 ──────────────────────────────────────
    content.innerHTML = `
    <div class="dashboard">
      <div class="dashboard-header">
        <span>私家大厨 · 概览</span>
      </div>

      <div class="dash-cards">
        <div class="dash-card">
          <div class="dash-card-label">活跃食谱</div>
          <div class="dash-card-value neutral">${total}</div>
          <div class="dash-card-unit">道</div>
        </div>

        <div class="dash-card">
          <div class="dash-card-label">已做次数</div>
          <div class="dash-card-value neutral">${statusCounts['已做'] || 0}</div>
          <div class="dash-card-unit">道</div>
        </div>

        <div class="dash-card">
          <div class="dash-card-label">熟练菜</div>
          <div class="dash-card-value" style="color:#10B981">${statusCounts['熟练'] || 0}</div>
          <div class="dash-card-unit">道</div>
        </div>

        <div class="dash-card">
          <div class="dash-card-label">未做过</div>
          <div class="dash-card-value" style="color:#94A3B8">${statusCounts['未做'] || 0}</div>
          <div class="dash-card-unit">道</div>
        </div>
      </div>

      ${statusBars ? `
        <div class="category-section">
          <div class="category-section-header">食谱状态分布</div>
          <div class="category-list">${statusBars}</div>
        </div>` : ''}

      ${recentRows.length ? `
        <div class="category-section" style="margin-top:1.5rem">
          <div class="category-section-header">最近烹饪</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:0.75rem">
            ${recentCards}
          </div>
        </div>` : ''}
    </div>
  `;
    // ── 绑定最近记录点击 → 查看详情 ───────────────
    shadow.querySelectorAll('.dash-card[data-recipe]').forEach(card => {
        card.addEventListener('click', () => {
            const recipeId = card.getAttribute('data-recipe');
            if (!recipeId)
                return;
            // 切换到食谱详情视图
            shadow.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            shadow.querySelector('.nav-btn[data-view="recipe-detail"]')?.classList.add('active');
            panel.currentView = 'recipe-detail';
            panel.setParamValues({ ...panel.getParamValues(), id: recipeId });
            panel.reload();
        });
    });
}
