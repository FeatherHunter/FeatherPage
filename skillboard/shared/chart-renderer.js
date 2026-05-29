// chart.js 通过 CDN 全局加载：window.Chart
// 使用方式：new window.Chart(canvas, config)
// @ts-ignore - plugin loaded via CDN
const datalabels = window.ChartDataLabels;
const DEFAULT_COLORS = [
    '#2563EB', '#60A5FA', '#93C5FD',
    '#10B981', '#34D399', '#6EE7B7',
    '#F59E0B', '#FBBF24', '#FCD34D',
    '#EF4444', '#F87171', '#FCA5A5',
    '#8B5CF6', '#A855F7', '#F43F5E',
    '#06B6D4', '#14B8A6', '#84CC16',
];
export class ChartRenderer {
    constructor(canvas) {
        this.chart = null;
        this.canvas = canvas;
    }
    render(type, labels, datasets, options) {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        const colors = datasets[0]?.colorScheme || DEFAULT_COLORS;
        // Register datalabels plugin
        if (datalabels) {
            window.Chart.register(datalabels);
        }
        this.chart = new window.Chart(this.canvas, {
            type,
            data: {
                labels,
                datasets: datasets.map((ds, datasetIndex) => ({
                    ...ds, // preserve barPercentage/categoryPercentage/cutout etc.
                    label: ds.label,
                    data: ds.data,
                    backgroundColor: type === 'pie' || type === 'doughnut'
                        ? colors.slice(0, ds.data.length)
                        : (ds.colorScheme?.[0] || colors[datasetIndex % colors.length]),
                    borderColor: type === 'doughnut' ? 'transparent' : (ds.colorScheme?.[0] || colors[datasetIndex % colors.length]),
                    borderWidth: type === 'doughnut' ? 0 : 1,
                    borderRadius: type === 'doughnut' ? 0 : 4,
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 400 },
                plugins: {
                    legend: { display: true, position: 'top' },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            label: (ctx) => {
                                const val = ctx.raw;
                                if (typeof val !== 'number')
                                    return String(val);
                                return Number.isInteger(val) ? String(val) : val.toFixed(2);
                            }
                        }
                    },
                    datalabels: {
                        display: (type === 'pie' || type === 'doughnut'),
                        color: '#fff',
                        formatter: (value, ctx) => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = ((value / total) * 100).toFixed(2);
                            return pct + '%';
                        }
                    }
                },
                ...options
            }
        });
    }
    updateData(labels, datasets) {
        if (!this.chart)
            return;
        this.chart.data.labels = labels;
        this.chart.data.datasets.forEach((ds, i) => { ds.data = datasets[i]?.data || []; });
        this.chart.update();
    }
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}
