# Change Log

English | [简体中文](./CHANGELOG.md)

## [0.1.6]

### Fixed

- Cramped table columns in the hover panel: numeric cells now carry non-breaking spaces on both sides so headers and values line up

## [0.1.5]

### Changed

- The buddy line is now status-only: remaining travel time while traveling, a hint when the daily limit is reached
- Removed the "Claim / Depart" links from the hover panel (the automation handles it every 30 minutes)

## [0.1.4]

### Added

- Token usage table gains `Input` / `Output` / `Cache hit` columns
- The per-model ranking always shows today's data

### Removed

- Today / This month tabs and their commands
- Token expiry display

## [0.1.3]

### Changed

- Removed the last-7-days bar chart
- Package credits now use plain numbers, no progress bars

### Removed

- The self-drawn (SVG image) rendering path and its setting

## [0.1.2]

### Changed

- Credits are shown as a large number; the top progress bar is gone
- Sections are separated by thin rules, numeric columns are right aligned

## [0.1.1]

### Changed

- The hover panel switched from HTML cards to plain Markdown: VS Code strips the `style` attribute inside hovers, so the HTML version degraded to plain text

## [0.1.0]

First self-maintained release (version numbering restarted).

### Added

- Credits in the status bar, click to refresh, high priority
- Hover panel: credits, packages, check-in and buddy state, last-updated time
- Token usage for this hour / today / this month, including credits
- Daily check-in and buddy travel (claim + depart)
- Sign-in state auto-read (Windows DPAPI / macOS Keychain) with a manual token fallback
- Token usage index persisted, so rotated logs do not lose the monthly total
