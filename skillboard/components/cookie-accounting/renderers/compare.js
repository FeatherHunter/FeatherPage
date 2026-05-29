import { config } from '../config.js';
import { ChartRenderer } from '../../../shared/chart-renderer.js';
import { getWeekRange, getLastWeekRange, getLastMonthRange, getLastYearRange, getMonthLastDay, interpolateSQL } from '../../../shared/utils.js';
const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
function fmt(n) {
    return Math.round(Number(n) * 100) / 100;
}
function getWeekSelectorOptions(selectedStart, selectedEnd) {
    const now = new Date();
    const options = [];
    for (let i = 0; i < 12; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 7);
        const range = getWeekRange(d);
        const label = `${range.weekStart} ~ ${range.weekEnd}`;
        const selected = range.weekStart === selectedStart && range.weekEnd === selectedEnd ? 'selected' : '';
        options.push(`<option value="${range.weekStart}|${range.weekEnd}" ${selected}>${label}</option>`);
    }
    return options.join('');
}
function getMonthSelectorOptions(selectedMonth) {
    const now = new Date();
    const options = [];
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const selected = month === selectedMonth ? 'selected' : '';
        options.push(`<option value="${month}" ${selected}>${month}</option>`);
    }
    return options.join('');
}
function getYearSelectorOptions(selectedYear) {
    const now = new Date();
    const options = [];
    for (let i = 0; i < 5; i++) {
        const year = String(now.getFullYear() - i);
        const selected = year === selectedYear ? 'selected' : '';
        options.push(`<option value="${year}" ${selected}>${year}年</option>`);
    }
    return options.join('');
}
export async function renderCompareView(panel, db, mode = 'month') {
    const shadow = panel.getShadow();
    const content = shadow.getElementById('view-content');
    const paramValues = panel.getParamValues();
    const now = new Date();
    // Determine two periods to compare (A = baseline, B = current)
    let periodA;
    let periodB;
    if (mode === 'week') {
        const aKey = paramValues['_week_a'] || '';
        const bKey = paramValues['_week_b'] || '';
        const current = getWeekRange(now);
        const past = getLastWeekRange();
        if (aKey) {
            const [start, end] = aKey.split('|');
            periodA = { week_start: start, week_end: end };
        }
        else {
            periodA = { week_start: past.weekStart, week_end: past.weekEnd };
        }
        if (bKey) {
            const [start, end] = bKey.split('|');
            periodB = { week_start: start, week_end: end };
        }
        else {
            periodB = { week_start: current.weekStart, week_end: current.weekEnd };
        }
    }
    else if (mode === 'month') {
        const aMonth = paramValues['_month_a'] || '';
        const bMonth = paramValues['_month_b'] || '';
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const lastMonth = getLastMonthRange().month;
        periodA = aMonth
            ? { month: aMonth, month_lastday: getMonthLastDay(aMonth) }
            : { month: lastMonth, month_lastday: getMonthLastDay(lastMonth) };
        periodB = bMonth
            ? { month: bMonth, month_lastday: getMonthLastDay(bMonth) }
            : { month: currentMonth, month_lastday: getMonthLastDay(currentMonth) };
    }
    else {
        const aYear = paramValues['_year_a'] || '';
        const bYear = paramValues['_year_b'] || '';
        const currentYear = String(now.getFullYear());
        const pastYear = getLastYearRange().year;
        periodA = { year: aYear || pastYear };
        periodB = { year: bYear || currentYear };
    }
    // Build period selector HTML
    let periodSelectorsHtml = '';
    if (mode === 'week') {
        periodSelectorsHtml = `
      <div class="compare-period-selectors">
        <div class="period-selector">
          <label>对比基准</label>
          <select id="period-a" class="period-select">${getWeekSelectorOptions(periodA.week_start, periodA.week_end)}</select>
        </div>
        <span class="vs-label">vs</span>
        <div class="period-selector">
          <label>当前期</label>
          <select id="period-b" class="period-select">${getWeekSelectorOptions(periodB.week_start, periodB.week_end)}</select>
        </div>
      </div>`;
    }
    else if (mode === 'month') {
        periodSelectorsHtml = `
      <div class="compare-period-selectors">
        <div class="period-selector">
          <label>对比基准</label>
          <select id="period-a" class="period-select">${getMonthSelectorOptions(periodA.month)}</select>
        </div>
        <span class="vs-label">vs</span>
        <div class="period-selector">
          <label>当前期</label>
          <select id="period-b" class="period-select">${getMonthSelectorOptions(periodB.month)}</select>
        </div>
      </div>`;
    }
    else {
        periodSelectorsHtml = `
      <div class="compare-period-selectors">
        <div class="period-selector">
          <label>对比基准</label>
          <select id="period-a" class="period-select">${getYearSelectorOptions(periodA.year)}</select>
        </div>
        <span class="vs-label">vs</span>
        <div class="period-selector">
          <label>当前期</label>
          <select id="period-b" class="period-select">${getYearSelectorOptions(periodB.year)}</select>
        </div>
      </div>`;
    }
    content.innerHTML = `
    <div class="compare-view">
      <div class="compare-header">
        <select id="compare-mode" class="compare-mode-select">
          <option value="week" ${mode === 'week' ? 'selected' : ''}>周对比</option>
          <option value="month" ${mode === 'month' ? 'selected' : ''}>月对比</option>
          <option value="year" ${mode === 'year' ? 'selected' : ''}>年对比</option>
        </select>
      </div>
      ${periodSelectorsHtml}
      <div class="compare-body">
        <div class="chart-section">
          <h3>支出对比</h3>
          <div class="chart-wrapper"><canvas id="compare-bar"></canvas></div>
        </div>
        <div class="chart-section">
          <h3>分类占比</h3>
          <div class="chart-wrapper compare-pie-container">
            <div class="pie-wrapper"><canvas id="compare-pie-a"></canvas><div class="pie-label"></div></div>
            <div class="pie-wrapper"><canvas id="compare-pie-b"></canvas><div class="pie-label"></div></div>
          </div>
        </div>
        <div class="chart-section">
          <h3>趋势对比</h3>
          <div class="chart-wrapper"><canvas id="compare-trend"></canvas></div>
        </div>
      </div>
    </div>
  `;
    // Bind mode change
    shadow.getElementById('compare-mode')?.addEventListener('change', (e) => {
        panel.setParamValues({ ...panel.getParamValues(), _compare_mode: e.target.value });
        panel.reload();
    });
    // Bind period A change
    shadow.getElementById('period-a')?.addEventListener('change', (e) => {
        const val = e.target.value;
        if (mode === 'week')
            panel.setParamValues({ ...panel.getParamValues(), _week_a: val });
        else if (mode === 'month')
            panel.setParamValues({ ...panel.getParamValues(), _month_a: val });
        else
            panel.setParamValues({ ...panel.getParamValues(), _year_a: val });
        panel.reload();
    });
    // Bind period B change
    shadow.getElementById('period-b')?.addEventListener('change', (e) => {
        const val = e.target.value;
        if (mode === 'week')
            panel.setParamValues({ ...panel.getParamValues(), _week_b: val });
        else if (mode === 'month')
            panel.setParamValues({ ...panel.getParamValues(), _month_b: val });
        else
            panel.setParamValues({ ...panel.getParamValues(), _year_b: val });
        panel.reload();
    });
    // Query IDs and labels
    let barQueryId, pieQueryId, trendQueryId;
    let labelA, labelB;
    if (mode === 'week') {
        barQueryId = 'compare-weekly-bar';
        pieQueryId = 'compare-weekly-category-pie';
        trendQueryId = 'compare-weekly-bar';
        labelA = '基准周';
        labelB = '对比周';
    }
    else if (mode === 'month') {
        barQueryId = 'compare-monthly-bar';
        pieQueryId = 'compare-monthly-category-pie';
        trendQueryId = 'compare-monthly-bar';
        labelA = periodA.month;
        labelB = periodB.month;
    }
    else {
        barQueryId = 'compare-yearly-bar';
        pieQueryId = 'compare-yearly-category-pie';
        trendQueryId = 'compare-yearly-bar';
        labelA = periodA.year + '年';
        labelB = periodB.year + '年';
    }
    const barQuery = config.queries.find(q => q.id === barQueryId);
    const pieQuery = config.queries.find(q => q.id === pieQueryId);
    const trendQuery = config.queries.find(q => q.id === trendQueryId);
    // Execute queries: bar+pie use both A and B for comparison; trend uses both A and B
    const [barAResult, barBResult, pieAResult, pieBResult] = await Promise.allSettled([
        barQuery ? db.exec(interpolateSQL(barQuery.sql, periodA), {}) : Promise.resolve(null),
        barQuery ? db.exec(interpolateSQL(barQuery.sql, periodB), {}) : Promise.resolve(null),
        pieQuery ? db.exec(interpolateSQL(pieQuery.sql, periodA), {}) : Promise.resolve(null),
        pieQuery ? db.exec(interpolateSQL(pieQuery.sql, periodB), {}) : Promise.resolve(null),
    ]);
    const [trendAResult, trendBResult] = await Promise.allSettled([
        trendQuery ? db.exec(interpolateSQL(trendQuery.sql, periodA), {}) : Promise.resolve(null),
        trendQuery ? db.exec(interpolateSQL(trendQuery.sql, periodB), {}) : Promise.resolve(null),
    ]);
    // Render bar (grouped: 2 bars per category - periodA vs periodB)
    const barCanvas = shadow.getElementById('compare-bar');
    if (barCanvas) {
        const aRows = barAResult.status === 'fulfilled' ? (barAResult.value?.rows || []) : [];
        const bRows = barBResult.status === 'fulfilled' ? (barBResult.value?.rows || []) : [];
        if (aRows.length > 0 || bRows.length > 0) {
            const key = mode === 'week' ? 'weekday' : mode === 'month' ? 'day' : 'month';
            const maxLabels = mode === 'week' ? 7 : mode === 'month' ? 31 : 12;
            const mapToData = (rows) => {
                const arr = new Array(maxLabels).fill(0);
                rows.forEach(r => {
                    const idx = parseInt(r[key] || (mode === 'week' ? '0' : '1'), 10);
                    const normalizedIdx = mode === 'week' ? idx : idx - 1;
                    if (normalizedIdx >= 0 && normalizedIdx < maxLabels)
                        arr[normalizedIdx] = fmt(r['total']);
                });
                return arr;
            };
            const labels = mode === 'week' ? WEEKDAY_LABELS
                : mode === 'month' ? Array.from({ length: 31 }, (_, i) => `${i + 1}日`)
                    : MONTH_LABELS;
            new ChartRenderer(barCanvas).render('bar', labels, [
                { label: labelA, data: mapToData(aRows), colorScheme: ['#2563EB'] },
                { label: labelB, data: mapToData(bRows), colorScheme: ['#FF6B6B'] }
            ], { plugins: { legend: { display: true, position: 'top' } }, scales: { y: { beginAtZero: true } } });
        }
    }
    // Render pie (two side-by-side: periodA vs periodB)
    const pieCanvasA = shadow.getElementById('compare-pie-a');
    const pieCanvasB = shadow.getElementById('compare-pie-b');
    const pieLabelA = shadow.querySelector('.compare-pie-container .pie-wrapper:nth-child(1) .pie-label');
    const pieLabelB = shadow.querySelector('.compare-pie-container .pie-wrapper:nth-child(2) .pie-label');
    if (pieCanvasA && pieCanvasB) {
        const aRows = pieAResult.status === 'fulfilled' ? (pieAResult.value?.rows || []) : [];
        const bRows = pieBResult.status === 'fulfilled' ? (pieBResult.value?.rows || []) : [];
        const colorScheme = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#F8B500', '#26de81', '#FD79A8'];
        if (aRows.length > 0) {
            const pieLabels = aRows.map(r => r['category']);
            const pieData = aRows.map(r => fmt(r['total']));
            new ChartRenderer(pieCanvasA).render('doughnut', pieLabels, [{ label: labelA, data: pieData, colorScheme }]);
            if (pieLabelA)
                pieLabelA.textContent = labelA;
        }
        if (bRows.length > 0) {
            const pieLabels = bRows.map(r => r['category']);
            const pieData = bRows.map(r => fmt(r['total']));
            new ChartRenderer(pieCanvasB).render('doughnut', pieLabels, [{ label: labelB, data: pieData, colorScheme }]);
            if (pieLabelB)
                pieLabelB.textContent = labelB;
        }
    }
    // Render trend line (A vs B)
    const trendCanvas = shadow.getElementById('compare-trend');
    if (trendCanvas) {
        const aRows = trendAResult.status === 'fulfilled' ? (trendAResult.value?.rows || []) : [];
        const bRows = trendBResult.status === 'fulfilled' ? (trendBResult.value?.rows || []) : [];
        if (aRows.length > 0 || bRows.length > 0) {
            let labels = [];
            if (mode === 'week')
                labels = WEEKDAY_LABELS;
            else if (mode === 'month') {
                const maxDays = periodB.month_lastday ? parseInt(periodB.month_lastday.split('-')[2], 10) : 31;
                labels = Array.from({ length: maxDays }, (_, i) => `${i + 1}日`);
            }
            else
                labels = MONTH_LABELS;
            const key = mode === 'week' ? 'weekday' : mode === 'month' ? 'day' : 'month';
            const mapToData = (rows) => {
                if (mode === 'week') {
                    const arr = new Array(7).fill(0);
                    rows.forEach(r => { const idx = parseInt(r[key] || '0', 10); if (idx >= 0 && idx < 7)
                        arr[idx] = fmt(r['total']); });
                    return arr;
                }
                else if (mode === 'month') {
                    const arr = new Array(labels.length).fill(0);
                    rows.forEach(r => { const idx = parseInt(r[key] || '1', 10) - 1; if (idx >= 0 && idx < arr.length)
                        arr[idx] = fmt(r['total']); });
                    return arr;
                }
                else {
                    const arr = new Array(12).fill(0);
                    rows.forEach(r => { const idx = parseInt(r[key] || '1', 10) - 1; if (idx >= 0 && idx < 12)
                        arr[idx] = fmt(r['total']); });
                    return arr;
                }
            };
            new ChartRenderer(trendCanvas).render('line', labels, [
                { label: labelA, data: mapToData(aRows), colorScheme: ['#2563EB'] },
                { label: labelB, data: mapToData(bRows), colorScheme: ['#FF6B6B'] }
            ], { plugins: { legend: { display: true, position: 'top' } }, scales: { y: { beginAtZero: true } } });
        }
    }
}
