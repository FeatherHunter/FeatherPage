export const LearningSystemConfig = {
    meta: {
        name: "learning-system",
        label: "学习系统",
        icon: "GraduationCap",
        description: "知识体系管理 - 数据浏览",
        dbFiles: ["learning-system.db"],
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
