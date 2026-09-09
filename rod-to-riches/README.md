# Rod to Riches

A self-contained, single-player 3D fishing and investment game for Owen's Project Shed.

## Play

Cast, hook when a fish bites, then hold the reel button or Space to reel. Release to lower tension. Sell catches, upgrade gear, and purchase up to three automated boats. Press P to pause an attempt. The help button explains the rules.

## Hosting and development

Serve the repository with a static HTTP server, then open `/rod-to-riches/`. GitHub Pages serves the files directly; no build, account, API key, CDN, or backend is needed. All game requests stay on the same origin. Three.js 0.180.0 is vendored with its MIT license. Scene geometry and sounds are generated locally.

Run economy tests with `node --test rod-to-riches/economy.test.mjs` from the repository root.

The source is split into `scene.mjs` (3D harbor), `economy.mjs` (progression and fishing rules), and `game.mjs` (interface, input, saves and animation). `style.css` contains responsive layouts.

## Save and economy

Progress is stored in this browser's localStorage under `rod-to-riches-save-v1`. There is no cloud sync. Private browsing, cleared storage, or changing device/origin may lose progress. Storage failure is shown in the footer. Boats earn only while the tab is visible, without offline earnings. Prices are fictional game dollars. This is not an investment recommendation or real-money game.

## Compatibility

Requires JavaScript and WebGL2 in a current browser. Device pixel ratio is capped to reduce rendering load; small screens start with the harbor collapsed. Sound starts muted. Reduced-motion preferences disable decorative scene movement. HK/mainland reachability depends on GitHub Pages and the player's network, and must be tested on actual regional connections.

## Optional browser tools

Where supported, WebMCP exposes `read_fishing_progress` and `sell_caught_fish`, using the same validated state/actions as the UI. Unsupported browsers continue normally.
