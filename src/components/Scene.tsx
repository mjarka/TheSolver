import { Suspense, useRef } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { Vector3, PerspectiveCamera as ThreePerspectiveCamera } from "three";
import { Character } from "./Character";
import { RowManager } from "./RowManager";
import { GameLoop } from "./GameLoop";
import { useGameStore, TILE_X } from "../store/gameStore";

const CAM_LOOK = new Vector3(0, 0, 1);
const MOBILE_CAM_LOOK = new Vector3(0, 2.3, 3);
// Desktop/landscape: relaxed wide view
const DESKTOP_CAM = new Vector3(0, 3, 8);
const DESKTOP_HFOV = 60; // min horizontal FOV (degrees)
// Mobile/portrait: close dolly-zoom — buffer row (Z=6) falls behind the camera
const MOBILE_CAM = new Vector3(0, 2.9, 3.7);
const MOBILE_HFOV = 95; // wider hFOV needed because camera is closer to tiles
const DEFAULT_FOV = 50;
const FOV_MAX = 120; // raised to allow the intentional wide-angle look on portrait
// Intro (start screen) camera — adjust to taste
const INTRO_CAM = new Vector3(0, 1.5, 4.6);
const INTRO_CAM_LOOK = new Vector3(0, 0.8, 2);
const INTRO_HFOV = 70;
const INTRO_CAM_MOBILE = new Vector3(0, 2.5, 4.2);
const INTRO_CAM_LOOK_MOBILE = new Vector3(0, 1.2, 1.5);
const INTRO_HFOV_MOBILE = 60;
const SHAKE_STRENGTH = 0.23;
const SHAKE_DECAY = 7;

function CameraShake() {
  const { gl } = useThree();
  const wrongLandAt = useGameStore((s) => s.wrongLandAt);
  const prevWrongLandAt = useRef(wrongLandAt);
  const shakeIntensity = useRef(0);

  useFrame((_, delta) => {
    if (wrongLandAt !== prevWrongLandAt.current) {
      prevWrongLandAt.current = wrongLandAt;
      shakeIntensity.current = SHAKE_STRENGTH;
    }

    if (shakeIntensity.current > 0.001) {
      shakeIntensity.current *= Math.exp(-SHAKE_DECAY * delta);
      const s = shakeIntensity.current * 100; // px
      const x = (Math.random() - 0.5) * s;
      const y = (Math.random() - 0.5) * s;
      gl.domElement.style.transform = `translate(${x}px, ${y}px)`;
    } else {
      shakeIntensity.current = 0;
      gl.domElement.style.transform = "";
    }
  });

  return null;
}

function CameraSetup() {
  const { camera, viewport } = useThree();
  const phase = useGameStore((s) => s.phase);
  const currentLook = useRef(INTRO_CAM_LOOK.clone());
  const prevPhase = useRef(phase);
  const initialized = useRef(false);

  useFrame(() => {
    const cam = camera as ThreePerspectiveCamera;
    const isPortrait = viewport.aspect < 0.9;
    const isIntro = phase === "start";

    // Snap to correct intro position on first frame
    if (!initialized.current) {
      initialized.current = true;
      const snapPos = isPortrait ? INTRO_CAM_MOBILE : INTRO_CAM;
      const snapLook = isPortrait ? INTRO_CAM_LOOK_MOBILE : INTRO_CAM_LOOK;
      camera.position.copy(snapPos);
      currentLook.current.copy(snapLook);
      camera.lookAt(currentLook.current);
    }

    prevPhase.current = phase;

    const targetPos = isIntro
      ? isPortrait
        ? INTRO_CAM_MOBILE
        : INTRO_CAM
      : isPortrait
        ? MOBILE_CAM
        : DESKTOP_CAM;
    const targetLook = isIntro
      ? isPortrait
        ? INTRO_CAM_LOOK_MOBILE
        : INTRO_CAM_LOOK
      : isPortrait
        ? MOBILE_CAM_LOOK
        : CAM_LOOK;

    camera.position.lerp(targetPos, 0.05);
    currentLook.current.lerp(targetLook, 0.05);
    camera.lookAt(currentLook.current);

    // Maintain minimum horizontal FOV so all 3 tiles stay visible
    const targetHFOV = isIntro
      ? isPortrait
        ? INTRO_HFOV_MOBILE
        : INTRO_HFOV
      : isPortrait
        ? MOBILE_HFOV
        : DESKTOP_HFOV;
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
  const base: [number, number, number] = [TILE_X[col], 0.1, 0];
  return <Character basePosition={base} />;
}

function SceneReadySignal() {
  const setSceneReady = useGameStore((s) => s.setSceneReady);
  const fired = useRef(false);
  useFrame(() => {
    if (!fired.current) {
      fired.current = true;
      setSceneReady();
    }
  });
  return null;
}

export function Scene() {
  return (
    <Canvas
      shadows
      style={{ width: "100%", height: "100%" }}
      gl={{ antialias: true, alpha: true }}
    >
      <PerspectiveCamera makeDefault fov={50} />
      <CameraSetup />
      <CameraShake />

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

      <Suspense fallback={null}>
        <RowManager />
        <CharacterWithColumn />
        <SceneReadySignal />
      </Suspense>

      <GameLoop />
    </Canvas>
  );
}
