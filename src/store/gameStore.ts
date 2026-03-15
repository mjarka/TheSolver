import { create } from 'zustand'
import { generateQuestion, type Question } from '../utils/mathGenerator'

export type Phase = 'start' | 'playing' | 'correct' | 'advancing' | 'wrong' | 'gameover'

export const TILE_X = [-2.5, 0, 2.5] as const

interface GameState {
  phase: Phase
  question: Question
  options: number[]
  bufferedQuestion: Question   // pre-generated next question, shown on buffer row
  bufferedOptions: number[]
  score: number
  lives: number
  timeLeft: number
  selectedTileIndex: number
  currentColumnIndex: number

  startGame: () => void
  tick: (delta: number) => void
  answer: (value: number, tileIndex: number) => void
  setAdvancing: () => void
  /** Called by RowManager after correct scroll: shifts buffer → active, pre-generates new buffer */
  advanceQuestion: () => void
  /** Called by CharacterFallback after wrong fall: new question, buffer untouched */
  nextQuestion: () => void
  restartGame: () => void
}

const TIMER_MS = 5000
const INITIAL_LIVES = 3

function newRound() {
  const q = generateQuestion()
  const b = generateQuestion()
  return {
    question: q,
    options: q.options,
    bufferedQuestion: b,
    bufferedOptions: b.options,
    timeLeft: TIMER_MS,
    selectedTileIndex: -1,
  }
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'start',
  ...newRound(),
  score: 0,
  lives: INITIAL_LIVES,
  currentColumnIndex: 1,

  startGame: () =>
    set({ phase: 'playing', score: 0, lives: INITIAL_LIVES, currentColumnIndex: 1, ...newRound() }),

  tick: (delta) => {
    const { phase, timeLeft } = get()
    if (phase !== 'playing') return
    const next = timeLeft - delta
    if (next <= 0) {
      set({ timeLeft: 0, phase: 'wrong', selectedTileIndex: -1 })
    } else {
      set({ timeLeft: next })
    }
  },

  answer: (value, tileIndex) => {
    const { phase, question, score, lives } = get()
    if (phase !== 'playing') return
    const correct = value === question.answer
    if (correct) {
      set({ phase: 'correct', score: score + 1, selectedTileIndex: tileIndex })
    } else {
      set({ phase: 'wrong', lives: lives - 1, selectedTileIndex: tileIndex })
    }
  },

  setAdvancing: () =>
    set((s) => ({
      phase: 'advancing',
      currentColumnIndex: s.selectedTileIndex >= 0 ? s.selectedTileIndex : s.currentColumnIndex,
    })),

  advanceQuestion: () => {
    const { lives, bufferedQuestion } = get()
    if (lives <= 0) { set({ phase: 'gameover' }); return }
    const next = generateQuestion()
    set({
      phase: 'playing',
      question: bufferedQuestion,
      options: bufferedQuestion.options,
      bufferedQuestion: next,
      bufferedOptions: next.options,
      timeLeft: TIMER_MS,
      selectedTileIndex: -1,
    })
  },

  nextQuestion: () => {
    const { lives } = get()
    if (lives <= 0) { set({ phase: 'gameover' }); return }
    const q = generateQuestion()
    set({ phase: 'playing', question: q, options: q.options, timeLeft: TIMER_MS, selectedTileIndex: -1 })
  },

  restartGame: () =>
    set({ phase: 'playing', score: 0, lives: INITIAL_LIVES, currentColumnIndex: 1, ...newRound() }),
}))
