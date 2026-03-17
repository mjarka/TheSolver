import React, { useEffect, useState } from 'react'
import { useProgress } from '@react-three/drei'
import { useGameStore } from '../store/gameStore'
import { asset } from '../utils/assetUrl'

export function LoadingScreen() {
  const { progress, active } = useProgress()
  const sceneReady = useGameStore((s) => s.sceneReady)
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    if (!active && progress >= 100 && sceneReady) {
      setFading(true)
      const id = setTimeout(() => setVisible(false), 600)
      return () => clearTimeout(id)
    }
  }, [active, progress, sceneReady])

  if (!visible) return null

  return (
    <div className={`loading-screen${fading ? ' loading-screen--out' : ''}`}>
      <img src={asset("/logotype.png")} className="start-logo" alt="The Solver" />
      <div className="loading-bar-wrap">
        <div className="loading-bar-fill" style={{ '--pct': `${progress}%` } as React.CSSProperties} />
      </div>
      <div className="loading-pct">{Math.round(progress)}%</div>
    </div>
  )
}
