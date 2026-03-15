# theSolver — CLAUDE.md

## Project overview
Mobile-first browser math game built with React 19 + React Three Fiber.
Player sees a multiplication/arithmetic problem and must jump to the correct answer tile within 5 seconds.
No backend, no leaderboard, no database.

## Stack
- **Vite + TypeScript** — build tool
- **React 19 + React Three Fiber v9** — 3D scene
- **@react-three/drei** — helpers (`useGLTF`, `useAnimations`, `Html`, `PerspectiveCamera`)
- **Zustand v5** — game state
- **Tailwind CSS v4** — HUD overlays only

## Architecture

### State — `src/store/gameStore.ts`
Single Zustand store. Key fields:
- `phase`: `'start' | 'playing' | 'correct' | 'advancing' | 'wrong' | 'gameover'`
- `question` / `options` — active math question
- `bufferedQuestion` / `bufferedOptions` — pre-generated next question (shown on buffer row)
- `currentColumnIndex` — column (0/1/2) where character stands; persists after correct jump
- `selectedTileIndex` — which tile the player clicked (-1 = timeout)

Phase transitions:
```
playing → correct → advancing → playing (advanceQuestion)
playing → wrong → playing (nextQuestion)
```

### Scene — `src/components/Scene.tsx`
- `PerspectiveCamera` initial position `[0, 5, 8]`, looks at `[0, 0, 1]`
- **Responsive camera** via `CameraSetup` (runs in `useFrame`):
  - Portrait (aspect < 0.9): lerps to `MOBILE_CAM [0, 4, 5]`, `MOBILE_HFOV 85°` — buffer row falls behind camera
  - Landscape: lerps to `DESKTOP_CAM [0, 5, 8]`, `DESKTOP_HFOV 60°`
  - Vertical FOV computed from target hFOV ÷ aspect, capped at `FOV_MAX 120°`
- Answer tiles at Z=`+SHIFT_DIST` (close to camera — easy to tap)
- Character at Z=0 (middle row)
- Buffer row at Z=`+SHIFT_DIST*2` (on portrait mobile: behind the camera, not visible)

### Row system — `src/components/RowManager.tsx`
- Maintains 5 rows on screen at all times
- Row Z positions are multiples of `SHIFT_DIST` (no hardcoded values)
- During `advancing` phase: animates all rows by `-SHIFT_DIST` at `SHIFT_SPEED`
- Rows past Z < `-(SHIFT_DIST*2 + 0.5)` start fading (`material.opacity` via `traverse`)
- Removed from React state only when `opacity === 0`
- After scroll: calls `advanceQuestion()` — shifts buffer→active, generates new buffer
- `isAnswer` / `isBuffer` flags derived from `baseZ === SHIFT_DIST / SHIFT_DIST*2`

### Character — `src/components/CharacterFallback.tsx`
- Position controlled **exclusively via `useFrame`** — no `position={}` prop on the group
  (prevents R3F from teleporting the character when `basePosition` prop changes)
- Phase transitions detected inside `useFrame` via `prevPhase` ref, not `useEffect`
  (prevents race condition where `useFrame` runs before `useEffect` fires)
- `correct`: arc jump toward Z=`SHIFT_DIST` (+X to chosen column), calls `setAdvancing()` on land
- `advancing`: Z moves in sync with tile rows (same `SHIFT_SPEED` / `SHIFT_DIST`)
- `wrong`: moves toward tile then falls with gravity; after falling off screen waits `wrongDelay` (2 s) then calls `nextQuestion()`

### Math generator — `src/utils/mathGenerator.ts`
Supports `+`, `-`, `×`, `÷`. Division always produces integer results.
Generates 2 plausible wrong answers (±1–5 offset from correct).

### Shared constants — `src/constants.ts`
`SHIFT_DIST`, `SHIFT_SPEED` — used by RowManager, CharacterFallback, and Scene.
Changing `SHIFT_DIST` automatically adjusts row spacing, scroll distance, jump target, and fade threshold.

## Key rules
- **Never use `position={}` prop on the character group** — always set via `useFrame`
- **Detect phase changes inside `useFrame`, not `useEffect`** — avoids one-frame teleport glitch
- Tile materials have `transparent={true}` — required for fade-out animation
- Only the character casts shadows (`castShadow`), not tiles
- Timer runs only during `playing` phase; all other phases pause it

## Swapping in real assets
1. Drop `character.glb` into `public/models/`
2. In `Scene.tsx`: swap `<CharacterFallback />` for `<Character />`
3. In `Character.tsx`: match `CLIP` constants to actual animation clip names in the GLB

## Dev
```bash
npm install
npm run dev       # starts on http://localhost:5173 (also accessible on LAN via --host)
npm run build
```
