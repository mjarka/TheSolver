import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useGameStore } from '../store/gameStore'
import type { ThreeEvent } from '@react-three/fiber'
import type { Group, MeshStandardMaterial } from 'three'
import { Color } from 'three'

interface PlatformProps {
  position: [number, number, number]
  tileIndex: number   // 0=left 1=center 2=right
  value?: number      // only on interactive tiles
  interactive?: boolean
}

const COLOR_TILE = new Color('#2a2a4a')
const COLOR_GREEN = new Color('#22c55e')
const COLOR_RED   = new Color('#ef4444')
const FLASH_DURATION = 0.6  // seconds

export function Platform({ position, tileIndex, value, interactive = false }: PlatformProps) {
  const groupRef  = useRef<Group>(null)
  const matRef    = useRef<MeshStandardMaterial>(null)
  const [hovered, setHovered] = useState(false)

  const prevFlashAt   = useRef(useGameStore.getState().tileFlashAt)
  const flashTimer    = useRef(0)       // counts down from FLASH_DURATION to 0
  const flashColor    = useRef<Color>(COLOR_TILE)

  const { phase, answer, question, selectedTileIndex, tileFlashAt } = useGameStore()
  const isActive = interactive && phase === 'playing'

  useFrame((_, delta) => {
    if (!groupRef.current || !matRef.current) return

    // --- scale hover ---
    const target = hovered && isActive ? 1.08 : 1
    const s = groupRef.current.scale.x
    groupRef.current.scale.setScalar(s + (target - s) * 0.2)

    // --- detect landing signal ---
    if (tileFlashAt !== prevFlashAt.current) {
      const wasInteractive = interactive && value !== undefined
      prevFlashAt.current = tileFlashAt   // always sync — prevents stale fire after becoming interactive
      const isCorrectTile = wasInteractive && value === question.answer
      const isWrongTile   = wasInteractive && phase === 'wrong' && tileIndex === selectedTileIndex && selectedTileIndex !== -1

      if (isCorrectTile) {
        flashColor.current = COLOR_GREEN
        flashTimer.current = FLASH_DURATION
      } else if (isWrongTile) {
        flashColor.current = COLOR_RED
        flashTimer.current = FLASH_DURATION
      }
    }

    // --- animate flash ---
    if (flashTimer.current > 0) {
      flashTimer.current = Math.max(0, flashTimer.current - delta)
      const t = flashTimer.current / FLASH_DURATION          // 1→0
      matRef.current.color.lerpColors(COLOR_TILE, flashColor.current, t)
    } else {
      matRef.current.color.copy(COLOR_TILE)
    }
  })

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation()
    if (!isActive || value === undefined) return
    answer(value, tileIndex)
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
        <meshStandardMaterial ref={matRef} color={COLOR_TILE} roughness={0.5} metalness={0.1} transparent />
      </mesh>

      {interactive && value !== undefined && (
        <Html center position={[0, 0.3, 0]} style={{ pointerEvents: 'none' }}>
          <div className="platform-label">{value}</div>
        </Html>
      )}
    </group>
  )
}
