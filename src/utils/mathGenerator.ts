export type Operation = '+' | '-' | '×' | '÷'
export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Question {
  a: number
  b: number
  operation: Operation
  answer: number
  label: string   // e.g. "6 × 6"
  options: number[] // 3 shuffled options, one is answer
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function wrongOptions(correct: number, count = 2, maxOffset = 5): number[] {
  const wrongs = new Set<number>()
  let attempts = 0
  while (wrongs.size < count && attempts < 100) {
    attempts++
    const offset = rand(1, maxOffset) * (Math.random() < 0.5 ? 1 : -1)
    const candidate = correct + offset
    if (candidate > 0 && candidate !== correct) {
      wrongs.add(candidate)
    }
  }
  return Array.from(wrongs)
}

function buildOptions(answer: number, maxOffset = 5): number[] {
  const wrongs = wrongOptions(answer, 2, maxOffset)
  return shuffle([answer, ...wrongs])
}

export function generateQuestion(difficulty: Difficulty = 'easy'): Question {
  let ops: Operation[]
  let a: number, b: number, answer: number
  let maxOffset: number

  if (difficulty === 'easy') {
    ops = ['+', '-']
    maxOffset = 5
  } else if (difficulty === 'medium') {
    ops = ['×', '÷']
    maxOffset = 5
  } else {
    ops = ['+', '-', '×', '÷']
    maxOffset = 10
  }

  const op = ops[rand(0, ops.length - 1)]

  switch (op) {
    case '+': {
      const max = difficulty === 'hard' ? 50 : 10
      a = rand(1, max)
      b = rand(1, max)
      answer = a + b
      break
    }
    case '-': {
      const max = difficulty === 'hard' ? 50 : 10
      a = rand(2, max)
      b = rand(1, a)
      answer = a - b
      break
    }
    case '×': {
      const max = difficulty === 'hard' ? 12 : 9
      a = rand(2, max)
      b = rand(2, max)
      answer = a * b
      break
    }
    case '÷': {
      const max = difficulty === 'hard' ? 12 : 9
      b = rand(2, max)
      answer = rand(2, max)
      a = b * answer
      break
    }
  }

  return {
    a,
    b,
    operation: op,
    answer,
    label: `${a} ${op} ${b}`,
    options: buildOptions(answer, maxOffset),
  }
}
