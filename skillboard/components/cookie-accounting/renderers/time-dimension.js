import { config } from '../config.js';
import { ChartRenderer } from '../../../shared/chart-renderer.js';
import { getWeekRange, getMonthLastDay, interpolateSQL } from '../../../shared/utils.js';
const COLOR_SCHEME = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD",
    "#98D8C8", "#F7DC6F", "#BB8FCE", "#F8B500", "#26de81", "#FD79A8", "#A29BFE",
];
const LINE_COLOR_CURRENT = '#2563EB';
// 格式化数字，避免浮点精度问题
function fmt(n) {
    return Math.round(Number(n) * 100) / 100;
}
// Labels
const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => String(i));
export async function renderTimeDimensionView(panel, db) {
    const shadow = panel.getShadow();
    const content = shadow.getElementById('view-content');
    const paramValues = panel.getParamValues();
    // Get or initialize granularity
    const granularity = paramValues['_granularity'] || 'daily';
    // Get selected period date from paramValues, default to today
    const selectedDate = paramValues['_selected_date'] || new Date().toISOString().split('T')[0];
    // Calculate date parameters based on granularity and selected date
    const dateParams = calculateDateParams(granularity, selectedDate);
    // Render UI structure
    content.innerHTML = `
    <div class="time-dim-view">
      <div class="time-dim-tabs">
        <button class="tab-btn ${granularity === 'daily' ? 'active' : ''}" data-granularity="daily">日报</button>
        <button class="tab-btn ${granularity === 'weekly' ? 'active' : ''}" data-granularity="weekly">周报</button>
        <button class="tab-btn ${granularity === 'monthly' ? 'active' : ''}" data-granularity="monthly">月报</button>
        <button class="tab-btn ${granularity === 'yearly' ? 'active' : ''}" data-granularity="yearly">年报</button>
      </div>
      <div class="period-selector-row">
        <input type="date" id="period-date" class="period-input" value="${selectedDate}" />
        <input type="week" id="period-week" class="period-input" value="${getWeekValue(selectedDate)}" />
        <input type="month" id="period-month" class="period-input" value="${getMonthValue(selectedDate)}" />
        <select id="period-year" class="period-input">
          ${generateYearOptions(getYearValue(selectedDate))}
        </select>
      </div>
      <div class="time-dim-charts-grid">
        <div class="chart-panel">
          <div class="chart-title">柱状图</div>
          <canvas id="time-dim-chart-bar"></canvas>
        </div>
        <div class="chart-panel">
          <div class="chart-title">环形图</div>
          <canvas id="time-dim-chart-pie"></canvas>
        </div>
        <div class="chart-panel">
          <div class="chart-title">折线图</div>
          <canvas id="time-dim-chart-line"></canvas>
        </div>
        <div class="empty-state" id="time-dim-empty" style="display:none">
          <p>暂无数据</p>
          <p class="hint">当前时间范围内没有消费记录</p>
        </div>
      </div>
    </div>
  `;
    // Show/hide period inputs based on granularity
    updatePeriodSelectorVisibility(shadow, granularity);
    // Bind period inputs to make selectors work
    bindPeriodInputs(shadow, panel, granularity, selectedDate);
    // Bind granularity tab clicks
    content.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const g = btn.getAttribute('data-granularity');
            panel.setParamValues({ ...panel.getParamValues(), _granularity: g });
            panel.reload();
        });
    });
    function generateYearOptions(selectedYear) {
        const currentYear = new Date().getFullYear();
        let options = '';
        for (let y = currentYear; y >= 2000; y--) {
            const sel = String(y) === selectedYear ? ' selected' : '';
            options += `<option value="${y}"${sel}>${y}年</option>`;
        }
        return options;
    }
    // Render all 3 charts
    await renderAllCharts(shadow, db, granularity, dateParams);
}
function getWeekValue(dateStr) {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const weekStart = new Date(date);
    const day = weekStart.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    weekStart.setDate(weekStart.getDate() + mondayOffset);
    const weekNum = getWeekNumber(weekStart);
    return `${year}-W${String(weekNum).padStart(2, '0')}`;
}
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
function getMonthValue(dateStr) {
    return dateStr.substring(0, 7); // YYYY-MM
}
function getYearValue(dateStr) {
    return dateStr.substring(0, 4); // YYYY
}
function updatePeriodSelectorVisibility(shadow, granularity) {
    const dateInput = shadow.getElementById('period-date');
    const weekInput = shadow.getElementById('period-week');
    const monthInput = shadow.getElementById('period-month');
    const yearInput = shadow.getElementById('period-year');
    if (dateInput)
        dateInput.style.display = granularity === 'daily' ? 'flex' : 'none';
    if (weekInput)
        weekInput.style.display = granularity === 'weekly' ? 'flex' : 'none';
    if (monthInput)
        monthInput.style.display = granularity === 'monthly' ? 'flex' : 'none';
    if (yearInput)
        yearInput.style.display = granularity === 'yearly' ? 'flex' : 'none';
}
function bindPeriodInputs(shadow, panel, granularity, currentDate) {
    const dateInput = shadow.getElementById('period-date');
    const weekInput = shadow.getElementById('period-week');
    const monthInput = shadow.getElementById('period-month');
    const yearInput = shadow.getElementById('period-year');
    const updateAndReload = (newDate) => {
        panel.setParamValues({ ...panel.getParamValues(), _selected_date: newDate });
        panel.reload();
    };
    if (dateInput) {
        dateInput.addEventListener('change', () => updateAndReload(dateInput.value));
    }
    if (weekInput) {
        weekInput.addEventListener('change', () => {
            const weekStr = weekInput.value; // e.g., "2026-W21"
            const [year, week] = weekStr.split('-W').map(Number);
            const date = getDateFromWeek(year, week);
            updateAndReload(date);
        });
    }
    if (monthInput) {
        monthInput.addEventListener('change', () => {
            const monthStr = monthInput.value; // e.g., "2026-05"
            updateAndReload(monthStr + '-01');
        });
    }
    if (yearInput) {
        yearInput.addEventListener('change', () => {
            const yearStr = yearInput.value;
            updateAndReload(`${yearStr}-01-01`);
        });
    }
}
function getDateFromWeek(year, week) {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const isoWeekStart = simple;
    if (dow <= 4)
        isoWeekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
        isoWeekStart.setDate(simple.getDate() + 8 - simple.getDay());
    const result = new Date(isoWeekStart);
    return result.toISOString().split('T')[0];
}
function calculateDateParams(granularity, selectedDate) {
    const date = new Date(selectedDate);
    switch (granularity) {
        case 'daily': {
            // Use the selected date as today
            return {
                currentParams: { today: selectedDate },
                pastParams: undefined
            };
        }
        case 'weekly': {
            const current = getWeekRange(date);
            // Calculate past week
            const pastDate = new Date(date);
            pastDate.setDate(pastDate.getDate() - 7);
            const past = getWeekRange(pastDate);
            return {
                currentParams: { week_start: current.weekStart, week_end: current.weekEnd },
                pastParams: { week_start: past.weekStart, week_end: past.weekEnd }
            };
        }
        case 'monthly': {
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const currentMonth = `${year}-${String(month).padStart(2, '0')}`;
            const currentLastday = getMonthLastDay(currentMonth);
            // Calculate past month
            const pastMonthDate = new Date(date);
            pastMonthDate.setMonth(pastMonthDate.getMonth() - 1);
            const pastMonth = `${pastMonthDate.getFullYear()}-${String(pastMonthDate.getMonth() + 1).padStart(2, '0')}`;
            const pastMonthLastday = getMonthLastDay(pastMonth);
            return {
                currentParams: { month: currentMonth, month_lastday: currentLastday },
                pastParams: { month: pastMonth, month_lastday: pastMonthLastday }
            };
        }
        case 'yearly': {
            const currentYear = String(date.getFullYear());
            const pastYear = String(date.getFullYear() - 1);
            return {
                currentParams: { year: currentYear },
                pastParams: { year: pastYear }
            };
        }
    }
}
function getQueryIds(granularity) {
    switch (granularity) {
        case 'daily':
            return {
                barQueryId: 'daily-expense-bar',
                pieQueryId: 'daily-expense-pie',
                lineQueryId: 'daily-hourly-trend'
            };
        case 'weekly':
            return {
                barQueryId: 'weekly-expense-bar',
                pieQueryId: 'weekly-expense-pie',
                lineQueryId: 'weekly-current-trend'
            };
        case 'monthly':
            return {
                barQueryId: 'monthly-expense-bar',
                pieQueryId: 'monthly-expense-pie',
                lineQueryId: 'monthly-current-trend'
            };
        case 'yearly':
            return {
                barQueryId: 'yearly-expense-bar',
                pieQueryId: 'yearly-expense-pie',
                lineQueryId: 'yearly-current-trend'
            };
    }
}
async function renderAllCharts(shadow, db, granularity, dateParams) {
    const barCanvas = shadow.getElementById('time-dim-chart-bar');
    const pieCanvas = shadow.getElementById('time-dim-chart-pie');
    const lineCanvas = shadow.getElementById('time-dim-chart-line');
    const emptyState = shadow.getElementById('time-dim-empty');
    const queryIds = getQueryIds(granularity);
    // Helper to check if we have data
    let hasData = false;
    // Render bar chart
    if (barCanvas) {
        const barQuery = config.queries.find(q => q.id === queryIds.barQueryId);
        if (barQuery) {
            const result = await db.exec(interpolateSQL(barQuery.sql, dateParams.currentParams), {});
            if (result.rows && result.rows.length > 0) {
                hasData = true;
                const rows = result.rows;
                const { labels, data } = prepareBarData(rows, queryIds.barQueryId);
                const renderer = new ChartRenderer(barCanvas);
                const dataset = { label: '支出', data, colorScheme: COLOR_SCHEME };
                // When few data points (e.g. daily report with 2-5 categories), limit bar width
                if (labels.length <= 2) {
                    dataset.barPercentage = 0.15;
                    dataset.categoryPercentage = 0.6;
                }
                else if (labels.length <= 4) {
                    dataset.barPercentage = 0.25;
                    dataset.categoryPercentage = 0.6;
                }
                renderer.render('bar', labels, [dataset], {
                    plugins: { legend: { display: false } }
                });
            }
        }
    }
    // Render pie chart
    if (pieCanvas) {
        const pieQuery = config.queries.find(q => q.id === queryIds.pieQueryId);
        if (pieQuery) {
            const result = await db.exec(interpolateSQL(pieQuery.sql, dateParams.currentParams), {});
            if (result.rows && result.rows.length > 0) {
                hasData = true;
                const labels = result.rows.map((r) => String(r[result.columns[0]] || ''));
                const data = result.rows.map((r) => Number(r[result.columns[1]] || 0));
                const renderer = new ChartRenderer(pieCanvas);
                renderer.render('doughnut', labels, [{ label: '占比', data, colorScheme: COLOR_SCHEME }]);
            }
        }
    }
    // Render line chart (current period only, no comparison)
    if (lineCanvas) {
        const lineQuery = config.queries.find(q => q.id === queryIds.lineQueryId);
        if (lineQuery) {
            const result = await db.exec(interpolateSQL(lineQuery.sql, dateParams.currentParams), {});
            if (result.rows && result.rows.length > 0) {
                hasData = true;
                const { labels, currentData } = prepareLineData(result.rows, queryIds.lineQueryId, granularity, dateParams);
                const renderer = new ChartRenderer(lineCanvas);
                renderer.render('line', labels, [
                    { label: getCurrentLabel(granularity), data: currentData, colorScheme: [LINE_COLOR_CURRENT] }
                ], {
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } }
                });
            }
        }
    }
    if (!hasData) {
        showEmpty(emptyState);
    }
}
function showEmpty(emptyState) {
    if (emptyState)
        emptyState.style.display = 'block';
}
function getCurrentLabel(granularity) {
    switch (granularity) {
        case 'daily': return '今日';
        case 'weekly': return '本周';
        case 'monthly': return '本月';
        case 'yearly': return '今年';
    }
}
function prepareBarData(rows, queryId) {
    if (queryId === 'daily-expense-bar' || queryId === 'daily-expense-pie') {
        // By category
        const labels = rows.map(r => String(r['category'] || ''));
        const data = rows.map(r => fmt(r['total']));
        return { labels, data };
    }
    if (queryId === 'weekly-expense-bar') {
        // By weekday (0-6)
        const arr = new Array(7).fill(0);
        rows.forEach(r => {
            const idx = parseInt(r['weekday'] || '0', 10);
            if (idx >= 0 && idx < 7)
                arr[idx] = fmt(r['total']);
        });
        return { labels: WEEKDAY_LABELS, data: arr };
    }
    if (queryId === 'weekly-expense-pie') {
        // By category
        const labels = rows.map(r => String(r['category'] || ''));
        const data = rows.map(r => fmt(r['total']));
        return { labels, data };
    }
    if (queryId === 'monthly-expense-bar') {
        // By day of month
        const maxDays = 31;
        const arr = new Array(maxDays).fill(0);
        rows.forEach(r => {
            const day = parseInt(r['day'] || '1', 10) - 1;
            if (day >= 0 && day < maxDays)
                arr[day] = fmt(r['total']);
        });
        const labels = Array.from({ length: maxDays }, (_, i) => `${i + 1}日`);
        return { labels, data: arr };
    }
    if (queryId === 'monthly-expense-pie') {
        // By category
        const labels = rows.map(r => String(r['category'] || ''));
        const data = rows.map(r => fmt(r['total']));
        return { labels, data };
    }
    if (queryId === 'yearly-expense-bar') {
        // By month
        const arr = new Array(12).fill(0);
        rows.forEach(r => {
            const month = parseInt(r['month'] || '1', 10) - 1;
            if (month >= 0 && month < 12)
                arr[month] = fmt(r['total']);
        });
        return { labels: MONTH_LABELS, data: arr };
    }
    if (queryId === 'yearly-expense-pie') {
        // By category
        const labels = rows.map(r => String(r['category'] || ''));
        const data = rows.map(r => fmt(r['total']));
        return { labels, data };
    }
    // Fallback
    const labels = rows.map(r => String(r['category'] || r['label'] || ''));
    const data = rows.map(r => fmt(r['total']));
    return { labels, data };
}
function prepareLineData(rows, queryId, granularity, dateParams) {
    if (queryId === 'daily-hourly-trend') {
        // Hourly trend: 0-23 hours
        const arr = new Array(24).fill(0);
        rows.forEach(r => {
            const hour = parseInt(r['hour'] || '0', 10);
            if (hour >= 0 && hour < 24)
                arr[hour] = fmt(r['total']);
        });
        return { labels: HOUR_LABELS, currentData: arr };
    }
    if (granularity === 'weekly') {
        // Weekly: by weekday (Sun-Sat)
        const arr = new Array(7).fill(0);
        rows.forEach(r => {
            const day = r['day'];
            if (day) {
                const d = new Date(day);
                const idx = d.getDay(); // 0=Sun, 1=Mon...
                if (idx >= 0 && idx < 7)
                    arr[idx] = fmt(r['total']);
            }
        });
        return { labels: WEEKDAY_LABELS, currentData: arr };
    }
    if (granularity === 'monthly') {
        // Monthly: by day of month
        const maxDays = dateParams.currentParams.month_lastday
            ? parseInt(dateParams.currentParams.month_lastday.split('-')[2], 10)
            : 31;
        const arr = new Array(maxDays).fill(0);
        rows.forEach(r => {
            const day = parseInt(r['day'] || '1', 10) - 1;
            if (day >= 0 && day < maxDays)
                arr[day] = fmt(r['total']);
        });
        const labels = Array.from({ length: maxDays }, (_, i) => `${i + 1}日`);
        return { labels, currentData: arr };
    }
    // yearly: by month
    const arr = new Array(12).fill(0);
    rows.forEach(r => {
        const month = parseInt(r['month'] || '1', 10) - 1;
        if (month >= 0 && month < 12)
            arr[month] = fmt(r['total']);
    });
    return { labels: MONTH_LABELS, currentData: arr };
}
