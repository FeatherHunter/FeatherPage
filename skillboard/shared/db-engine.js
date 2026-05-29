import { interpolateSQL, resolveShortcut } from './utils.js';
export class DbEngine {
    constructor() {
        this.db = null;
        this._isLoaded = false;
    }
    async loadFromFile(file, filename) {
        const SQL = await initSqlJs({
            locateFile: () => './sql-wasm.wasm'
        });
        const buffer = await file.arrayBuffer();
        this.db = new SQL.Database(new Uint8Array(buffer));
        this._isLoaded = true;
    }
    async loadFromUint8Array(data) {
        const SQL = await initSqlJs({
            locateFile: () => './sql-wasm.wasm'
        });
        this.db = new SQL.Database(data);
        this._isLoaded = true;
    }
    async exec(sql, params = {}) {
        if (!this._isLoaded || !this.db)
            throw new Error('Database not loaded');
        const resolvedParams = {};
        for (const [key, value] of Object.entries(params)) {
            resolvedParams[key] = resolveShortcut(value);
        }
        const finalSql = interpolateSQL(sql, resolvedParams);
        try {
            const result = this.db.exec(finalSql);
            if (!result || result.length === 0)
                return { columns: [], values: [], rows: [] };
            const { columns, values } = result[0];
            const rows = values.map((row) => {
                const obj = {};
                columns.forEach((col, i) => { obj[col] = row[i]; });
                return obj;
            });
            return { columns, values, rows };
        }
        catch (e) {
            console.error('SQL Error:', e, '\nSQL:', finalSql);
            throw e;
        }
    }
    async exportDatabase(filename) {
        if (!this._isLoaded || !this.db)
            throw new Error('Database not loaded');
        const data = this.db.export();
        return new Blob([data], { type: 'application/octet-stream' });
    }
    isLoaded() { return this._isLoaded; }
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this._isLoaded = false;
        }
    }
}
