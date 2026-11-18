# Change Log

English | [简体中文](./CHANGELOG.md)

## [0.1.0]

First self-maintained release (version numbering restarted; previous history intentionally dropped).

### Added

- Credits in the status bar, click to refresh, high priority
- Card-style hover panel: remaining / total / percentage progress bar, package list, check-in and buddy chips, last-updated time
- **Token usage**: this hour / today / this month, each with the credits consumed (`credit`)
- **Today / This month** tabs inside the hover panel, with a per-model breakdown (tokens, credits, share bar)
- Last-7-days bar chart (square-root scaled)
- New settings: `tokenUsage`, `usageLogPath`, `usageTopModels`, `hoverStyle`
- New commands: show today's / this month's token usage
- Token usage index persisted in the extension's globalStorage, so rotated logs do not lose the monthly total

### Notes

- Token usage is parsed from the local logs of the official CodeBuddy extension (no public token-level API)
- Set `hoverStyle` to `plain` if the rich panel misbehaves
