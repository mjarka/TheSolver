import { Scene } from './components/Scene'
import { MathProblem } from './components/MathProblem'
import { TimerBar } from './components/TimerBar'
import { GameOver } from './components/GameOver'
import { StartScreen } from './components/StartScreen'
import { useGameStore } from './store/gameStore'

export default function App() {
  const phase = useGameStore((s) => s.phase)

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#1a1a2e]">
      {/* 3D canvas fills the viewport */}
      <Scene />

      {/* HTML overlays */}
      {phase !== 'start' && <MathProblem />}
      {phase !== 'start' && phase !== 'gameover' && <TimerBar />}
      <StartScreen />
      <GameOver />
    </div>
  )
}
