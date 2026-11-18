# CodeBuddy Usage

在 VS Code 状态栏显示 **CodeBuddy / WorkBuddy 的积分余量**，悬停即可看到 **token 消耗明细**、每日签到状态和喵喵旅行进度。

> 本项目为个人二次开发版本，与腾讯及 CodeBuddy / WorkBuddy 官方团队无关。

---

## 功能

**状态栏**
- 常驻显示剩余积分，例如 `⚡ 2431.68`，点击即可刷新
- 高优先级状态栏项，空间紧张时不会被挤掉

**悬浮面板（鼠标悬停状态栏）**
- 顶部：账号头像 + 昵称（取自本地登录态，不额外请求接口）
- 剩余积分：大字号数值 + `剩余 / 总量 · 百分比`，总量可点击跳转官网用量页
- 状态行：今日签到状态；喵喵旅行中显示剩余时间，达到当日上限时显示提示
- **token 消耗**：按本小时 / 今日 / 本月三档，分别列出 `用量`、`输入`、`输出`、`缓存命中率`、`积分消耗`
- **今日按模型**：模型、用量、积分、占比条，按用量降序
- **套餐额度**：套餐名、剩余 / 总量、到期日（纯数字，不占视觉）
- 页脚：最近更新时间 + 数据来源

**自动化（默认开启，每 30 分钟一次）**
- 每日自动签到领积分
- 喵喵旅行：自动领取已挣到的积分，并派出下一趟
- 刷新间隔可调整或关闭

**登录态**
- Windows 走 DPAPI、macOS 走钥匙串，自动读取官方扩展保存的 `accessToken`
- 自动读取失败时（未装官方扩展、Linux、系统凭据不可用）可手动粘贴 Token 兜底

**其它**
- 中英文界面，跟随 VS Code 显示语言
- 无运行时依赖，纯 TypeScript 编译产物

---

## 安装

**从 vsix 安装**（推荐）

```bash
code --install-extension codebuddy-usage-0.1.6.vsix
```

或在扩展视图右上角 `⋯` → **Install from VSIX...**，装完 Reload Window。

**前提**：VS Code 里需安装并登录 **Tencent Cloud CodeBuddy**（`tencent-cloud.coding-copilot`），本扩展从它保存的登录态里取 `accessToken`。不需要安装 WorkBuddy / CodeBuddy 桌面端。

> CodeBuddy 与 WorkBuddy 共用同一套账号体系。扩展默认请求 `https://www.workbuddy.cn`，
> 国际站请在设置里把 `apiBase` 改为 `https://www.workbuddy.ai`。

---

## 悬浮面板

```
### 🖼 Akira · CodeBuddy 积分余量

## 10,320.64
剩余 / 总量 10,407　·　99.2%

今日已签到　·　✿ 喵喵旅行剩余 00:05:42

***

⚡ Token 消耗

| 时段 | 用量 | 输入 | 输出 | 缓存命中 | 积分 |
| :--- | ---: | ---: | ---: | ---: | ---: |
| 本小时 | 674K | 667K | 7.72K | 100% | 2.83 |
| 今日 | 33.8M | 33.6M | 219K | 98% | 132.31 |
| 本月 | 152M | 151M | 512K | 99% | 358.71 |

| 模型 | 用量 | 积分 | 占比 |
| :--- | ---: | ---: | :--- |
| Deepseek-V4.1-Flash | 33.8M | 132.31 | ━━━━━━━━ 100% |

***

🧩 套餐额度

*共 39 个有余量的套餐，显示前 5 个*

| 套餐 | 剩余 | 到期 |
| :--- | ---: | ---: |
| CodeBuddy个人版国内运营裂变包 | 13.64 / 100 | 2026-11-22 |

*更新于 11/18 17:09　·　数据来自本地 CodeBuddy 日志*
```

几点说明：

- **缓存命中率** = `cacheTokens / inputTokens`，即输入 token 中命中缓存的比例，数值越高越省钱
- 模型列表固定展示**今日**数据，按用量降序，默认前 5 个（可配 1–10）
- 套餐只展示有余量的前 5 个，剩余与总量按本周期计算
- 面板由 VS Code 的 Markdown 渲染器绘制，跟随主题，文字可选中复制

---

## 设置项

搜索 `codebuddyUsage`：

