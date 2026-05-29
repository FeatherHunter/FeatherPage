// 快捷值解析：TODAY / CURRENT / MONTH_START / MONTH_END → 实际日期字符串
export function resolveShortcut(value, now = new Date()) {
    switch (value.toUpperCase()) {
        case 'TODAY':
            return now.toISOString().split('T')[0];
        case 'CURRENT':
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        case 'MONTH_START': {
            const d = new Date(now.getFullYear(), now.getMonth(), 1);
            return d.toISOString().split('T')[0];
        }
        case 'MONTH_END': {
            const d = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            return d.toISOString().split('T')[0];
        }
        default:
            return value;
    }
}
// 替换 SQL 中的 {{paramName}} 占位符
export function interpolateSQL(sql, params) {
    return sql.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        let value = params[key] ?? '';
        // 移除参数值中的 { } 字符，防止 SQLite 解析器报 unrecognized token 错误
        // （用户粘贴 JSON 字符串时可能包含花括号）
        value = value.replace(/[{}]/g, '');
        // 空字符串转换为 SQL 的 '' (两个单引号)
        if (value === '')
            return "''";
        // 转义单引号（SQL 字符串字面量中的单引号需要双写）
        return value.replace(/'/g, "''");
    });
}
// 格式化显示值
export function formatValue(value, format, unit) {
    if (value === null || value === undefined)
        return '—';
    if (format === 'currency')
        return `${Number(value).toFixed(2)} ${unit || '元'}`;
    if (format === 'number') {
        const num = Number(value);
        const isInteger = Number.isInteger(num);
        return `${isInteger ? num.toString() : num.toFixed(1)}${unit ? ' ' + unit : ''}`;
    }
    return String(value);
}
// 格式化日期
export function formatDate(value, format = 'date') {
    if (!value)
        return '—';
    try {
        const d = new Date(value.includes(' ') ? value : value + 'T00:00:00');
        if (isNaN(d.getTime()))
            return value;
        const date = d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
        if (format === 'datetime') {
            const time = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return `${date} ${time}`;
        }
        return date;
    }
    catch {
        return value;
    }
}
// ── 日期计算辅助函数 ────────────────────────────────────────
/** 返回某日期所在周的开始和结束日期（周一到周日） */
export function getWeekRange(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay(); // 0=周日, 1=周一...
    // 调整为周一=0, 周日=6 的偏移量
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() + mondayOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return {
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
    };
}
/** 返回上周的开始和结束日期 */
export function getLastWeekRange() {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    return getWeekRange(lastWeek);
}
/** 返回上月的月份和月末日期 */
export function getLastMonthRange() {
    const now = new Date();
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = lastMonthDate.getFullYear();
    const month = lastMonthDate.getMonth() + 1; // 转回1-indexed
    const lastDay = new Date(year, month, 0).getDate();
    return {
        month: `${year}-${String(month).padStart(2, '0')}`,
        monthLastday: `${year}-${String(month).padStart(2, '0')}-${lastDay}`,
    };
}
/** 返回去年的年份 */
export function getLastYearRange() {
    const now = new Date();
    const lastYear = now.getFullYear() - 1;
    return { year: String(lastYear) };
}
/** 解析周选择器的值（格式：YYYY-Www，如 2026-W20），返回该周的开始和结束日期 */
export function parseWeekValue(weekValue) {
    const match = weekValue.match(/^(\d{4})-W(\d{2})$/);
    if (!match)
        return null;
    const year = parseInt(match[1], 10);
    const weekNum = parseInt(match[2], 10);
    // 计算该周周一的日期
    // JS中Date的setDate可以处理溢出，自动进入下个月
    // 先找到该年的1月1日，然后找到第一个周一
    const jan1 = new Date(year, 0, 1);
    const dayOfWeek = jan1.getDay(); // 0=周日
    // 第一个周一需要的天数：如果1月1日是周一(1)，则需要0天；如果是周日(0)，需要1天；其他情况用 8 - dayOfWeek
    const daysToFirstMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const firstMonday = new Date(year, 0, 1 + daysToFirstMonday);
    // 加上 (weekNum - 1) 周
    firstMonday.setDate(firstMonday.getDate() + (weekNum - 1) * 7);
    const weekStart = firstMonday;
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return {
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
    };
}
/** 根据 yearMonth（YYYY-MM）返回该月的最后一天 */
export function getMonthLastDay(yearMonth) {
    const [year, month] = yearMonth.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
}
