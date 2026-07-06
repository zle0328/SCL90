import { FACTORS, THRESHOLDS, type Factor } from '@/data/factors'
import { QUESTIONS } from '@/data/questions'

/** 单因子得分结果 */
export interface FactorResult {
  key: string
  name: string
  desc: string
  /** 该因子项目数 */
  itemCount: number
  /** 该因子总分 */
  total: number
  /** 该因子均分(总分/项目数),保留两位 */
  average: number
  /** 是否筛查阳性(均分 ≥ 2) */
  positive: boolean
  /** 严重程度分级 */
  level: SeverityLevel
}

export type SeverityLevel = 'normal' | 'mild' | 'moderate' | 'severe'

/** 整体测评结果 */
export interface Scl90Result {
  /** 总分(90 题之和) */
  totalScore: number
  /** 总均分 GSI = 总分/90 */
  gsi: number
  /** 阳性项目数(得分 ≥ 2 的题数) */
  positiveCount: number
  /** 阴性项目数(得分 = 1 的题数) */
  negativeCount: number
  /** 阳性症状均分 PSDI = 阳性项目总分 / 阳性项目数 */
  psdi: number
  /** 是否总体筛查阳性 */
  overallPositive: boolean
  /** 各因子结果 */
  factors: FactorResult[]
}

/** 均分 → 严重程度分级(依据因子均分常用划分) */
export function severityOf(average: number): SeverityLevel {
  if (average < 2) return 'normal'
  if (average < 3) return 'mild'
  if (average < 4) return 'moderate'
  return 'severe'
}

export const SEVERITY_TEXT: Record<SeverityLevel, string> = {
  normal: '正常',
  mild: '轻度',
  moderate: '中度',
  severe: '重度'
}

export const SEVERITY_COLOR: Record<SeverityLevel, string> = {
  normal: '#21b57a',
  mild: '#f5a623',
  moderate: '#f5824a',
  severe: '#e8534e'
}

/**
 * 计算 SCL-90 结果
 * @param answers 长度 90 的数组,answers[i] 为第 (i+1) 题的得分(1-5)。未答为 0。
 */
export function calcResult(answers: number[]): Scl90Result {
  // 总分与阳性/阴性项目统计
  let totalScore = 0
  let positiveCount = 0
  let negativeCount = 0
  let positiveSum = 0

  for (let i = 0; i < QUESTIONS.length; i++) {
    const score = answers[i] || 0
    totalScore += score
    if (score >= THRESHOLDS.positiveItem) {
      positiveCount++
      positiveSum += score
    } else if (score === 1) {
      negativeCount++
    }
  }

  const gsi = round2(totalScore / QUESTIONS.length)
  const psdi = positiveCount > 0 ? round2(positiveSum / positiveCount) : 0

  // 各因子
  const factors: FactorResult[] = FACTORS.map((f: Factor) => {
    const total = f.items.reduce((sum, id) => sum + (answers[id - 1] || 0), 0)
    const average = round2(total / f.items.length)
    const level = severityOf(average)
    return {
      key: f.key,
      name: f.name,
      desc: f.desc,
      itemCount: f.items.length,
      total,
      average,
      positive: average >= THRESHOLDS.factorScore,
      level
    }
  })

  const overallPositive =
    totalScore > THRESHOLDS.totalScore ||
    positiveCount > THRESHOLDS.positiveCount ||
    factors.some((f) => f.positive)

  return {
    totalScore,
    gsi,
    positiveCount,
    negativeCount,
    psdi,
    overallPositive,
    factors
  }
}

/** 生成整体结论文本 */
export function overallConclusion(result: Scl90Result): string {
  if (!result.overallPositive) {
    return '本次测评各项指标均在正常范围内,未见明显心理症状。请继续保持良好的生活与情绪状态。'
  }
  const posFactors = result.factors
    .filter((f) => f.positive && f.key !== 'other')
    .sort((a, b) => b.average - a.average)
    .map((f) => f.name)

  const parts: string[] = []
  parts.push('本次测评结果提示存在一定的心理症状,建议结合自身情况参考。')
  if (result.totalScore > THRESHOLDS.totalScore) {
    parts.push(`总分 ${result.totalScore} 分(超过 ${THRESHOLDS.totalScore} 分参考线)。`)
  }
  if (posFactors.length) {
    parts.push(`其中「${posFactors.join('、')}」等因子得分偏高,较为突出。`)
  }
  parts.push('如上述困扰持续存在或影响日常生活,建议向专业心理咨询师或精神科医生进一步咨询。')
  return parts.join('')
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
