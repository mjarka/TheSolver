import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useGameStore } from '../store/gameStore'
import type { ThreeEvent } from '@react-three/fiber'
import type { Group } from 'three'

interface PlatformProps {
  position: [number, number, number]
  tileIndex: number   // 0=left 1=center 2=right (drives color)
  value?: number      // only on interactive tiles
  interactive?: boolean
}

const COLORS = ['#4f6ef7', '#f74f8e', '#4fc87f']
const COLOR_DECO = '#2a2a4a'

export function Platform({ position, tileIndex, value, interactive = false }: PlatformProps) {
  const groupRef = useRef<Group>(null)
  const [hovered, setHovered] = useState(false)
  const { phase, answer } = useGameStore()
  const isActive = interactive && phase === 'playing'

  useFrame(() => {
    if (!groupRef.current) return
    const target = hovered && isActive ? 1.08 : 1
    const s = groupRef.current.scale.x
    groupRef.current.scale.setScalar(s + (target - s) * 0.2)
  })

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation()
    if (!isActive || value === undefined) return
    answer(value, tileIndex)
  }

  const color = interactive ? COLORS[tileIndex % COLORS.length] : COLOR_DECO

  return (
    <group ref={groupRef} position={position}>
      <mesh
        onClick={handleClick}
        onPointerEnter={() => isActive && setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        receiveShadow
      >
        <boxGeometry args={[1.8, 0.2, 1.8]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.1} transparent />
      </mesh>

      {interactive && value !== undefined && (
        <Html center position={[0, 0.3, 0]} style={{ pointerEvents: 'none' }}>
          <div className="platform-label">{value}</div>
        </Html>
      )}
    </group>
  )
}
