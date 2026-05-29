// config-home-manager.ts
// Home Manager Skill - SkillBoard Configuration
// DB: home.db (tables: items / item_locations / item_tags / accounts)
export const HomeManagerConfig = {
    // ── 1. meta ──────────────────────────────────────────────────────────────
    meta: {
        name: "home-manager",
        label: "居家管家",
        icon: "House",
        description: "居家物品管理，支持物品录入、搜索、库存管理、分类统计和账户管理",
        dbFiles: ["home.db"],
    },
    // ── 2. schema ────────────────────────────────────────────────────────────
    schema: {
        tables: [
            // ── items (main item table) ──────────────────────────────────────
            {
                name: "items",
                fields: [
                    { name: "id", type: "INTEGER", label: "ID", primaryKey: true },
                    { name: "name", type: "TEXT", label: "名称", nullable: false },
                    { name: "category", type: "TEXT", label: "分类", nullable: false },
                    { name: "owner", type: "TEXT", label: "持有人", default: "使用者" },
                    { name: "purchase_price", type: "REAL", label: "单价", unit: "元", format: "currency" },
                    { name: "remark", type: "TEXT", label: "备注" },
                    { name: "photo", type: "TEXT", label: "照片路径" },
                    { name: "access_count", type: "INTEGER", label: "访问次数", format: "number" },
                    { name: "last_accessed_at", type: "TEXT", label: "最后访问", format: "datetime" },
                    { name: "created_at", type: "TEXT", label: "创建时间", format: "datetime" },
                    { name: "updated_at", type: "TEXT", label: "更新时间", format: "datetime" },
                ],
            },
            // ── item_locations (per-location storage records) ─────────────────
            {
                name: "item_locations",
                fields: [
                    { name: "id", type: "INTEGER", label: "位置ID", primaryKey: true },
                    { name: "item_id", type: "INTEGER", label: "物品ID", nullable: false },
                    { name: "location", type: "TEXT", label: "位置路径", nullable: false },
                    { name: "quantity", type: "INTEGER", label: "数量", default: 1, format: "number" },
                    { name: "reason", type: "TEXT", label: "原因" },
                    {
                        name: "location_status",
                        type: "TEXT",
                        label: "位置状态",
                        options: ["在家", "备用", "穿着中", "旅游中", "洗护中", "借用中", "维修中", "已用完", "快递中", "待处理", "已废弃"],
                    },
                    { name: "purchase_date", type: "TEXT", label: "购买日期", format: "date" },
                    { name: "expiration_date", type: "TEXT", label: "过期日期", format: "date" },
                    { name: "created_at", type: "TEXT", label: "创建时间", format: "datetime" },
                    { name: "updated_at", type: "TEXT", label: "更新时间", format: "datetime" },
                ],
            },
            // ── item_tags (item tags) ──────────────────────────────────────────
            {
                name: "item_tags",
                fields: [
                    { name: "id", type: "INTEGER", label: "ID", primaryKey: true },
                    { name: "item_id", type: "INTEGER", label: "物品ID", nullable: false },
                    { name: "tag", type: "TEXT", label: "标签", nullable: false },
                ],
            },
            // ── accounts (encrypted account storage) ────────────────────────
            {
                name: "accounts",
                fields: [
                    { name: "id", type: "INTEGER", label: "ID", primaryKey: true },
                    { name: "platform", type: "TEXT", label: "平台", nullable: false },
                    { name: "username", type: "TEXT", label: "用户名" },
                    { name: "encrypted_password", type: "TEXT", label: "密码(加密)" },
                    { name: "tags", type: "TEXT", label: "标签" },
                    { name: "note", type: "TEXT", label: "备注" },
                    { name: "created_at", type: "TEXT", label: "创建时间", format: "datetime" },
                    { name: "updated_at", type: "TEXT", label: "更新时间", format: "datetime" },
                ],
            },
        ],
    },
    // ── 3. queries ────────────────────────────────────────────────────────────
    queries: [
        // ── 3.1 Item search (name/tag/location fuzzy search) ─────────────────
        {
            id: "item-search",
            label: "物品搜索",
            sql: `SELECT DISTINCT i.id, i.name, i.category, i.owner, i.purchase_price,
                   i.remark, i.photo, i.access_count, i.last_accessed_at,
                   il.location, il.quantity, il.location_status,
                   il.purchase_date, il.expiration_date,
                   GROUP_CONCAT(t.tag, '、') as tags
            FROM items i
            LEFT JOIN item_locations il ON i.id = il.item_id
            LEFT JOIN item_tags t ON i.id = t.item_id
            WHERE (CASE WHEN {{name}} IS NULL OR {{name}} = '' THEN 1 ELSE i.name LIKE '%' || {{name}} || '%' END = 1)
              AND (CASE WHEN {{category}} IS NULL OR {{category}} = '' THEN 1 ELSE i.category = {{category}} END = 1)
              AND (CASE WHEN {{location}} IS NULL OR {{location}} = '' THEN 1 ELSE il.location LIKE '%' || {{location}} || '%' END = 1)
              AND (CASE WHEN {{tag}} IS NULL OR {{tag}} = '' THEN 1 ELSE t.tag = {{tag}} END = 1)
              AND (CASE WHEN {{status}} IS NULL OR {{status}} = '' THEN 1 ELSE il.location_status = {{status}} END = 1)
            GROUP BY i.id
            ORDER BY i.access_count DESC
            LIMIT CAST(COALESCE(NULLIF({{limit}}, ''), '20') AS INTEGER)`,
            params: [
                { name: "name", type: "text", label: "物品名称", default: "" },
                { name: "category", type: "text", label: "分类", default: "" },
                { name: "location", type: "text", label: "位置", default: "" },
                { name: "tag", type: "text", label: "标签", default: "" },
                { name: "status", type: "text", label: "状态", default: "" },
                { name: "limit", type: "text", label: "结果限制", default: "20" },
            ],
        },
        // ── 3.2 Item list (filter by location/status/category, sortable) ────
        {
            id: "item-list",
            label: "物品列表",
            sql: `SELECT i.id, i.name, i.category, i.owner, i.purchase_price,
                   i.remark, i.photo, i.access_count, i.last_accessed_at,
                   il.location, il.quantity, il.location_status,
                   il.purchase_date, il.expiration_date,
                   GROUP_CONCAT(t.tag, '、') as tags
            FROM items i
            LEFT JOIN item_locations il ON i.id = il.item_id
            LEFT JOIN item_tags t ON i.id = t.item_id
            WHERE (CASE WHEN {{location}} IS NULL OR {{location}} = '' THEN 1 ELSE il.location LIKE '%' || {{location}} || '%' END = 1)
              AND (CASE WHEN {{status}} IS NULL OR {{status}} = '' THEN 1 ELSE il.location_status = {{status}} END = 1)
              AND (CASE WHEN {{category}} IS NULL OR {{category}} = '' THEN 1 ELSE i.category = {{category}} END = 1)
              AND (CASE WHEN {{owner}} IS NULL OR {{owner}} = '' THEN 1 ELSE i.owner = {{owner}} END = 1)
            GROUP BY i.id
            ORDER BY
              CASE
                WHEN {{sort}} = 'recent' THEN i.last_accessed_at
                WHEN {{sort}} = 'frequent' THEN CAST(i.access_count AS TEXT)
                WHEN {{sort}} = 'updated' THEN i.updated_at
                WHEN {{sort}} = 'dormant' THEN i.last_accessed_at
                ELSE i.name
              END DESC,
              i.name ASC
            LIMIT CAST(COALESCE(NULLIF({{limit}}, ''), '100') AS INTEGER)`,
            params: [
                { name: "location", type: "text", label: "位置", default: "" },
                { name: "status", type: "text", label: "状态", default: "" },
                { name: "category", type: "text", label: "分类", default: "" },
                { name: "owner", type: "text", label: "持有人", default: "" },
                { name: "sort", type: "text", label: "排序方式", default: "" },
                { name: "limit", type: "text", label: "结果限制", default: "100" },
            ],
        },
        // ── 3.3 Item detail (single item for detail view) ───────────────────
        {
            id: "item-detail",
            label: "物品详情",
            sql: `SELECT i.*, il.location, il.quantity, il.reason, il.location_status,
                   il.purchase_date, il.expiration_date,
                   GROUP_CONCAT(t.tag, '、') as tags
            FROM items i
            LEFT JOIN item_locations il ON i.id = il.item_id
            LEFT JOIN item_tags t ON i.id = t.item_id
            WHERE i.id = {{id}}
            GROUP BY il.id
            ORDER BY il.id`,
            params: [
                { name: "id", type: "text", label: "物品ID" },
            ],
        },
        // ── 3.4 Inventory (all items at a specific location) ─────────────────
        {
            id: "inventory",
            label: "库存",
            sql: `SELECT DISTINCT i.id, i.name, i.category, i.owner,
                   il.location as matched_location,
                   il.quantity as matched_quantity,
                   il.location_status,
                   il.purchase_date, il.expiration_date,
                   GROUP_CONCAT(t.tag, '、') as tags
            FROM items i
            JOIN item_locations il ON i.id = il.item_id
            LEFT JOIN item_tags t ON i.id = t.item_id
            WHERE il.location LIKE '%' || {{location}} || '%'
            GROUP BY i.id, il.id
            ORDER BY i.category, i.name`,
            params: [
                { name: "location", type: "text", label: "库存位置" },
            ],
        },
        // ── 3.5 Frequent items (by access count) ─────────────────────────────
        {
            id: "stats-frequent",
            label: "频繁使用",
            sql: `SELECT i.*, GROUP_CONCAT(t.tag, '、') as tags
            FROM items i
            LEFT JOIN item_tags t ON i.id = t.item_id
            GROUP BY i.id
            ORDER BY i.access_count DESC
            LIMIT CAST({{limit}} AS INTEGER)`,
            params: [
                { name: "limit", type: "text", label: "结果限制", default: "20" },
            ],
        },
        // ── 3.6 Dormant items (long time no access, by last_accessed_at asc) ─
        {
            id: "stats-dormant",
            label: "长期未用",
            sql: `SELECT i.*, GROUP_CONCAT(t.tag, '、') as tags
            FROM items i
            LEFT JOIN item_tags t ON i.id = t.item_id
            WHERE i.last_accessed_at IS NOT NULL
            GROUP BY i.id
            ORDER BY i.last_accessed_at ASC
            LIMIT CAST({{limit}} AS INTEGER)`,
            params: [
                { name: "limit", type: "text", label: "结果限制", default: "20" },
            ],
        },
        // ── 3.7 Summary statistics (total + status distribution + category) ──
        {
            id: "stats-summary",
            label: "统计概览",
            sql: `SELECT
              (SELECT COUNT(*) FROM items) as total_items,
              (SELECT COUNT(DISTINCT item_id) FROM item_locations) as total_locations`,
            params: [],
        },
        // ── 3.8 Tag list ───────────────────────────────────────────────────
        {
            id: "tag-list",
            label: "标签列表",
            sql: `SELECT tag, COUNT(*) as cnt
            FROM item_tags
            GROUP BY tag
            ORDER BY cnt DESC`,
            params: [],
        },
        // ── 3.9 Account list (password hidden) ─────────────────────────────
        {
            id: "account-list",
            label: "账户列表",
            sql: `SELECT id, platform, username, tags, note, created_at, updated_at
            FROM accounts
            ORDER BY platform`,
            params: [],
        },
        // ── 3.10 Express/in-transit items ─────────────────────────────────
        {
            id: "express-items",
            label: "快递中物品",
            sql: `SELECT i.id, i.name, i.category,
                   il.location, il.quantity, il.location_status,
                   il.purchase_date, il.expiration_date,
                   GROUP_CONCAT(t.tag, '、') as tags
            FROM items i
            JOIN item_locations il ON i.id = il.item_id
            LEFT JOIN item_tags t ON i.id = t.item_id
            WHERE il.location_status = '快递中'
            GROUP BY i.id, il.id
            ORDER BY i.name`,
            params: [],
        },
        // ── 3.11 Status distribution for charts ───────────────────────────
        {
            id: "status-summary",
            label: "状态分布",
            sql: `SELECT il.location_status, COUNT(DISTINCT i.id) as cnt
            FROM items i
            JOIN item_locations il ON i.id = il.item_id
            GROUP BY il.location_status
            ORDER BY cnt DESC`,
            params: [],
            chartType: "doughnut",
        },
        // ── 3.12 Category distribution for charts ────────────────────────
        {
            id: "category-summary",
            label: "分类分布",
            sql: `SELECT category as location_status, COUNT(*) as cnt
            FROM items
            GROUP BY category
            ORDER BY cnt DESC`,
            params: [],
            chartType: "bar",
        },
    ],
    // ── 4. actions ────────────────────────────────────────────────────────────
    actions: [
        // ── 4.1 Add new item ───────────────────────────────────────────────
        {
            id: "add-item",
            label: "Add Item",
            type: "insert",
            targetTable: "items",
            fields: [
                { field: "name", required: true, source: "user-input", prompt: "Item name" },
                { field: "category", required: true, source: "user-input", prompt: "Category (e.g. 衣物/食品/数码)" },
                { field: "owner", source: "user-input", prompt: "Owner (default: 使用者)", default: "使用者" },
                { field: "purchase_price", source: "user-input", prompt: "Unit price (元)", format: "currency" },
                { field: "remark", source: "user-input", prompt: "Remark" },
                { field: "photo", source: "user-input", prompt: "Photo path" },
            ],
        },
        // ── 4.2 Add location record (item + location) ──────────────────────
        {
            id: "add-location",
            label: "Add Location",
            type: "insert",
            targetTable: "item_locations",
            fields: [
                { field: "item_id", required: true, source: "user-input", prompt: "Item ID" },
                { field: "location", required: true, source: "user-input", prompt: "Location path (e.g. 客厅/冰箱/上层, min 2 levels)" },
                { field: "quantity", required: true, source: "user-input", prompt: "Quantity", default: "1", format: "number" },
                { field: "location_status", source: "user-input", prompt: "Status", options: ["在家", "备用", "穿着中", "旅游中", "洗护中", "借用中", "维修中", "已用完", "快递中", "待处理", "已废弃"] },
                { field: "purchase_date", source: "user-input", prompt: "Purchase date (YYYY-MM-DD)", format: "date" },
                { field: "expiration_date", source: "user-input", prompt: "Expiration date (YYYY-MM-DD)", format: "date" },
                { field: "reason", source: "user-input", prompt: "Reason (optional)" },
            ],
        },
        // ── 4.3 Update item basic info ─────────────────────────────────────
        {
            id: "update-item",
            label: "Update Item",
            type: "update",
            targetTable: "items",
            fields: [
                { field: "id", required: true, source: "user-input", prompt: "Item ID" },
                { field: "name", source: "user-input", prompt: "Item name" },
                { field: "category", source: "user-input", prompt: "Category" },
                { field: "owner", source: "user-input", prompt: "Owner" },
                { field: "purchase_price", source: "user-input", prompt: "Unit price", format: "currency" },
                { field: "remark", source: "user-input", prompt: "Remark" },
                { field: "photo", source: "user-input", prompt: "Photo path" },
            ],
        },
        // ── 4.4 Update location status ────────────────────────────────────
        {
            id: "update-location-status",
            label: "Update Location Status",
            type: "update",
            targetTable: "item_locations",
            fields: [
                { field: "id", required: true, source: "user-input", prompt: "Location ID" },
                { field: "location_status", required: true, source: "user-input", prompt: "New status", options: ["在家", "备用", "穿着中", "旅游中", "洗护中", "借用中", "维修中", "已用完", "快递中", "待处理", "已废弃"] },
            ],
        },
        // ── 4.5 Quantity change (set directly) ─────────────────────────────
        {
            id: "update-quantity",
            label: "Adjust Quantity",
            type: "update",
            targetTable: "item_locations",
            fields: [
                { field: "id", required: true, source: "user-input", prompt: "Location ID" },
                { field: "quantity", required: true, source: "user-input", prompt: "New quantity (set directly)", format: "number" },
            ],
        },
        // ── 4.6 Move item to new location ──────────────────────────────────
        {
            id: "update-location-move",
            label: "Move Item",
            type: "update",
            targetTable: "item_locations",
            fields: [
                { field: "id", required: true, source: "user-input", prompt: "Location ID" },
                { field: "location", required: true, source: "user-input", prompt: "New location (path)" },
            ],
        },
        // ── 4.7 Update location dates ──────────────────────────────────────
        {
            id: "update-location-dates",
            label: "Update Location Dates",
            type: "update",
            targetTable: "item_locations",
            fields: [
                { field: "id", required: true, source: "user-input", prompt: "Location ID" },
                { field: "purchase_date", source: "user-input", prompt: "Purchase date (YYYY-MM-DD)", format: "date" },
                { field: "expiration_date", source: "user-input", prompt: "Expiration date (YYYY-MM-DD)", format: "date" },
            ],
        },
        // ── 4.8 Set item tags ───────────────────────────────────────────────
        {
            id: "set-item-tags",
            label: "Set Tags",
            type: "update",
            targetTable: "item_tags",
            fields: [
                { field: "item_id", required: true, source: "user-input", prompt: "Item ID" },
                { field: "tag", required: true, source: "user-input", prompt: "Tags (comma-separated)" },
            ],
        },
        // ── 4.9 Add account (encrypted) ─────────────────────────────────────
        {
            id: "add-account",
            label: "Add Account",
            type: "insert",
            targetTable: "accounts",
            fields: [
                { field: "platform", required: true, source: "user-input", prompt: "Platform name" },
                { field: "username", source: "user-input", prompt: "Username / Account" },
                { field: "encrypted_password", required: true, source: "user-input", prompt: "Password" },
                { field: "tags", source: "user-input", prompt: "Tags (e.g. 社交,工作)" },
                { field: "note", source: "user-input", prompt: "Note" },
            ],
        },
        // ── 4.10 Delete account ────────────────────────────────────────────
        {
            id: "del-account",
            label: "Delete Account",
            type: "delete",
            targetTable: "accounts",
            fields: [
                { field: "id", required: true, source: "user-input", prompt: "Account ID" },
            ],
        },
    ],
    // ── 5. views ─────────────────────────────────────────────────────────────
    views: [
        // ── 5.1 Item search ─────────────────────────────────────────────────
        {
            id: "search",
            label: "搜索",
            icon: "MagnifyingGlass",
            components: {
                table: { queryId: "item-search", columns: ["name", "category", "location", "quantity", "location_status", "tags"], sortable: true, pageSize: 20 },
            },
        },
        // ── 5.2 Item list (filter + sort) ──────────────────────────────────
        {
            id: "list",
            label: "所有物品",
            icon: "List",
            components: {
                table: { queryId: "item-list", columns: ["name", "category", "location", "quantity", "location_status", "purchase_price", "tags"], sortable: true, pageSize: 50 },
            },
        },
        // ── 5.3 Item detail ────────────────────────────────────────────────
        {
            id: "detail",
            label: "物品详情",
            icon: "Info",
            components: {
                table: { queryId: "item-detail" },
            },
        },
        // ── 5.4 Inventory ──────────────────────────────────────────────────
        {
            id: "inventory",
            label: "库存",
            icon: "ClipboardText",
            components: {
                table: { queryId: "inventory", columns: ["name", "category", "matched_location", "matched_quantity", "location_status", "purchase_date", "expiration_date", "tags"], sortable: true },
            },
        },
        // ── 5.5 Frequent items ─────────────────────────────────────────────
        {
            id: "stats-frequent",
            label: "频繁使用",
            icon: "TrendUp",
            components: {
                table: { queryId: "stats-frequent", columns: ["name", "category", "access_count", "last_accessed_at", "tags"], sortable: true },
            },
        },
        // ── 5.6 Long unused ────────────────────────────────────────────────
        {
            id: "stats-dormant",
            label: "长期未用",
            icon: "TrendDown",
            components: {
                table: { queryId: "stats-dormant", columns: ["name", "category", "access_count", "last_accessed_at", "tags"], sortable: true },
            },
        },
        // ── 5.7 Summary stats ──────────────────────────────────────────────
        {
            id: "stats-summary",
            label: "统计",
            icon: "ChartBar",
            components: {
                chart: { queryId: "status-summary" },
            },
        },
        // ── 5.8 Tag management ─────────────────────────────────────────────
        {
            id: "tags",
            label: "标签",
            icon: "Tag",
            components: {
                table: { queryId: "tag-list", columns: ["tag", "cnt"] },
            },
        },
        // ── 5.9 Account management ────────────────────────────────────────
        {
            id: "accounts",
            label: "账户",
            icon: "Key",
            components: {
                table: { queryId: "account-list", columns: ["platform", "username", "tags", "note", "created_at"], sortable: true },
            },
        },
        // ── 5.10 Add item form ─────────────────────────────────────────────
        {
            id: "add",
            label: "添加物品",
            icon: "Plus",
            components: {
                form: { actionId: "add-item" },
            },
        },
        // ── 5.11 Express/in-transit items ──────────────────────────────────
        {
            id: "express",
            label: "快递中",
            icon: "Package",
            components: {
                table: { queryId: "express-items", columns: ["name", "category", "location", "quantity", "location_status", "tags"], sortable: true },
            },
        },
        // ── 5.12 数据库 ───────────────────────────────────────────────────
        {
            id: "data-browser",
            label: "数据库",
            icon: "Database",
            components: {
                dataBrowser: {}
            },
        },
    ],
};
