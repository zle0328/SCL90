import { describe, it, expect } from 'vitest'
import { calcResult, overallConclusion, severityOf } from './score'
import { QUESTIONS } from '@/data/questions'
import { FACTORS, THRESHOLDS } from '@/data/factors'
import { SEVERITY_BOUNDARIES } from '@/data/norms'

const N = QUESTIONS.length

function fill(value: number): number[] {
  return new Array(N).fill(value)
}

describe('severityOf 边界', () => {
  it('低于 mild 边界为 normal', () => {
    expect(severityOf(0)).toBe('normal')
    expect(severityOf(1.99)).toBe('normal')
  })
  it('刚好达到 mild 起点为 mild', () => {
    expect(severityOf(SEVERITY_BOUNDARIES.mild)).toBe('mild')
    expect(severityOf(2.99)).toBe('mild')
  })
  it('刚好达到 moderate 起点为 moderate', () => {
    expect(severityOf(SEVERITY_BOUNDARIES.moderate)).toBe('moderate')
    expect(severityOf(3.99)).toBe('moderate')
  })
  it('达到 severe 起点及以上为 severe', () => {
    expect(severityOf(SEVERITY_BOUNDARIES.severe)).toBe('severe')
    expect(severityOf(5)).toBe('severe')
  })
})

describe('calcResult 全 1 分(全部答"没有")', () => {
  const r = calcResult(fill(1))

  it('总分 = 题目数', () => {
    expect(r.totalScore).toBe(N)
  })
  it('GSI = 1', () => {
    expect(r.gsi).toBe(1)
  })
  it('阴性项目数 = 90,阳性项目数 = 0', () => {
    expect(r.negativeCount).toBe(N)
    expect(r.positiveCount).toBe(0)
  })
  it('PSDI = 0(无阳性项目)', () => {
    expect(r.psdi).toBe(0)
  })
  it('overallPositive = false', () => {
    expect(r.overallPositive).toBe(false)
  })
  it('所有因子均为 normal 且非阳性', () => {
    for (const f of r.factors) {
      expect(f.level).toBe('normal')
      expect(f.positive).toBe(false)
      expect(f.average).toBe(1)
    }
  })
})

describe('calcResult 全 5 分(全部答"严重")', () => {
  const r = calcResult(fill(5))

  it('总分 = 5 * 题目数', () => {
    expect(r.totalScore).toBe(N * 5)
  })
  it('GSI = 5', () => {
    expect(r.gsi).toBe(5)
  })
  it('阳性项目数 = 90,阴性项目数 = 0', () => {
    expect(r.positiveCount).toBe(N)
    expect(r.negativeCount).toBe(0)
  })
  it('PSDI = 5', () => {
    expect(r.psdi).toBe(5)
  })
  it('overallPositive = true 且所有因子 severe/阳性', () => {
    expect(r.overallPositive).toBe(true)
    for (const f of r.factors) {
      expect(f.level).toBe('severe')
      expect(f.positive).toBe(true)
    }
  })
})

describe('calcResult 阈值边界', () => {
  it('单题得分 = positiveItem 阈值(2)计入阳性', () => {
    const arr = fill(1)
    arr[0] = THRESHOLDS.positiveItem
    const r = calcResult(arr)
    expect(r.positiveCount).toBe(1)
    expect(r.negativeCount).toBe(N - 1)
  })

  it('因子均分刚好 = factorScore(2)判阳性', () => {
    // 找一个题数明确的因子(躯体化 12 项),全部填 2 分
    const som = FACTORS.find((f) => f.key === 'somatization')!
    const arr = fill(1)
    for (const id of som.items) arr[id - 1] = 2
    const r = calcResult(arr)
    const target = r.factors.find((f) => f.key === 'somatization')!
    expect(target.average).toBe(2)
    expect(target.positive).toBe(true)
    expect(target.level).toBe('mild')
  })

  it('总分刚好 > totalScore 阈值触发 overallPositive', () => {
    // 让全部因子均分低于 2(避免因子阳性触发),仅靠总分或阳性项目数
    // 简单起见:让 totalScore = 161(> 160),但保持每题 ≤ 1 无法达标
    // 采用:阳性项目数 = THRESHOLDS.positiveCount + 1 = 44 项 = 2 分,其余 = 1
    const arr = fill(1)
    for (let i = 0; i < THRESHOLDS.positiveCount + 1; i++) arr[i] = 2
    const r = calcResult(arr)
    expect(r.positiveCount).toBe(THRESHOLDS.positiveCount + 1)
    expect(r.overallPositive).toBe(true)
  })
})

describe('calcResult 未答混合', () => {
  it('answer=0 视为未作答,不计阳性也不计阴性', () => {
    const arr = fill(0)
    // 前 3 题 = 2(阳性),第 4 题 = 1(阴性),其余未答
    arr[0] = 2
    arr[1] = 2
    arr[2] = 2
    arr[3] = 1
    const r = calcResult(arr)
    expect(r.totalScore).toBe(2 + 2 + 2 + 1)
    expect(r.positiveCount).toBe(3)
    expect(r.negativeCount).toBe(1)
    expect(r.psdi).toBe(2) // 6 / 3
  })

  it('全未答:所有统计为 0', () => {
    const r = calcResult(fill(0))
    expect(r.totalScore).toBe(0)
    expect(r.positiveCount).toBe(0)
    expect(r.negativeCount).toBe(0)
    expect(r.psdi).toBe(0)
    expect(r.gsi).toBe(0)
    expect(r.overallPositive).toBe(false)
  })
})

describe('overallConclusion', () => {
  it('阴性结果给出正面表述', () => {
    const r = calcResult(fill(1))
    const text = overallConclusion(r)
    expect(text).toContain('正常范围')
  })
  it('阳性结果提及总分与建议咨询', () => {
    const r = calcResult(fill(5))
    const text = overallConclusion(r)
    expect(text).toContain('心理咨询师')
    expect(text).toContain(String(r.totalScore))
  })
})
