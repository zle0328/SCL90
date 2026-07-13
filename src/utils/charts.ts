import type { FactorResult } from '@/utils/score'
import { displayScore, escapeHtml, factorDisplayName, factorReportName } from '@/utils/report'

/** 因子雷达图(H5 页面展示 + PDF 导出) */
export function buildRadarSvg(factors: FactorResult[]): string {
  const width = 680
  const height = 520
  const centerX = width / 2
  const centerY = 248
  const radius = 150
  const pointCount = factors.length
  const angleStep = (Math.PI * 2) / pointCount
  const startAngle = -Math.PI / 2

  const pointAt = (index: number, valueRadius: number) => {
    const angle = startAngle + index * angleStep
    return {
      x: centerX + Math.cos(angle) * valueRadius,
      y: centerY + Math.sin(angle) * valueRadius
    }
  }
  const polygonPoints = (valueRadius: number) =>
    factors
      .map((_, index) => {
        const point = pointAt(index, valueRadius)
        return `${point.x.toFixed(1)},${point.y.toFixed(1)}`
      })
      .join(' ')
  const grid = [1, 2, 3, 4, 5]
    .map((level) => {
      const levelRadius = (radius / 5) * level
      return `
        <polygon points="${polygonPoints(levelRadius)}" fill="${level % 2 === 0 ? '#f8faff' : '#ffffff'}" stroke="#d9deea" stroke-width="1" />
      `
    })
    .join('')
  const axes = factors
    .map((_, index) => {
      const point = pointAt(index, radius)
      return `<line x1="${centerX}" y1="${centerY}" x2="${point.x.toFixed(1)}" y2="${point.y.toFixed(1)}" stroke="#d9deea" stroke-width="1" />`
    })
    .join('')
  const dataPoints = factors
    .map((factor, index) => {
      const point = pointAt(index, (radius / 5) * Math.min(5, Math.max(0, factor.average)))
      return `${point.x.toFixed(1)},${point.y.toFixed(1)}`
    })
    .join(' ')
  const dots = factors
    .map((factor, index) => {
      const point = pointAt(index, (radius / 5) * Math.min(5, Math.max(0, factor.average)))
      return `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4" fill="#4a63e7" />`
    })
    .join('')
  const labels = factors
    .map((factor, index) => {
      const point = pointAt(index, radius + 34)
      const name = escapeHtml(factorDisplayName(factor))
      const value = displayScore(factor.average)
      const anchor =
        Math.abs(point.x - centerX) < 12 ? 'middle' : point.x > centerX ? 'start' : 'end'
      return `
        <text x="${point.x.toFixed(1)}" y="${point.y.toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle" fill="#606a7b" font-size="20">
          <tspan x="${point.x.toFixed(1)}">${name}</tspan>
          <tspan x="${point.x.toFixed(1)}" dy="24" fill="#9aa3b2" font-size="17">${value}</tspan>
        </text>
      `
    })
    .join('')

  return `
    <svg style="display:block;width:100%;height:100%;" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${width}" height="${height}" fill="#fff" />
      ${grid}
      ${axes}
      <polygon points="${dataPoints}" fill="rgba(74,99,231,0.18)" stroke="#4a63e7" stroke-width="4" />
      ${dots}
      ${labels}
      <text x="${centerX}" y="${centerY + radius + 82}" text-anchor="middle" fill="#9aa3b2" font-size="18">中心 0 分 · 外圈 5 分</text>
    </svg>
  `
}

/** 临床结果单折线图(仅用于 PDF) */
export function buildLineChartSvg(factors: FactorResult[]): string {
  const width = 690
  const height = 250
  const left = 58
  const top = 10
  const right = 18
  const bottom = 64
  const chartWidth = width - left - right
  const chartHeight = height - top - bottom
  const xStep = chartWidth / (factors.length - 1)
  const points = factors.map((f, index) => {
    const x = left + index * xStep
    const y = top + chartHeight - (Math.min(5, Math.max(0, f.average)) / 5) * chartHeight
    return { x, y, factor: f }
  })
  const linePoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const horizontalLines = Array.from({ length: 11 }, (_, index) => {
    const value = 5 - index * 0.5
    const y = top + index * (chartHeight / 10)
    const isMajor = index % 2 === 0
    return `
      <line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" stroke="${isMajor ? '#333' : '#9a9a9a'}" stroke-width="${isMajor ? 1 : 0.7}" />
      <text x="${left - 8}" y="${y + 4}" text-anchor="end" font-size="12">${value.toFixed(2)}</text>
    `
  }).join('')
  const verticalLines = points
    .map(
      (p) =>
        `<line x1="${p.x}" y1="${top}" x2="${p.x}" y2="${top + chartHeight}" stroke="#333" stroke-width="1" />`
    )
    .join('')
  const xLabels = points
    .map((p) => {
      const labelParts = splitChartLabel(factorReportName(p.factor))
      const labelText = labelParts
        .map(
          (label, index) =>
            `<tspan x="${p.x}" dy="${index === 0 ? 0 : 14}">${escapeHtml(label)}</tspan>`
        )
        .join('')
      return `
        <text x="${p.x}" y="${top + chartHeight + 20}" text-anchor="middle" font-size="12">
          ${labelText}
          <tspan x="${p.x}" dy="14">${displayScore(p.factor.average)}</tspan>
        </text>
      `
    })
    .join('')
  const dots = points.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="3.2" fill="#222" />`).join('')

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${left}" y="${top}" width="${chartWidth}" height="${chartHeight}" fill="#fff" stroke="#333" stroke-width="1.4" />
      ${horizontalLines}
      ${verticalLines}
      <polyline points="${linePoints}" fill="none" stroke="#222" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round" />
      ${dots}
      ${xLabels}
    </svg>
  `
}

function splitChartLabel(name: string): string[] {
  if (name === '人际关系敏感') return ['人际关系', '敏感']
  if (name.length > 4) return [name.slice(0, 4), name.slice(4)]
  return [name]
}
