import { useGameStore } from '../store/gameStore'

export function StartScreen() {
  const phase = useGameStore((s) => s.phase)
  const startGame = useGameStore((s) => s.startGame)

  if (phase !== 'start') return null

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/60 z-50">
      <div className="text-white text-center px-8">
        <div
          className="font-black mb-2"
          style={{ fontSize: 'clamp(3rem, 15vw, 6rem)' }}
        >
          The Solver
        </div>
        <div className="text-white/60 text-lg mb-10">
          Matematyczne skoki
        </div>
        <button
          onClick={startGame}
          className="px-12 py-5 text-2xl font-bold rounded-3xl bg-white text-black
                     active:scale-95 transition-transform shadow-xl"
        >
          Start
        </button>
      </div>
    </div>
  )
}
