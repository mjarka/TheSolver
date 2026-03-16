import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { useGameStore } from "../store/gameStore";
import type { ThreeEvent } from "@react-three/fiber";
import type { Group, MeshStandardMaterial } from "three";
import { Color } from "three";

interface PlatformProps {
  position: [number, number, number];
  tileIndex: number; // 0=left 1=center 2=right
  value?: number;
  interactive?: boolean;
  isMiddleRow?: boolean;
}

const COLOR_TILE = new Color("#3d3d6b");
const COLOR_GREEN = new Color("#22c55e");
const COLOR_RED = new Color("#ef4444");
const FLASH_DURATION = 0.6;       // seconds — correct answer on correct guess
const WRONG_CORRECT_DURATION = 2.2; // seconds — correct tile stays green on wrong guess

export function Platform({
  position,
  tileIndex,
  value,
  interactive = false,
  isMiddleRow = false,
}: PlatformProps) {
  const groupRef = useRef<Group>(null);
  const matRef = useRef<MeshStandardMaterial>(null);
  const [hovered, setHovered] = useState(false);

  const prevFlashAt      = useRef(useGameStore.getState().tileFlashAt);
  const prevWrongLand    = useRef(useGameStore.getState().wrongLandAt);
  const prevStandingFall = useRef(useGameStore.getState().standingFallAt);
  const flashTimer    = useRef(0);
  const flashColor    = useRef<Color>(COLOR_TILE);
  const fallT         = useRef(0);
  const falling       = useRef(false);
  const prevPhase     = useRef<string>(useGameStore.getState().phase);
  const displayValue  = useRef<number | undefined>(value);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const textRef       = useRef<any>(null);
  const textOpacity   = useRef(value !== undefined ? 1 : 0);

  const { phase, answer, question, selectedTileIndex, currentColumnIndex, lives, tileFlashAt, wrongLandAt, standingFallAt } =
    useGameStore();
  const isActive = interactive && phase === "playing";

  useFrame((_, delta) => {
    if (!groupRef.current || !matRef.current) return;

    // --- scale hover ---
    const target = hovered && isActive ? 1.08 : 1;
    const s = groupRef.current.scale.x;
    groupRef.current.scale.setScalar(s + (target - s) * 0.2);

    // --- detect landing signal ---
    if (tileFlashAt !== prevFlashAt.current) {
      const wasInteractive = interactive && value !== undefined;
      prevFlashAt.current = tileFlashAt; // always sync — prevents stale fire after becoming interactive
      const isCorrectTile = wasInteractive && value === question.answer;
      const isWrongTile =
        wasInteractive &&
        tileIndex === selectedTileIndex &&
        selectedTileIndex !== -1 &&
        value !== question.answer;

      if (isCorrectTile) {
        flashColor.current = COLOR_GREEN;
        const wrongAnswerGiven = selectedTileIndex !== -1 && tileIndex !== selectedTileIndex;
        flashTimer.current = wrongAnswerGiven ? WRONG_CORRECT_DURATION : FLASH_DURATION;
      } else if (isWrongTile) {
        flashColor.current = COLOR_RED;
        flashTimer.current = FLASH_DURATION;
      }
    }

    // --- start fall when character fully lands on wrong tile ---
    if (wrongLandAt !== prevWrongLand.current) {
      prevWrongLand.current = wrongLandAt;
      const isWrongTile =
        interactive && value !== undefined &&
        phase === "wrong" &&
        tileIndex === selectedTileIndex &&
        selectedTileIndex !== -1;
      if (isWrongTile && lives === 0) {
        falling.current = true;
        fallT.current = 0;
      }
    }

    // --- start fall when timer runs out (standing tile sinks) ---
    if (standingFallAt !== prevStandingFall.current) {
      prevStandingFall.current = standingFallAt;
      if (isMiddleRow && tileIndex === currentColumnIndex && lives === 0) {
        falling.current = true;
        fallT.current = 0;
      }
    }

    // --- update cached display value ---
    if (value !== undefined) {
      displayValue.current = value;
      textOpacity.current = 1;
    }

    // --- animate flash ---
    if (flashTimer.current > 0) {
      flashTimer.current = Math.max(0, flashTimer.current - delta);
      const t = flashTimer.current / FLASH_DURATION; // 1→0
      matRef.current.color.lerpColors(COLOR_TILE, flashColor.current, t);
      textOpacity.current = 1;
    } else {
      matRef.current.color.copy(COLOR_TILE);
      if (value === undefined)
        textOpacity.current = Math.max(0, textOpacity.current - delta * 3);
    }

    // --- apply text opacity ---
    if (textRef.current?.material) {
      textRef.current.material.opacity = textOpacity.current;
    }

    // --- reset fall when phase leaves 'wrong' ---
    if (prevPhase.current === "wrong" && phase !== "wrong") {
      falling.current = false;
      fallT.current = 0;
      groupRef.current.position.y = position[1];
    }
    prevPhase.current = phase;

    // --- tile fall (wrong answer) ---
    if (falling.current) {
      fallT.current += delta;
      groupRef.current.position.y = position[1] - fallT.current * fallT.current * 0.18 * 60;
    }
  });

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    if (!isActive || value === undefined) return;
    answer(value, tileIndex);
  }

  return (
    <group ref={groupRef} position={position}>
      <mesh
        onClick={handleClick}
        onPointerEnter={() => isActive && setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        receiveShadow
      >
        <boxGeometry args={[1.8, 0.2, 1.8]} />
        <meshStandardMaterial
          ref={matRef}
          color={COLOR_TILE}
          roughness={0.5}
          metalness={0.1}
          transparent
        />
      </mesh>

      {displayValue.current !== undefined && (
        <Text
          ref={textRef}
          position={[0, 0.12, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.75}
          color="white"
          anchorX="center"
          anchorY="middle"
          renderOrder={1}
          font="/fonts/ChakraPetch-Bold.ttf"
        >
          {String(displayValue.current)}
        </Text>
      )}
    </group>
  );
}
