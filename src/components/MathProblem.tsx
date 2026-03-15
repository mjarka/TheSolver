import { useRef, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'

export function MathProblem() {
  const labelRef = useRef<HTMLDivElement>(null)
  const question = useGameStore((s) => s.question)
  const score = useGameStore((s) => s.score)
  const lives = useGameStore((s) => s.lives)
  const phase = useGameStore((s) => s.phase)

  useEffect(() => {
    if (!labelRef.current) return
    labelRef.current.style.opacity = phase === 'playing' ? '1' : '0.4'
  }, [phase])

  return (
    <div className="math-hud">
      <div className="math-meta">
        <span>Score {score}</span>
        <span>{'❤'.repeat(lives)}</span>
      </div>
      <div ref={labelRef} className="math-label">
        {question.label}
      </div>
    </div>
  )
}
