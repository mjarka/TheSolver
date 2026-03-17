import { useRef, useLayoutEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useGameStore, TILE_X } from "../store/gameStore";
import { SHIFT_DIST, SHIFT_SPEED } from "../constants";
import { asset } from "../utils/assetUrl";
import type { Group } from "three";
import { Mesh, MeshBasicMaterial, AnimationMixer, AnimationClip, LoopOnce } from "three";
import type { AnimationAction } from "three";

interface Props {
  basePosition: [number, number, number];
}

const MODEL_PATH = asset("/models/character.glb");
const ANSWER_ROW_Z = SHIFT_DIST;
const JUMP_HEIGHT = 0.9;
const JUMP_SPEED = 2.2;
const FALL_GRAVITY = 0.18;

export function Character({ basePosition }: Props) {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(MODEL_PATH);
  const mixerRef = useRef<AnimationMixer | null>(null);
  const jumpActionRef = useRef<AnimationAction | null>(null);
  const idleActionRef = useRef<AnimationAction | null>(null);
  const eyeblinkActionRef = useRef<AnimationAction | null>(null);
  const idleTimer = useRef(3 + Math.random() * 4);    // next idle in 3–7s
  const eyeblinkTimer = useRef(2 + Math.random() * 4); // next blink in 2–6s

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
      if (child instanceof Mesh) {
        child.castShadow = true;
        const oldMat = child.material as { map?: MeshBasicMaterial["map"] };
        child.material = new MeshBasicMaterial({ map: oldMat.map ?? null });
      }
    });
    const mixer = new AnimationMixer(scene);
    mixerRef.current = mixer;
    const clip = AnimationClip.findByName(animations, "jump");
    if (clip) {
      const action = mixer.clipAction(clip);
      action.loop = LoopOnce;
      action.clampWhenFinished = true;
      jumpActionRef.current = action;
    }
    const idleClip = AnimationClip.findByName(animations, "idle");
    if (idleClip) {
      const action = mixer.clipAction(idleClip);
      action.loop = LoopOnce;
      action.clampWhenFinished = true;
      idleActionRef.current = action;
    }
    const blinkClip = AnimationClip.findByName(animations, "eyeblinking");
    if (blinkClip) {
      const action = mixer.clipAction(blinkClip);
      action.loop = LoopOnce;
      action.clampWhenFinished = true;
      eyeblinkActionRef.current = action;
    }
    return () => { mixer.stopAllAction(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, delta) => {
    if (!group.current) return;
    const pos = group.current.position;

    mixerRef.current?.update(delta);

    // ── IDLE anim (start screen) ───────────────────────────
    if (phase === "start") {
      idleTimer.current -= delta;
      if (idleTimer.current <= 0) {
        idleActionRef.current?.reset().play();
        idleTimer.current = 3 + Math.random() * 4;
      }
    }

    // ── EYEBLINK anim (during gameplay) ───────────────────
    if (phase === "playing") {
      eyeblinkTimer.current -= delta;
      if (eyeblinkTimer.current <= 0) {
        eyeblinkActionRef.current?.reset().play();
        eyeblinkTimer.current = 2 + Math.random() * 4;
      }
    }

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
        jumpActionRef.current?.reset().play();
      }
      if (phase === "playing" || phase === "advancing") {
        targetRotY.current = 0;
        group.current?.scale.set(1, 1, 1);
        jumpActionRef.current?.stop();
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
      const targetX = TILE_X[useGameStore.getState().currentColumnIndex];
      pos.x = returnFrom.current[0] + (targetX - returnFrom.current[0]) * ratio;
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

      // TIMEOUT
      if (selectedTileIndex === -1) {
        if (lives === 0) {
          // last life — fall immediately with tile, no jump
          if (!wrongFlashFired.current) {
            wrongFlashFired.current = true;
            triggerStandingFall();
            landWrongTile();
            flashTiles();
          }
          t.current += delta;
          pos.y = basePosition[1] - t.current * t.current * FALL_GRAVITY * 60;
          if (pos.y < -8 && !done.current) {
            done.current = true;
            wrongDelay.current = 2;
          }
        } else {
          // lives > 0 — jump forward then advance
          t.current += delta * JUMP_SPEED;
          const p = Math.min(t.current, 1);
          pos.z = basePosition[2] + (ANSWER_ROW_Z - basePosition[2]) * p;
          pos.y = basePosition[1] + Math.sin(p * Math.PI) * JUMP_HEIGHT;
          group.current.scale.y = 1 + Math.sin(p * Math.PI) * 0.25;
          if (t.current >= 1 && !wrongFlashFired.current) {
            wrongFlashFired.current = true;
            group.current.scale.y = 1;
            triggerStandingFall();
            landWrongTile();
            flashTiles();
            done.current = true;
            setAdvancingWrong();
          }
        }
        return;
      }

      // WRONG TILE: arc jump for all cases; fall or advance after landing
      const targetX = TILE_X[selectedTileIndex];
      t.current += delta * JUMP_SPEED;
      const p = Math.min(t.current, 1);
      pos.x = basePosition[0] + (targetX - basePosition[0]) * p;
      pos.z = basePosition[2] + (ANSWER_ROW_Z - basePosition[2]) * p;

      if (t.current <= 1) {
        pos.y = basePosition[1] + Math.sin(p * Math.PI) * JUMP_HEIGHT;
        group.current.scale.y = 1 + Math.sin(p * Math.PI) * 0.45;
      } else {
        group.current.scale.y = 1;
        if (lives === 0) {
          const fallT = (t.current - 1) / JUMP_SPEED;
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
