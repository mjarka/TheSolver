import { useGameStore } from '../store/gameStore'

export function GameOver() {
  const phase = useGameStore((s) => s.phase)
  const score = useGameStore((s) => s.score)
  const restartGame = useGameStore((s) => s.restartGame)

  if (phase !== 'gameover') return null

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/70 z-50">
      <div className="text-white text-center px-8">
        <div className="text-6xl font-black mb-2">Game Over</div>
        <div className="text-2xl text-white/70 mb-8">Wynik: {score}</div>
        <button
          onClick={restartGame}
          className="px-10 py-4 text-xl font-bold rounded-2xl bg-white text-black
                     active:scale-95 transition-transform"
        >
          Zagraj ponownie
        </button>
      </div>
    </div>
  )
}
