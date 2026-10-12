# Rod to Riches

A self-contained, single-player 3D fishing and investment game for Owen's Project Shed.

## Play

Cast, hook when a fish bites, then hold the reel button or Space to reel. Release to lower tension. Sell catches, upgrade gear, and purchase up to three automated boats. Press P to pause an attempt. The help button explains the rules.

## Hosting and development

Serve the repository with a static HTTP server, then open `/rod-to-riches/`. GitHub Pages serves the files directly; no build, account, API key, CDN, or backend is needed. All game requests stay on the same origin. Three.js 0.180.0 is vendored with its MIT license. Scene geometry and sounds are generated locally.

Run all game tests with `node --test rod-to-riches/*.test.mjs` from the repository root.

The source is split into `scene.mjs` (3D harbor), `economy.mjs` (progression and fishing rules), and `game.mjs` (interface, input, saves and animation). `style.css` contains responsive layouts.

## The Fish Exchange

Available from the first visit, without fishing unlocks. A manually claimed $100 starter grant is available once per save to both new and existing players. It enters the shared game wallet and may fund either investments or fishing upgrades; it is not income or trading profit. Existing version-1 saves migrate in place, retaining all fishing progress.

Six fictional companies cover tackle (BAIT), seafood exports (TUNA), ports (DOCK), ocean farming (KELP), cold transport (ICE), and offshore exploration (DEEP). `market.mjs` owns quotes, trades, portfolio accounting and save validation; `exchange.mjs` owns the accessible dialog UI. No API, remote prices, account, backend or new dependency is used.

Quotes update every eight seconds of active visible play, with a fictional news event on rounds 1, 5, 9, etc. Seeded randomness, different volatility levels, a small common market move and a gentle pull toward each starting price drive the simulation. Event effects apply to the displayed quote immediately, not to a promised future return. Share prices are whole game dollars bounded at $1–$1,000; holdings are capped at 100,000 shares per ticker. Recent charts contain up to 48 actual simulated quotes, not fabricated opening history. Quotes, positions, average-cost basis in cents, realized P/L, the generator seed, and the grant flag persist inside the existing local save. No offline catch-up or reload reroll occurs.

Orders execute immediately at the current quote using whole shares. No shorting, margin, fees, dividends, order book or real-world trading claims. Unrealized P/L compares current holdings with remaining average cost; realized P/L tracks sales less allocated cost. Cash + stocks excludes unsold fish, fleet, gear and uncollected boat earnings. Fishing pauses while the exchange dialog is open; an interrupted attempt remains paused until explicitly resumed. Markets continue during a fishing pause but stop in hidden/closed tabs. As with all local game data, clearing or modifying the save can reset or alter progress; this is not a tamper-proof competitive economy.

## Save and economy

Progress is stored in this browser's localStorage under `rod-to-riches-save-v1`. There is no cloud sync. Private browsing, cleared storage, or changing device/origin may lose progress. Storage failure is shown in the footer. Boats earn only while the tab is visible, without offline earnings. Prices are fictional game dollars. This is not an investment recommendation or real-money game.

## Compatibility

Requires JavaScript and WebGL2 in a current browser. Device pixel ratio is capped to reduce rendering load; small screens start with the harbor collapsed. Sound starts muted. Reduced-motion preferences disable decorative scene movement. HK/mainland reachability depends on GitHub Pages and the player's network, and must be tested on actual regional connections.

## Optional browser tools

Where supported, WebMCP exposes `read_fishing_progress` and `sell_caught_fish`, using the same validated state/actions as the UI. Unsupported browsers continue normally.
