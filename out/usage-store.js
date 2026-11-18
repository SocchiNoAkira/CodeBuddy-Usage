"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageStore = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const usage_log_1 = require("./usage-log");
const INDEX_FILE = "usage-index.json";
const KEEP_MONTHS = 13;
const pad2 = (n) => (n < 10 ? `0${n}` : String(n));
const dayKeyOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const emptyTotals = () => ({ input: 0, output: 0, total: 0, cache: 0, credit: 0, calls: 0 });
function bump(store, e, sign) {
    let b = store[e.modelId];
    if (!b) {
        if (sign < 0)
            return;
        b = store[e.modelId] = { n: e.modelName, i: 0, o: 0, t: 0, c: 0, r: 0, k: 0 };
    }
    if (e.modelName)
        b.n = e.modelName;
    b.i += sign * e.input;
    b.o += sign * e.output;
    b.t += sign * e.total;
    b.c += sign * e.cache;
    b.r += sign * e.credit;
    b.k += sign;
    if (b.k <= 0 && b.t <= 0 && b.r <= 0)
        delete store[e.modelId];
}
class UsageStore {
    constructor(storageDir) {
        this.storageDir = storageDir;
        this.index = { version: 1, files: {}, days: {} };
        this.loaded = false;
        this.dirty = false;
        this.lastFileCount = 0;
    }
    get error() {
        return this.lastError;
    }
    indexPath() {
        if (!this.storageDir)
            return undefined;
        return path.join(this.storageDir, INDEX_FILE);
    }
    ensureLoaded() {
        if (this.loaded)
            return;
        this.loaded = true;
        const file = this.indexPath();
        if (!file)
            return;
        try {
            const raw = fs.readFileSync(file, "utf8");
            const parsed = JSON.parse(raw);
            if (parsed?.version === 1 && parsed.days && parsed.files)
                this.index = parsed;
        }
        catch {
            /* 首次运行或索引损坏：从空索引开始 */
        }
    }
    /**
     * 扫描日志增量并返回最新快照。
     * 单个文件失败不会影响其它文件；任何异常都被吞掉，调用方拿不到数据时只是不显示这一块。
     */
    refresh(overridePath) {
        this.ensureLoaded();
        this.lastError = undefined;
        let files = [];
        try {
            const roots = overridePath ? [overridePath] : (0, usage_log_1.candidateLogRoots)();
            if (overridePath) {
                // 允许直接填到日期目录或根目录，这里统一兜底成「根目录」
                try {
                    if (fs.statSync(overridePath).isFile()) {
                        files = [overridePath];
                    }
                }
                catch {
                    /* ignore */
                }
            }
            if (files.length === 0)
                files = (0, usage_log_1.listLogFiles)(roots);
        }
        catch (e) {
            this.lastError = String(e?.message ?? e);
            files = [];
        }
        this.lastFileCount = files.length;
        let changed = false;
        const alive = new Set(files);
        for (const known of Object.keys(this.index.files)) {
            if (!alive.has(known)) {
                // 日志已被轮转删除：索引里累计的 days 保留，只丢掉文件游标
                delete this.index.files[known];
                changed = true;
            }
        }
        for (const file of files) {
            try {
                let rec = this.index.files[file];
                if (!rec) {
                    rec = this.index.files[file] = { offset: 0, models: {}, agg: {} };
                    changed = true;
                }
                const stat = fs.statSync(file);
                if (stat.size < rec.offset) {
                    this.detach(rec);
                    rec.offset = 0;
                    rec.models = {};
                    rec.agg = {};
                    changed = true;
                    continue; // 本轮先扣减，下一轮再整文件解析
                }
                if (stat.size === rec.offset)
                    continue;
                const chunk = (0, usage_log_1.parseChunk)(file, rec.offset, rec.models);
                if (chunk.truncated)
                    continue;
                rec.offset = chunk.nextOffset;
                rec.models = chunk.models;
                for (const entry of chunk.entries) {
                    this.attach(rec, entry);
                    changed = true;
                }
            }
            catch (e) {
                this.lastError = String(e?.message ?? e);
            }
        }
        if (changed) {
            this.prune();
            this.scheduleSave();
        }
        return this.snapshot();
    }
    attach(rec, e) {
        const day = this.index.days[e.dayKey] ?? (this.index.days[e.dayKey] = {});
        const hour = day[e.hourKey] ?? (day[e.hourKey] = {});
        bump(hour, e, 1);
        const aggDay = rec.agg[e.dayKey] ?? (rec.agg[e.dayKey] = {});
        const aggHour = aggDay[e.hourKey] ?? (aggDay[e.hourKey] = {});
        bump(aggHour, e, 1);
    }
    /** 把某个文件已贡献的数值从总索引里扣掉（文件被截断/重建时用） */
    detach(rec) {
        for (const [dayKey, hours] of Object.entries(rec.agg)) {
            const day = this.index.days[dayKey];
            if (!day)
                continue;
            for (const [hourKey, models] of Object.entries(hours)) {
                const hour = day[hourKey];
                if (!hour)
                    continue;
                for (const [modelId, b] of Object.entries(models)) {
                    bump(hour, {
                        modelId,
                        modelName: b.n,
                        input: b.i,
                        output: b.o,
                        total: b.t,
                        cache: b.c,
                        credit: b.r,
                    }, -1);
                }
                if (Object.keys(hour).length === 0)
                    delete day[hourKey];
            }
            if (Object.keys(day).length === 0)
                delete this.index.days[dayKey];
        }
    }
    prune() {
        const now = new Date();
        const cutoff = dayKeyOf(new Date(now.getFullYear(), now.getMonth() - (KEEP_MONTHS - 1), 1));
        for (const dayKey of Object.keys(this.index.days)) {
            if (dayKey < cutoff)
                delete this.index.days[dayKey];
        }
    }
    scheduleSave() {
        this.dirty = true;
        if (this.saveTimer)
            return;
        this.saveTimer = setTimeout(() => {
            this.saveTimer = undefined;
            void this.flush();
        }, 800);
    }
    async flush() {
        if (!this.dirty)
            return;
        const file = this.indexPath();
        if (!file)
            return;
        this.dirty = false;
        try {
            await fs.promises.mkdir(path.dirname(file), { recursive: true });
            await fs.promises.writeFile(file, JSON.stringify(this.index), "utf8");
        }
        catch {
            this.dirty = true;
        }
    }
    collect(keep) {
        const merged = new Map();
        const totals = emptyTotals();
        for (const [dayKey, hours] of Object.entries(this.index.days)) {
            for (const [hourKey, models] of Object.entries(hours)) {
                if (!keep(dayKey, hourKey))
                    continue;
                for (const [modelId, b] of Object.entries(models)) {
                    const m = merged.get(modelId) ?? {
                        modelId,
                        modelName: b.n,
                        input: 0,
                        output: 0,
                        total: 0,
                        cache: 0,
                        credit: 0,
                        calls: 0,
                    };
                    m.modelName = b.n || m.modelName;
                    m.input += b.i;
                    m.output += b.o;
                    m.total += b.t;
                    m.cache += b.c;
                    m.credit += b.r;
                    m.calls += b.k;
                    merged.set(modelId, m);
                    totals.input += b.i;
                    totals.output += b.o;
                    totals.total += b.t;
                    totals.cache += b.c;
                    totals.credit += b.r;
                    totals.calls += b.k;
                }
            }
        }
        const models = [...merged.values()].filter((m) => m.total > 0).sort((a, b) => b.total - a.total);
        return { totals, models };
    }
    snapshot(now = new Date()) {
        this.ensureLoaded();
        const today = dayKeyOf(now);
        const hour = pad2(now.getHours());
        const month = today.slice(0, 7);
        const week = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
            const key = dayKeyOf(d);
            let sum = 0;
            for (const models of Object.values(this.index.days[key] ?? {})) {
                for (const b of Object.values(models))
                    sum += b.t;
            }
            week.push({ dayKey: key, label: String(d.getDate()), total: sum });
        }
        return {
            hour: this.collect((d, h) => d === today && h === hour),
            today: this.collect((d) => d === today),
            month: this.collect((d) => d.startsWith(month)),
            week,
            fileCount: this.lastFileCount,
            scannedAt: now.getTime(),
        };
    }
    dispose() {
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveTimer = undefined;
        }
        void this.flush();
    }
}
exports.UsageStore = UsageStore;
