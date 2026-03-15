export type Operation = '+' | '-' | '×' | '÷'

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

function wrongOptions(correct: number, count = 2): number[] {
  const wrongs = new Set<number>()
  let attempts = 0
  while (wrongs.size < count && attempts < 100) {
    attempts++
    // offset by ±1..5, avoid 0 and negatives
    const offset = rand(1, 5) * (Math.random() < 0.5 ? 1 : -1)
    const candidate = correct + offset
    if (candidate > 0 && candidate !== correct) {
      wrongs.add(candidate)
    }
  }
  return Array.from(wrongs)
}

function buildOptions(answer: number): number[] {
  const wrongs = wrongOptions(answer)
  return shuffle([answer, ...wrongs])
}

export function generateQuestion(): Question {
  const ops: Operation[] = ['+', '-', '×', '÷']
  const op = ops[rand(0, ops.length - 1)]

  let a: number, b: number, answer: number

  switch (op) {
    case '+': {
      a = rand(1, 20)
      b = rand(1, 20)
      answer = a + b
      break
    }
    case '-': {
      a = rand(2, 20)
      b = rand(1, a)
      answer = a - b
      break
    }
    case '×': {
      a = rand(2, 9)
      b = rand(2, 9)
      answer = a * b
      break
    }
    case '÷': {
      // generate as multiplication to guarantee integer result
      b = rand(2, 9)
      answer = rand(2, 9)
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
    options: buildOptions(answer),
  }
}
