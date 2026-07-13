import { reactive, watch } from 'vue'
import { QUESTIONS, type AnswerValue } from '@/data/questions'

interface QuizState {
  /** 每题得分,索引 0-89 对应题号 1-90,0 表示未作答 */
  answers: AnswerValue[]
  /** 答题开始时间戳 */
  startedAt: number
}

const STORAGE_KEY = 'scl90:quiz:v1'

function emptyAnswers(): AnswerValue[] {
  return new Array(QUESTIONS.length).fill(0) as AnswerValue[]
}

function isAnswerValue(n: number): n is AnswerValue {
  return n === 0 || n === 1 || n === 2 || n === 3 || n === 4 || n === 5
}

function hasWebStorage(): boolean {
  return typeof window !== 'undefined' && !!window.sessionStorage
}

function loadPersisted(): QuizState | null {
  if (!hasWebStorage()) return null
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<QuizState>
    if (!Array.isArray(parsed.answers) || parsed.answers.length !== QUESTIONS.length) return null
    const answers: AnswerValue[] = parsed.answers.map((v) => {
      const n = Number(v)
      return isAnswerValue(n) ? n : 0
    })
    return {
      answers,
      startedAt: typeof parsed.startedAt === 'number' ? parsed.startedAt : 0
    }
  } catch {
    return null
  }
}

function persist(state: QuizState) {
  if (!hasWebStorage()) return
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ answers: state.answers, startedAt: state.startedAt })
    )
  } catch {
    // 忽略配额或隐私模式异常
  }
}

function clearPersisted() {
  if (!hasWebStorage()) return
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // 忽略
  }
}

const persisted = loadPersisted()

export const quizStore = reactive<QuizState>({
  answers: persisted?.answers ?? emptyAnswers(),
  startedAt: persisted?.startedAt ?? 0
})

watch(
  () => [quizStore.answers.slice(), quizStore.startedAt] as const,
  () => persist(quizStore),
  { deep: false }
)

/** 重置作答(重新开始测试时调用) */
export function resetQuiz() {
  quizStore.answers = emptyAnswers()
  quizStore.startedAt = Date.now()
  clearPersisted()
}

/** 已作答数量 */
export function answeredCount(): number {
  let n = 0
  for (const v of quizStore.answers) if (v > 0) n++
  return n
}

/** 是否存在进行中的作答(供首页判断"继续测评") */
export function hasQuizProgress(): boolean {
  const count = answeredCount()
  return count > 0 && count < QUESTIONS.length
}

/** 第一个未作答题目的索引,若全部已答则返回 0 */
export function firstUnansweredIndex(): number {
  const idx = quizStore.answers.findIndex((v) => v === 0)
  return idx === -1 ? 0 : idx
}
