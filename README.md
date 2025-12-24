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

## Global Leaderboard (Firebase)

To enable the global leaderboard that persists across all players:

1. Create a Firebase project at https://console.firebase.google.com
2. Enable **Firestore Database** in your project (start in test mode for development)
3. Copy `.env.example` to `.env` and fill in your Firebase config values
4. For Vercel deployment, add the same environment variables in your Vercel project settings

Firestore Security Rules (recommended for production):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /highscores/{document} {
      allow read: if true;
      allow create: if request.resource.data.score is number
                    && request.resource.data.name is string
                    && request.resource.data.name.size() <= 10;
      allow update, delete: if false;
    }
  }
}
```

Without Firebase configured, the game falls back to local storage (device-only scores).

## Notes
- Art/textures are generated procedurally at runtime (neon rectangles) to keep the repo asset-light.
- Personal best score stored locally in `localStorage`.
- Global leaderboard stored in Firebase Firestore (when configured).
