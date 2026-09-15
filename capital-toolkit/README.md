# The Capital Toolkit

Static GitHub Pages app. No build step, server, API key, paid subscription, or package install. User approved the best free option, prioritizing intraday freshness, on 16 September 2026.

## Tools

- Market Desk: attributed TradingView chart widgets. Default intraday mode uses SPY (S&P 500), DIA (Dow Jones Industrial Average), ONEQ (Nasdaq Composite) tracking ETFs. These are ETF prices, never index levels. One-minute bars do not imply a one-minute feed delay. Provider determines actual delays; don't invent a fixed 15-minute promise. Daily mode uses FRED:SP500 / FRED:DJIA / FRED:NDQCOM, exact closing index observations with publication lag. A symbol-filtered S&P 500 headlines embed updates independently. Direct source links and manual reload controls remain available. Never label an iframe load event as evidence of real-time data.
- Treasury: public-domain US Treasury daily par yields, generated into `data/treasury.json`; curve and 126-observation 10Y history. Observation time is separate from retrieval time. Failure retains the old file; a stale warning appears after four calendar days.
- Research: `data/brief.json`, a genuinely researched, cited Codex analysis with cutoff and fact/inference separation. It is not scraped from the chart iframe or generated on every page view. Older than 48 hours is flagged. Local 06:30 Asia/Hong_Kong scheduled Codex task researches and republishes; the computer and app must be running and permissions/usage available.
- Owen's published notes: `data/owen-notes.json`, initially empty. Only add notes explicitly provided/approved by Owen. Each entry has `title`, `date`, `body`. Never convert visitor scratchpad content into public notes.
- Visitor scratchpad and DCF assumptions: localStorage, per browser, no cloud sync. Export supported. Do not enter secrets on this public origin.
- DCF: positive normalized unlevered FCFF, constant growth/WACC, year-end discounting, Gordon terminal value, cash/debt bridge and sensitivity. Fictional defaults explicitly labelled. No auto-import of financial statements. Unsupported negative FCF is rejected, negative implied equity is explained but not clamped.

## Verification

Intraday uses the advanced-chart widget, initialized to one-minute bars and a one-day range. Daily indices use symbol-overview. SPY's provider disclosure was verified in the browser as 15 minutes delayed during implementation; it is not a permanent guarantee for every feed. Provider market status remains visible. News is reloaded every five minutes while the market page is visible, plus manual reload; this checks for stories, not a promise of new stories at that frequency.

`node --test capital-toolkit/*.test.mjs` from the repository root.

`python3 -B capital-toolkit/update_treasury.py` refreshes the data (network required). It writes only generated data and refuses older snapshots. `python3 -B capital-toolkit/test_treasury.py` checks parsing offline.

`python3 -m http.server 8765 --bind 127.0.0.1` serves a local preview.

## Daily researched update

1. Inspect working tree and fetch main. Do not overwrite concurrent edits. Fast-forward only if safe.
2. Read this file and current `data/brief.json`. Refresh Treasury with the script. If unavailable, retain its existing date; never call old data current.
3. Research the most recently completed US trading session and genuinely new macro/company headlines. Browse primary releases (Treasury, Fed, BLS, BEA, issuer releases/filings) and a reputable financial newsroom. Open sources; verify dates, units, numbers and market session. Respect copyright and source word limits. Do not bypass paywalls or scrape/redistribute restricted quote feeds.
4. Write original analysis into the existing JSON schema. Distinguish observed evidence, competing interpretations, uncertain causality, and what would change the view. Cite each numerical claim with source IDs. Use accurate ET/HKT cutoffs. Do not imply real-time research. Do not invent Owen's opinions or issue personalized recommendations. Headlines from the automated widget refresh independently.
5. On weekends/market holidays, publish only if a substantive new development warrants a brief. Otherwise keep the existing cutoff and remain quiet. Do not republish the same prose with a new timestamp.
6. Validate JSON, source references, finite Treasury values, chronological dates; run tests. Commit only `capital-toolkit/data/brief.json` and `capital-toolkit/data/treasury.json` when changed. Push to main without force; verify GitHub Pages completion. Never include unrelated modifications or secrets. Report failures or required permissions, and keep the last working content when verification fails.

## Hosting & regional availability

Hosted on existing GitHub Pages, not Sites or another host. Scripts, styles, calculations, research text and Treasury snapshot are same-origin; fonts use system fallbacks, no Google Fonts dependency. TradingView is an external dependency and may fail on some mainland connections. GitHub itself is not universally reachable in mainland China. Source links and honest fallback messages stay available. No access guarantee without testing on actual target networks.

## Icon attribution

Hammer SVG from Lucide (https://lucide.dev), ISC License.
Copyright (c) 2026 Lucide Icons and Contributors.
Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.
THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
