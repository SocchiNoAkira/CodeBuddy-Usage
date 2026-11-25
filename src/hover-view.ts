import * as vscode from "vscode";

/**
 * 悬浮框渲染（纯 Markdown）。
 *
 * 能力边界（实测）：VS Code 会把 MarkdownString 里的 `style` 属性过滤掉，
 * 只保留标签结构，因此卡片、百分比宽度、背景色、圆角全部无效。
 *
 * 在扩展能用的范围里，用 Markdown 自身的排版能力组织信息：
 *  - `##` 大字号主数值
 *  - `***` 细分隔线分组
 *  - 表格负责左标签 / 右对齐数值
 *  - `█▏─` 精细进度条用于「有明确进度」的场景（模型占比，1/8 格精度）
 */

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

/** 单个时间窗的用量 */
export interface UsageCell {
  total: number;
  input: number;
  output: number;
  cache: number;
  credit: number;
}

export interface HoverUsageVM {
  hour: UsageCell;
  today: UsageCell;
  month: UsageCell;
  /** 今日按模型（已排序） */
  rows: HoverModelRow[];
  modelCount: number;
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

/**
 * 进度条字符：满格 + 左分数块（1/8 精度）+ 细横线轨道。
 * 分数块与满格在等宽字体里同宽同高，按顺序逐级填充，不会像 ░ 那样错位。
 */
const BAR_ON = "█";
const BAR_OFF = "─";
/** 索引 1..7 = 左侧 1/8 .. 7/8 填充；0 表示没有尾巴 */
const BAR_FRACTIONS = ["", "▏", "▎", "▍", "▌", "▋", "▊", "▉"];
const SEPARATOR = "***";

const t = (
  message: string,
  ...args: Array<string | number | boolean | undefined | null>
): string => vscode.l10n.t(message, ...args.map((a) => a ?? ""));

/** 表格单元格转义：竖线会把表格结构打断 */
function cell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

/**
 * 数值单元格左右各留一段不换行空格。
 * hover 里表格自带的 cell padding 很小，右对齐的数字会挨在一起看不出列边界。
 */
const GAP = "&nbsp;&nbsp;";
function gap(s: string): string {
  return `${GAP}${s}${GAP}`;
}

function num(n: number, digits = 2): string {
  const v = Number.isFinite(n) ? n : 0;
  const fixed = Math.abs(v).toFixed(digits);
  const [intPart, frac] = fixed.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${v < 0 ? "-" : ""}${grouped}${frac ? `.${frac}` : ""}`;
}

/** 去掉尾随 0：1,650.00 → 1,650 */
function numTrim(n: number, digits = 2): string {
  return num(n, digits)
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
}

/** token 数量用 K/M/B 缩写 */
function compact(n: number): string {
  const v = Number.isFinite(n) ? Math.max(0, n) : 0;
  const trim = (x: number) =>
    (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2))
      .replace(/(\.\d*?)0+$/, "$1")
      .replace(/\.$/, "");
  if (v >= 1e9) return `${trim(v / 1e9)}B`;
  if (v >= 1e6) return `${trim(v / 1e6)}M`;
  if (v >= 1e3) return `${trim(v / 1e3)}K`;
  return String(Math.round(v));
}

/**
 * 精细进度条：整数格用 █，余下的不足一格用左分数块（1/8 精度），其余用 ─ 补齐。
 * 总宽度恒为 cells 个字符，保证表格列对齐。
 */
function bar(pct: number, cells = 8): string {
  const p = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  const units = (p / 100) * cells * 8; // 每格细分为 8 档
  let full = Math.floor(units / 8);
  let eighth = Math.round(units % 8);
  if (eighth >= 8) {
    full += 1;
    eighth = 0;
  }
  // 占比 >0 但连 1/8 格都不到时，至少露出一个最小分数块
  if (p > 0 && full === 0 && eighth === 0) {
    eighth = 1;
  }
  const used = full + (eighth > 0 ? 1 : 0);
  return (
    BAR_ON.repeat(full) +
    BAR_FRACTIONS[eighth] +
    BAR_OFF.repeat(Math.max(0, cells - used))
  );
}

/** 缓存命中率：cacheTokens 是 inputTokens 中命中缓存的部分 */
function hitRate(c: UsageCell): string {
  if (!c.input) return "-";
  const pct = (c.cache / c.input) * 100;
  return `${pct >= 99.95 ? 100 : pct.toFixed(0)}%`;
}

function header(vm: HoverVM): string {
  const avatar = vm.avatarUrl ? `![](${vm.avatarUrl}) ` : "";
  const title = vm.nickname
    ? `${cell(vm.nickname)} · ${t("CodeBuddy Credits")}`
    : t("CodeBuddy Credits");
  return `### ${avatar}${title}`;
}

function hero(vm: HoverVM): string {
  const pct = vm.total > 0 ? (vm.remain / vm.total) * 100 : 0;
  return [
    `## ${numTrim(vm.remain)}`,
    `${t("Remaining")} / ${t("Total")} [${numTrim(vm.total)}](${vm.plansUrl})　·　**${pct.toFixed(1)}%**`,
  ].join("\n");
}

function chipsLine(list: HoverChip[]): string {
  if (!list.length) return "";
  return list
    .map((c) => (c.link ? `[${c.text}](${c.link})` : c.text))
    .filter(Boolean)
    .join("　·　");
}

function usageRow(label: string, c: UsageCell): string {
  return (
    `| ${label} | ${gap(compact(c.total))} | ${gap(compact(c.input))} | ${gap(
      compact(c.output)
    )} | ${gap(hitRate(c))} | ${gap(numTrim(c.credit))} |`
  );
}

function usageBlock(u: HoverUsageVM): string {
  const lines: string[] = [];
  lines.push(`**⚡ ${t("Token usage")}**`);
  lines.push("");
  lines.push(
    `| ${t("Period")} | ${gap(t("Tokens"))} | ${gap(t("Input"))} | ${gap(t("Output"))} | ${gap(
      t("Cache hit")
    )} | ${gap(t("Credits"))} |`
  );
  lines.push("| :--- | ---: | ---: | ---: | ---: | ---: |");
  lines.push(usageRow(t("This hour"), u.hour));
  lines.push(usageRow(t("Today"), u.today));
  lines.push(usageRow(t("This month"), u.month));
  lines.push("");

  if (!u.rows.length) {
    lines.push(`*${u.note ?? t("No usage recorded for this period")}*`);
    return lines.join("\n");
  }

  lines.push(
    `| ${t("Model")} | ${gap(t("Tokens"))} | ${gap(t("Credits"))} | ${gap(t("Share"))} |`
  );
  lines.push("| :--- | ---: | ---: | :--- |");
  for (const r of u.rows) {
    const share = Math.max(0, Math.min(1, r.share));
    lines.push(
      `| ${cell(r.name)} | ${gap(compact(r.total))} | ${gap(numTrim(r.credit))} | ${gap(
        `\`${bar(share * 100, 8)}\` ${(share * 100).toFixed(0)}%`
      )} |`
    );
  }
  if (u.modelCount > u.rows.length) {
    lines.push("");
    lines.push(`*${t("{0} models in total, showing the first {1}", u.modelCount, u.rows.length)}*`);
  }
  return lines.join("\n");
}

function plansBlock(vm: HoverVM): string {
  const lines: string[] = [];
  lines.push(`**🧩 ${t("Package credits")}**`);
  if (vm.planCount > vm.plans.length) {
    lines.push("");
    lines.push(
      `*${t("{0} packages with credits left, showing the first {1}", vm.planCount, vm.plans.length)}*`
    );
  }
  lines.push("");

  if (!vm.plans.length) {
    lines.push(`*${t("No packages left")}*`);
    return lines.join("\n");
  }

  lines.push(`| ${t("Package")} | ${gap(t("Left"))} | ${gap(t("Expires"))} |`);
  lines.push("| :--- | ---: | ---: |");
  for (const p of vm.plans) {
    lines.push(
      `| ${cell(p.name)} | ${gap(`${numTrim(p.left)} / ${numTrim(p.total)}`)} | ${gap(
        cell(p.expires)
      )} |`
    );
  }
  return lines.join("\n");
}

function footer(vm: HoverVM): string {
  const bits: string[] = [];
  if (vm.updatedAt) bits.push(t("Updated {0}", fmtTime(vm.updatedAt)));
  if (vm.usage) bits.push(t("From local CodeBuddy logs"));
  if (!bits.length) return "";
  return `*${bits.join("　·　")}*`;
}

function fmtTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function renderHover(vm: HoverVM): vscode.MarkdownString {
  const blocks: string[] = [header(vm), "", hero(vm)];

  const chips = chipsLine(vm.chips);
  if (chips) blocks.push("", chips);

  if (vm.usage) blocks.push("", SEPARATOR, "", usageBlock(vm.usage));
  blocks.push("", SEPARATOR, "", plansBlock(vm));

  const foot = footer(vm);
  if (foot) blocks.push("", foot);

  const md = new vscode.MarkdownString(blocks.join("\n"));
  md.isTrusted = true;
  md.supportThemeIcons = false;
  md.supportHtml = false;
  return md;
}
