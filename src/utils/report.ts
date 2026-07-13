import type { FactorResult } from '@/utils/score'

/** 页面展示用因子名 */
export const FACTOR_DISPLAY_NAME: Record<string, string> = {
  somatization: '躯体化',
  obsessive: '强迫症状',
  interpersonal: '人际关系敏感',
  depression: '抑郁症状',
  anxiety: '焦虑症状',
  hostility: '敌对症状',
  phobic: '恐怖症状',
  paranoid: '偏执症状',
  psychoticism: '精神病性',
  other: '睡眠饮食'
}

/** PDF 结果单用因子名(第 10 项在临床单里习惯记为"其他项目") */
export const FACTOR_REPORT_NAME: Record<string, string> = {
  ...FACTOR_DISPLAY_NAME,
  other: '其他项目'
}

export function factorDisplayName(factor: FactorResult): string {
  return FACTOR_DISPLAY_NAME[factor.key] || factor.name
}

export function factorReportName(factor: FactorResult): string {
  return FACTOR_REPORT_NAME[factor.key] || factor.name
}

export function displayScore(score: number): string {
  return score.toFixed(2)
}

/** 因子均分 1-5 → 进度条 0-100% */
export function barPercent(average: number): number {
  return Math.min(100, Math.max(0, ((average - 1) / 4) * 100))
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

export function formatDisplayDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