| 设置 | 默认 | 说明 |
| --- | --- | --- |
| `accessToken` | 空 | 自动读取失败时手动粘贴的 JWT，通常无需填写 |
| `refreshIntervalMinutes` | 30 | 自动刷新间隔（分钟），0 表示关闭 |
| `autoCheckin` | 开 | 自动每日签到 |
| `buddyTravel` | 开 | 自动喵喵旅行（领取 + 派出） |
| `apiBase` | `https://www.workbuddy.cn` | 国内站；国际站填 `https://www.workbuddy.ai` |
| `tokenUsage` | 开 | 是否展示 token 消耗区块 |
| `usageLogPath` | 空 | 自定义 CodeBuddy 日志目录；留空自动探测 |
| `usageTopModels` | 5 | 模型列表条数（1–10） |
| `hoverStyle` | `rich` | `rich` = 当前看板；`plain` = 早期纯表格样式（兜底用） |

## 命令

命令面板（`Ctrl+Shift+P`）搜索 `CodeBuddy Usage`：

| 命令 | 用途 |
| --- | --- |
| 刷新余量 | 手动刷新一次 |
| 输入 Access Token（自动读取失败时） | 手动粘贴 JWT，留空表示清除 |
| 修复登录（重新读取登录态 / 输入 Token） | 登录异常时的一键修复菜单 |
| 打开官网用量页 | 浏览器打开用量页 |
| 喵喵领积分 / 喵喵去旅行 | 手动触发一次（自动流程之外） |

---

## 数据来源与隐私

| 数据 | 来源 |
| --- | --- |
| 积分余量 / 套餐 / 签到 / 喵喵 | CodeBuddy 官网接口，使用本地登录态里的 `accessToken` |
| token 消耗 | 本机 CodeBuddy 扩展的日志：`%LOCALAPPDATA%\CodeBuddyExtension\Logs\VSCode\<日期>\*.log`（macOS / Linux 对应应用数据目录） |

- 凭据只在本机读取与缓存，**不会上传到任何地方**，也不经过第三方
- token 缓存在扩展自己的 SecretStorage（VS Code 加解密），仅在 token 临近过期时重新读取系统凭据
- token 用量统计只读本地日志，不发起额外网络请求；累计结果存在扩展的 globalStorage，日志被轮转清理后历史仍保留
- 统计范围仅限**本机、当前 IDE** 的调用，不含网页版 / 其它机器

---

## 常见问题

| 现象 | 处理 |
| --- | --- |
| 状态栏没有出现 | Reload Window；确认没有同时装着旧版本扩展 |
| 显示「未找到登录凭据」 | 确认 VS Code 里 CodeBuddy 扩展已登录；仍不行就手动粘贴 Access Token |
| 显示「登录已过期」 | 先在 CodeBuddy 里重新登录，再点状态栏选「重新读取 CodeBuddy 登录态并刷新」 |
| 显示「拉取失败」 | 点状态栏重试 |
| token 区块显示「未找到 CodeBuddy 日志」 | 官方扩展至少用过一次；或在设置里用 `usageLogPath` 指定日志目录 |
| 命中的日志目录不对 | 检查 `%LOCALAPPDATA%\CodeBuddyExtension\Logs\VSCode` 是否存在 |
| 用的是国际站 | 把 `apiBase` 改为 `https://www.workbuddy.ai` |
| 想回到旧版表格样式 | 把 `hoverStyle` 设为 `plain` |

---

## 开发

仓库只包含源码与清单文件：编译产物 `out/`、依赖 `node_modules/`、`.vsix` 包都不纳入版本管理，克隆后需要自行构建。

```bash
npm install
npm run compile      # 生成 out/，之后即可按 F5 调试
```

- `F5`：若提示选择环境，选 **VS Code Extension**，VS Code 会自动生成 `.vscode/launch.json`
- `npm run watch`：边改边编译，改完在宿主窗口 `Ctrl+R` 重载生效

打包：

```bash
npm install -g @vscode/vsce
vsce package         # 自动先执行 npm run compile，产物为 codebuddy-usage-<version>.vsix
```

源码结构：

| 文件 | 职责 |
| --- | --- |
| `src/extension.ts` | 状态栏、命令、用量/签到/喵喵流程、悬浮面板数据装配 |
| `src/hover-view.ts` | 悬浮面板的 Markdown 渲染 |
| `src/usage-log.ts` | 解析 CodeBuddy 本地日志中的 token 用量 |
| `src/usage-store.ts` | 用量增量索引与持久化 |
| `src/auth.ts` | 登录态自动读取与 token 缓存 |
| `src/sqlite-reader.ts` | 内置最小 SQLite 解析器（读 `state.vscdb`） |

---

## 声明

- 本项目与 Tencent、CodeBuddy、WorkBuddy 官方无隶属或背书关系
- 相关名称与商标归其各自所有者；接口属于第三方服务，使用前请自行确认是否符合其服务条款
