import { useGameStore } from '../store/gameStore'

export function GameOver() {
  const phase = useGameStore((s) => s.phase)
  const score = useGameStore((s) => s.score)
  const restartGame = useGameStore((s) => s.restartGame)

  if (phase !== 'gameover') return null

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/70 z-50">
      <div className="text-white text-center px-8">
        <div className="gameover-title">Game Over</div>
        <div className="gameover-score">Score: {score}</div>
        <button
          type="button"
          onClick={restartGame}
          className="gameover-btn active:scale-95 transition-transform"
        >
          <svg
            className="gameover-btn-outline"
            viewBox="0 0 1656.89 378.16"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polygon
              points="1656.89 171.7 1656.89 378.16 148.9 378.16 0 229.26 0 0 1485.19 0 1656.89 171.7"
              fill="none"
              stroke="rgba(255,255,255,0.7)"
              strokeWidth="18"
            />
          </svg>
          Play Again
        </button>
      </div>
    </div>
  )
}
