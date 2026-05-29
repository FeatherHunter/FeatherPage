export const MemoConfig = {
    meta: {
        name: "memo",
        label: "备忘录",
        icon: "Notepad",
        description: "备忘录与笔记管理 - 数据浏览",
        dbFiles: ["memo.db"],
    },
    schema: {
        tables: [],
    },
    queries: [],
    actions: [],
    views: [
        { id: "data-browser", label: "数据库", icon: "Database",
            components: { dataBrowser: {} } },
    ],
};
