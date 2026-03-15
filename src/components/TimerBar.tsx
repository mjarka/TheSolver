import { useRef, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'

const TIMER_MS = 5000

export function TimerBar() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const timeLeft = useGameStore((s) => s.timeLeft)
  const phase = useGameStore((s) => s.phase)

  useEffect(() => {
    const pct = Math.max(0, (timeLeft / TIMER_MS) * 100)
    const hue = Math.round((pct / 100) * 120)
    const fill = fillRef.current
    if (!fill) return
    fill.style.width = `${pct}%`
    fill.style.backgroundColor = `hsl(${hue}, 90%, 50%)`
    fill.style.transition = phase === 'playing' ? 'width 0.1s linear' : 'none'
  }, [timeLeft, phase])

  return (
    <div ref={wrapRef} className="timer-wrap">
      <div ref={fillRef} className="timer-fill" />
    </div>
  )
}
