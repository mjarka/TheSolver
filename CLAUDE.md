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
- `PerspectiveCamera` at `[0, 5, 8]`, looks at `[0, 0, 1]`
- Answer tiles at Z=+3 (bottom of screen, close to camera — easy to tap)
- Character at Z=0 (middle row)
- Decorative rows at Z=-3, -6 (scroll away to top)
- Buffer row at Z=+6 (pre-spawned off-screen bottom)

### Row system — `src/components/RowManager.tsx`
- Maintains 5 rows on screen at all times (+6, +3, 0, -3, -6)
- During `advancing` phase: animates all rows -3 in Z at `SHIFT_SPEED`
- Rows past Z < -6.5 start fading (`material.opacity` via `traverse`)
- Removed from React state only when `opacity === 0`
- After scroll: calls `advanceQuestion()` — shifts buffer→active, generates new buffer
- New buffer row pre-spawned at Z=+6

### Character — `src/components/CharacterFallback.tsx`
- Position controlled **exclusively via `useFrame`** — no `position={}` prop on the group
  (prevents R3F from teleporting the character when `basePosition` prop changes)
- Phase transitions detected inside `useFrame` via `prevPhase` ref, not `useEffect`
  (prevents race condition where `useFrame` runs before `useEffect` fires)
- `correct`: arc jump toward Z=+3 (+X to chosen column), calls `setAdvancing()` on land
- `advancing`: Z moves in sync with tile rows (same `SHIFT_SPEED` / `SHIFT_DIST`)
- `wrong`: moves toward tile then falls with gravity, calls `nextQuestion()`

### Math generator — `src/utils/mathGenerator.ts`
Supports `+`, `-`, `×`, `÷`. Division always produces integer results.
Generates 2 plausible wrong answers (±1–5 offset from correct).

### Shared constants — `src/constants.ts`
`SHIFT_DIST = 3`, `SHIFT_SPEED = 5.5` — used by both RowManager and CharacterFallback.

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
