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
exports.candidateLogRoots = candidateLogRoots;
exports.listLogFiles = listLogFiles;
exports.parseChunk = parseChunk;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const RE_TS = /^\[(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})\.\d+\]/;
const RE_MODEL_ID = /\[CraftInvokableAgent\]\s*\[([0-9a-fA-F]{32})\]/;
const RE_USAGE_ID = /\[AgentReporter\]\s*\[([0-9a-fA-F]{32})\]/;
const RE_NAME = /"name":"([^"]{1,80})"/;
const RE_MODEL_CODE = /"id":"([^"]{1,80})"/;
/** 数值字段的正则缓存（避免每行都新建 RegExp） */
const numCache = new Map();
function numOf(line, key) {
    let re = numCache.get(key);
    if (!re) {
        re = new RegExp(`"${key}":(-?\\d+(?:\\.\\d+)?)`);
        numCache.set(key, re);
    }
    const m = re.exec(line);
    return m ? Number(m[1]) : 0;
}
const pad2 = (n) => (n < 10 ? `0${n}` : String(n));
/**
 * 各宿主上官方扩展可能落日志的目录。
 * 官方扩展在 VS Code / CodeBuddy IDE / Trae 等宿主里都叫 CodeBuddyExtension，
 * 这里顺手把可能的产品名都试一遍，只返回真实存在的目录。
 */
function candidateLogRoots() {
    const products = ["CodeBuddyExtension", "CodeBuddyExtension CN", "CodeBuddy"];
    const bases = [];
    if (process.platform === "win32") {
        bases.push(process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local"));
    }
    else if (process.platform === "darwin") {
        bases.push(path.join(os.homedir(), "Library", "Application Support"));
    }
    else {
        bases.push(process.env.XDG_DATA_HOME ?? path.join(os.homedir(), ".local", "share"));
    }
    if (process.env.CODEBUDDY_LOG_DIR)
        bases.push(process.env.CODEBUDDY_LOG_DIR);
    const roots = [];
    for (const base of bases) {
        for (const product of products) {
            const dir = path.join(base, product, "Logs", "VSCode");
            try {
                if (fs.statSync(dir).isDirectory())
                    roots.push(dir);
            }
            catch {
                /* 目录不存在：跳过 */
            }
        }
    }
    return roots;
}
/** 列出所有日志文件（`<root>/<YYYY-MM-DD>/*.log`） */
function listLogFiles(roots) {
    const files = [];
    for (const root of roots) {
        let days;
        try {
            days = fs.readdirSync(root, { withFileTypes: true });
        }
        catch {
            continue;
        }
        for (const day of days) {
            if (!day.isDirectory() || !/^\d{4}-\d{2}-\d{2}$/.test(day.name))
                continue;
            const dir = path.join(root, day.name);
            let names;
            try {
                names = fs.readdirSync(dir);
            }
            catch {
                continue;
            }
            for (const name of names) {
                if (name.toLowerCase().endsWith(".log"))
                    files.push(path.join(dir, name));
            }
        }
    }
    return files.sort();
}
/**
 * 从 `fromOffset` 起解析增量内容。
 * 只消费到最后一个换行，剩下的半行留给下次（避免读到写一半的 JSON）。
 */
function parseChunk(filePath, fromOffset, modelsIn) {
    const models = { ...modelsIn };
    let stat;
    try {
        stat = fs.statSync(filePath);
    }
    catch {
        return { entries: [], models, nextOffset: 0, truncated: false };
    }
    if (stat.size < fromOffset)
        return { entries: [], models, nextOffset: 0, truncated: true };
    if (stat.size === fromOffset)
        return { entries: [], models, nextOffset: fromOffset, truncated: false };
    let buf;
    let fd;
    try {
        fd = fs.openSync(filePath, "r");
        const len = stat.size - fromOffset;
        buf = Buffer.alloc(len);
        const read = fs.readSync(fd, buf, 0, len, fromOffset);
        if (read < len)
            buf = buf.subarray(0, read);
    }
    catch {
        return { entries: [], models, nextOffset: fromOffset, truncated: false };
    }
    finally {
        if (fd !== undefined) {
            try {
                fs.closeSync(fd);
            }
            catch {
                /* ignore */
            }
        }
    }
    const lastNl = buf.lastIndexOf(0x0a);
    const usable = lastNl >= 0 ? buf.subarray(0, lastNl + 1) : Buffer.alloc(0);
    const nextOffset = fromOffset + usable.length;
    if (usable.length === 0)
        return { entries: [], models, nextOffset: fromOffset, truncated: false };
    const entries = [];
    for (const raw of usable.toString("utf8").split("\n")) {
        const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
        if (!line)
            continue;
        const ts = RE_TS.exec(line);
        if (!ts)
            continue;
        // 模型声明行：先记下 id → 名称，后续同 id 的用量行都归到它名下
        const modelHit = RE_MODEL_ID.exec(line);
        if (modelHit && line.includes("model:")) {
            const code = RE_MODEL_CODE.exec(line)?.[1];
            const name = RE_NAME.exec(line)?.[1];
            const id = code || name;
            if (id)
                models[modelHit[1]] = { id, name: name || id };
            continue;
        }
        // 用量行：必须是 usage={...} 的 step 指标行
        const usageHit = RE_USAGE_ID.exec(line);
        if (!usageHit || !line.includes("usage=") || !line.includes('"inputTokens"'))
            continue;
        const year = Number(ts[1]);
        const month = Number(ts[2]);
        const day = Number(ts[3]);
        const hour = Number(ts[4]);
        const minute = Number(ts[5]);
        const second = Number(ts[6]);
        const input = numOf(line, "inputTokens");
        const output = numOf(line, "outputTokens");
        const declared = numOf(line, "totalTokens");
        const total = declared > 0 ? declared : input + output;
        if (total <= 0)
            continue;
        const callId = usageHit[1];
        const ref = models[callId];
        entries.push({
            ts: new Date(year, month - 1, day, hour, minute, second).getTime(),
            dayKey: `${year}-${pad2(month)}-${pad2(day)}`,
            hourKey: pad2(hour),
            modelId: ref?.id ?? callId,
            modelName: ref?.name ?? callId,
            input,
            output,
            total,
            cache: numOf(line, "cacheTokens"),
            credit: numOf(line, "credit"),
        });
    }
    return { entries, models, nextOffset, truncated: false };
}
