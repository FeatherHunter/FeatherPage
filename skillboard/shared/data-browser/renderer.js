import { formatValue, formatDate } from '../utils.js';
/**
 * 渲染数据浏览器视图
 * 提供只读的数据库表数据浏览功能
 */
export async function renderDataBrowserView(panel, db) {
    const shadow = panel.getShadow();
    const content = shadow.getElementById('view-content');
    // Initialize state
    // 移动端（< 640px）默认折叠侧边栏
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const state = {
        currentTable: '',
        page: 1,
        pageSize: 50,
        filterColumn: '',
        filterValue: '',
        sortColumn: '',
        sortDirection: 'ASC',
        columns: [],
        sidebarCollapsed: isMobile,
        activeRowIndex: -1
    };
    // Get all table names
    const tablesResult = await db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    const tableNames = (tablesResult.rows || []).map((row) => row.name);
    if (tableNames.length === 0) {
        content.innerHTML = '<div class="empty-state"><p>No tables found</p></div>';
        return;
    }
    // Set initial table
    state.currentTable = tableNames[0];
    // Get table info and columns
    const tableInfo = await getTableInfo(db, state.currentTable);
    state.columns = tableInfo.columns.map(c => c.name);
    // Render initial view
    await renderView(shadow, db, state, tableNames, tableInfo);
    // Bind sidebar events (event delegation)
    shadow.addEventListener('click', async (e) => {
        const target = e.target;
        // Sidebar toggle
        if (target.id === 'sidebar-toggle' || target.closest('#sidebar-toggle')) {
            state.sidebarCollapsed = !state.sidebarCollapsed;
            await renderView(shadow, db, state, tableNames, tableInfo);
            // 调整侧边栏宽度
            const sidebar = shadow?.querySelector('.data-browser-sidebar');
            if (sidebar) {
                adjustSidebarWidth(sidebar, state);
            }
            return;
        }
        // Table item click
        const tableItem = target.closest('.table-item');
        if (!tableItem)
            return;
        const tableName = tableItem.dataset.table;
        if (!tableName)
            return;
        state.currentTable = tableName;
        state.page = 1;
        state.filterColumn = '';
        state.filterValue = '';
        state.sortColumn = '';
        state.sortDirection = 'ASC';
        state.activeRowIndex = -1;
        const newTableInfo = await getTableInfo(db, tableName);
        state.columns = newTableInfo.columns.map(c => c.name);
        await renderView(shadow, db, state, tableNames, newTableInfo);
    });
    // Bind pagination events (delegated)
    shadow.addEventListener('click', async (e) => {
        const target = e.target;
        // Page navigation
        if (target.id === 'db-first-page') {
            if (state.page !== 1) {
                state.page = 1;
                await refreshData(shadow, db, state, tableNames);
            }
        }
        else if (target.id === 'db-prev-page') {
            if (state.page > 1) {
                state.page--;
                await refreshData(shadow, db, state, tableNames);
            }
        }
        else if (target.id === 'db-next-page') {
            state.page++;
            await refreshData(shadow, db, state, tableNames);
        }
        else if (target.id === 'db-last-page') {
            const tc = await getTotalCount(db, state.currentTable, state.filterColumn, state.filterValue);
            const tp = Math.max(1, Math.ceil(tc / state.pageSize));
            if (state.page !== tp) {
                state.page = tp;
                await refreshData(shadow, db, state, tableNames);
            }
        }
        // Sort header click
        if (target.classList.contains('sortable-header')) {
            const col = target.dataset.column;
            if (!col)
                return;
            if (state.sortColumn === col) {
                state.sortDirection = state.sortDirection === 'ASC' ? 'DESC' : 'ASC';
            }
            else {
                state.sortColumn = col;
                state.sortDirection = 'ASC';
            }
            state.page = 1;
            await refreshData(shadow, db, state, tableNames);
        }
    });
    // Bind change events (page size + mobile table select)
    shadow.addEventListener('change', async (e) => {
        const target = e.target;
        if (target.id === 'db-page-size') {
            state.pageSize = parseInt(target.value, 10);
            state.page = 1;
            await refreshData(shadow, db, state, tableNames);
        }
        else if (target.id === 'table-select') {
            const tableName = target.value;
            if (!tableName)
                return;
            state.currentTable = tableName;
            state.page = 1;
            state.filterColumn = '';
            state.filterValue = '';
            state.sortColumn = '';
            state.sortDirection = 'ASC';
            state.activeRowIndex = -1;
            const newTableInfo = await getTableInfo(db, tableName);
            state.columns = newTableInfo.columns.map(c => c.name);
            await renderView(shadow, db, state, tableNames, newTableInfo);
        }
    });
    // Bind filter events
    shadow.addEventListener('input', async (e) => {
        const target = e.target;
        if (target.id === 'db-filter-column') {
            state.filterColumn = target.value;
            state.filterValue = '';
            const filterInput = shadow.getElementById('db-filter-value');
            if (filterInput)
                filterInput.value = '';
        }
        else if (target.id === 'db-filter-value') {
            state.filterValue = target.value;
        }
        // Debounced filter apply
        clearTimeout(shadow._filterTimeout);
        shadow._filterTimeout = setTimeout(async () => {
            state.page = 1;
            await refreshData(shadow, db, state, tableNames);
        }, 300);
    });
    // Bind row click for detail panel (event delegation)
    shadow.addEventListener('click', async (e) => {
        const target = e.target;
        // Close button in detail panel (must be before interactive element guard)
        if (target.classList.contains('detail-close') || target.closest('.detail-close')) {
            const detailRow = target.closest('.row-detail');
            if (detailRow)
                detailRow.remove();
            state.activeRowIndex = -1;
            return;
        }
        // Ignore clicks on interactive elements
        if (target.closest('button') || target.closest('select') || target.closest('input') || target.closest('a'))
            return;
        // Click on data row
        const tr = target.closest('tr');
        if (!tr)
            return;
        if (tr.classList.contains('row-detail'))
            return;
        // Ensure we're in the data table tbody
        if (!target.closest('tbody'))
            return;
        const tbody = tr.parentElement;
        if (!tbody)
            return;
        const rows = Array.from(tbody.querySelectorAll('tr:not(.row-detail)'));
        const rowIndex = rows.indexOf(tr);
        if (rowIndex === -1)
            return;
        // Toggle: click same row → close
        if (state.activeRowIndex === rowIndex) {
            const next = tr.nextElementSibling;
            if (next?.classList.contains('row-detail'))
                next.remove();
            state.activeRowIndex = -1;
            return;
        }
        // Close any open detail row
        tbody.querySelectorAll('.row-detail').forEach(el => el.remove());
        // Open new detail row
        const data = await getTableData(db, state.currentTable, state.page, state.pageSize, state.filterColumn, state.filterValue, state.sortColumn, state.sortDirection);
        const row = data.rows[rowIndex];
        if (!row)
            return;
        const detailRow = document.createElement('tr');
        detailRow.className = 'row-detail';
        detailRow.innerHTML = `<td colspan="${data.columns.length}">
      <div class="detail-panel">
        <div class="detail-panel-header">
          <span>记录详情 #${(state.page - 1) * state.pageSize + rowIndex + 1}</span>
          <button class="detail-close" aria-label="关闭详情">✕</button>
        </div>
        <div class="detail-grid">
          ${data.columns.map(col => {
            const raw = row[col];
            let formatted = raw;
            if (raw === null || raw === undefined) {
                formatted = '—';
            }
            else if (typeof raw === 'number') {
                formatted = formatValue(raw, 'number');
            }
            else if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
                formatted = formatDate(raw, 'datetime');
            }
            return `<div class="detail-item">
              <span class="detail-label">${escapeHtml(col)}</span>
              <span class="detail-value">${escapeHtml(String(formatted ?? '—'))}</span>
            </div>`;
        }).join('')}
        </div>
      </div>
    </td>`;
        tr.after(detailRow);
        state.activeRowIndex = rowIndex;
    });
}
/**
 * 调整侧边栏宽度
 * 折叠时由 CSS 处理（移动端 28px，桌面端 48px）
 * 展开时自动适配最宽表名并缓存
 */
