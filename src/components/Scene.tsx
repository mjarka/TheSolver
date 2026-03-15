import { Suspense } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { useEffect } from 'react'
import { Vector3 } from 'three'
import { CharacterFallback } from './CharacterFallback'
import { RowManager } from './RowManager'
import { GameLoop } from './GameLoop'
import { useGameStore, TILE_X } from '../store/gameStore'

const CAM_LOOK = new Vector3(0, 0, 1)

function CameraSetup() {
  const { camera } = useThree()
  useEffect(() => {
    camera.lookAt(CAM_LOOK)
  }, [camera])
  return null
}

function CharacterWithColumn() {
  const col = useGameStore((s) => s.currentColumnIndex)
  const base: [number, number, number] = [TILE_X[col], 0.4, 0]
  return <CharacterFallback basePosition={base} />
}

export function Scene() {
  return (
    <Canvas
      shadows
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#1a1a2e']} />

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

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.11, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#16213e" />
      </mesh>

      <Suspense fallback={null}>
        <RowManager />
        <CharacterWithColumn />
      </Suspense>

      <GameLoop />
    </Canvas>
  )
}
