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

## Notes
- Art/textures are generated procedurally at runtime (neon rectangles) to keep the repo asset-light.
- Best score stored locally in `localStorage`.