function adjustSidebarWidth(sidebar, state) {
    // 折叠时由 CSS 处理，不通过 JS 设置宽度
    if (state.sidebarCollapsed) {
        return;
    }
    // 缓存逻辑：只在首次或无缓存时计算
    if (state._sidebarWidth) {
        sidebar.style.width = state._sidebarWidth;
        return;
    }
    // 计算最宽表名宽度
    const items = sidebar.querySelectorAll('.table-item');
    let maxWidth = 0;
    items.forEach(item => {
        const el = item;
        // 使用临时 span 测量文字实际宽度
        const span = document.createElement('span');
        span.style.visibility = 'hidden';
        span.style.position = 'absolute';
        span.style.whiteSpace = 'nowrap';
        span.style.font = getComputedStyle(el).font;
        span.textContent = el.textContent?.trim() || '';
        document.body.appendChild(span);
        const textWidth = span.getBoundingClientRect().width;
        document.body.removeChild(span);
        if (textWidth > maxWidth)
            maxWidth = textWidth;
    });
    // 如果宽度为 0，使用默认宽度
    if (maxWidth === 0) {
        maxWidth = 120;
    }
    // 加 item 的 padding（左右各 0.5rem = 8px）+ 侧边栏额外间距
    const itemPadding = 16; // .table-item 的左右 padding
    const extraPadding = 8; // 额外间距
    state._sidebarWidth = (maxWidth + itemPadding + extraPadding) + 'px';
    sidebar.style.width = state._sidebarWidth;
}
async function getTableInfo(db, tableName) {
    const result = await db.exec(`PRAGMA table_info('${tableName}')`);
    return {
        name: tableName,
        columns: (result.rows || [])
    };
}
async function getTotalCount(db, tableName, filterColumn, filterValue) {
    let sql = `SELECT COUNT(*) as count FROM '${tableName}'`;
    if (filterColumn && filterValue) {
        sql += ` WHERE ${filterColumn} LIKE '%${filterValue.replace(/'/g, "''")}%'`;
    }
    const result = await db.exec(sql);
    return (result.rows || [])[0]?.count ?? 0;
}
async function getTableData(db, tableName, page, pageSize, filterColumn, filterValue, sortColumn, sortDirection) {
    const offset = (page - 1) * pageSize;
    let sql = `SELECT * FROM '${tableName}'`;
    // Apply filter
    if (filterColumn && filterValue) {
        sql += ` WHERE ${filterColumn} LIKE '%${filterValue.replace(/'/g, "''")}%'`;
    }
    // Apply sort
    if (sortColumn) {
        sql += ` ORDER BY ${sortColumn} ${sortDirection}`;
    }
    // Apply pagination
    sql += ` LIMIT ${pageSize} OFFSET ${offset}`;
    const result = await db.exec(sql);
    return {
        columns: result.columns,
        rows: result.rows || []
    };
}
async function renderView(shadow, db, state, tableNames, tableInfo) {
    const content = shadow.getElementById('view-content');
    const totalCount = await getTotalCount(db, state.currentTable, state.filterColumn, state.filterValue);
    const totalPages = Math.max(1, Math.ceil(totalCount / state.pageSize));
    const data = await getTableData(db, state.currentTable, state.page, state.pageSize, state.filterColumn, state.filterValue, state.sortColumn, state.sortDirection);
    // Mobile detection for responsive layout
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    let sidebarHtml;
    let mobileDropdownHtml = '';
    if (isMobile) {
        // Mobile: dropdown select instead of sidebar
        sidebarHtml = '';
        mobileDropdownHtml = `
      <div class="table-select-wrapper">
        <select class="table-select" id="table-select">
          ${tableNames.map(name => `<option value="${name}" ${name === state.currentTable ? 'selected' : ''}>${name}</option>`).join('')}
        </select>
      </div>
    `;
    }
    else {
        // Desktop: sidebar
        sidebarHtml = `
      <div class="data-browser-sidebar ${state.sidebarCollapsed ? 'collapsed' : ''}">
        <div class="sidebar-header">
          <button class="sidebar-toggle" id="sidebar-toggle" title="${state.sidebarCollapsed ? '展开' : '折叠'}">
            ${state.sidebarCollapsed ? '▶' : '◀'}
          </button>
          <h3>${state.sidebarCollapsed ? '' : '表列表'}</h3>
        </div>
        <div class="table-list">
          ${tableNames.map(name => `
            <div class="table-item ${name === state.currentTable ? 'active' : ''}" data-table="${name}">
              ${name}
            </div>
          `).join('')}
        </div>
      </div>
    `;
    }
    // Build filter options
    const filterColumnOptions = tableInfo.columns.map(col => `<option value="${col.name}" ${col.name === state.filterColumn ? 'selected' : ''}>${col.name}</option>`).join('');
    // Build data table HTML
    const tableRowsHtml = data.rows.map(row => {
        return `<tr class="data-row">${data.columns.map(col => {
            const raw = row[col];
            let formatted = raw;
            if (raw === null || raw === undefined) {
                formatted = '—';
            }
            else if (typeof raw === 'number') {
                formatted = formatValue(raw, 'number');
            }
            else if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
                formatted = formatDate(raw, 'datetime');
            }
            return `<td data-field="${col}" data-raw="${escapeHtml(String(raw ?? ''))}">${formatted}</td>`;
        }).join('')}</tr>`;
    }).join('');
    const sortIndicator = (col) => {
        if (state.sortColumn !== col)
            return '';
        return state.sortDirection === 'ASC' ? ' ▲' : ' ▼';
    };
    const tableHtml = `
    <div class="data-browser-main">
      ${mobileDropdownHtml}
      <div class="data-browser-toolbar">
        <span class="current-table">${state.currentTable}</span>
        <span class="field-count">${tableInfo.columns.length} 个字段</span>
        <div class="pagination-controls">
          <select id="db-page-size" class="page-size-select">
            <option value="20" ${state.pageSize === 20 ? 'selected' : ''}>20</option>
            <option value="50" ${state.pageSize === 50 ? 'selected' : ''}>50</option>
            <option value="100" ${state.pageSize === 100 ? 'selected' : ''}>100</option>
          </select>
          <button id="db-first-page" class="page-btn" ${state.page === 1 ? 'disabled' : ''}>首页</button>
          <button id="db-prev-page" class="page-btn" ${state.page === 1 ? 'disabled' : ''}>上一页</button>
          <span class="page-info">第 ${state.page}/${totalPages} 页</span>
          <button id="db-next-page" class="page-btn" ${state.page >= totalPages ? 'disabled' : ''}>下一页</button>
          <button id="db-last-page" class="page-btn" ${state.page >= totalPages ? 'disabled' : ''}>尾页</button>
        </div>
      </div>

      <div class="filter-bar">
        <select id="db-filter-column" class="filter-column-select">
          <option value="">选择字段</option>
          ${filterColumnOptions}
        </select>
        <input type="text" id="db-filter-value" class="filter-input"
          placeholder="筛选值..." value="${state.filterValue}"
          ${!state.filterColumn ? 'disabled' : ''}>
      </div>

      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              ${data.columns.map(col => `
                <th class="sortable-header" data-column="${col}">${col}${sortIndicator(col)}</th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml || '<tr><td colspan="${data.columns.length}" class="empty-cell">暂无数据</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="table-footer">
        <span class="total-count">共 ${totalCount} 条</span>
      </div>
    </div>
  `;
    content.innerHTML = `<style>${getTableStyles()}</style><div class="data-browser">${sidebarHtml}${tableHtml}</div>`;
    // 渲染完成后调整侧边栏宽度（使用 requestAnimationFrame 确保布局完成）
    requestAnimationFrame(() => {
        const sidebar = shadow?.querySelector('.data-browser-sidebar');
        if (sidebar) {
            adjustSidebarWidth(sidebar, state);
        }
        // 渲染完成后设置列宽（基于表头文字宽度）
        adjustColumnWidths(shadow);
    });
}
/**
 * 设置列宽：根据表头文字宽度按比例分配容器宽度
 */
function adjustColumnWidths(shadow) {
    const table = shadow.querySelector('.data-table');
    if (!table)
        return;
    const ths = table.querySelectorAll('th');
    if (ths.length === 0)
        return;
    // Get container width
    const containerWidth = table.parentElement?.getBoundingClientRect().width;
    if (!containerWidth || containerWidth <= 0)
        return;
    // Measure header text widths via canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx)
        return;
    const firstTh = ths[0];
    const computedStyle = getComputedStyle(firstTh);
    ctx.font = `${computedStyle.fontWeight} ${computedStyle.fontSize} ${computedStyle.fontFamily}`;
    const textWidths = [];
    let totalTextWidth = 0;
    ths.forEach((th) => {
        const text = th.textContent?.trim() || '';
        const w = Math.ceil(ctx.measureText(text).width);
        textWidths.push(w);
        totalTextWidth += w;
    });
    if (totalTextWidth <= 0)
        return;
    // Set percentage widths for proportional distribution
    // table-layout: fixed + width: 100% handles the actual sizing
    const rawPcts = [];
    let pctSum = 0;
    ths.forEach((th) => {
        const text = th.textContent?.trim() || '';
        const w = Math.ceil(ctx.measureText(text).width);
        const pct = Math.max(Math.round((w / totalTextWidth) * 100), 3);
        rawPcts.push(pct);
        pctSum += pct;
    });
    // Scale down if over 100%, assign remainder to widest column
    let finalPcts;
    if (pctSum > 100) {
        const scale = 100 / pctSum;
        finalPcts = rawPcts.map(p => Math.max(Math.floor(p * scale), 2));
    }
    else {
        finalPcts = [...rawPcts];
    }
    // Assign remainder to fill 100%
    let remainder = 100 - finalPcts.reduce((s, p) => s + p, 0);
    const widestIdx = rawPcts.indexOf(Math.max(...rawPcts));
    finalPcts[widestIdx] += remainder;
    ths.forEach((th, i) => {
        ;
        th.style.width = finalPcts[i] + '%';
    });
    // Table fills container
    table.style.width = '100%';
    table.style.maxWidth = '100%';
}
/**
 * 获取数据表格 CSS 样式
 */
function getTableStyles() {
    return `
    .data-table {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    .data-browser .table-wrapper {
      overflow-x: hidden;
    }
    .data-table th {
      background: #f8fafc;
      padding: 0.75rem;
      text-align: left;
      font-weight: 600;
      color: #475569;
      border-bottom: 2px solid #e2e8f0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
    }
    .data-table td {
      padding: 0.75rem;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .data-table tr:hover td {
      background: #f8fafc;
    }
    .data-table td.positive {
      color: #10B981;
      font-weight: 600;
    }
    .data-table td.negative {
      color: #EF4444;
      font-weight: 600;
    }
    tr.data-row {
      cursor: pointer;
      transition: background 0.15s;
    }
    tr.data-row:hover td {
      background: #f8fafc;
    }
    .row-detail td {
      padding: 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .detail-panel {
      background: #f8fafc;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      margin: 0.25rem 0;
      max-width: 100%;
      overflow: hidden;
    }
    .detail-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .detail-panel-header span {
      font-size: 0.75rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
    }
    .detail-close {
      background: none;
      border: none;
      cursor: pointer;
      color: #94a3b8;
      font-size: 1rem;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .detail-close:hover {
      background: #e2e8f0;
      color: #475569;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 0.75rem;
    }
    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      min-width: 0;
      max-width: 100%;
    }
    .detail-label {
      font-size: 0.65rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .detail-value {
      font-size: 0.8rem;
      color: #1e293b;
      font-family: 'Geist Mono', monospace;
      word-break: break-all;
      min-width: 0;
      overflow-wrap: break-word;
      white-space: normal;
    }
    .table-select-wrapper {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .table-select {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 0.875rem;
      background: #fff;
      color: #1e293b;
    }
  `;
}
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
async function refreshData(shadow, db, state, tableNames) {
    const tableInfo = await getTableInfo(db, state.currentTable);
    const totalCount = await getTotalCount(db, state.currentTable, state.filterColumn, state.filterValue);
    const totalPages = Math.max(1, Math.ceil(totalCount / state.pageSize));
    state.activeRowIndex = -1;
    // Close any open detail rows
    shadow.querySelectorAll('.row-detail').forEach(el => el.remove());
    // Update just the main content area
    const mainEl = shadow.querySelector('.data-browser-main');
    if (!mainEl)
        return;
    const data = await getTableData(db, state.currentTable, state.page, state.pageSize, state.filterColumn, state.filterValue, state.sortColumn, state.sortDirection);
    // Update table name and field count
    const tableNameEl = mainEl.querySelector('.current-table');
    if (tableNameEl)
        tableNameEl.textContent = state.currentTable;
    const fieldCountEl = mainEl.querySelector('.field-count');
    if (fieldCountEl)
        fieldCountEl.textContent = `${tableInfo.columns.length} 个字段`;
    // Update filter column options
    const filterColumnSelect = shadow.getElementById('db-filter-column');
    if (filterColumnSelect) {
        const currentFilterCol = state.filterColumn;
        filterColumnSelect.innerHTML = `<option value="">选择字段</option>` +
            tableInfo.columns.map(col => `<option value="${col.name}">${col.name}</option>`).join('');
        if (currentFilterCol && tableInfo.columns.some(c => c.name === currentFilterCol)) {
            filterColumnSelect.value = currentFilterCol;
        }
        else {
            state.filterColumn = '';
            state.filterValue = '';
        }
    }
    // Update filter input state
    const filterInput = shadow.getElementById('db-filter-value');
    if (filterInput) {
        filterInput.value = state.filterValue;
        filterInput.disabled = !state.filterColumn;
    }
    // Update table header with sort indicators
    const thead = mainEl.querySelector('thead tr');
    if (thead) {
        thead.innerHTML = data.columns.map(col => {
            let indicator = '';
            if (state.sortColumn === col) {
                indicator = state.sortDirection === 'ASC' ? ' ▲' : ' ▼';
            }
            return `<th class="sortable-header" data-column="${col}">${col}${indicator}</th>`;
        }).join('');
    }
    // Update table body
    const tbody = mainEl.querySelector('tbody');
    if (tbody) {
        if (data.rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${data.columns.length}" class="empty-cell">No data</td></tr>`;
        }
        else {
            tbody.innerHTML = data.rows.map(row => {
                return `<tr class="data-row">${data.columns.map(col => {
                    const raw = row[col];
                    let formatted = raw;
                    if (raw === null || raw === undefined) {
                        formatted = '—';
                    }
                    else if (typeof raw === 'number') {
                        formatted = formatValue(raw, 'number');
                    }
                    else if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
                        formatted = formatDate(raw, 'datetime');
                    }
                    return `<td data-field="${col}" data-raw="${escapeHtml(String(raw ?? ''))}">${formatted}</td>`;
                }).join('')}</tr>`;
            }).join('');
        }
    }
    // Update pagination controls
    const pageInfo = mainEl.querySelector('.page-info');
    if (pageInfo)
        pageInfo.textContent = `第 ${state.page}/${totalPages} 页`;
    const totalEl = mainEl.querySelector('.total-count');
    if (totalEl)
        totalEl.textContent = `共 ${totalCount} 条`;
    // Update button states
    const firstBtn = shadow.getElementById('db-first-page');
    const prevBtn = shadow.getElementById('db-prev-page');
    const nextBtn = shadow.getElementById('db-next-page');
    const lastBtn = shadow.getElementById('db-last-page');
    if (firstBtn)
        firstBtn.disabled = state.page === 1;
    if (prevBtn)
        prevBtn.disabled = state.page === 1;
    if (nextBtn)
        nextBtn.disabled = state.page >= totalPages;
    if (lastBtn)
        lastBtn.disabled = state.page >= totalPages;
}
