import { config } from '../config.js';
import { renderParamForm } from '../../../shared/ui-helpers.js';
import { resolveShortcut } from '../../../shared/utils.js';
import { ChartRenderer } from '../../../shared/chart-renderer.js';
/**
 * 渲染通用图表视图
 */
export async function renderChartView(panel, db, queryId) {
    const shadow = panel.getShadow();
    const content = shadow.getElementById('view-content');
    const paramValues = panel.getParamValues();
    const query = config.queries.find(q => q.id === queryId);
    if (!query) {
        content.innerHTML = `<div class="empty-state"><p>Query not found: ${queryId}</p></div>`;
        return;
    }
    // 参数表单
    let paramHtml = '';
    if (query.params?.length) {
        paramHtml = renderParamForm(query.params, resolveShortcut) + '<button class="apply-btn" id="apply-params">应用</button>';
    }
    // 执行查询
    const result = await db.exec(query.sql, paramValues);
    if (!result.rows?.length) {
        content.innerHTML = `${paramHtml}<div class="empty-state"><p>暂无数据</p></div>`;
        return;
    }
    // 渲染图表
    const labels = result.rows.map(r => r[result.columns[0]]);
    const chartType = (query.chartType || 'bar');
    content.innerHTML = `${paramHtml}<div class="chart-wrapper"><canvas id="chart-canvas"></canvas></div>`;
    const canvas = shadow.getElementById('chart-canvas');
    const renderer = new ChartRenderer(canvas);
    renderer.render(chartType, labels, [{
            label: query.label,
            data: result.rows.map(r => Number(r[result.columns[1]]) || 0),
            colorScheme: query.chartConfig?.colorScheme,
        }]);
    // 绑定「应用」按钮
    const applyBtn = shadow.getElementById('apply-params');
    applyBtn?.addEventListener('click', async () => {
        const newParams = {};
        query.params?.forEach(p => {
            const input = shadow.querySelector(`[name="${p.name}"]`);
            if (input)
                newParams[p.name] = input.value;
        });
        panel.setParamValues(newParams);
        await panel.reload();
    });
}
