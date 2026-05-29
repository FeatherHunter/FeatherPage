export const ScheduleManagerConfig = {
    meta: {
        name: "schedule-manager",
        label: "作息管家",
        icon: "Clock",
        description: "作息计划与记录管理 - 数据浏览",
        dbFiles: ["schedule_data.db"],
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
