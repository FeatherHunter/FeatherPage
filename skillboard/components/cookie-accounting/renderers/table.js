import { config } from '../config.js';
import { renderTable, renderParamForm } from '../../../shared/ui-helpers.js';
import { resolveShortcut, formatValue, formatDate } from '../../../shared/utils.js';
/**
 * 渲染通用表格视图
 * 支持：每日记录、最近记录、关键词搜索
 */
export async function renderTableView(panel, db, queryId, tableConfig) {
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
        paramHtml = renderParamForm(query.params, resolveShortcut, paramValues) + '<button class="apply-btn" id="apply-params">应用</button>';
    }
    // 执行查询
    const result = await db.exec(query.sql, paramValues);
    const allFields = config.schema.tables.flatMap(t => t.fields);
    // 渲染表格
    const tableHtml = renderTable(result, allFields, tableConfig);
    content.innerHTML = `${paramHtml}${tableHtml}`;
    // 绑定行点击 → 展开详情
    shadow.querySelectorAll('.data-table tbody tr').forEach(row => {
        row.addEventListener('click', () => {
            const rowIndex = Array.from(shadow.querySelectorAll('.data-table tbody tr')).indexOf(row);
            toggleRowDetail(shadow, result, allFields, rowIndex);
        });
    });
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
// ── 行详情展开/收起 ───────────────────────────
function toggleRowDetail(shadow, result, fields, rowIndex) {
    const tbody = shadow.querySelector('.data-table tbody');
    if (!tbody)
        return;
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const clickedRow = rows[rowIndex];
    if (!clickedRow)
        return;
    // 关闭已有详情行
    shadow.querySelectorAll('.row-detail').forEach(el => el.remove());
    const existingDetail = clickedRow.nextElementSibling;
    if (existingDetail?.classList.contains('row-detail')) {
        existingDetail.remove();
        return;
    }
    const row = result.rows?.[rowIndex];
    if (!row)
        return;
    const visibleCols = result.columns;
    const detailRow = document.createElement('tr');
    detailRow.className = 'row-detail';
    detailRow.innerHTML = `<td colspan="${visibleCols.length}">
    <div class="detail-panel">
      <div class="detail-panel-header">
        <span>记录详情</span>
        <button class="detail-close" aria-label="关闭详情">✕</button>
      </div>
      <div class="detail-grid">
        ${visibleCols.map(col => {
        const field = fields.find(f => f.name === col);
        const raw = row[col];
        let formatted = raw;
        if (field?.format === 'currency' || field?.format === 'number') {
            formatted = formatValue(raw, field.format, field.unit);
        }
        else if (field?.format === 'date' || field?.format === 'datetime') {
            formatted = formatDate(String(raw ?? ''), field.format);
        }
        const isPositive = field?.format === 'currency' && Number(raw) > 0;
        const isNegative = field?.format === 'currency' && Number(raw) < 0;
        const cssClass = isPositive ? 'positive' : isNegative ? 'negative' : '';
        return `<div class="detail-item">
            <span class="detail-label">${field?.label || col}</span>
            <span class="detail-value ${cssClass}">${formatted ?? '—'}</span>
          </div>`;
    }).join('')}
      </div>
    </div>
  </td>`;
    // 关闭按钮
    detailRow.querySelector('.detail-close')?.addEventListener('click', (e) => {
        e.stopPropagation();
        detailRow.remove();
    });
    // 插入详情行
    clickedRow.insertAdjacentElement('afterend', detailRow);
}
