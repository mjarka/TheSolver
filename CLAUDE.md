# theSolver — CLAUDE.md

## Project overview
Mobile-first browser math game built with React 19 + React Three Fiber.
Player sees a multiplication/arithmetic problem and must jump to the correct answer tile within 5 seconds.
No backend, no leaderboard, no database.

## Stack
- **Vite + TypeScript** — build tool
- **React 19 + React Three Fiber v9** — 3D scene
- **@react-three/drei** — helpers (`useGLTF`, `Text`, `PerspectiveCamera`)
- **Zustand v5** — game state
- **Tailwind CSS v4** — HUD overlays only

## Architecture

### State — `src/store/gameStore.ts`
Single Zustand store. Key fields:
- `phase`: `'start' | 'playing' | 'correct' | 'advancing' | 'wrong' | 'gameover'`
- `question` / `options` — active math question
- `bufferedQuestion` / `bufferedOptions` — pre-generated next question (shown on buffer row)
- `currentColumnIndex` — column (0/1/2) where character stands; persists after correct/wrong jump
- `selectedTileIndex` — which tile the player clicked (-1 = timeout)
- `lives` — decremented on wrong answer AND on timeout
- `tileFlashAt` — increments to trigger tile color flash on landing
- `wrongLandAt` — increments when character fully lands on wrong tile (t≥1), triggers tile fall
- `standingFallAt` — increments on timeout, triggers standing tile to sink (only when lives=0)

Phase transitions:
```
playing → correct  → advancing → playing (advanceQuestion)
playing → wrong    → advancing → playing (setAdvancingWrong → advanceQuestion)
                               ↘ gameover (when lives=0 after fall)
```
- Wrong answer with lives remaining: goes through `advancing` (tiles scroll) via `setAdvancingWrong()`
- Wrong answer on last life: character falls off screen, then `nextQuestion()` → gameover
- `setAdvancingWrong()` updates `currentColumnIndex` to `selectedTileIndex` (character stays on jumped column)

### Scene — `src/components/Scene.tsx`
- `PerspectiveCamera` initial position `[0, 5, 8]`, looks at `[0, 0, 1]`
- **Responsive camera** via `CameraSetup` (runs in `useFrame`):
  - Portrait (aspect < 0.9): lerps to `MOBILE_CAM [0, 2.9, 4.7]`, `MOBILE_HFOV 95°`
  - Landscape: lerps to `DESKTOP_CAM [0, 5, 8]`, `DESKTOP_HFOV 60°`
  - Vertical FOV computed from target hFOV ÷ aspect, capped at `FOV_MAX 120°`
- Answer tiles at Z=`+SHIFT_DIST`
- Character at Z=0 (middle row)
- Buffer row at Z=`+SHIFT_DIST*2`
- Far buffer row at Z=`+SHIFT_DIST*3` (blank/decorative, new rows spawn here)

### Row system — `src/components/RowManager.tsx`
- Maintains 6 rows: Z = -SHIFT_DIST, 0, +SHIFT_DIST, +SHIFT_DIST*2, +SHIFT_DIST*3 (+ fading)
- New rows spawn at Z=`+SHIFT_DIST*3` (far buffer, blank)
- During `advancing` phase: animates all rows by `-SHIFT_DIST` at `SHIFT_SPEED`
- Rows past threshold start fading via `traverse` — handles both `MeshStandardMaterial` and `MeshBasicMaterial`
- `FADE_SPEED = 0.4` → fade duration ~2.5s
- Removed from React state only when `opacity === 0`
- After scroll: calls `advanceQuestion()` — shifts buffer→active, generates new buffer
- `isAnswer` / `isBuffer` / `isMiddle` flags derived from baseZ value
- Passes `isMiddleRow` prop to Platform (needed for standing tile fall on timeout)

### Character — `src/components/Character.tsx`
- Loads `public/models/character.glb` via `useGLTF`; meshes use `MeshBasicMaterial` (shadeless)
- Position controlled **exclusively via `useFrame`** — no `position={}` prop on the group
- Phase transitions detected inside `useFrame` via `prevPhase` ref (no `useEffect`)
- **Animations** via `AnimationMixer` — all `LoopOnce`, `clampWhenFinished`:
  - `jump` — plays on `correct` and `wrong` phase entry; stops on `playing`/`advancing`
  - `idle` — fires randomly every 3–7s during `start` phase
  - `eyeblinking` — fires randomly every 2–6s during `playing` phase
