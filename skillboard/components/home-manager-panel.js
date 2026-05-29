import { DbEngine } from '../shared/db-engine.js';
import { ChartRenderer } from '../shared/chart-renderer.js';
import { renderTable, renderParamForm } from '../shared/ui-helpers.js';
import { resolveShortcut } from '../shared/utils.js';
import { HomeManagerConfig } from '../config/config-home-manager.js';
// @ts-ignore - HomeManagerConfig uses local SkillConfig type that structurally matches
const config = HomeManagerConfig;
class HomeManagerPanel extends HTMLElement {
    constructor() {
        super();
        this.db = new DbEngine();
        this.currentView = 'daily';
        this.paramValues = {};
        this.loadedDbName = null;
        this.SKILL_NAME = 'home-manager';
        this.shadow = this.attachShadow({ mode: 'open' });
    }
    connectedCallback() {
        this.render();
        this.addEventListener('db-updated', (e) => {
            const ce = e;
            this.loadedDbName = ce.detail.filename;
            this.showDbStatus(ce.detail.filename);
        });
    }
    render() {
        this.shadow.innerHTML = `
      <style>${this.getStyles()}</style>
      <div class="panel">
        <div class="panel-header">
          <h2>${config.meta.label}</h2>
          <p class="desc">${config.meta.description}</p>
        </div>

        <div class="db-loader">
          <input type="file" accept=".db" id="db-file" />
          <label for="db-file">选择数据库文件或拖拽 .db 文件到此处</label>
          <div class="drop-zone" id="drop-zone">
            <p>拖拽 .db 文件到此处</p>
          </div>
        </div>

        <div class="views-nav" id="views-nav" style="display:none">
          ${config.views.map(v => `
            <button data-view="${v.id}" class="nav-btn">${v.label}</button>
          `).join('')}
        </div>

        <div class="view-content" id="view-content"></div>
      </div>
    `;
        this.bindEvents();
    }
    getStyles() {
        return `
      :host { display: block; font-family: 'Geist', 'Inter', sans-serif; }
      .panel { max-width: 1200px; margin: 0 auto; padding: 2rem; }
      .panel-header h2 { font-size: 1.5rem; font-weight: 600; color: #18181B; }
      .desc { color: #64748B; font-size: 0.875rem; margin: 0.25rem 0 1.5rem; }

      .db-loader { margin-bottom: 2rem; }
      .db-loader input[type="file"] { display: none; }
      .db-loader label {
        display: inline-block; padding: 0.75rem 1.5rem;
        background: #2563EB; color: #fff; border-radius: 8px; cursor: pointer;
        font-size: 0.875rem; transition: background 0.2s;
      }
      .db-loader label:hover { background: #1D4ED8; }
      .drop-zone {
        margin-top: 1rem; padding: 2rem; border: 2px dashed #E4E4E7;
        border-radius: 12px; text-align: center; color: #64748B;
        transition: border-color 0.2s, background 0.2s;
      }
      .drop-zone.drag-over { border-color: #2563EB; background: #EFF6FF; }
      .drop-zone p { margin: 0; }
      .db-status { margin-top: 0.75rem; font-size: 0.8rem; color: #10B981; }
      .db-status.error { color: #EF4444; }

      .views-nav { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
      .nav-btn {
        padding: 0.5rem 1rem; border: 1px solid #E4E4E7; border-radius: 8px;
        background: #fff; color: #64748B; font-size: 0.875rem; cursor: pointer;
        transition: all 0.2s;
      }
      .nav-btn:hover { border-color: #2563EB; color: #2563EB; }
      .nav-btn.active { background: #2563EB; color: #fff; border-color: #2563EB; }

      .view-content { background: #fff; border-radius: 16px; padding: 1.5rem; }

      .param-form { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; padding: 1rem; background: #F8FAFC; border-radius: 12px; }
      .param-field { display: flex; flex-direction: column; gap: 0.25rem; }
      .param-field label { font-size: 0.75rem; color: #64748B; font-weight: 500; }
      .param-input { padding: 0.5rem 0.75rem; border: 1px solid #E4E4E7; border-radius: 6px; font-size: 0.875rem; outline: none; }
      .param-input:focus { border-color: #2563EB; }
      .apply-btn {
        align-self: flex-end; padding: 0.5rem 1rem;
        background: #18181B; color: #fff; border: none; border-radius: 6px;
        cursor: pointer; font-size: 0.875rem;
      }
      .apply-btn:hover { background: #27272A; }
      .apply-btn:active { transform: scale(0.98); }

      .table-wrapper { overflow-x: auto; }
      .data-table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 0.875rem; }
      .data-table th { text-align: left; padding: 0.75rem 1rem; background: #F8FAFC; color: #64748B; font-weight: 500; border-bottom: 1px solid #E4E4E7; }
      .data-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #F4F4F5; color: #18181B; }
      .data-table tr:hover td { background: #F8FAFC; }
      .data-table tr { transition: background 0.15s; }

      .empty-state { text-align: center; padding: 3rem; color: #64748B; }
      .empty-state svg { color: #D4D4D8; margin-bottom: 1rem; }
      .empty-state p { margin: 0; font-size: 0.875rem; }

      .chart-wrapper { position: relative; height: 300px; margin-top: 1rem; }
      canvas { width: 100% !important; }

      .loading { text-align: center; padding: 2rem; color: #64748B; }
      .loading::after { content: '...'; animation: dots 1.5s infinite; }
      @keyframes dots { 0%, 20%{content:'.'} 40%{content:'..'} 60%, 100%{content:'...'} }
    `;
    }
    bindEvents() {
        const fileInput = this.shadow.getElementById('db-file');
        const dropZone = this.shadow.getElementById('drop-zone');
        fileInput?.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (file)
                await this.loadDb(file);
        });
        dropZone?.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
        dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
        dropZone?.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const file = e.dataTransfer?.files[0];
            if (file)
                await this.loadDb(file);
        });
        this.shadow.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentView = btn.getAttribute('data-view') || 'daily';
                this.shadow.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.switchView();
            });
        });
    }
    async loadDb(file) {
        try {
            await this.db.loadFromFile(file, 'home.db');
            this.loadedDbName = file.name;
            localStorage.setItem(`skillboard_db_${this.SKILL_NAME}`, file.name);
            const viewsNav = this.shadow.getElementById('views-nav');
            viewsNav.style.display = 'flex';
            const dropZone = this.shadow.getElementById('drop-zone');
            if (dropZone)
                dropZone.style.display = 'none';
            const status = document.createElement('div');
            status.className = 'db-status';
            status.textContent = `已加载: ${file.name}`;
            this.shadow.querySelector('.db-status')?.remove();
            this.shadow.querySelector('.db-loader')?.appendChild(status);
            this.switchView();
        }
        catch (e) {
            this.shadow.querySelector('.db-status')?.remove();
            const err = document.createElement('div');
            err.className = 'db-status error';
            err.textContent = `加载失败: ${e.message}`;
            this.shadow.querySelector('.db-loader')?.appendChild(err);
        }
    }
    showDbStatus(filename) {
        const viewsNav = this.shadow.getElementById('views-nav');
        viewsNav.style.display = 'flex';
        const dropZone = this.shadow.getElementById('drop-zone');
        if (dropZone)
            dropZone.style.display = 'none';
        this.shadow.querySelector('.db-status')?.remove();
        const status = document.createElement('div');
        status.className = 'db-status';
        status.textContent = `已加载: ${filename}（请重新拖拽文件以加载数据）`;
        this.shadow.querySelector('.db-loader')?.appendChild(status);
    }
    async prefillParams(queryId) {
        const query = config.queries.find(q => q.id === queryId);
        if (!query?.params)
            return;
        for (const p of query.params) {
            if (p.default !== undefined && this.paramValues[p.name] === undefined) {
                this.paramValues[p.name] = resolveShortcut(p.default);
            }
        }
    }
    async switchView() {
        const content = this.shadow.getElementById('view-content');
        if (!this.db.isLoaded())
            return;
        content.innerHTML = '<div class="loading">加载中</div>';
        const view = config.views.find(v => v.id === this.currentView);
        if (!view)
            return;
        try {
            if (view.components.table) {
                await this.prefillParams(view.components.table.queryId);
                await this.renderTableView(view.components.table.queryId, view.components.table);
            }
            else if (view.components.chart) {
                await this.prefillParams(view.components.chart.queryId);
                await this.renderChartView(view.components.chart.queryId);
            }
        }
        catch (e) {
            content.innerHTML = `<div class="empty-state"><p>加载失败: ${e.message}</p></div>`;
        }
    }
    async renderTableView(queryId, tableConfig) {
        const content = this.shadow.getElementById('view-content');
        const query = config.queries.find(q => q.id === queryId);
        if (!query) {
            content.innerHTML = `<div class="empty-state"><p>Query not found: ${queryId}</p></div>`;
            return;
        }
        let paramHtml = '';
        if (query.params && query.params.length > 0) {
            paramHtml = renderParamForm(query.params, resolveShortcut);
            paramHtml += '<button class="apply-btn" id="apply-params">应用</button>';
        }
        const result = await this.db.exec(query.sql, this.paramValues);
        const allFields = config.schema.tables.flatMap(t => t.fields);
        const tableHtml = renderTable(result, allFields, tableConfig);
        content.innerHTML = `${paramHtml}${tableHtml}`;
        const applyBtn = this.shadow.getElementById('apply-params');
        applyBtn?.addEventListener('click', async () => {
            const newParams = {};
            query.params?.forEach(p => {
                const input = this.shadow.querySelector(`[name="${p.name}"]`);
                if (input)
                    newParams[p.name] = input.value;
            });
            this.paramValues = newParams;
            await this.switchView();
        });
    }
    async renderChartView(queryId) {
        const content = this.shadow.getElementById('view-content');
        const query = config.queries.find(q => q.id === queryId);
        if (!query) {
            content.innerHTML = `<div class="empty-state"><p>Query not found: ${queryId}</p></div>`;
            return;
        }
        let paramHtml = '';
        if (query.params && query.params.length > 0) {
            paramHtml = renderParamForm(query.params, resolveShortcut);
            paramHtml += '<button class="apply-btn" id="apply-params">应用</button>';
        }
        const result = await this.db.exec(query.sql, this.paramValues);
        if (!result.rows || result.rows.length === 0) {
            content.innerHTML = `${paramHtml}<div class="empty-state"><p>暂无数据</p></div>`;
            return;
        }
        const labels = result.rows.map(r => r[result.columns[0]]);
        const chartType = query.chartType || 'bar';
        const colorScheme = query.chartConfig?.colorScheme;
        content.innerHTML = `${paramHtml}<div class="chart-wrapper"><canvas id="chart-canvas"></canvas></div>`;
        const canvas = this.shadow.getElementById('chart-canvas');
        const renderer = new ChartRenderer(canvas);
        renderer.render(chartType, labels, [{ label: query.label, data: result.rows.map(r => Number(r[result.columns[1]]) || 0), colorScheme }]);
        const applyBtn = this.shadow.getElementById('apply-params');
        applyBtn?.addEventListener('click', async () => {
            const newParams = {};
            query.params?.forEach(p => {
                const input = this.shadow.querySelector(`[name="${p.name}"]`);
                if (input)
                    newParams[p.name] = input.value;
            });
            this.paramValues = newParams;
            await this.prefillParams(queryId);
            await this.renderChartView(queryId);
        });
    }
}
customElements.define('home-manager-panel', HomeManagerPanel);
