import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/gameStore'

/** Invisible component that drives the timer each frame. */
export function GameLoop() {
  const tick = useGameStore((s) => s.tick)

  useFrame((_, delta) => {
    tick(delta * 1000) // convert seconds → ms
  })

  return null
}
