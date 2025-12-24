# Trench Runner: Degen Dash

Mobile-first endless runner built with Phaser 3 + React 18 + Solana wallet adapter.

## Quickstart
1. Install: `npm install`
2. Run dev: `npm run dev`
3. Build: `npm run build`
4. Preview: `npm run preview`
5. Deploy (Vercel): `vercel --prod`

## Controls
- Swipe or arrow keys: up jump, down slide, left/right change lanes.
- Auto-run speed ramps over time. Avoid pits/blocks, grab collectibles.

## Solana
- Connect via Phantom (devnet).
- Client helpers: `src/solana/client/index.ts` for submit_score PDA.
- Anchor program scaffold in `src/solana/program` + `anchor.toml`.

## Structure
- `src/components`: React overlays (HUD, menus, wallet).
- `src/game`: Phaser scenes and entities.
- `src/utils`: Swipe helper, particles, global store.
- `public/manifest.json`: PWA basics.
- `vercel.json`: static deploy settings.

## Global Leaderboard (JSONBin.io)

The game uses JSONBin.io for a persistent global leaderboard. Already configured!

For Vercel deployment, add these environment variables in your project settings:
- `VITE_JSONBIN_API_KEY` - Your X-Master-Key from jsonbin.io
- `VITE_JSONBIN_BIN_ID` - The bin ID storing the leaderboard

Without these configured, the game falls back to local storage (device-only scores).

## Notes
- Art/textures are generated procedurally at runtime (neon rectangles) to keep the repo asset-light.
- Personal best score stored locally in `localStorage`.
- Global leaderboard stored in JSONBin.io (free, persistent, no backend needed).
