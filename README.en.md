# CodeBuddy Usage

Show **CodeBuddy / WorkBuddy credits** in the VS Code status bar. Hover it to see **token usage**, the daily check-in state and your buddy's travel progress.

> Personal fork / secondary development. Not affiliated with Tencent or the official CodeBuddy / WorkBuddy teams.

[简体中文](./README.md) | English

---

## Features

**Status bar**
- Always-on credits counter, e.g. `⚡ 2431.68`; click to refresh
- High priority, so it is not crowded out when the status bar is busy

**Hover panel**
- Avatar + nickname from the local sign-in state (no extra API call)
- Credits: large number plus `remaining / total · percentage`; the total links to the web usage page
- Status line: today's check-in; buddy travel remaining time, or a hint when the daily limit is hit
- **Token usage** for this hour / today / this month, each with `total`, `input`, `output`, `cache hit rate` and `credits`
- **Per-model breakdown for today**: model, tokens, credits, share bar, sorted by usage
- **Package credits**: name, remaining / total, expiry — plain numbers only
- Footer: last update time and data source

**Automation (on by default, every 30 minutes)**
- Daily check-in to claim credits
- Buddy travel: claim the earned credits and send the buddy out again
- The interval is configurable and can be disabled

**Sign-in**
- Reads the `accessToken` stored by the official CodeBuddy extension — DPAPI on Windows, Keychain on macOS
- Falls back to a manually pasted token (no official extension, Linux, or unavailable credential store)

**Other**
- Chinese / English UI, following the VS Code display language
- No runtime dependencies, plain TypeScript output

---

## Install

**From a vsix** (recommended)

```bash
code --install-extension codebuddy-usage-0.1.7.vsix
```

Or in the Extensions view: `⋯` → **Install from VSIX...**, then reload the window.

**Requirement**: install and sign in to **Tencent Cloud CodeBuddy** (`tencent-cloud.coding-copilot`) in VS Code — this extension reads the `accessToken` it stores. The desktop apps are not needed.

> CodeBuddy and WorkBuddy share the same account. The default API base is `https://www.workbuddy.cn`;
> set `apiBase` to `https://www.workbuddy.ai` for the international site.

---

## Hover panel

```
### 🖼 Akira · CodeBuddy Credits

## 10,320.64
Remaining / Total 10,407　·　99.2%

Checked in today　·　✿ Buddy travel remaining 00:05:42

***

⚡ Token usage

| Period | Tokens | Input | Output | Cache hit | Credits |
| :--- | ---: | ---: | ---: | ---: | ---: |
| This hour | 674K | 667K | 7.72K | 100% | 2.83 |
| Today | 33.8M | 33.6M | 219K | 98% | 132.31 |
| This month | 152M | 151M | 512K | 99% | 358.71 |

| Model | Tokens | Credits | Share |
| :--- | ---: | ---: | :--- |
| Deepseek-V4.1-Flash | 33.8M | 132.31 | ━━━━━━━━ 100% |

***

🧩 Package credits

*39 packages with credits left, showing the first 5*

| Package | Left | Expires |
| :--- | ---: | ---: |
| CodeBuddy Individual Plan Bundle | 13.64 / 100 | 2026-11-22 |

*Updated 11/18 17:09　·　From local CodeBuddy logs*
```

Notes:

- **Cache hit rate** = `cacheTokens / inputTokens` — the share of input tokens served from cache
- The model list always shows **today**, sorted by usage, top 5 by default (1–10 configurable)
- Package list shows the first 5 packages that still have credits, using this cycle's numbers
- The panel is rendered by VS Code's Markdown renderer: follows the theme, text is selectable

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
| `tokenUsage` | on | Show the token usage block |
| `usageLogPath` | empty | Custom CodeBuddy log directory; auto-detected when empty |
| `usageRefreshSeconds` | 60 | Log re-scan interval in seconds, `0` disables it; local files only |
| `usageTopModels` | 5 | Number of models listed (1–10) |
| `hoverStyle` | `rich` | `rich` = current dashboard; `plain` = legacy table layout (fallback) |

## Commands

Search `CodeBuddy Usage` in the command palette (`Ctrl+Shift+P`):

| Command | Purpose |
| --- | --- |
| Refresh quota | Refresh once |
| Paste Access Token (when auto-read fails) | Paste a JWT manually; empty clears it |
| Fix sign-in (re-read sign-in state / paste token) | One-stop recovery menu |
| Open usage page | Open the web usage page |
| Buddy claim credits / Buddy depart | Manual trigger outside the automation |

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
| Nothing in the status bar | Reload the window; make sure no older version is installed alongside |
| "No credentials found" | Make sure the CodeBuddy extension is signed in; otherwise paste an Access Token |
| "Login expired" | Sign in again in CodeBuddy, then click the status bar and pick "Re-read the CodeBuddy sign-in state" |
| "Fetch failed" | Click the status bar to retry |
| "No CodeBuddy logs found" | Use the official extension at least once, or point `usageLogPath` at the log directory |
| Wrong log directory picked up | Check that `%LOCALAPPDATA%\CodeBuddyExtension\Logs\VSCode` exists |
| Using the international site | Set `apiBase` to `https://www.workbuddy.ai` |
| Want the old table layout | Set `hoverStyle` to `plain` |

---

## Development

This repository only contains source and manifest files. Build output (`out/`), dependencies (`node_modules/`) and `.vsix` packages are not tracked — build it yourself after cloning.

```bash
npm install
npm run compile      # produces out/, then press F5 to debug
```

- `F5`: if VS Code asks for an environment, pick **VS Code Extension** — it generates `.vscode/launch.json` for you
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
| `src/hover-view.ts` | Markdown rendering of the hover panel |
| `src/usage-log.ts` | Parser for token usage in the CodeBuddy local logs |
| `src/usage-store.ts` | Incremental usage index and persistence |
| `src/auth.ts` | Sign-in state auto-read and token cache |
| `src/sqlite-reader.ts` | Minimal built-in SQLite reader for `state.vscdb` |

---

## Disclaimer

- Not affiliated with or endorsed by Tencent, CodeBuddy or WorkBuddy
- Names and trademarks belong to their respective owners; the APIs are third-party services — make sure your usage complies with their terms
