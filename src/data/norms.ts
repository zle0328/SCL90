/**
 * SCL-90 中国常模参考值与严重程度分级边界。
 * 数据来源:中国正常人 SCL-90 常模(金华等,1986,n=1388)。
 */

/** 严重程度分级(按因子均分或总均分划分) */
export type SeverityLevel = 'normal' | 'mild' | 'moderate' | 'severe'

/**
 * 严重程度上界:
 * - 均分 < MILD  → normal(正常)
 * - MILD ≤ 均分 < MODERATE → mild(轻度)
 * - MODERATE ≤ 均分 < SEVERE → moderate(中度)
 * - 均分 ≥ SEVERE → severe(重度)
 */
export const SEVERITY_BOUNDARIES = {
  /** 阳性阈值,同时是"轻度"起点 */
  mild: 2,
  moderate: 3,
  severe: 4
} as const

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

/** 均分 → 严重程度分级 */
export function severityOf(average: number): SeverityLevel {
  if (average < SEVERITY_BOUNDARIES.mild) return 'normal'
  if (average < SEVERITY_BOUNDARIES.moderate) return 'mild'
  if (average < SEVERITY_BOUNDARIES.severe) return 'moderate'
  return 'severe'
}

/** 整体指标常模(均分±标准差,来自 1986 中国常模) */
export const OVERALL_NORMS = {
  totalScore: '129.96±38.76',
  gsi: '1.44±0.43',
  negativeCount: '65.08±18.33',
  positiveCount: '24.92±18.41'
} as const

/** 各因子均分常模(按因子 key 索引) */
export const FACTOR_NORMS: Record<string, string> = {
  somatization: '1.37±0.48',
  obsessive: '1.62±0.58',
  interpersonal: '1.65±0.51',
  depression: '1.50±0.59',
  anxiety: '1.39±0.43',
  hostility: '1.48±0.56',
  phobic: '1.23±0.41',
  paranoid: '1.43±0.57',
  psychoticism: '1.29±0.42',
  other: '-'
}
