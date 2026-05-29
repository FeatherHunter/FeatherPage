import { config } from './config.js';
import { DbEngine } from './config.js';
export class InterviewManagerPanel extends HTMLElement {
    get currentView() { return this._currentView; }
    set currentView(v) { this._currentView = v; }
    constructor() {
        super();
        this.db = new DbEngine();
        this._currentView = 'data-browser';
        this.paramValues = {};
        this.SKILL_NAME = 'interview-manager';
        this.shadow = this.attachShadow({ mode: 'open' });
    }
    async connectedCallback() {
        this.render();
        this.addEventListener('db-updated', async (e) => {
            const ce = e;
            if (!ce.detail.filename) {
                this.db.close();
                this.shadow.getElementById('views-nav').style.display = 'none';
                this.shadow.querySelector('.db-loaded-indicator')?.remove();
                const dbLoader = this.shadow.querySelector('.db-loader');
                if (dbLoader)
                    dbLoader.style.display = 'block';
                this.switchView();
                return;
            }
            const restored = await this.restoreDbFromStorage();
            if (restored) {
                this.showDbLoaded(ce.detail.filename);
                this.switchView();
            }
        });
        const savedFilename = localStorage.getItem(`skillboard_db_${this.SKILL_NAME}_name`);
        if (savedFilename) {
            // @ts-ignore
            if ('showOpenFilePicker' in window) {
                const reloaded = await this.tryAutoReload();
                if (reloaded)
                    return;
            }
            const restored = await this.restoreDbFromStorage();
            if (restored) {
                this.showDbLoaded(savedFilename);
                this.switchView();
            }
        }
    }
    render() {
        this.shadow.innerHTML = `
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
          ${config.views
            .map(v => `
              <button data-view="${v.id}" class="nav-btn${v.id === this.currentView ? ' active' : ''}">${v.label}</button>
            `).join('')}
        </div>

        <div class="view-content" id="view-content"></div>
      </div>
    `;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = new URL('./styles.css', import.meta.url).href;
        this.shadow.appendChild(link);
        this.bindEvents();
    }
    bindEvents() {
        const fileInput = this.shadow.getElementById('db-file');
        const dropZone = this.shadow.getElementById('drop-zone');
        fileInput?.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (file)
                await this.loadDb(file);
        });
        dropZone?.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
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
                this.currentView = btn.getAttribute('data-view') || 'data-browser';
                this.shadow.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.switchView();
            });
        });
    }
    async loadDb(file) {
        try {
            await this.db.loadFromFile(file, 'interview.db');
            localStorage.setItem(`skillboard_db_${this.SKILL_NAME}_name`, file.name);
            // Try to cache to localStorage, but don't fail if it's too large
            try {
                const blob = await this.db.exportDatabase(file.name);
                const buffer = await blob.arrayBuffer();
                localStorage.setItem(`skillboard_db_${this.SKILL_NAME}`, JSON.stringify(Array.from(new Uint8Array(buffer))));
            }
            catch (storageErr) {
                console.warn('localStorage quota exceeded, skipping cache:', storageErr);
            }
            this.persistFileHandle(file).catch(() => { });
            this.showDbLoaded(file.name);
            this.switchView();
            // 修复：加载完成后移除文件输入框焦点并滚动到顶部，防止移动端底部导航被滚出视野
            const fileInput = this.shadow.getElementById('db-file');
            if (fileInput) {
                fileInput.value = '';
                fileInput.blur();
            }
            window.scrollTo({ top: 0, behavior: 'instant' });
        }
        catch (e) {
            this.showDbError(e.message);
        }
    }
    async persistFileHandle(file) {
        localStorage.setItem(`skillboard_db_${this.SKILL_NAME}_handle`, 'persisted');
        localStorage.setItem(`skillboard_db_${this.SKILL_NAME}_handle_name`, file.name);
    }
    async tryAutoReload() {
        // @ts-ignore
        if (!('showOpenFilePicker' in window))
            return false;
        try {
            // @ts-ignore
            const handles = await window.showOpenFilePicker({
                types: [{ description: 'SQLite DB', accept: { 'application/x-sqlite3': ['.db'] } }],
                multiple: false,
                excludeAcceptAllOption: true
            });
            if (handles && handles[0]) {
                const file = await handles[0].getFile();
                await this.db.loadFromFile(file, file.name);
                const blob = await this.db.exportDatabase(file.name);
                const buffer = await blob.arrayBuffer();
                localStorage.setItem(`skillboard_db_${this.SKILL_NAME}`, JSON.stringify(Array.from(new Uint8Array(buffer))));
                localStorage.setItem(`skillboard_db_${this.SKILL_NAME}_name`, file.name);
                return true;
            }
        }
        catch (e) {
            // User cancelled or not supported
        }
        return false;
    }
    async restoreDbFromStorage() {
        try {
            const stored = localStorage.getItem(`skillboard_db_${this.SKILL_NAME}`);
            if (!stored)
                return false;
            const data = new Uint8Array(JSON.parse(stored));
            await this.db.loadFromUint8Array(data);
            return true;
        }
        catch (e) {
            return false;
        }
    }
    showDbLoaded(filename) {
        this.shadow.querySelector('.db-loaded-indicator')?.remove();
        const dbLoader = this.shadow.querySelector('.db-loader');
        if (dbLoader)
            dbLoader.style.display = 'none';
        this.shadow.getElementById('views-nav').style.display = 'flex';
        const indicator = document.createElement('div');
        indicator.className = 'db-loaded-indicator';
        indicator.innerHTML = `
      <span class="db-status-text">${filename}</span>
      <button class="db-reload-btn" id="db-reload-btn" title="刷新数据">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 4v6h-6M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
        刷新数据
      </button>
    `;
        this.shadow.querySelector('.panel')?.insertBefore(indicator, this.shadow.getElementById('views-nav'));
        this.shadow.getElementById('db-reload-btn')?.addEventListener('click', async () => {
            const reloaded = await this.tryAutoReload();
            if (reloaded)
                this.switchView();
        });
    }
    showDbError(msg) {
        this.shadow.querySelector('.db-status')?.remove();
        const err = document.createElement('div');
        err.className = 'db-status error';
        err.textContent = `加载失败: ${msg}`;
        this.shadow.querySelector('.db-loader')?.appendChild(err);
    }
    async switchView() {
        const content = this.shadow.getElementById('view-content');
        if (!this.db.isLoaded()) {
            content.innerHTML = '<div class="empty-state"><p>请先加载数据库文件</p><p class="hint">拖拽 .db 文件到上方或点击"选择文件"</p></div>';
            return;
        }
        content.innerHTML = '<div class="loading">加载中</div>';
        const view = config.views.find(v => v.id === this.currentView);
        if (!view)
            return;
        try {
            if (view.components.dataBrowser) {
                const { renderDataBrowserView } = await import('../../shared/data-browser/renderer.js');
                await renderDataBrowserView(this, this.db);
            }
        }
        catch (e) {
            content.innerHTML = `<div class="error-state"><p>加载失败: ${e.message}</p></div>`;
        }
    }
    getShadow() { return this.shadow; }
    getDb() { return this.db; }
    getParamValues() { return this.paramValues; }
    setParamValues(v) { this.paramValues = v; }
    reload() { return this.switchView(); }
}
customElements.define('interview-manager-panel', InterviewManagerPanel);
