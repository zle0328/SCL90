import { reactive } from 'vue'
import { QUESTIONS } from '@/data/questions'

interface QuizState {
  /** 每题得分,索引 0-89 对应题号 1-90,0 表示未作答 */
  answers: number[]
  /** 答题开始时间戳 */
  startedAt: number
}

function emptyAnswers(): number[] {
  return new Array(QUESTIONS.length).fill(0)
}

export const quizStore = reactive<QuizState>({
  answers: emptyAnswers(),
  startedAt: 0
})

/** 重置作答(重新开始测试时调用) */
export function resetQuiz() {
  quizStore.answers = emptyAnswers()
  quizStore.startedAt = Date.now()
}

/** 已作答数量 */
export function answeredCount(): number {
  return quizStore.answers.filter((v) => v > 0).length
}
