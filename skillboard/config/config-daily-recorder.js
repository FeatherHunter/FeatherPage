export const DailyRecorderConfig = {
    meta: {
        name: "daily-recorder",
        label: "录音机",
        icon: "Microphone",
        description: "每日语录记录 - 数据浏览",
        dbFiles: ["daily_recorder.db"],
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
