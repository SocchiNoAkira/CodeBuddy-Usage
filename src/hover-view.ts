import * as vscode from "vscode";

/**
 * 悬浮框的富文本渲染（纯 HTML + 内联样式）。
 *
 * 为什么用 HTML：MarkdownString 支持 `supportHtml`，而 hover 的 markdown 只能出表格，
 * 想画进度条/柱状图/胶囊标签就必须用 HTML。VS Code 的 sanitizer 只放行一部分标签与
 * CSS 属性（background-color / border-* / color / display / float / font-* / height /
 * line-height / margin / opacity / padding / text-align / vertical-align / white-space /
 * width 等），因此这里**不使用** flex、gap、grid、box-shadow、position、transform，
 * 布局一律用 inline-block + 百分比宽度，保证在悬停框里也能正常排版。
 *
 * 颜色统一走 VS Code 主题变量并带 hex 兜底（浅色/深色主题都不会出现纯白方块）。
 */

export type HoverRange = "today" | "month";

export interface HoverChip {
  text: string;
  /** command: 链接，点击后在扩展宿主里执行 */
  link?: string;
  tone?: "ok" | "warn" | "err" | "muted";
}

export interface HoverModelRow {
  name: string;
  total: number;
  credit: number;
  share: number;
}

export interface HoverUsageVM {
  hourTotal: number;
  hourCredit: number;
  todayTotal: number;
  todayCredit: number;
  monthTotal: number;
  monthCredit: number;
  /** 近 7 天，最后一个元素是今天 */
  week: Array<{ label: string; total: number }>;
  range: HoverRange;
  rows: HoverModelRow[];
  modelCount: number;
  /** 无数据/解析失败时的说明 */
  note?: string;
}

export interface HoverVM {
  nickname?: string;
  avatarUrl?: string;
  remain: number;
  total: number;
  plansUrl: string;
  plans: Array<{ name: string; left: number; total: number; expires: string }>;
  planCount: number;
  chips: HoverChip[];
  updatedAt?: Date;
  usage?: HoverUsageVM;
}

const PALETTE = [
  "var(--vscode-charts-blue,#3794ff)",
  "var(--vscode-charts-green,#3fb950)",
  "var(--vscode-charts-purple,#b180d7)",
  "var(--vscode-charts-orange,#e8a33d)",
  "var(--vscode-charts-yellow,#d9b600)",
  "var(--vscode-charts-red,#f14c4c)",
];

const BORDER = "var(--vscode-widget-border,rgba(128,128,128,0.35))";

const t = (
  message: string,
  ...args: Array<string | number | boolean | undefined | null>
): string => vscode.l10n.t(message, ...args.map((a) => a ?? ""));

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 千分位数字，默认两位小数并去掉多余的 0 */
function num(n: number, digits = 2): string {
  const v = Number.isFinite(n) ? n : 0;
  const fixed = Math.abs(v).toFixed(digits);
  const [intPart, frac] = fixed.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${v < 0 ? "-" : ""}${grouped}${frac ? `.${frac}` : ""}`;
}

/** 同上，但去掉尾随的 0：1,650.00 → 1,650 */
function numTrim(n: number, digits = 2): string {
  return num(n, digits)
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
}

/** token 数量用 K/M/B 缩写，避免长数字把一行撑开 */
function compact(n: number): string {
  const v = Number.isFinite(n) ? Math.max(0, n) : 0;
  const trim = (x: number) =>
    (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2)).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  if (v >= 1e9) return `${trim(v / 1e9)}B`;
  if (v >= 1e6) return `${trim(v / 1e6)}M`;
  if (v >= 1e3) return `${trim(v / 1e3)}K`;
  return String(Math.round(v));
}

function bar(pct: number, color: string, height: number): string {
  const p = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  const r = Math.round(height / 2);
  return (
    `<span style="display:inline-block;width:100%;height:${height}px;` +
    `background-color:rgba(128,128,128,0.22);border-radius:${r}px;font-size:0;vertical-align:middle">` +
    `<span style="display:inline-block;width:${p.toFixed(1)}%;height:${height}px;` +
    `background-color:${color};border-radius:${r}px;vertical-align:top"></span></span>`
  );
}

function card(inner: string): string {
  return (
    `<div style="border-style:solid;border-width:1px;border-color:${BORDER};` +
    `border-radius:6px;padding:8px 10px 9px;margin-bottom:8px">${inner}</div>`
  );
}

function sectionTitle(text: string): string {
  return `<div style="font-size:10px;font-weight:600;letter-spacing:0.4px;opacity:0.7;margin:10px 0 5px">${esc(
    text
  )}</div>`;
}

