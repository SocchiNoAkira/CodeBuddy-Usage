# CodeBuddy Usage

在 VS Code 状态栏显示 **CodeBuddy / WorkBuddy 的积分余量**，并把 **token 消耗**、每日签到、喵喵旅行一起收进一个卡片式的悬浮面板里。

> 本项目为个人二次开发版本，与腾讯及 CodeBuddy / WorkBuddy 官方团队无关。

---

## 功能

**状态栏**
- 常驻显示当前剩余积分，例如 `⚡ 2431.68`，点击即可刷新
- 空间不足时不会被挤掉（高优先级状态栏项）

**悬浮面板（悬停状态栏）**
- 顶部展示账号头像 + 昵称（取自本地登录态，不需要额外接口）
- 剩余积分卡片：剩余 / 总量 / 百分比，配进度条
- 状态胶囊：今日签到、喵喵旅行倒计时（可直接点「领积分」「去旅行」）、Token 有效期
- token 消耗：**本小时 / 今日 / 本月** 三档合计，各自带积分消耗
- 近 7 天用量柱状图（平方根归一化，日用量差异大时也能看出趋势）
- **今日 / 本月** 页签切换，下方按模型列出消耗明细（合计 + 积分 + 占比条）
- 套餐额度列表：每个套餐的剩余 / 总量 / 到期日，配进度条
- 底部显示最近更新时间与数据来源

**自动化**
- 每日自动签到领积分
- 喵喵旅行：自动领取到账积分并派它出门赚下一趟
- 默认每 30 分钟自动刷新，可在设置里调整或关闭

**登录态**
- Windows 走 DPAPI、macOS 走钥匙串，自动读取 CodeBuddy 官方扩展保存的 `accessToken`
- 自动读取失败时（未装官方扩展、Linux、凭据不可用）可手动粘贴 Token 兜底

**其它**
- 中英文界面（跟随 VS Code 显示语言）
- 无运行时依赖，纯 TypeScript 编译产物

---

## 安装

1. 安装本扩展：`code --install-extension codebuddy-usage-0.1.0.vsix`
2. 在 VS Code 中安装并登录 **Tencent Cloud CodeBuddy**（`tencent-cloud.coding-copilot`）
3. 无需任何配置，状态栏会自动出现余量

> 只需要 VS Code 扩展，不需要安装 WorkBuddy / CodeBuddy 桌面端。
> CodeBuddy 与 WorkBuddy 共用同一套账号体系；本扩展默认请求 `https://www.workbuddy.cn`，
> 国际站请在设置里把 `apiBase` 改为 `https://www.workbuddy.ai`。

---

## 悬浮面板示意

```
🖼 昵称 · CodeBuddy 积分余量
┌────────────────────────────────────┐
│ 剩余积分                            │
│ 2,431.68 / 3,530           68.9%   │
│ ████████████████░░░░░░░░           │
└────────────────────────────────────┘
(✓ 今日已签到) (✿ 喵喵返程 03:12:45) (领积分) (去旅行) (Token 有效期至 01-15)

TOKEN 消耗
本小时           今日            本月
3.28M           9.48M           127.2M
8.07 积分        40.81 积分      267.21 积分
        ▁ ▂ ▃ ▁ ▂ ▇ ▃
[ 今日 ]  本月
Deepseek-V4.1-Flash   9.48M   40.81
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 100%

套餐额度
个人体验版              1,200 / 1,500
▓▓▓▓▓▓▓▓▓░            2026-12-31

更新于 11/18 16:04:12      数据来自本地 CodeBuddy 日志
```

### 关于页签

点击「今日 / 本月」后悬浮框会被关闭（VS Code 不会保持 hover），状态栏会提示一句
「Token 消耗：已切换为本月，再次悬停状态栏即可查看」，**再悬停一次**就是切换后的视图。
选择会记住，重启后保持不变。

不想用鼠标时，也可以在命令面板执行：

- `CodeBuddy Usage: 查看今日 token 消耗`
- `CodeBuddy Usage: 查看本月 token 消耗`

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
| `tokenUsage` | 开 | 悬浮面板是否展示 token 消耗 |
| `usageLogPath` | 空 | 自定义 CodeBuddy 日志目录；留空自动探测 |
| `usageTopModels` | 5 | 模型列表条数（1–10） |
| `hoverStyle` | `rich` | `rich` = 卡片样式；`plain` = 旧版纯表格（出问题时兜底） |

---

## 数据来源与隐私

| 数据 | 来源 |
| --- | --- |
| 积分余量 / 套餐 / 签到 / 喵喵 | CodeBuddy 官网接口，使用本地登录态里的 `accessToken` |
| token 消耗 | 本机 CodeBuddy 扩展的日志：`%LOCALAPPDATA%\CodeBuddyExtension\Logs\VSCode\<日期>\*.log`（macOS / Linux 对应应用数据目录） |

- 凭据只在本机读取与缓存，**不会上传到任何地方**，也不经过第三方
- token 缓存在扩展自己的 SecretStorage（VS Code 加解密），只有 token 临近过期时才重新读取系统凭据
- token 用量统计只读本地日志，不额外发起网络请求；累计结果存在扩展的 globalStorage，日志被轮转清理后历史仍保留
- 统计范围仅限**本机、当前 IDE** 的调用，不含网页版 / 其它机器

---

## 常见问题

| 现象 | 处理 |
| --- | --- |
| 显示「未找到登录凭据」 | 确认 VS Code 里 CodeBuddy 扩展已登录；仍不行就手动粘贴 Access Token |
| 显示「登录已过期」 | 先在 CodeBuddy 里重新登录，再点状态栏选「重新读取 CodeBuddy 登录态并刷新」 |
| 显示「拉取失败」 | 点状态栏重试 |
| token 区块显示「未找到 CodeBuddy 日志」 | 确认官方扩展已登录并使用过；或在设置里用 `usageLogPath` 指定日志目录 |
| 用的是国际站 | 把 `apiBase` 改为 `https://www.workbuddy.ai` |
| 面板样式异常 | 把 `hoverStyle` 改成 `plain` 回到旧版表格 |

---

## 开发

```bash
npm install
npm run compile        # 或按 F5 在扩展开发宿主中调试
```

打包：

```bash
npm install -g @vscode/vsce
vsce package
```

源码结构：

| 文件 | 职责 |
| --- | --- |
| `src/extension.ts` | 状态栏、命令、用量/签到/喵喵流程、悬浮面板数据装配 |
| `src/hover-view.ts` | 悬浮面板的 HTML 渲染（卡片、进度条、柱状图、页签） |
| `src/usage-log.ts` | 解析 CodeBuddy 本地日志中的 token 用量 |
| `src/usage-store.ts` | 用量增量索引与持久化 |
| `src/auth.ts` | 登录态自动读取与 token 缓存 |
| `src/sqlite-reader.ts` | 内置最小 SQLite 解析器（读 `state.vscdb`） |

---

## 声明

- 本项目与 Tencent、CodeBuddy、WorkBuddy 官方无隶属或背书关系
- 相关名称与商标归其各自所有者；接口属于第三方服务，使用前请自行确认是否符合其服务条款
