import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, useGLTF, useTexture } from "@react-three/drei";
import { useGameStore } from "../store/gameStore";
import { asset } from "../utils/assetUrl";
import type { ThreeEvent } from "@react-three/fiber";
import type { Group, MeshStandardMaterial, MeshBasicMaterial } from "three";
import { Color, Mesh } from "three";

interface PlatformProps {
  position: [number, number, number];
  tileIndex: number; // 0=left 1=center 2=right
  value?: number;
  interactive?: boolean;
  isMiddleRow?: boolean;
  isStartTile?: boolean;
}

const COLOR_TILE = new Color("#ffffff");
const COLOR_GREEN = new Color("#22c55e");
const COLOR_RED = new Color("#ef4444");
const FLASH_DURATION = 0.6; // seconds — correct answer on correct guess
const WRONG_CORRECT_DURATION = 2.2; // seconds — correct tile stays green on wrong guess

function useBlockMeshes() {
  const { scene } = useGLTF(asset("/models/boxGeometry.glb")) as unknown as {
    scene: Group;
  };
  const meshes: Record<string, Mesh["geometry"]> = {};
  scene.traverse((child) => {
    if (child instanceof Mesh)
      meshes[child.name.toLowerCase()] = child.geometry;
  });
  return meshes;
}

export function Platform({
  position,
  tileIndex,
  value,
  interactive = false,
  isMiddleRow = false,
  isStartTile = false,
}: PlatformProps) {
  const blockMeshes = useBlockMeshes();
  const colorMap = useTexture(asset("/ColorMap.jpg"));
  const normalMap = useTexture(asset("/NormalMap.png"));
  const groupRef = useRef<Group>(null);
  const matRef = useRef<MeshBasicMaterial>(null);
  const emitMatRef = useRef<MeshStandardMaterial>(null);
  const blackMatRef = useRef<MeshStandardMaterial>(null);
  const [hovered, setHovered] = useState(false);

  const prevFlashAt = useRef(useGameStore.getState().tileFlashAt);
  const prevWrongLand = useRef(useGameStore.getState().wrongLandAt);
  const prevStandingFall = useRef(useGameStore.getState().standingFallAt);
  const flashTimer = useRef(0);
  const flashDuration = useRef(FLASH_DURATION);
  const flashColor = useRef<Color>(COLOR_TILE);
  const fallT = useRef(0);
  const falling = useRef(false);
  const prevPhase = useRef<string>(useGameStore.getState().phase);
  const displayValue = useRef<number | undefined>(value);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const textRef = useRef<any>(null);
  const textOpacity = useRef(value !== undefined || isStartTile ? 1 : 0);
  const textColor = useRef(new Color("#ffffff"));

  const {
    phase,
    answer,
    startGame,
    question,
    selectedTileIndex,
    currentColumnIndex,
    lives,
    tileFlashAt,
    wrongLandAt,
    standingFallAt,
  } = useGameStore();
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
        const wrongAnswerGiven =
          selectedTileIndex !== -1 && tileIndex !== selectedTileIndex;
        flashDuration.current = wrongAnswerGiven
          ? WRONG_CORRECT_DURATION
          : FLASH_DURATION;
        flashTimer.current = flashDuration.current;
      } else if (isWrongTile) {
        flashColor.current = COLOR_RED;
        flashDuration.current = FLASH_DURATION;
        flashTimer.current = FLASH_DURATION;
      }
    }

    // --- start fall when character fully lands on wrong tile ---
    if (wrongLandAt !== prevWrongLand.current) {
      prevWrongLand.current = wrongLandAt;
      const isWrongTile =
        interactive &&
        value !== undefined &&
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
      const t = 1 - flashTimer.current / flashDuration.current; // 0→1 (ease in)
      const intensity = Math.sin(t * Math.PI) * 1.4; // arc: 0 → peak → 0
      matRef.current.color.copy(COLOR_TILE);
      if (emitMatRef.current) {
        emitMatRef.current.emissive.copy(flashColor.current);
        emitMatRef.current.emissiveIntensity = intensity;
      }
      textOpacity.current = 1;
      textColor.current.copy(flashColor.current);
    } else {
      if (emitMatRef.current) emitMatRef.current.emissiveIntensity = 0;
      matRef.current.color.copy(COLOR_TILE);
      textColor.current.set("#ffffff");
      if (value === undefined) {
        textOpacity.current = Math.max(0, textOpacity.current - delta * 3);
      } else if (phase === "wrong" && value !== question.answer) {
        textOpacity.current = Math.max(0, textOpacity.current - delta * 10);
      }
    }

    // --- apply text opacity + color ---
    if (textRef.current?.material) {
      textRef.current.material.opacity = textOpacity.current;
      textRef.current.material.color.copy(textColor.current);
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
      groupRef.current.position.y =
        position[1] - fallT.current * fallT.current * 0.18 * 60;
    }
  });

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    if (isStartTile && phase === "start") {
      startGame();
      return;
    }
    if (!isActive || value === undefined) return;
    answer(value, tileIndex);
  }

  return (
    <group ref={groupRef} position={position}>
      {/* body — świeci podczas flasha */}
      <mesh
        geometry={blockMeshes["body"]}
        onClick={handleClick}
        onPointerEnter={() => (isActive || isStartTile) && setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        receiveShadow
      >
        {!blockMeshes["body"] && <boxGeometry args={[1.8, 0.2, 1.8]} />}
        <meshBasicMaterial
          ref={matRef}
          color={COLOR_TILE}
          map={colorMap}
          transparent
        />
      </mesh>
      {/* emit — świeci przy poprawnej/złej odpowiedzi */}
      {blockMeshes["emit"] && (
        <mesh
          geometry={blockMeshes["emit"]}
          onClick={handleClick}
          onPointerEnter={() => (isActive || isStartTile) && setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          <meshStandardMaterial
            ref={emitMatRef}
            color={COLOR_TILE}
            map={colorMap}
            normalMap={normalMap}
            roughness={0.4}
            metalness={0}
            emissive={COLOR_TILE}
            emissiveIntensity={0}
            transparent
          />
        </mesh>
      )}
      {/* black — bez emissive */}
      {blockMeshes["black"] && (
        <mesh
          geometry={blockMeshes["black"]}
          onClick={handleClick}
          onPointerEnter={() => (isActive || isStartTile) && setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          receiveShadow
        >
          <meshStandardMaterial ref={blackMatRef} color="#000000" roughness={0.6} metalness={0} transparent />
        </mesh>
      )}

      {isStartTile ? (
        <Text
          position={[0, 0.12, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.38}
          color="white"
          anchorX="center"
          anchorY="middle"
          renderOrder={1}
          font={asset("/fonts/ChakraPetch-Bold.ttf")}
        >
          START
        </Text>
      ) : (
        displayValue.current !== undefined && (
          <Text
            ref={textRef}
            position={[0, 0.12, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.75}
            color="white"
            anchorX="center"
            anchorY="middle"
            renderOrder={1}
            font={asset("/fonts/ChakraPetch-Bold.ttf")}
          >
            {String(displayValue.current)}
          </Text>
        )
      )}
    </group>
  );
}

useGLTF.preload(asset("/models/boxGeometry.glb"));
