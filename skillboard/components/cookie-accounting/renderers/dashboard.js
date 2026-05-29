import { config } from '../config.js';
/**
 * 渲染仪表盘视图
 * 显示：本月支出/收入/结余/笔数 + 分类占比条
 */
export async function renderDashboardView(panel, db) {
    const shadow = panel.getShadow();
    const content = shadow.getElementById('view-content');
    // ── 骨架屏 ─────────────────────────────────────
    content.innerHTML = `
    <div class="dashboard">
      <div class="dashboard-header"><span>本月概览</span></div>
      <div class="dash-cards">
        ${[1, 2, 3, 4].map(() => '<div class="dash-card skeleton skeleton-card"></div>').join('')}
      </div>
    </div>
  `;
    // ── 计算当月日期范围 ──────────────────────────
    const now = new Date();
    const month = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const monthLastday = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString().split('T')[0];
    const params = { month, month_lastday: monthLastday };
    // ── 并行查询：月度汇总 + 分类占比（容错） ───────────────
    const [overviewResult, catResult] = await Promise.allSettled([
        db.exec(config.queries.find(q => q.id === 'monthly-overview').sql, params),
        db.exec(config.queries.find(q => q.id === 'category-breakdown').sql, params),
    ]);
    const overview = overviewResult.status === 'fulfilled'
        ? (overviewResult.value.rows || [])[0] || {}
        : {};
    const count = Number(overview['count'] ?? 0);
    const expense = Number(overview['expense'] ?? 0);
    const income = Number(overview['income'] ?? 0);
    const net = Number(overview['net'] ?? 0);
    // ── 分类条 ────────────────────────────────────
    const topCategories = catResult.status === 'fulfilled'
        ? (catResult.value.rows || [])
        : []
            .slice(0, 5);
    const totalCatAmount = topCategories.reduce((s, r) => s + Number(r['total'] || 0), 0);
    const CHART_COLORS = ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'];
    const categoryBars = topCategories.map((r, i) => {
        const pct = totalCatAmount > 0
            ? (Number(r['total']) / totalCatAmount * 100).toFixed(1) : '0';
        const color = CHART_COLORS[i % CHART_COLORS.length];
        return `
      <div class="category-bar-row">
        <span class="category-name">${r['category']}</span>
        <div class="category-bar-track">
          <div class="category-bar-fill" style="width:${pct}%;background:${color}"></div>
        </div>
        <span class="category-pct">${pct}%</span>
      </div>`;
    }).join('');
    // ── 金额颜色 ──────────────────────────────────
    const expenseStr = expense > 0 ? expense.toFixed(2) : '0.00';
    const incomeStr = income > 0 ? income.toFixed(2) : '0.00';
    const netAbs = Math.abs(net).toFixed(2);
    const netSign = net >= 0 ? '+' : '-';
    const netClass = net >= 0 ? 'positive-net' : 'negative-net';
    // ── 渲染 ──────────────────────────────────────
    content.innerHTML = `
    <div class="dashboard">
      <div class="dashboard-header">
        <span>本月概览</span>
      </div>

      <div class="dash-cards">
        <div class="dash-card" data-view="monthly" role="button" tabindex="0" aria-label="查看本月支出">
          <div class="dash-card-label">本月支出</div>
          <div class="dash-card-value expense">-${expenseStr}</div>
          <div class="dash-card-unit">元</div>
        </div>

        <div class="dash-card" data-view="time-dimension" role="button" tabindex="0" aria-label="查看本月收入">
          <div class="dash-card-label">本月收入</div>
          <div class="dash-card-value income">+${incomeStr}</div>
          <div class="dash-card-unit">元</div>
        </div>

        <div class="dash-card" data-view="time-dimension" role="button" tabindex="0" aria-label="查看本月结余">
          <div class="dash-card-label">本月结余</div>
          <div class="dash-card-value ${netClass}">${netSign}${netAbs}</div>
          <div class="dash-card-unit">元</div>
        </div>

        <div class="dash-card" data-view="recent" role="button" tabindex="0" aria-label="查看本月笔数">
          <div class="dash-card-label">记账笔数</div>
          <div class="dash-card-value neutral">${count}</div>
          <div class="dash-card-unit">笔</div>
        </div>
      </div>

      ${categoryBars ? `
        <div class="category-section">
          <div class="category-section-header">支出分类占比</div>
          <div class="category-list">${categoryBars}</div>
        </div>` : ''}
    </div>
  `;
    // ── 绑定数字卡点击 → 跳转视图 ─────────────────
    shadow.querySelectorAll('.dash-card[data-view]').forEach(card => {
        const handler = () => {
            const target = card.getAttribute('data-view');
            if (!target)
                return;
            // 更新 nav active + currentView + reload
            shadow.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            shadow.querySelector(`.nav-btn[data-view="${target}"]`)?.classList.add('active');
            panel.currentView = target;
            // 收入/结余跳转时显式设置为月报
            if (target === 'time-dimension') {
                panel.setParamValues({
                    ...panel.getParamValues(),
                    _granularity: 'month'
                });
            }
            panel.reload();
        };
        card.addEventListener('click', handler);
        card.addEventListener('keydown', (e) => {
            const ke = e;
            if (ke.key === 'Enter' || ke.key === ' ') {
                ke.preventDefault();
                card.dispatchEvent(new Event('click'));
            }
        });
    });
}
