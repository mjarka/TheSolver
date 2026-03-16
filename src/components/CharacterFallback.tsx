import { useRef, useLayoutEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGameStore, TILE_X } from "../store/gameStore";
import { SHIFT_DIST, SHIFT_SPEED } from "../constants";
import type { Group } from "three";

interface Props {
  basePosition: [number, number, number];
}

const ANSWER_ROW_Z = SHIFT_DIST;
const JUMP_HEIGHT = 1.4;
const JUMP_SPEED = 2.2;
const FALL_GRAVITY = 0.18;

export function CharacterFallback({ basePosition }: Props) {
  const group = useRef<Group>(null);
  const phase = useGameStore((s) => s.phase);
  const selectedTileIndex = useGameStore((s) => s.selectedTileIndex);
  const setAdvancing = useGameStore((s) => s.setAdvancing);
  const flashTiles = useGameStore((s) => s.flashTiles);
  const landWrongTile = useGameStore((s) => s.landWrongTile);
  const triggerStandingFall = useGameStore((s) => s.triggerStandingFall);
  const nextQuestion = useGameStore((s) => s.nextQuestion);

  const t = useRef(0);
  const done = useRef(false);
  const wrongFlashFired = useRef(false);
  const wrongLandFired  = useRef(false);
  const wrongDelay = useRef(0);
  const returnFrom = useRef<[number, number, number]>([...basePosition]);
  const scrolled = useRef(0);
  const prevPhase = useRef(phase);

  // Set initial position without using the JSX position prop.
  // If we used position={basePosition} on the group, R3F would reset the mesh
  // position whenever basePosition changes (column switch) — causing a teleport glitch.
  useLayoutEffect(() => {
    group.current?.position.set(...basePosition);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, delta) => {
    if (!group.current) return;
    const pos = group.current.position;

    // Detect phase transitions here (not in useEffect) to avoid race conditions
    if (prevPhase.current !== phase) {
      if (phase === "correct" || phase === "wrong") {
        t.current = 0;
        done.current = false;
        wrongFlashFired.current = false;
        wrongLandFired.current = false;
        wrongDelay.current = 0;
      }
      if (phase === "advancing") {
        // Capture exact position in this same frame — no teleport glitch
        returnFrom.current = [pos.x, pos.y, pos.z];
        scrolled.current = 0;
      }
      prevPhase.current = phase;
    }

    // ── IDLE ──────────────────────────────────────────────
    if (phase === "playing" || phase === "start") {
      pos.set(
        basePosition[0],
        basePosition[1] + Math.sin(Date.now() * 0.003) * 0.05,
        basePosition[2],
      );
      return;
    }

    // ── CORRECT: arc jump toward answer row (+Z) ──────────
    if (phase === "correct") {
      if (done.current) return;
      t.current = Math.min(t.current + delta * JUMP_SPEED, 1);
      const p = t.current;
      const targetX =
        selectedTileIndex >= 0 ? TILE_X[selectedTileIndex] : basePosition[0];
      pos.x = basePosition[0] + (targetX - basePosition[0]) * p;
      pos.z = basePosition[2] + (ANSWER_ROW_Z - basePosition[2]) * p;
      pos.y = basePosition[1] + Math.sin(p * Math.PI) * JUMP_HEIGHT;
      if (t.current >= 1 && !done.current) {
        done.current = true;
        flashTiles();
        setAdvancing();
      }
      return;
    }

    // ── ADVANCING: move in sync with tile rows ────────────
    if (phase === "advancing") {
      scrolled.current = Math.min(
        scrolled.current + delta * SHIFT_SPEED,
        SHIFT_DIST,
      );
      const ratio = scrolled.current / SHIFT_DIST;
      pos.z = returnFrom.current[2] - scrolled.current;
      pos.x =
        returnFrom.current[0] +
        (basePosition[0] - returnFrom.current[0]) * ratio;
      pos.y =
        returnFrom.current[1] +
        (basePosition[1] - returnFrom.current[1]) * ratio;
      return;
    }

    // ── WRONG: arc jump to tile then fall ────────────────
    if (phase === "wrong") {
      if (done.current) {
        wrongDelay.current -= delta;
        if (wrongDelay.current <= 0) nextQuestion();
        return;
      }

      // ── TIMEOUT: no jump, fall from standing tile ──────
      if (selectedTileIndex === -1) {
        if (!wrongFlashFired.current) {
          wrongFlashFired.current = true;
          triggerStandingFall();
        }
        t.current += delta;
        pos.y = basePosition[1] - t.current * t.current * FALL_GRAVITY * 60;
        if (pos.y < -8 && !done.current) {
          done.current = true;
          wrongDelay.current = 2;
        }
        return;
      }

      // ── WRONG TILE: arc jump then fall ─────────────────
      t.current += delta * JUMP_SPEED;
      const p = Math.min(t.current, 1);
      const targetX = TILE_X[selectedTileIndex];
      pos.x = basePosition[0] + (targetX - basePosition[0]) * p;
      pos.z = basePosition[2] + (ANSWER_ROW_Z - basePosition[2]) * p;

      if (t.current <= 1) {
        pos.y = basePosition[1] + Math.sin(p * Math.PI) * JUMP_HEIGHT;
      } else {
        const fallT = t.current - 1;
        pos.y = basePosition[1] - fallT * fallT * FALL_GRAVITY * 60;
      }

      if (t.current >= 1 && !wrongFlashFired.current) {
        wrongFlashFired.current = true;
        flashTiles();
      }
      if (t.current >= 1 && !wrongLandFired.current) {
        wrongLandFired.current = true;
        landWrongTile();
      }
      if (pos.y < -8 && !done.current) {
        done.current = true;
        wrongDelay.current = 2;
      }
      return;
    }

    // ── GAMEOVER ───────────────────────────────────────────
    pos.set(...basePosition);
  });

  return (
    <group ref={group}>
      <mesh castShadow>
        <capsuleGeometry args={[0.18, 0.45, 4, 8]} />
        <meshStandardMaterial color="#f4c430" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.5, 0]} castShadow>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#f4c430" roughness={0.5} />
      </mesh>
    </group>
  );
}
