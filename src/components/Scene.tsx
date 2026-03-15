import { Suspense } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { Vector3, PerspectiveCamera as ThreePerspectiveCamera } from "three";
import { CharacterFallback } from "./CharacterFallback";
import { RowManager } from "./RowManager";
import { GameLoop } from "./GameLoop";
import { useGameStore, TILE_X } from "../store/gameStore";

const CAM_LOOK = new Vector3(0, 0, 1);
// Desktop/landscape: relaxed wide view
const DESKTOP_CAM = new Vector3(0, 5, 8);
const DESKTOP_HFOV = 60; // min horizontal FOV (degrees)
// Mobile/portrait: close dolly-zoom — buffer row (Z=6) falls behind the camera
const MOBILE_CAM = new Vector3(0, 2.9, 4.7);
const MOBILE_HFOV = 95; // wider hFOV needed because camera is closer to tiles
const DEFAULT_FOV = 50;
const FOV_MAX = 120; // raised to allow the intentional wide-angle look on portrait

function CameraSetup() {
  const { camera, viewport } = useThree();

  useFrame(() => {
    const cam = camera as ThreePerspectiveCamera;
    const isPortrait = viewport.aspect < 0.9;

    // Smoothly lerp between portrait and landscape camera positions
    camera.position.lerp(isPortrait ? MOBILE_CAM : DESKTOP_CAM, 0.05);
    camera.lookAt(CAM_LOOK);

    // Maintain minimum horizontal FOV so all 3 tiles stay visible
    const targetHFOV = isPortrait ? MOBILE_HFOV : DESKTOP_HFOV;
    const halfHRad = (targetHFOV / 2) * (Math.PI / 180);
    const requiredVFovDeg =
      2 * Math.atan(Math.tan(halfHRad) / viewport.aspect) * (180 / Math.PI);
    const fov = Math.min(Math.max(requiredVFovDeg, DEFAULT_FOV), FOV_MAX);
    if (cam.fov !== fov) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  });

  return null;
}

function CharacterWithColumn() {
  const col = useGameStore((s) => s.currentColumnIndex);
  const base: [number, number, number] = [TILE_X[col], 0.4, 0];
  return <CharacterFallback basePosition={base} />;
}

export function Scene() {
  return (
    <Canvas
      shadows
      style={{ width: "100%", height: "100%" }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={["#1a1a2e"]} />

      <PerspectiveCamera makeDefault position={[0, 5, 8]} fov={50} />
      <CameraSetup />

      <ambientLight intensity={0.5} />
      <directionalLight
        position={[3, 8, 6]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.11, 0]}
        receiveShadow
      >
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#16213e" />
      </mesh>

      <Suspense fallback={null}>
        <RowManager />
        <CharacterWithColumn />
      </Suspense>

      <GameLoop />
    </Canvas>
  );
}
