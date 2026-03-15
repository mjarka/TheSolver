import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { useGameStore } from '../store/gameStore'
import type { Group } from 'three'

// Match these to the actual clip names in your GLB
const CLIP = { idle: 'idle', jump: 'jump', fall: 'fall' } as const
const MODEL_PATH = '/models/character.glb'

export function Character() {
  const group = useRef<Group>(null)
  const { scene, animations } = useGLTF(MODEL_PATH)
  const { actions, mixer } = useAnimations(animations, group)
  const phase = useGameStore((s) => s.phase)
  const nextQuestion = useGameStore((s) => s.nextQuestion)

  const targetY = useRef(0)
  const settled = useRef(false)

  useEffect(() => {
    settled.current = false
    if (phase === 'correct') targetY.current = 0.8
    else if (phase === 'wrong') targetY.current = -3.5
    else targetY.current = 0
  }, [phase])

  useFrame((_, delta) => {
    if (!group.current) return
    const pos = group.current.position
    const speed = phase === 'wrong' ? 4 : 8
    pos.y += (targetY.current - pos.y) * Math.min(speed * delta, 1)

    if (!settled.current && (phase === 'correct' || phase === 'wrong')) {
      if (Math.abs(pos.y - targetY.current) < 0.05) {
        settled.current = true
        nextQuestion()
      }
    }
  })

  useEffect(() => {
    const stopAll = () => Object.values(actions).forEach((a) => a?.fadeOut(0.2))
    if (phase === 'playing' || phase === 'start') {
      stopAll(); actions[CLIP.idle]?.reset().fadeIn(0.2).play()
    } else if (phase === 'correct') {
      stopAll(); actions[CLIP.jump]?.reset().fadeIn(0.1).play()
    } else if (phase === 'wrong') {
      stopAll(); actions[CLIP.fall]?.reset().fadeIn(0.1).play()
    }
  }, [phase, actions])

  useEffect(() => () => mixer.stopAllAction(), [mixer])

  return (
    <group ref={group}>
      <primitive object={scene} scale={0.8} />
    </group>
  )
}

useGLTF.preload(MODEL_PATH)
