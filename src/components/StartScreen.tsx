import { useGameStore } from '../store/gameStore'
import { asset } from '../utils/assetUrl'
import type { Difficulty } from '../utils/mathGenerator'

const LEVELS: { difficulty: Difficulty; label: string; sub: string }[] = [
  { difficulty: 'easy',   label: 'Easy',   sub: '+ −'     },
  { difficulty: 'medium', label: 'Medium', sub: '× ÷'     },
  { difficulty: 'hard',   label: 'Hard',   sub: '+ − × ÷' },
]

export function StartScreen() {
  const phase            = useGameStore((s) => s.phase)
  const difficulty       = useGameStore((s) => s.difficulty)
  const selectDifficulty = useGameStore((s) => s.selectDifficulty)

  if (phase !== 'start') return null

  return (
    <div className="start-header">
      <img src={asset("/logotype.png")} className="start-logo" alt="The Solver" />

      <div className="level-list">
        {LEVELS.map(({ difficulty: d, label, sub }) => (
          <div
            key={d}
            className={`level-btn-wrap${difficulty === d ? ' level-btn-wrap--active' : ''}`}
            data-difficulty={d}
          >
<button
              type="button"
              className="level-btn"
              onClick={() => selectDifficulty(d)}
            >
              <div className="level-btn-label">{label}</div>
              <div className="level-btn-sub">{sub}</div>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
