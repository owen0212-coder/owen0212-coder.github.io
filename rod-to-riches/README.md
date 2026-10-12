# Rod to Riches

A self-contained, single-player 3D fishing and investment game for Owen's Project Shed.

## Play

Walk with WASD / arrows, click or tap the ground, or choose a station sign / Island guide destination to walk there automatically. Press E or the context button when close enough to interact. Phones also have a direction pad. Water, buildings, trees and unpurchased parcels block movement; purchased parcels connect to the existing island. Leaving a fishing attempt abandons only that attempt, never stored catches.

- Fishing dock: cast, hook on the bite, hold Space / Reel and release to reduce tension. P pauses the attempt.
- Fish market: sell your personal catch and collect net crew proceeds.
- Fish Exchange: visit the broker to trade shares and claim the existing starter grant.
- Tackle & Co.: buy rod, bait and cooler upgrades.
- Harbormaster: buy land and boats, hire and train fishers, and collect fleet earnings.

All five stations are reachable on the original island. Choosing a destination moves the character through the world; it never teleports or executes a remote trade. Transaction handlers recheck physical proximity. Bag / journal is read-only and can be opened anywhere. The help dialog explains controls and economy limits.

## Hosting and development

Serve the repository with a static HTTP server, then open `/rod-to-riches/`. GitHub Pages serves the files directly; no build, account, API key, CDN, or backend is needed. All game requests stay on the same origin. Three.js 0.180.0 is vendored with its MIT license. Scene geometry and sounds are generated locally.

Run all game tests with `node --test rod-to-riches/*.test.mjs` from the repository root.

`island-scene.mjs` renders the procedural 3D island, buildings, animated player, workers, parcels and boats. `island.mjs` shares station geometry, collision boundaries, pathfinding and movement with the UI; `business.mjs` handles land/staff accounting; `stations.mjs` renders physical counters. `economy.mjs` retains fishing/fleet progression and `game.mjs` coordinates input, saves and animation. `island.css` styles the new world shell; the existing exchange styles remain in `style.css`. `scene.mjs` is the retained pre-island scene, no longer loaded by the game.

## Land, employees and productivity

The home island provides one crew space. East wharf ($250), Net-makers’ yard ($650) and Packing quay ($1,200) each add two spaces and visible walkable land/workstations. Plots can be bought independently and only once. Maximum crew: seven. Empty land does not generate income, and land cannot be resold in this version.

A fisher costs $120 to hire and initially generates $18 gross revenue per visible-play minute, with $6 wages deducted from that revenue: $12 net. Crew handles routine catches and sales separately from the player’s cooler. Training costs $180 / $400 / $800, increases gross revenue by $6 per worker per minute per level, and caps at level three. Workers visibly occupy the home workplace and purchased parcels. Hiring/training/land costs are paid once from the shared wallet; wages never create debt or automatically drain wallet cash. Net crew proceeds accumulate until collected at the fish market. There are no dismissals, seasonal demand, taxes, maintenance, offline production or company insolvency mechanics in this first version. Fleet income remains separate and existing boats do not consume staff capacity. Reported capital invested is historical spending, not a liquid or resale valuation.

## The Fish Exchange

Available from the first visit, without fishing unlocks: walk to the stockbroker using the Exchange sign or Island guide. A manually claimed $100 starter grant is available once per save to both new and existing players. It enters the shared game wallet and may fund investments, fishing upgrades or the island business; it is not income or trading profit. Existing version-1 saves migrate in place, retaining all fishing progress, stock holdings and grant status. Island position, land, workers, training and business accounts are added to that same save. Invalid or inaccessible saved positions return to the starter promenade.

Six fictional companies cover tackle (BAIT), seafood exports (TUNA), ports (DOCK), ocean farming (KELP), cold transport (ICE), and offshore exploration (DEEP). `market.mjs` owns quotes, trades, portfolio accounting and save validation; `exchange.mjs` owns the accessible dialog UI. No API, remote prices, account, backend or new dependency is used.

Quotes update every eight seconds of active visible play, with a fictional news event on rounds 1, 5, 9, etc. Seeded randomness, different volatility levels, a small common market move and a gentle pull toward each starting price drive the simulation. Event effects apply to the displayed quote immediately, not to a promised future return. Share prices are whole game dollars bounded at $1–$1,000; holdings are capped at 100,000 shares per ticker. Recent charts contain up to 48 actual simulated quotes, not fabricated opening history. Quotes, positions, average-cost basis in cents, realized P/L, the generator seed, and the grant flag persist inside the existing local save. No offline catch-up or reload reroll occurs.

Orders execute immediately at the current quote using whole shares, only at the broker’s counter. No shorting, margin, fees, dividends, order book or real-world trading claims. Unrealized P/L compares current holdings with remaining average cost; realized P/L tracks sales less allocated cost. Cash + stocks excludes unsold fish, land, staff investment, fleet, gear and uncollected business/boat earnings. Movement stops while a counter dialog is open. Markets continue while walking, browsing counters or pausing a fishing attempt, but stop in hidden/closed tabs. As with all local game data, clearing or modifying the save can reset or alter progress; this is not a tamper-proof competitive economy.

## Save and economy

Progress is stored in this browser's localStorage under `rod-to-riches-save-v1`. On the first migration of a pre-island save, an unchanged backup is also retained under `rod-to-riches-pre-island-backup-v1` if storage permits. There is no cloud sync. Use one game tab at a time; simultaneous tabs do not merge saves. Private browsing, cleared storage, or changing device/origin may lose progress. Storage failure is shown in the footer and station dialogs. Boats and crew earn only while the tab is visible, without offline earnings. Prices are fictional game dollars. This is not an investment recommendation or real-money game.

## Compatibility

Requires JavaScript and WebGL2 in a current browser. Device pixel ratio is capped to reduce rendering load. Mobile uses a following camera and direction pad; the Island guide reaches stations outside the current view. Sound starts muted. Reduced-motion preferences disable decorative scene movement and camera smoothing; deliberate character movement remains functional. HK/mainland reachability depends on GitHub Pages and the player's network, and must be tested on actual regional connections.

## Optional browser tools

Where supported, WebMCP exposes `read_fishing_progress` and `sell_caught_fish`. Selling requires the character to be physically at the fish-market counter, including through this optional browser interface. Read-only progress includes island location and business accounts. Unsupported browsers continue normally.
