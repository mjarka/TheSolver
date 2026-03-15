import { useState, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh, MeshStandardMaterial } from 'three'
import { useGameStore, TILE_X } from '../store/gameStore'
import { SHIFT_DIST, SHIFT_SPEED } from '../constants'
import { Platform } from './Platform'
import type { Group } from 'three'

// Z layout:
//   +6  buffer row  (pre-spawned off-screen bottom)
//   +3  answer row  (active, interactive)
//    0  middle row  (character)
//   -3  back row    (decorative)
//   -6  fading row  (visible at top, opacity 0→1 inverted)
const FADE_START_Z = -6.5 // rows past this Z start fading (keeps 5 rows fully visible)
const FADE_SPEED   = 1.2  // opacity units per second (1/FADE_SPEED = fade duration)

type RowMeta = { id: number }
let _rowId = 3

export function RowManager() {
  const options         = useGameStore((s) => s.options)
  const bufferedOptions = useGameStore((s) => s.bufferedOptions)
  const phase           = useGameStore((s) => s.phase)
  const advanceQuestion = useGameStore((s) => s.advanceQuestion)

  const [rowMetas, setRowMetas] = useState<RowMeta[]>([
    { id: 0 }, // Z = -3  decorative
    { id: 1 }, // Z =  0  middle
    { id: 2 }, // Z = +3  answer
    { id: 3 }, // Z = +6  buffer
  ])

  const baseZMap   = useRef(new Map<number, number>([[0, -3],[1, 0],[2, 3],[3, 6]]))
  const groupMap   = useRef(new Map<number, Group | null>())
  const opacityMap = useRef(new Map<number, number>()) // id → current opacity (1=full, 0=gone)
  const shiftProg  = useRef(0)
  const shifting   = useRef(false)

  const prevPhase = useRef(phase)
  useEffect(() => {
    if (prevPhase.current !== 'advancing' && phase === 'advancing') {
      shifting.current = true
      shiftProg.current = 0
    }
    prevPhase.current = phase
  }, [phase])

  useFrame((_, delta) => {
    // ── Animate fading rows ────────────────────────────────
    const fadedOut: number[] = []
    opacityMap.current.forEach((opacity, id) => {
      const next = Math.max(0, opacity - delta * FADE_SPEED)
      opacityMap.current.set(id, next)

      const g = groupMap.current.get(id)
      if (g) {
        g.traverse((child) => {
          if (child instanceof Mesh) {
            const mat = child.material
            if (mat instanceof MeshStandardMaterial) {
              mat.opacity = next
            }
          }
        })
      }

      if (next <= 0) fadedOut.push(id)
    })

    // Remove fully faded rows
    if (fadedOut.length > 0) {
      fadedOut.forEach((id) => {
        opacityMap.current.delete(id)
        baseZMap.current.delete(id)
        groupMap.current.delete(id)
      })
      setRowMetas((prev) => prev.filter((r) => !fadedOut.includes(r.id)))
    }

    // ── Scroll animation ───────────────────────────────────
    if (!shifting.current) return

    shiftProg.current += delta * SHIFT_SPEED
    const offset = Math.min(shiftProg.current, SHIFT_DIST)

    groupMap.current.forEach((group, id) => {
      const bz = baseZMap.current.get(id) ?? 0
      if (group) group.position.z = bz - offset
    })

    if (shiftProg.current < SHIFT_DIST) return

    // ── Scroll complete ────────────────────────────────────
    shifting.current = false
    shiftProg.current = 0

    baseZMap.current.forEach((bz, id) => {
      const newBZ = bz - SHIFT_DIST
      baseZMap.current.set(id, newBZ)

      const g = groupMap.current.get(id)
      if (g) g.position.z = newBZ  // snap to exact position

      // Start fading rows that cross the threshold
      if (newBZ <= FADE_START_Z && !opacityMap.current.has(id)) {
        opacityMap.current.set(id, 1)
      }
    })

    // Pre-spawn next buffer row at Z = +6
    const newId = ++_rowId
    baseZMap.current.set(newId, 6)

    setRowMetas((prev) => [...prev, { id: newId }])

    advanceQuestion()
  })

  return (
    <>
      {rowMetas.map(({ id }) => {
        const baseZ    = baseZMap.current.get(id) ?? 0
        const isAnswer = baseZ === 3
        const isBuffer = baseZ === 6

        return (
          <group
            key={id}
            ref={(g) => { groupMap.current.set(id, g) }}
            position={[0, 0, baseZ]}
          >
            {TILE_X.map((x, tileIndex) => (
              <Platform
                key={tileIndex}
                position={[x, 0, 0]}
                tileIndex={tileIndex}
                value={isAnswer ? options[tileIndex] : isBuffer ? bufferedOptions[tileIndex] : undefined}
                interactive={isAnswer}
              />
            ))}
          </group>
        )
      })}
    </>
  )
}
