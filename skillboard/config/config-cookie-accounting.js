// config-cookie-accounting.ts
// SkillBoard 数据层配置文件 - 饼干记账
// 数据库文件：biscuit_accountant.db
// 生成依据：scripts/db.py（表结构/写入逻辑）+ scripts/query.py（查询逻辑）+ scripts/analyze.py（分析逻辑）
//
// 字段来源对应：
//   meta.dbFiles           ← db.py DB_FILENAME = "biscuit_accountant.db"
//   schema                 ← db.py init_db() 建表语句（9字段）
//   queries.daily-records  ← query.py list_today() → fetch_all(from_time, to_time)
//   queries.monthly-summary ← analyze.py monthly_summary()（amount < 0，按 category GROUP BY）
//   queries.category-breakdown ← analyze.py get_category_breakdown()（含 avg）
//   queries.monthly-overview  ← analyze.py _get_totals()（count/expense/income/net）
//   queries.period-compare    ← analyze.py compare_periods()
//   queries.recent-records    ← query.py list_recent(limit) → fetch_all(limit)
//   queries.keyword-search   ← query.py search_keyword() → fetch_all(keyword)
//   actions.add-record       ← db.py insert_record() 入参（7字段，无 id/created_at）
export const CookieAccountingConfig = {
    // ── 1. meta（元数据）─────────────────────────────────────────
    meta: {
        name: "cookie-accounting",
        label: "饼干记账",
        icon: "Cookie",
        description: "记录饼干购买与消耗，支持日/周/月统计和分类分析",
        dbFiles: ["biscuit_accountant.db"],
    },
    // ── 2. schema（数据库结构）──────────────────────────────────
    schema: {
        tables: [
            {
                name: "bills",
                fields: [
                    // id：自增主键，DB 自动生成，UI 不展示
                    { name: "id", type: "INTEGER", label: "ID", primaryKey: true, visible: false },
                    // category：非空，选项覆盖支出9类 + 收入5类
                    { name: "category", type: "TEXT", label: "分类", nullable: false,
                        options: ["餐饮", "购物", "交通", "娱乐", "医疗", "住房", "教育", "通讯", "其他",
                            "工资", "奖金", "兼职", "投资"] },
                    // time：非空，完整时间戳格式
                    { name: "time", type: "TEXT", label: "时间", nullable: false, format: "datetime" },
                    // amount：非空，负数为支出，正数为收入
                    { name: "amount", type: "REAL", label: "金额", nullable: false, format: "currency", unit: "元" },
                    // account：默认空字符串
                    { name: "account", type: "TEXT", label: "账户", default: "" },
                    // ledger：默认"生活"
                    { name: "ledger", type: "TEXT", label: "账本", default: "生活" },
                    // currency：默认"人民币"
                    { name: "currency", type: "TEXT", label: "货币", default: "人民币" },
                    // note：默认空字符串
                    { name: "note", type: "TEXT", label: "备注", default: "" },
                    // created_at：DB 自动填充 CURRENT_TIMESTAMP，UI 不展示
                    { name: "created_at", type: "TEXT", label: "创建时间", visible: false },
                ],
            },
        ],
    },
    // ── 3. queries（预设查询）───────────────────────────────────
    queries: [
        // ── 3.1 今日记录 ──────────────────────────────────────────
        // 来自 query.py list_today()：WHERE time >= '{date} 00:00:00' AND time <= '{date} 23:59:59'
        {
            id: "daily-records",
            label: "今日记录",
            sql: "SELECT id, category, time, amount, note FROM bills WHERE time >= '{{date}} 00:00:00' AND time <= '{{date}} 23:59:59' ORDER BY time DESC",
            params: [
                { name: "date", type: "date", label: "日期", default: "TODAY" },
            ],
        },
        // ── 3.2 月度支出汇总（柱状图）─────────────────────────────
        // 来自 analyze.py monthly_summary()：
        //   WHERE time >= '{month}-01 00:00:00' AND time <= '{month_end} 23:59:59' AND amount < 0
        //   GROUP BY category ORDER BY total DESC
        {
            id: "monthly-summary",
            label: "月度支出汇总",
            sql: `SELECT
              category,
              SUM(ABS(amount)) as total,
              COUNT(*) as count
            FROM bills
            WHERE time >= '{{month}}-01 00:00:00'
              AND time <= '{{month_lastday}} 23:59:59'
              AND amount < 0
            GROUP BY category
            ORDER BY total DESC`,
            params: [
                { name: "month", type: "month", label: "月份", default: "CURRENT" },
                { name: "month_lastday", type: "hidden", label: "月末日期" },
            ],
            chartType: "bar",
            chartConfig: {
                colorScheme: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE"],
            },
        },
        // ── 3.3 分类支出明细（环形图）─────────────────────────────
        // 来自 analyze.py get_category_breakdown()：
        //   WHERE time >= '{from} 00:00:00' AND time <= '{to} 23:59:59' AND amount < 0
        //   含 AVG(ABS(amount)) as avg
        {
            id: "category-breakdown",
            label: "分类分析",
            sql: `SELECT
              category,
              SUM(ABS(amount)) as total,
              COUNT(*) as count,
              AVG(ABS(amount)) as avg
            FROM bills
            WHERE time >= '{{from}} 00:00:00'
              AND time <= '{{to}} 23:59:59'
              AND amount < 0
            GROUP BY category
            ORDER BY total DESC`,
            params: [
                { name: "from", type: "date", label: "开始日期", default: "MONTH_START" },
                { name: "to", type: "date", label: "结束日期", default: "MONTH_END" },
            ],
            chartType: "doughnut",
            chartConfig: {
                colorScheme: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#F8B500", "#26de81", "#FD79A8", "#A29BFE", "#6C5CE7", "#74B9FF", "#55A3FF", "#00CEC9", "#E17055"],
            },
        },
        // ── 3.4 收支总览（月度计数/支出/收入/净额）───────────────
        // 来自 analyze.py _get_totals()：
        //   expense = SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END)
        //   income  = SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END)
        //   net     = income - expense
        {
            id: "monthly-overview",
            label: "收支总览",
            sql: `SELECT
              COUNT(*) as count,
              SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as expense,
              SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income,
              SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END)
              - SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as net
            FROM bills
            WHERE time >= '{{month}}-01 00:00:00'
              AND time <= '{{month_lastday}} 23:59:59'`,
            params: [
                { name: "month", type: "month", label: "月份", default: "CURRENT" },
                { name: "month_lastday", type: "hidden", label: "月末日期" },
            ],
        },
        // ── 3.5 周期对比（本周 vs 上周 / 本月 vs 上月）────────────
        // 来自 analyze.py compare_periods()：前端调用两次本查询（本期+上期），前端自行计算 change
        {
            id: "period-compare",
            label: "周期对比",
            sql: `SELECT
              CASE WHEN amount < 0 THEN 'expense' ELSE 'income' END as type,
              SUM(ABS(amount)) as total,
              COUNT(*) as count
            FROM bills
            WHERE time >= '{{from}} 00:00:00'
              AND time <= '{{to}} 23:59:59'
            GROUP BY type`,
            params: [
                { name: "from", type: "date", label: "开始日期" },
                { name: "to", type: "date", label: "结束日期" },
                { name: "period", type: "select", label: "周期",
                    options: [
                        { label: "本周 vs 上周", value: "week" },
                        { label: "本月 vs 上月", value: "month" },
                    ],
                },
            ],
            chartType: "bar",
        },
        // ── 3.6 最近记录 ──────────────────────────────────────────
        // 来自 query.py list_recent(limit)：fetch_all(limit=N) → SELECT ... LIMIT N
        {
            id: "recent-records",
            label: "最近记录",
            sql: "SELECT id, category, time, amount, note FROM bills ORDER BY time DESC LIMIT {{limit}}",
            params: [
                { name: "limit", type: "select", label: "条数",
                    default: "10",
                    options: [
                        { label: "10条", value: "10" },
                        { label: "100条", value: "100" },
                        { label: "1000条", value: "1000" },
                        { label: "全部", value: "999999" },
                    ],
                },
            ],
        },
        // ── 3.7 关键词搜索 ────────────────────────────────────────
        // 来自 query.py search_keyword()：WHERE note LIKE '%{keyword}%'
        // SQLite 拼接字符串用 ||，不能写成 Python 格式化
        {
            id: "keyword-search",
            label: "关键词搜索",
            sql: "SELECT id, category, time, amount, note FROM bills WHERE note LIKE '%' || '{{keyword}}' || '%' ORDER BY time DESC",
            params: [
                { name: "keyword", type: "text", label: "关键词" },
            ],
        },
        // ── 3.8 按周对比（柱状图/环形图）─────────────────────────
        // 按周日（0-6）分组，展示本周每天 vs 上周每天的支出对比
        {
            id: "compare-weekly-bar",
            label: "周对比（柱状图）",
            sql: `SELECT
              strftime('%w', time) as weekday,
              SUM(ABS(amount)) as total
            FROM bills
            WHERE time >= '{{week_start}} 00:00:00'
              AND time <= '{{week_end}} 23:59:59'
              AND amount < 0
            GROUP BY weekday
            ORDER BY weekday`,
            params: [
                { name: "week_start", type: "date", label: "周开始日期" },
                { name: "week_end", type: "date", label: "周结束日期" },
            ],
            chartType: "bar",
        },
        {
            id: "compare-weekly-pie",
            label: "周对比（环形图）",
            sql: `SELECT
              strftime('%w', time) as weekday,
              SUM(ABS(amount)) as total
            FROM bills
            WHERE time >= '{{week_start}} 00:00:00'
              AND time <= '{{week_end}} 23:59:59'
              AND amount < 0
            GROUP BY weekday
            ORDER BY weekday`,
            params: [
                { name: "week_start", type: "date", label: "周开始日期" },
                { name: "week_end", type: "date", label: "周结束日期" },
            ],
            chartType: "doughnut",
        },
        // ── 3.9 按月对比（柱状图/环形图）─────────────────────────
        // 按月内日期（01-31）分组，展示某月每日支出分布
        {
            id: "compare-monthly-bar",
            label: "月对比（柱状图）",
            sql: `SELECT
              strftime('%d', time) as day,
              SUM(ABS(amount)) as total
            FROM bills
            WHERE time >= '{{month}}-01 00:00:00'
              AND time <= '{{month_lastday}} 23:59:59'
              AND amount < 0
            GROUP BY day
            ORDER BY day`,
            params: [
                { name: "month", type: "month", label: "月份" },
                { name: "month_lastday", type: "hidden", label: "月末日期" },
            ],
            chartType: "bar",
        },
        {
            id: "compare-monthly-pie",
            label: "月对比（环形图）",
            sql: `SELECT
              strftime('%d', time) as day,
              SUM(ABS(amount)) as total
            FROM bills
            WHERE time >= '{{month}}-01 00:00:00'
              AND time <= '{{month_lastday}} 23:59:59'
              AND amount < 0
            GROUP BY day
            ORDER BY day`,
            params: [
                { name: "month", type: "month", label: "月份" },
                { name: "month_lastday", type: "hidden", label: "月末日期" },
            ],
            chartType: "doughnut",
        },
        // ── 3.10 按年对比（柱状图/环形图）────────────────────────
        // 按月份（01-12）分组，展示某年每月支出分布
        {
            id: "compare-yearly-bar",
            label: "年对比（柱状图）",
            sql: `SELECT
              strftime('%m', time) as month,
              SUM(ABS(amount)) as total
            FROM bills
            WHERE time >= '{{year}}-01-01 00:00:00'
              AND time <= '{{year}}-12-31 23:59:59'
              AND amount < 0
            GROUP BY month
            ORDER BY month`,
            params: [
                { name: "year", type: "year", label: "年份" },
            ],
            chartType: "bar",
        },
        {
            id: "compare-yearly-pie",
            label: "年对比（环形图）",
            sql: `SELECT
              strftime('%m', time) as month,
              SUM(ABS(amount)) as total
            FROM bills
            WHERE time >= '{{year}}-01-01 00:00:00'
              AND time <= '{{year}}-12-31 23:59:59'
              AND amount < 0
            GROUP BY month
            ORDER BY month`,
            params: [
                { name: "year", type: "year", label: "年份" },
            ],
            chartType: "doughnut",
        },
        // ── 3.11 按周期对比（分类环形图）──────────────────────────
        // 按 category 分组，用于 compare.ts 饼图展示分类占比
        {
            id: "compare-weekly-category-pie",
            label: "周对比（分类环形图）",
            sql: `SELECT
              category,
              SUM(ABS(amount)) as total
            FROM bills
            WHERE time >= '{{week_start}} 00:00:00'
              AND time <= '{{week_end}} 23:59:59'
              AND amount < 0
            GROUP BY category
            ORDER BY total DESC`,
            params: [
                { name: "week_start", type: "date", label: "周开始日期" },
                { name: "week_end", type: "date", label: "周结束日期" },
            ],
            chartType: "doughnut",
        },
        {
            id: "compare-monthly-category-pie",
            label: "月对比（分类环形图）",
            sql: `SELECT
              category,
              SUM(ABS(amount)) as total
            FROM bills
            WHERE time >= '{{month}}-01 00:00:00'
              AND time <= '{{month_lastday}} 23:59:59'
              AND amount < 0
            GROUP BY category
            ORDER BY total DESC`,
            params: [
                { name: "month", type: "month", label: "月份" },
                { name: "month_lastday", type: "hidden", label: "月末日期" },
            ],
            chartType: "doughnut",
        },
        {
            id: "compare-yearly-category-pie",
            label: "年对比（分类环形图）",
            sql: `SELECT
              category,
              SUM(ABS(amount)) as total
            FROM bills
            WHERE time >= '{{year}}-01-01 00:00:00'
              AND time <= '{{year}}-12-31 23:59:59'
              AND amount < 0
            GROUP BY category
            ORDER BY total DESC`,
            params: [
                { name: "year", type: "year", label: "年份" },
            ],
            chartType: "doughnut",
        },
        // ── 3.12 时间维度（日/周/月/年）──────────────────────────
        // Phase 4: 时间维度 tab group
        // 日报（Daily）
        {
            id: "daily-expense-bar",
            label: "日报-支出（柱状图）",
            sql: "SELECT category, SUM(ABS(amount)) as total FROM bills WHERE time >= '{{today}} 00:00:00' AND time <= '{{today}} 23:59:59' AND amount < 0 GROUP BY category ORDER BY total DESC",
            params: [
                { name: "today", type: "date", label: "日期", default: "CURRENT" },
            ],
            chartType: "bar",
            chartConfig: {
                colorScheme: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE"],
            },
        },
        {
            id: "daily-expense-pie",
            label: "日报-支出（环形图）",
            sql: "SELECT category, SUM(ABS(amount)) as total FROM bills WHERE time >= '{{today}} 00:00:00' AND time <= '{{today}} 23:59:59' AND amount < 0 GROUP BY category ORDER BY total DESC",
            params: [
                { name: "today", type: "date", label: "日期", default: "CURRENT" },
            ],
            chartType: "doughnut",
            chartConfig: {
                colorScheme: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#F8B500", "#26de81", "#FD79A8", "#A29BFE", "#6C5CE7", "#74B9FF", "#55A3FF", "#00CEC9", "#E17055"],
            },
        },
        {
            id: "daily-hourly-trend",
            label: "日报-小时趋势（折线图）",
            sql: "SELECT strftime('%H', time) as hour, SUM(ABS(amount)) as total FROM bills WHERE time >= '{{today}} 00:00:00' AND time <= '{{today}} 23:59:59' AND amount < 0 GROUP BY hour ORDER BY hour",
            params: [
                { name: "today", type: "date", label: "日期", default: "CURRENT" },
            ],
            chartType: "line",
            chartConfig: {
                colorScheme: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE"],
            },
        },
        // 周报（Weekly）
        {
            id: "weekly-expense-bar",
            label: "周报-支出（柱状图）",
            sql: "SELECT strftime('%w', time) as weekday, SUM(ABS(amount)) as total FROM bills WHERE time >= '{{week_start}} 00:00:00' AND time <= '{{week_end}} 23:59:59' AND amount < 0 GROUP BY weekday ORDER BY weekday",
            params: [
                { name: "week_start", type: "date", label: "周开始日期" },
                { name: "week_end", type: "date", label: "周结束日期" },
            ],
            chartType: "bar",
            chartConfig: {
                colorScheme: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE"],
            },
        },
        {
            id: "weekly-expense-pie",
            label: "周报-支出（环形图）",
            sql: "SELECT category, SUM(ABS(amount)) as total FROM bills WHERE time >= '{{week_start}} 00:00:00' AND time <= '{{week_end}} 23:59:59' AND amount < 0 GROUP BY category ORDER BY total DESC",
            params: [
                { name: "week_start", type: "date", label: "周开始日期" },
                { name: "week_end", type: "date", label: "周结束日期" },
            ],
            chartType: "doughnut",
            chartConfig: {
                colorScheme: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#F8B500", "#26de81", "#FD79A8", "#A29BFE", "#6C5CE7", "#74B9FF", "#55A3FF", "#00CEC9", "#E17055"],
            },
        },
        {
            id: "weekly-current-trend",
            label: "周报-本周趋势（折线图）",
            sql: "SELECT date(time) as day, SUM(ABS(amount)) as total FROM bills WHERE time >= '{{week_start}} 00:00:00' AND time <= '{{week_end}} 23:59:59' AND amount < 0 GROUP BY day ORDER BY day",
            params: [
                { name: "week_start", type: "date", label: "周开始日期" },
                { name: "week_end", type: "date", label: "周结束日期" },
            ],
            chartType: "line",
            chartConfig: {
                colorScheme: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE"],
            },
        },
        {
            id: "weekly-past-trend",
            label: "周报-上周趋势（折线图）",
            sql: "SELECT date(time) as day, SUM(ABS(amount)) as total FROM bills WHERE time >= '{{week_start}} 00:00:00' AND time <= '{{week_end}} 23:59:59' AND amount < 0 GROUP BY day ORDER BY day",
            params: [
                { name: "week_start", type: "date", label: "周开始日期" },
                { name: "week_end", type: "date", label: "周结束日期" },
            ],
            chartType: "line",
            chartConfig: {
                colorScheme: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE"],
            },
        },
        // 月报（Monthly）
        {
            id: "monthly-expense-bar",
            label: "月报-支出（柱状图）",
            sql: "SELECT strftime('%d', time) as day, SUM(ABS(amount)) as total FROM bills WHERE time >= '{{month}}-01 00:00:00' AND time <= '{{month_lastday}} 23:59:59' AND amount < 0 GROUP BY day ORDER BY day",
            params: [
                { name: "month", type: "month", label: "月份" },
                { name: "month_lastday", type: "hidden", label: "月末日期" },
            ],
            chartType: "bar",
            chartConfig: {
                colorScheme: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE"],
            },
        },
        {
            id: "monthly-expense-pie",
            label: "月报-支出（环形图）",
            sql: "SELECT category, SUM(ABS(amount)) as total FROM bills WHERE time >= '{{month}}-01 00:00:00' AND time <= '{{month_lastday}} 23:59:59' AND amount < 0 GROUP BY category ORDER BY total DESC",
            params: [
                { name: "month", type: "month", label: "月份" },
                { name: "month_lastday", type: "hidden", label: "月末日期" },
            ],
            chartType: "doughnut",
            chartConfig: {
                colorScheme: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#F8B500", "#26de81", "#FD79A8", "#A29BFE", "#6C5CE7", "#74B9FF", "#55A3FF", "#00CEC9", "#E17055"],
            },
        },
        {
            id: "monthly-current-trend",
            label: "月报-本月趋势（折线图）",
            sql: "SELECT strftime('%d', time) as day, SUM(ABS(amount)) as total FROM bills WHERE time >= '{{month}}-01 00:00:00' AND time <= '{{month_lastday}} 23:59:59' AND amount < 0 GROUP BY day ORDER BY day",
            params: [
                { name: "month", type: "month", label: "月份" },
                { name: "month_lastday", type: "hidden", label: "月末日期" },
            ],
            chartType: "line",
            chartConfig: {
                colorScheme: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE"],
            },
        },
        {
            id: "monthly-past-trend",
            label: "月报-上月趋势（折线图）",
            sql: "SELECT strftime('%d', time) as day, SUM(ABS(amount)) as total FROM bills WHERE time >= '{{month}}-01 00:00:00' AND time <= '{{month_lastday}} 23:59:59' AND amount < 0 GROUP BY day ORDER BY day",
            params: [
                { name: "month", type: "month", label: "月份" },
                { name: "month_lastday", type: "hidden", label: "月末日期" },
            ],
            chartType: "line",
            chartConfig: {
                colorScheme: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE"],
            },
        },
        // 年报（Yearly）
        {
            id: "yearly-expense-bar",
            label: "年报-支出（柱状图）",
            sql: "SELECT strftime('%m', time) as month, SUM(ABS(amount)) as total FROM bills WHERE time >= '{{year}}-01-01 00:00:00' AND time <= '{{year}}-12-31 23:59:59' AND amount < 0 GROUP BY month ORDER BY month",
            params: [
                { name: "year", type: "year", label: "年份" },
            ],
            chartType: "bar",
            chartConfig: {
                colorScheme: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE"],
            },
        },
        {
            id: "yearly-expense-pie",
            label: "年报-支出（环形图）",
            sql: "SELECT category, SUM(ABS(amount)) as total FROM bills WHERE time >= '{{year}}-01-01 00:00:00' AND time <= '{{year}}-12-31 23:59:59' AND amount < 0 GROUP BY category ORDER BY total DESC",
            params: [
                { name: "year", type: "year", label: "年份" },
            ],
            chartType: "doughnut",
            chartConfig: {
                colorScheme: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#F8B500", "#26de81", "#FD79A8", "#A29BFE", "#6C5CE7", "#74B9FF", "#55A3FF", "#00CEC9", "#E17055"],
            },
        },
        {
            id: "yearly-current-trend",
            label: "年报-今年趋势（折线图）",
            sql: "SELECT strftime('%m', time) as month, SUM(ABS(amount)) as total FROM bills WHERE time >= '{{year}}-01-01 00:00:00' AND time <= '{{year}}-12-31 23:59:59' AND amount < 0 GROUP BY month ORDER BY month",
            params: [
                { name: "year", type: "year", label: "年份" },
            ],
            chartType: "line",
            chartConfig: {
                colorScheme: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE"],
            },
        },
        {
            id: "yearly-past-trend",
            label: "年报-去年趋势（折线图）",
            sql: "SELECT strftime('%m', time) as month, SUM(ABS(amount)) as total FROM bills WHERE time >= '{{year}}-01-01 00:00:00' AND time <= '{{year}}-12-31 23:59:59' AND amount < 0 GROUP BY month ORDER BY month",
            params: [
                { name: "year", type: "year", label: "年份" },
            ],
            chartType: "line",
            chartConfig: {
                colorScheme: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE"],
            },
        },
    ],
    // ── 4. actions（操作定义）──────────────────────────────────
    // 注：饼干记账为只读模块，不支持新增/修改/删除操作
    actions: [],
    // ── 5. views（视图定义）────────────────────────────────────
    views: [
        { id: "dashboard", label: "仪表盘", icon: "Gauge",
            components: {} },
        { id: "daily", label: "每日记录", icon: "CalendarBlank",
            components: { table: { queryId: "daily-records", sortable: true, pageSize: 20 } } },
        { id: "recent", label: "最近记录", icon: "Clock",
            components: { table: { queryId: "recent-records", sortable: true, pageSize: 10 } } },
        { id: "search", label: "关键词搜索", icon: "MagnifyingGlass",
            components: { table: { queryId: "keyword-search", sortable: true, pageSize: 20 } } },
        { id: "monthly", label: "月度统计", icon: "ChartBar",
            components: { chart: { queryId: "monthly-summary" } } },
        { id: "category", label: "分类分析", icon: "ChartPieSlice",
            components: { chart: { queryId: "category-breakdown" } } },
        { id: "compare", label: "周期对比", icon: "ArrowsLeftRight",
            components: { chart: { queryId: "period-compare" } } },
        { id: "time-dimension", label: "时间维度", icon: "ClockClock",
            components: {} },
        { id: "data-browser", label: "数据库", icon: "Database",
            components: { dataBrowser: {} } },
    ],
};
