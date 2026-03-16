import { useRef, useLayoutEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useGameStore, TILE_X } from "../store/gameStore";
import { SHIFT_DIST, SHIFT_SPEED } from "../constants";
import type { Group } from "three";
import { Mesh } from "three";

interface Props {
  basePosition: [number, number, number];
}

const MODEL_PATH = "/models/character.glb";
const ANSWER_ROW_Z = SHIFT_DIST;
const JUMP_HEIGHT = 1.4;
const JUMP_SPEED = 2.2;
const FALL_GRAVITY = 0.18;

export function Character({ basePosition }: Props) {
  const group = useRef<Group>(null);
  const { scene } = useGLTF(MODEL_PATH);

  const phase = useGameStore((s) => s.phase);
  const lives = useGameStore((s) => s.lives);
  const selectedTileIndex = useGameStore((s) => s.selectedTileIndex);
  const setAdvancing = useGameStore((s) => s.setAdvancing);
  const setAdvancingWrong = useGameStore((s) => s.setAdvancingWrong);
  const flashTiles = useGameStore((s) => s.flashTiles);
  const landWrongTile = useGameStore((s) => s.landWrongTile);
  const triggerStandingFall = useGameStore((s) => s.triggerStandingFall);
  const nextQuestion = useGameStore((s) => s.nextQuestion);

  const t = useRef(0);
  const done = useRef(false);
  const wrongFlashFired = useRef(false);
  const wrongLandFired = useRef(false);
  const wrongDelay = useRef(0);
  const returnFrom = useRef<[number, number, number]>([...basePosition]);
  const scrolled = useRef(0);
  const prevPhase = useRef(phase);
  const targetRotY = useRef(0); // if model faces wrong way, add Math.PI here

  useLayoutEffect(() => {
    group.current?.position.set(...basePosition);
    scene.traverse((child) => {
      if (child instanceof Mesh) child.castShadow = true;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, delta) => {
    if (!group.current) return;
    const pos = group.current.position;

    if (prevPhase.current !== phase) {
      if (phase === "correct" || phase === "wrong") {
        t.current = 0;
        done.current = false;
        wrongFlashFired.current = false;
        wrongLandFired.current = false;
        wrongDelay.current = 0;
        // face the target tile
        if (selectedTileIndex >= 0) {
          const dx = TILE_X[selectedTileIndex] - basePosition[0];
          const dz = ANSWER_ROW_Z - basePosition[2];
          targetRotY.current = Math.atan2(dx, dz);
        }
      }
      if (phase === "playing" || phase === "advancing") {
        targetRotY.current = 0;
        group.current?.scale.set(1, 1, 1);
      }
      if (phase === "advancing") {
        returnFrom.current = [pos.x, pos.y, pos.z];
        scrolled.current = 0;
      }
      prevPhase.current = phase;
    }

    // smooth rotation toward target
    group.current.rotation.y +=
      (targetRotY.current - group.current.rotation.y) * Math.min(10 * delta, 1);

    // ── IDLE ──────────────────────────────────────────────
    if (phase === "playing" || phase === "start") {
      pos.set(...basePosition);
      const breathe = 1 + Math.sin(Date.now() * 0.0025) * 0.03;
      group.current.scale.set(1, breathe, 1);
      return;
    }

    // ── CORRECT: arc jump toward answer row ───────────────
    if (phase === "correct") {
      if (done.current) return;
      t.current = Math.min(t.current + delta * JUMP_SPEED, 1);
      const p = t.current;
      const targetX =
        selectedTileIndex >= 0 ? TILE_X[selectedTileIndex] : basePosition[0];
      pos.x = basePosition[0] + (targetX - basePosition[0]) * p;
      pos.z = basePosition[2] + (ANSWER_ROW_Z - basePosition[2]) * p;
      pos.y = basePosition[1] + Math.sin(p * Math.PI) * JUMP_HEIGHT;
      group.current.scale.y = 1 + Math.sin(p * Math.PI) * 0.25;
      if (t.current >= 1 && !done.current) {
        done.current = true;
        group.current.scale.y = 1;
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

    // ── WRONG: arc jump to tile then fall ─────────────────
    if (phase === "wrong") {
      if (done.current) {
        wrongDelay.current -= delta;
        if (wrongDelay.current <= 0) nextQuestion();
        return;
      }

      // TIMEOUT: jump in place, then fall (lives=0) or advance (lives>0)
      if (selectedTileIndex === -1) {
        t.current += delta * JUMP_SPEED;
        const p = Math.min(t.current, 1);

        if (t.current <= 1) {
          pos.z = basePosition[2] + (ANSWER_ROW_Z - basePosition[2]) * p;
          pos.y = basePosition[1] + Math.sin(p * Math.PI) * JUMP_HEIGHT;
          group.current.scale.y = 1 + Math.sin(p * Math.PI) * 0.25;
        }

        if (t.current >= 1 && !wrongFlashFired.current) {
          wrongFlashFired.current = true;
          group.current.scale.y = 1;
          triggerStandingFall();
          flashTiles();
          if (lives > 0) {
            done.current = true;
            setAdvancingWrong();
          }
        }

        if (lives === 0 && t.current > 1) {
          const fallT = t.current - 1;
          pos.y = basePosition[1] - fallT * fallT * FALL_GRAVITY * 60;
          if (pos.y < -8 && !done.current) {
            done.current = true;
            wrongDelay.current = 2;
          }
        }
        return;
      }

      // WRONG TILE: arc jump, then fall only on last life
      t.current += delta * JUMP_SPEED;
      const p = Math.min(t.current, 1);
      const targetX = TILE_X[selectedTileIndex];
      pos.x = basePosition[0] + (targetX - basePosition[0]) * p;
      pos.z = basePosition[2] + (ANSWER_ROW_Z - basePosition[2]) * p;

      if (t.current <= 1) {
        pos.y = basePosition[1] + Math.sin(p * Math.PI) * JUMP_HEIGHT;
        group.current.scale.y = 1 + Math.sin(p * Math.PI) * 0.45;
      } else {
        group.current.scale.y = 1;
        if (lives === 0) {
          const fallT = t.current - 1;
          pos.y = basePosition[1] - fallT * fallT * FALL_GRAVITY * 60;
        } else {
          pos.y = basePosition[1];
        }
      }

      if (t.current >= 1 && !wrongFlashFired.current) {
        wrongFlashFired.current = true;
        flashTiles();
      }
      if (t.current >= 1 && !wrongLandFired.current) {
        wrongLandFired.current = true;
        landWrongTile();
        if (lives > 0) {
          done.current = true;
          setAdvancingWrong();
        }
      }
      if (lives === 0 && pos.y < -8 && !done.current) {
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
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(MODEL_PATH);
