import { formatValue, formatDate } from './utils.js';
export function renderTable(result, fields, options) {
    if (!result.rows || result.rows.length === 0) {
        return `<div class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>暂无数据</p>
    </div>`;
    }
    const visibleCols = options?.columns
        ? result.columns.filter(c => options.columns.includes(c))
        : result.columns;
    let html = `<div class="table-wrapper"><table class="data-table">`;
    html += `<thead><tr>`;
    visibleCols.forEach(col => {
        const field = fields.find(f => f.name === col);
        const label = field?.label || col;
        html += `<th>${label}</th>`;
    });
    html += `</tr></thead><tbody>`;
    result.rows.slice(0, options?.pageSize || 50).forEach(row => {
        html += `<tr>`;
        visibleCols.forEach(col => {
            const field = fields.find(f => f.name === col);
            const raw = row[col];
            let formatted = raw;
            if (field?.format === 'currency' || field?.format === 'number') {
                formatted = formatValue(raw, field.format, field.unit);
            }
            else if (field?.format === 'date' || field?.format === 'datetime') {
                formatted = formatDate(String(raw ?? ''), field.format);
            }
            const isNegative = field?.format === 'currency' && Number(raw) < 0;
            html += `<td${isNegative ? ' class="negative"' : ''}>${formatted ?? '—'}</td>`;
        });
        html += `</tr>`;
    });
    html += `</tbody></table></div>`;
    return html;
}
export function renderParamForm(params, resolveShortcutFn, currentValues) {
    if (!params || params.length === 0)
        return '';
    let html = `<div class="param-form">`;
    params.forEach(p => {
        if (p.type === 'hidden')
            return;
        html += `<div class="param-field">`;
        html += `<label for="param-${p.name}">${p.label}</label>`;
        const currentVal = currentValues?.[p.name];
        if (p.type === 'select' && p.options) {
            html += `<select id="param-${p.name}" name="${p.name}" class="param-input">`;
            p.options.forEach(opt => {
                const selected = (currentVal ?? p.default) === opt.value ? 'selected' : '';
                html += `<option value="${opt.value}" ${selected}>${opt.label}</option>`;
            });
            html += `</select>`;
        }
        else if (p.type === 'date' || p.type === 'month') {
            const val = currentVal ?? (p.default ? resolveShortcutFn(p.default) : '');
            html += `<input type="${p.type === 'month' ? 'month' : 'date'}" id="param-${p.name}" name="${p.name}" value="${val}" class="param-input" />`;
        }
        else {
            html += `<input type="text" id="param-${p.name}" name="${p.name}" placeholder="${p.label}" value="${currentVal ?? p.default ?? ''}" class="param-input" />`;
        }
        html += `</div>`;
    });
    html += `</div>`;
    return html;
}