function header(vm: HoverVM): string {
  const avatar = vm.avatarUrl
    ? `<img src="${esc(vm.avatarUrl)}" width="20" height="20" style="border-radius:10px;vertical-align:middle;margin-right:5px">`
    : `<span style="vertical-align:middle;margin-right:5px">⚡</span>`;
  const title = vm.nickname
    ? `${esc(vm.nickname)}<span style="opacity:0.55;font-weight:400"> · ${esc(t("CodeBuddy Credits"))}</span>`
    : esc(t("CodeBuddy Credits"));
  return `<div style="font-size:13px;font-weight:600;margin-bottom:7px">${avatar}<span style="vertical-align:middle">${title}</span></div>`;
}

function hero(vm: HoverVM): string {
  const pct = vm.total > 0 ? (vm.remain / vm.total) * 100 : 0;
  return card(
    `<div style="font-size:10px;letter-spacing:0.5px;opacity:0.6;margin-bottom:1px">${esc(t("Remaining"))}</div>` +
      `<div style="font-size:21px;font-weight:600;line-height:1.25;white-space:nowrap">` +
      `${esc(numTrim(vm.remain))}` +
      `<span style="font-size:11px;font-weight:400;opacity:0.55"> / ` +
      `<a href="${esc(vm.plansUrl)}" style="color:inherit;text-decoration:none">${esc(numTrim(vm.total))}</a></span>` +
      `<span style="float:right;font-size:11px;font-weight:400;opacity:0.7;line-height:2.4">${pct.toFixed(1)}%</span>` +
      `</div>` +
      `<div style="margin-top:5px">${bar(pct, PALETTE[0], 6)}</div>`
  );
}

function chips(list: HoverChip[]): string {
  if (!list.length) return "";
  const bg: Record<string, string> = {
    ok: "rgba(80,180,110,0.22)",
    warn: "rgba(220,160,60,0.24)",
    err: "rgba(220,90,90,0.22)",
    muted: "rgba(128,128,128,0.16)",
  };
  const items = list.map((c) => {
    const style =
      `display:inline-block;padding:1px 8px;margin:0 5px 4px 0;border-radius:9px;` +
      `font-size:10px;line-height:16px;background-color:${bg[c.tone ?? "muted"]}`;
    return c.link
      ? `<a href="${esc(c.link)}" style="${style};color:inherit;text-decoration:none">${esc(c.text)}</a>`
      : `<span style="${style}">${esc(c.text)}</span>`;
  });
  return `<div style="font-size:0;margin-bottom:4px">${items.join("")}</div>`;
}

function weekChart(week: HoverUsageVM["week"]): string {
  if (!week.length) return "";
  const max = Math.max(1, ...week.map((w) => w.total));
  const cells = week
    .map((w) => {
      // 用平方根归一化：日用量常差两个数量级，线性归一化会让小值全部贴到最小高度
      const h = w.total <= 0 ? 2 : Math.max(3, Math.round(Math.sqrt(w.total / max) * 26));
      const color = w.total > 0 ? PALETTE[0] : "rgba(128,128,128,0.3)";
      return (
        `<div style="display:inline-block;width:14.28%;vertical-align:bottom;text-align:center">` +
        `<div style="height:${h}px;background-color:${color};border-radius:2px"></div>` +
        `<div style="font-size:9px;opacity:0.45;margin-top:2px;line-height:1">${esc(w.label)}</div>` +
        `</div>`
      );
    })
    .join("");
  return `<div style="font-size:0;white-space:nowrap;margin-top:9px">${cells}</div>`;
}

function metricStrip(u: HoverUsageVM): string {
  // 三格各占 1/3：不加内边距，否则 33.3%+padding 会超过 100% 把第三格挤到下一行
  const cell = (label: string, total: number, credit: number) =>
    `<div style="display:inline-block;width:33.3%;vertical-align:top">` +
    `<div style="font-size:10px;opacity:0.6;margin-bottom:1px">${esc(label)}</div>` +
    `<div style="font-size:15px;font-weight:600;line-height:1.25;white-space:nowrap">${esc(compact(total))}</div>` +
    `<div style="font-size:10px;opacity:0.6;white-space:nowrap">${esc(numTrim(credit))} ${esc(t("credits"))}</div>` +
    `</div>`;
  return (
    `<div style="font-size:0">` +
    cell(t("This hour"), u.hourTotal, u.hourCredit) +
    cell(t("Today"), u.todayTotal, u.todayCredit) +
    cell(t("This month"), u.monthTotal, u.monthCredit) +
    `</div>`
  );
}

