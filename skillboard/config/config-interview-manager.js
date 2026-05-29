export const InterviewManagerConfig = {
    meta: {
        name: "interview-manager",
        label: "面试管家",
        icon: "Briefcase",
        description: "面试准备与记录管理 - 数据浏览",
        dbFiles: ["interview.db"],
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