- **Idle (no anim)**: breathing via `scale.y` (±3%), character faces forward
- **correct**: arc jump toward Z=`SHIFT_DIST`, `JUMP_HEIGHT = 0.9`; calls `setAdvancing()` on land
- **advancing**: Z moves in sync with tile rows (same `SHIFT_SPEED` / `SHIFT_DIST`)
- **wrong (tile selected)**:
  - Arc jump to wrong tile
  - `lives > 0`: lands, calls `setAdvancingWrong()` immediately (tiles scroll)
  - `lives = 0`: falls off screen, waits 2s, calls `nextQuestion()` → gameover
- **wrong (timeout, selectedTileIndex = -1)**:
  - Arc jump forward to answer row Z
  - `lives > 0`: lands, calls `setAdvancingWrong()`
  - `lives = 0`: falls off screen after landing
- Character rotates to face target tile on jump; returns to forward on `playing`/`advancing`

### Platform — `src/components/Platform.tsx`
- 3D text via `<Text>` from drei, flat on tile surface (`rotation={[-π/2,0,0]}`)
- Font: `public/fonts/ChakraPetch-Bold.ttf`
- `displayValue` ref caches last known value — number stays visible after tile scrolls past, fading out when flash ends
- **Mesh materials**:
  - `body` — `MeshBasicMaterial` (shadeless, baked texture from Blender) with `colorMap`
  - `emit` — `MeshStandardMaterial` with emissive flash (green correct, red wrong)
  - `black` — `MeshStandardMaterial` black, `transparent` for fade support
- **Text color** follows flash: green on correct tile, red on wrong tile; resets to white when flash ends
- **Flash durations**:
  - Correct tile on wrong guess: `WRONG_CORRECT_DURATION = 2.2s`
  - Correct answer on correct guess: `FLASH_DURATION = 0.6s`
  - Wrong tile: `FLASH_DURATION = 0.6s`
- **Tile fall** (Y-axis drop with gravity): triggered by `wrongLandAt` (wrong tile) or `standingFallAt` (timeout) — only when `lives === 0`
- Fall resets when phase leaves `'wrong'`

### HUD — `src/App.tsx` + `src/index.css`
- `.hud-backdrop`: fixed gradient overlay (`height: 65%`, dark at bottom → transparent at top)
- `.math-label` uses Chakra Petch Bold via `@font-face`; has `margin-bottom: 0.6rem`
- **GameOver button** uses SVG polygon outline (hexagon shape with two cut corners) instead of CSS border

### Math generator — `src/utils/mathGenerator.ts`
Supports `+`, `-`, `×`, `÷`. Division always produces integer results.
Generates 2 plausible wrong answers (±1–5 offset from correct).

### Shared constants — `src/constants.ts`
`SHIFT_DIST`, `SHIFT_SPEED` — used by RowManager, Character, and Scene.
Changing `SHIFT_DIST` automatically adjusts row spacing, scroll distance, jump target, and fade threshold.

## Key rules
- **Never use `position={}` prop on the character group** — always set via `useFrame`
- **Detect phase changes inside `useFrame`, not `useEffect`** — avoids one-frame teleport glitch
- Tile materials have `transparent={true}` — required for fade-out animation (all three mesh types: body, emit, black)
- `body` mesh uses `MeshBasicMaterial` — do not add lighting-dependent props (`roughness`, `normalMap`, `emissive`)
- Only the character casts shadows (`castShadow`), not tiles
- Timer runs only during `playing` phase; all other phases pause it
- Wrong answer always goes through `advancing` phase (tiles scroll) unless `lives === 0`
- Flash tile color check uses `value !== question.answer` (not `phase === 'wrong'`) so it works after phase changes to `advancing`

## Assets
- `public/models/character.glb` — player character with animations: `jump`, `idle`, `eyeblinking`
- `public/models/boxGeometry.glb` — tile model with meshes: `body`, `emit`, `black`
- `public/ColorMap.jpg` — baked color texture for tiles
- `public/NormalMap.png` — normal map for `emit`/`black` meshes
- `public/fonts/ChakraPetch-Bold.ttf` — tile and HUD numbers

## Hosting
- Deployed via GitHub Actions to GitHub Pages on every push to `master`
- Live URL: `https://mjarka.github.io/TheSolver/`
- Vite `base: '/TheSolver/'` required for correct asset paths

## Dev
```bash
npm install
npm run dev       # starts on http://localhost:5173 (also accessible on LAN via --host)
npm run build
```
