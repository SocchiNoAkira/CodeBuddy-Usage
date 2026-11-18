# CodeBuddy Usage

Show your **CodeBuddy / WorkBuddy credits** in the VS Code status bar, and keep **token usage**, the daily check-in and the buddy travel in one card-style hover panel.

> Personal fork / secondary development. Not affiliated with Tencent or the official CodeBuddy / WorkBuddy teams.

[简体中文](./README.md) | English

---

## Features

**Status bar**
- Always-on credits counter, e.g. `⚡ 2431.68`; click to refresh
- High priority, so it is not crowded out when the status bar is busy

**Hover panel**
- Avatar + nickname from the local sign-in state (no extra API call)
- Credits card: remaining / total / percentage with a progress bar
- Status chips: today's check-in, buddy travel countdown (with clickable *Claim* / *Depart*), token expiry
- **Token usage for this hour / today / this month**, each with the credits consumed
- Last-7-days bar chart (square-root scaled, so days of very different volume stay readable)
- **Today / This month** tabs, with a per-model breakdown (tokens, credits, share bar)
- Package list: remaining / total / expiry per package, with progress bars
- Footer with last-updated time and data source

**Automation**
- Daily check-in to claim credits
- Buddy travel: claim earned credits and send the buddy out again
- Auto refresh every 30 minutes (configurable / can be disabled)

**Sign-in**
- Reads the `accessToken` stored by the official CodeBuddy extension — DPAPI on Windows, Keychain on macOS
- Falls back to a manually pasted token (no official extension, Linux, or unavailable credential store)

**Other**
- Chinese / English UI (follows the VS Code display language)
- No runtime dependencies, plain TypeScript output

---

## Install

1. `code --install-extension codebuddy-usage-0.1.0.vsix`
2. Install and sign in to **Tencent Cloud CodeBuddy** (`tencent-cloud.coding-copilot`) in VS Code
3. No configuration needed — the status bar item shows up automatically

> Only the VS Code extension is required. CodeBuddy and WorkBuddy share the same account.
> The default API base is `https://www.workbuddy.cn`; set `apiBase` to `https://www.workbuddy.ai` for the international site.

---

## Hover panel

```
🖼 nickname · CodeBuddy Credits
┌────────────────────────────────────┐
│ Remaining                           │
│ 2,431.68 / 3,530           68.9%    │
│ ████████████████░░░░░░░░            │
└────────────────────────────────────┘
(✓ Checked in) (✿ Buddy back in 03:12:45) (Claim) (Depart) (Token until 01-15)

TOKEN USAGE
This hour        Today           This month
3.28M            9.48M           127.2M
8.07 credits     40.81 credits   267.21 credits
        ▁ ▂ ▃ ▁ ▂ ▇ ▃
[ Today ]  This month
Deepseek-V4.1-Flash   9.48M   40.81
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 100%

PACKAGE CREDITS
个人体验版              1,200 / 1,500
▓▓▓▓▓▓▓▓▓░            2026-12-31

Updated 11/18 16:04:12      From local CodeBuddy logs
```

### About the tabs

Clicking **Today / This month** closes the hover (VS Code does not keep it open). The status bar shows
a short confirmation — hover it again to see the switched view. The choice is remembered across restarts.

Both views are also available from the command palette:

- `CodeBuddy Usage: Show today's token usage`
- `CodeBuddy Usage: Show this month's token usage`

---

## Settings

Search for `codebuddyUsage`:

| Setting | Default | Description |
| --- | --- | --- |
| `accessToken` | empty | Manually pasted JWT, only needed when auto-read fails |
| `refreshIntervalMinutes` | 30 | Auto refresh interval in minutes, `0` disables it |
| `autoCheckin` | on | Automatic daily check-in |
| `buddyTravel` | on | Automatic buddy travel (claim + depart) |
| `apiBase` | `https://www.workbuddy.cn` | Domestic site; use `https://www.workbuddy.ai` for the international one |
| `tokenUsage` | on | Show the token usage block in the hover panel |
| `usageLogPath` | empty | Custom CodeBuddy log directory; auto-detected when empty |
| `usageTopModels` | 5 | Number of models listed (1–10) |
| `hoverStyle` | `rich` | `rich` = card layout, `plain` = legacy tables (fallback) |

---

## Data sources and privacy

| Data | Source |
| --- | --- |
| Credits / packages / check-in / buddy | CodeBuddy web API using the local `accessToken` |
| Token usage | Local logs of the CodeBuddy extension: `%LOCALAPPDATA%\CodeBuddyExtension\Logs\VSCode\<date>\*.log` (macOS / Linux: the app data directory) |

- Credentials are read and cached locally only — never uploaded, no third party involved
- The token is cached in the extension's own SecretStorage; the system credential store is touched only when the token is about to expire
- Token usage is parsed from local logs with no extra network calls; aggregates are persisted so rotated logs do not lose history
- Statistics cover **this machine and this IDE only** (no web app, no other devices)

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| "No credentials found" | Make sure the CodeBuddy extension is signed in; otherwise paste an Access Token |
| "Login expired" | Sign in again in CodeBuddy, then click the status bar and pick "Re-read the CodeBuddy sign-in state" |
| "Fetch failed" | Click the status bar to retry |
| "No CodeBuddy logs found" | Use the official extension at least once, or point `usageLogPath` at the log directory |
| Using the international site | Set `apiBase` to `https://www.workbuddy.ai` |
| Panel looks broken | Set `hoverStyle` to `plain` |

---

## Development

This repository only contains source and manifest files. Build output (`out/`), dependencies (`node_modules/`) and `.vsix` packages are not tracked — build it yourself after cloning.

```bash
npm install
npm run compile      # produces out/, then press F5 to debug
```

- `F5`: `.vscode/launch.json` is included, so it runs `npm: compile` first and then opens the Extension Development Host
- `npm run watch`: recompile on save; press `Ctrl+R` in the host window to reload

Package:

```bash
npm install -g @vscode/vsce
vsce package         # runs npm run compile first, outputs codebuddy-usage-<version>.vsix
```

Source layout:

| File | Responsibility |
| --- | --- |
| `src/extension.ts` | Status bar, commands, usage/check-in/buddy flows, hover panel data |
| `src/hover-view.ts` | Hover panel HTML rendering (cards, bars, chart, tabs) |
| `src/usage-log.ts` | Parser for token usage in the CodeBuddy local logs |
| `src/usage-store.ts` | Incremental usage index and persistence |
| `src/auth.ts` | Sign-in state auto-read and token cache |
| `src/sqlite-reader.ts` | Minimal built-in SQLite reader for `state.vscdb` |

---

## Disclaimer

- Not affiliated with or endorsed by Tencent, CodeBuddy or WorkBuddy
- Names and trademarks belong to their respective owners; the APIs are third-party services — make sure your usage complies with their terms
