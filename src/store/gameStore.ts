import { create } from "zustand";
import { generateQuestion, type Question, type Difficulty } from "../utils/mathGenerator";

export type Phase =
  | "start"
  | "playing"
  | "correct"
  | "advancing"
  | "wrong"
  | "gameover";

export const TILE_X = [-2, 0, 2] as const;

interface GameState {
  sceneReady: boolean;
  setSceneReady: () => void;
  phase: Phase;
  difficulty: Difficulty;
  question: Question;
  options: number[];
  bufferedQuestion: Question; // pre-generated next question, shown on buffer row
  bufferedOptions: number[];
  score: number;
  lives: number;
  timeLeft: number;
  selectedTileIndex: number;
  currentColumnIndex: number;

  tileFlashAt: number;    // increments each time tiles should flash (after character lands)
  wrongLandAt: number;    // increments when character fully lands on wrong tile (t>=1)
  standingFallAt: number; // increments on timeout — tile under character sinks
  landWrongTile: () => void;
  triggerStandingFall: () => void;
  selectDifficulty: (difficulty: Difficulty) => void;
  startGame: () => void;
  tick: (delta: number) => void;
  answer: (value: number, tileIndex: number) => void;
  flashTiles: () => void;
  setAdvancing: () => void;
  setAdvancingWrong: () => void;
  /** Called by RowManager after correct scroll: shifts buffer → active, pre-generates new buffer */
  advanceQuestion: () => void;
  /** Called by CharacterFallback after wrong fall: new question, buffer untouched */
  nextQuestion: () => void;
  restartGame: () => void;
}

const TIMER_MS = 5000;
export const INITIAL_LIVES = 5;

function newRound(difficulty: Difficulty) {
  const q = generateQuestion(difficulty);
  const b = generateQuestion(difficulty);
  return {
    question: q,
    options: q.options,
    bufferedQuestion: b,
    bufferedOptions: b.options,
    timeLeft: TIMER_MS,
    selectedTileIndex: -1,
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  sceneReady: false,
  setSceneReady: () => set({ sceneReady: true }),
  phase: "start",
  difficulty: "easy",
  ...newRound("easy"),
  score: 0,
  lives: INITIAL_LIVES,
  currentColumnIndex: 1,
  tileFlashAt: 0,
  wrongLandAt: 0,
  standingFallAt: 0,
  landWrongTile: () => set((s) => ({ wrongLandAt: s.wrongLandAt + 1 })),
  triggerStandingFall: () => set((s) => ({ standingFallAt: s.standingFallAt + 1 })),

  selectDifficulty: (difficulty) => set({ difficulty }),

  startGame: () => {
    const { difficulty } = get();
    set({
      phase: "playing",
      score: 0,
      lives: INITIAL_LIVES,
      currentColumnIndex: 1,
      ...newRound(difficulty),
    });
  },

  tick: (delta) => {
    const { phase, timeLeft } = get();
    if (phase !== "playing") return;
    const next = timeLeft - delta;
    if (next <= 0) {
      set((s) => ({ timeLeft: 0, phase: "wrong", selectedTileIndex: -1, lives: s.lives - 1 }));
    } else {
      set({ timeLeft: next });
    }
  },

  answer: (value, tileIndex) => {
    const { phase, question, score, lives } = get();
    if (phase !== "playing") return;
    const correct = value === question.answer;
    if (correct) {
      set({ phase: "correct", score: score + 1, selectedTileIndex: tileIndex });
    } else {
      set({ phase: "wrong", lives: lives - 1, selectedTileIndex: tileIndex });
    }
  },

  flashTiles: () => set((s) => ({ tileFlashAt: s.tileFlashAt + 1 })),

  setAdvancing: () =>
    set((s) => ({
      phase: "advancing",
      currentColumnIndex:
        s.selectedTileIndex >= 0 ? s.selectedTileIndex : s.currentColumnIndex,
    })),

  setAdvancingWrong: () =>
    set((s) => ({
      phase: "advancing",
      currentColumnIndex:
        s.selectedTileIndex >= 0 ? s.selectedTileIndex : s.currentColumnIndex,
    })),

  advanceQuestion: () => {
    const { lives, bufferedQuestion, difficulty } = get();
    if (lives <= 0) {
      set({ phase: "gameover" });
      return;
    }
    const next = generateQuestion(difficulty);
    set({
      phase: "playing",
      question: bufferedQuestion,
      options: bufferedQuestion.options,
      bufferedQuestion: next,
      bufferedOptions: next.options,
      timeLeft: TIMER_MS,
      selectedTileIndex: -1,
    });
  },

  nextQuestion: () => {
    const { lives, difficulty } = get();
    if (lives <= 0) {
      set({ phase: "gameover" });
      return;
    }
    const q = generateQuestion(difficulty);
    set({
      phase: "playing",
      question: q,
      options: q.options,
      timeLeft: TIMER_MS,
      selectedTileIndex: -1,
    });
  },

  restartGame: () => set({ phase: "start" }),
}));
