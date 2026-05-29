import { config } from '../config.js';
import { ChartRenderer } from '../../../shared/chart-renderer.js';
/**
 * 渲染 Home Manager 仪表盘视图
 * 显示：物品总数、位置总数、状态分布(环形图)、分类分布(柱状图)
 */
export async function renderDashboardView(panel, db) {
    const shadow = panel.getShadow();
    const content = shadow.getElementById('view-content');
    // ── 并行查询：汇总 + 状态分布 + 分类分布 ─────────
    const [summaryResult, statusResult, catResult] = await Promise.all([
        db.exec(config.queries.find(q => q.id === 'stats-summary').sql, {}),
        db.exec(config.queries.find(q => q.id === 'status-summary').sql, {}),
        db.exec(config.queries.find(q => q.id === 'category-summary').sql, {}),
    ]);
    const summary = (summaryResult.rows || [])[0] || {};
    const totalItems = Number(summary['total_items'] ?? 0);
    const totalLocations = Number(summary['total_locations'] ?? 0);
    // ── 数字卡 ──────────────────────────────────────
    const cardsHtml = `
    <div class="dash-cards">
      <div class="dash-card">
        <div class="dash-card-label">物品总数</div>
        <div class="dash-card-value neutral">${totalItems}</div>
        <div class="dash-card-unit">件</div>
      </div>
      <div class="dash-card">
        <div class="dash-card-label">位置记录</div>
        <div class="dash-card-value neutral">${totalLocations}</div>
        <div class="dash-card-unit">条</div>
      </div>
    </div>`;
    // ── 图表区 ─────────────────────────────────────
    const chartsHtml = `
    <div class="dashboard-charts">
      ${statusResult.rows?.length
        ? `<div class="chart-section">
            <div class="chart-section-header">物品状态分布</div>
            <div class="chart-wrapper"><canvas id="status-chart-canvas"></canvas></div>
          </div>` : ''}
      ${catResult.rows?.length
        ? `<div class="chart-section">
            <div class="chart-section-header">分类分布</div>
            <div class="chart-wrapper"><canvas id="category-chart-canvas"></canvas></div>
          </div>` : ''}
    </div>`;
    content.innerHTML = `
    <div class="dashboard">
      <div class="dashboard-header"><span>概览</span></div>
      ${cardsHtml}
      ${chartsHtml}
    </div>`;
    // ── 渲染状态环形图 ─────────────────────────────
    const statusCanvas = shadow.getElementById('status-chart-canvas');
    if (statusCanvas && statusResult.rows?.length) {
        const renderer = new ChartRenderer(statusCanvas);
        renderer.render('doughnut', statusResult.rows.map(r => r['location_status']), [{
                label: '状态分布',
                data: statusResult.rows.map(r => Number(r['cnt']) || 0),
            }]);
    }
    // ── 渲染分类柱状图 ─────────────────────────────
    const catCanvas = shadow.getElementById('category-chart-canvas');
    if (catCanvas && catResult.rows?.length) {
        const renderer = new ChartRenderer(catCanvas);
        renderer.render('bar', catResult.rows.map(r => r['location_status']), [{
                label: '分类数量',
                data: catResult.rows.map(r => Number(r['cnt']) || 0),
            }]);
    }
}
