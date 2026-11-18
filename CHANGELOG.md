# Change Log

[English](./CHANGELOG.en.md) | 简体中文

## [0.1.0]

首个自维护版本（版本号重新起算，历史变更不再保留）。

### 新增

- 状态栏显示积分余量，点击刷新，高优先级常驻
- 卡片式悬浮面板：剩余 / 总量 / 百分比进度条、套餐额度列表、签到与喵喵状态胶囊、最近更新时间
- **token 消耗统计**：本小时 / 今日 / 本月三档合计，各自带积分消耗（`credit`）
- 悬浮面板内 **今日 / 本月** 页签，按模型列出消耗明细（合计、积分、占比条）
- 近 7 天用量柱状图（平方根归一化）
- 新增配置项：`tokenUsage`、`usageLogPath`、`usageTopModels`、`hoverStyle`
- 新增命令：查看今日 token 消耗 / 查看本月 token 消耗
- token 用量索引持久化到扩展 globalStorage，官方日志被轮转后本月数据不丢失

### 说明

- token 用量来自 CodeBuddy 官方扩展的本地日志解析（服务端没有 token 维度的公开接口）
- 若发现悬浮面板样式异常，可将 `hoverStyle` 设为 `plain` 回到旧版表格
