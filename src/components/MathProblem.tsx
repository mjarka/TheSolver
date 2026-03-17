import { useRef, useEffect } from "react";
import { useGameStore, INITIAL_LIVES } from "../store/gameStore";

export function MathProblem() {
  const labelRef = useRef<HTMLDivElement>(null);
  const question = useGameStore((s) => s.question);
  const score = useGameStore((s) => s.score);
  const lives = useGameStore((s) => s.lives);
  const phase = useGameStore((s) => s.phase);

  useEffect(() => {
    if (!labelRef.current) return;
    labelRef.current.style.opacity = phase === "playing" ? "1" : "0.4";
  }, [phase]);

  return (
    <>
      <div className="lives-hud">
        {Array.from({ length: INITIAL_LIVES }).map((_, i) => (
          <svg key={i} viewBox="0 0 1147.43 878.85" className="heart-icon" aria-hidden="true">
            <polygon
              points="1147.43 305.13 878.84 573.72 573.71 878.85 268.59 573.72 0 305.13 305.12 0 573.72 268.6 842.31 0 1147.43 305.13"
              fill={i < lives ? 'white' : 'none'}
              stroke="white"
              strokeWidth="70"
            />
          </svg>
        ))}
      </div>
      <div className="score-hud">
        <span className="score-label">score</span>
        {score}
      </div>
      <div className="math-hud">
        <div ref={labelRef} className="math-label">
          {question.label}
        </div>
      </div>
    </>
  );
}