function tabs(range: HoverRange): string {
  const active = `color:var(--vscode-textLink-foreground,#3794ff);border-bottom-color:var(--vscode-textLink-foreground,#3794ff);opacity:1`;
  const idle = `color:inherit;border-bottom-color:transparent;opacity:0.55`;
  const tab = (label: string, command: string, on: boolean) =>
    `<a href="command:${command}" style="display:inline-block;padding:2px 9px 3px;margin-right:2px;` +
    `font-size:11px;text-decoration:none;border-bottom-style:solid;border-bottom-width:2px;` +
    `${on ? active : idle}">${esc(label)}</a>`;
  return (
    `<div style="margin:9px 0 7px;border-bottom-style:solid;border-bottom-width:1px;border-bottom-color:${BORDER}">` +
    tab(t("Today"), "codebuddyUsage.usageToday", range === "today") +
    tab(t("This month"), "codebuddyUsage.usageMonth", range === "month") +
    `</div>`
  );
}

function modelRows(u: HoverUsageVM): string {
  if (!u.rows.length) {
    return `<div style="font-size:11px;opacity:0.55">${esc(u.note ?? t("No usage recorded for this period"))}</div>`;
  }
  const body = u.rows
    .map((r, i) => {
      const color = PALETTE[i % PALETTE.length];
      return (
        `<div style="margin-bottom:7px">` +
        `<div style="font-size:11px;white-space:nowrap">` +
        `<span style="display:inline-block;width:56%;overflow:hidden;vertical-align:bottom">${esc(r.name)}</span>` +
        `<span style="display:inline-block;width:26%;text-align:right;font-weight:600;vertical-align:bottom">${esc(
          compact(r.total)
        )}</span>` +
        `<span style="display:inline-block;width:18%;text-align:right;opacity:0.6;vertical-align:bottom;font-size:10px">${esc(
          numTrim(r.credit)
        )}</span>` +
        `</div>` +
        `<div style="margin-top:3px">${bar(r.share * 100, color, 4)}</div>` +
        `</div>`
      );
    })
    .join("");
  const more =
    u.modelCount > u.rows.length
      ? `<div style="font-size:9px;opacity:0.45;margin-top:-2px">${esc(
          t("{0} models in total, showing the first {1}", u.modelCount, u.rows.length)
        )}</div>`
      : "";
  return body + more;
}

function usageSection(u: HoverUsageVM): string {
  return (
    sectionTitle(t("Token usage")) +
    metricStrip(u) +
    weekChart(u.week) +
    tabs(u.range) +
    modelRows(u)
  );
}

function planRows(vm: HoverVM): string {
  const title =
    sectionTitle(t("Package credits")) +
    (vm.planCount > vm.plans.length
      ? `<div style="font-size:9px;opacity:0.45;margin-bottom:4px">${esc(
          t("{0} packages with credits left, showing the first {1}", vm.planCount, vm.plans.length)
        )}</div>`
      : "");
  if (!vm.plans.length) {
    return title + `<div style="font-size:11px;opacity:0.55">${esc(t("No packages left"))}</div>`;
  }
  const rows = vm.plans
    .map((p) => {
      const pct = p.total > 0 ? (p.left / p.total) * 100 : 0;
      return (
        `<div style="margin-bottom:7px">` +
        `<div style="font-size:11px;white-space:nowrap">` +
        `<span style="display:inline-block;width:58%;overflow:hidden;vertical-align:bottom">${esc(p.name)}</span>` +
        `<span style="display:inline-block;width:42%;text-align:right;font-weight:600;vertical-align:bottom">${esc(
          numTrim(p.left)
        )}<span style="opacity:0.5;font-weight:400"> / ${esc(numTrim(p.total))}</span></span>` +
        `</div>` +
        `<div style="font-size:0;margin-top:3px">` +
        `<span style="display:inline-block;width:70%;vertical-align:middle">${bar(pct, PALETTE[1], 4)}</span>` +
        `<span style="display:inline-block;width:28%;text-align:right;font-size:9px;opacity:0.5;vertical-align:middle;white-space:nowrap">${esc(
          p.expires
        )}</span>` +
        `</div>` +
        `</div>`
      );
    })
    .join("");
  return title + rows;
}

function footer(vm: HoverVM): string {
  const left = vm.updatedAt ? t("Updated {0}", fmtTime(vm.updatedAt)) : "";
  const right = vm.usage ? t("From local CodeBuddy logs") : "";
  return (
    `<div style="font-size:9px;opacity:0.5;margin-top:9px;white-space:nowrap">${esc(left)}` +
    `<span style="float:right">${esc(right)}</span></div>`
  );
}

function fmtTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function renderHover(vm: HoverVM): vscode.MarkdownString {
  const parts: string[] = [header(vm), hero(vm)];
  const chipHtml = chips(vm.chips);
  if (chipHtml) parts.push(chipHtml);
  if (vm.usage) parts.push(usageSection(vm.usage));
  parts.push(planRows(vm), footer(vm));

  const md = new vscode.MarkdownString(parts.join(""));
  md.supportHtml = true;
  md.isTrusted = true;
  md.supportThemeIcons = false;
  return md;
}
