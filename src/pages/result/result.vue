<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import * as echarts from 'echarts'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { quizStore, resetQuiz } from '@/store/quiz'
import {
  calcResult,
  overallConclusion,
  SEVERITY_TEXT,
  SEVERITY_COLOR,
  type FactorResult,
  type Scl90Result
} from '@/utils/score'

const result = ref<Scl90Result | null>(null)
const conclusion = ref('')
const exporting = ref(false)
let radarChart: echarts.ECharts | null = null

const FACTOR_DISPLAY_NAME: Record<string, string> = {
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

const FACTOR_REPORT_NAME: Record<string, string> = {
  ...FACTOR_DISPLAY_NAME,
  other: '其他项目'
}

const FACTOR_REFERENCE: Record<string, string> = {
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

onLoad(() => {
  const r = calcResult(quizStore.answers)
  result.value = r
  conclusion.value = overallConclusion(r)

  nextTick(() => {
    renderRadar()
    window.addEventListener('resize', resizeRadar)
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeRadar)
  radarChart?.dispose()
  radarChart = null
})

function barPercent(average: number): number {
  // 因子均分范围 1-5,映射为 0-100%
  return Math.min(100, Math.max(0, ((average - 1) / 4) * 100))
}

function renderRadar() {
  const el = document.getElementById('factor-radar')
  if (!el || !result.value) return

  if (!radarChart) {
    radarChart = echarts.init(el)
  }

  radarChart.setOption({
    color: ['#4a63e7'],
    tooltip: {
      trigger: 'item'
    },
    radar: {
      center: ['50%', '52%'],
      radius: '62%',
      splitNumber: 4,
      indicator: result.value.factors.map((f) => ({
        name: factorDisplayName(f),
        max: 5
      })),
      axisName: {
        color: '#606a7b',
        fontSize: 12
      },
      axisLine: {
        lineStyle: {
          color: '#d9deea'
        }
      },
      splitLine: {
        lineStyle: {
          color: '#d9deea'
        }
      },
      splitArea: {
        areaStyle: {
          color: ['#ffffff', '#f6f8fd']
        }
      }
    },
    series: [
      {
        name: '因子均分',
        type: 'radar',
        symbol: 'circle',
        symbolSize: 5,
        data: [
          {
            value: result.value.factors.map((f) => f.average),
            name: '因子均分',
            areaStyle: {
              color: 'rgba(74, 99, 231, 0.18)'
            },
            lineStyle: {
              width: 2
            }
          }
        ]
      }
    ]
  })
}

function resizeRadar() {
  radarChart?.resize()
}

async function exportPdf() {
  if (exporting.value) return

  if (!result.value) {
    uni.showToast({
      title: '报告内容未加载',
      icon: 'none'
    })
    return
  }

  exporting.value = true
  const reportEl = buildClinicalReportElement(result.value, conclusion.value)
  document.body.appendChild(reportEl)

  try {
    await nextTick()

    const canvas = await html2canvas(reportEl, {
      scale: Math.min(2, window.devicePixelRatio || 2),
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: reportEl.scrollWidth,
      windowHeight: reportEl.scrollHeight
    })
    const imageData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imageHeight = (canvas.height * pageWidth) / canvas.width

    let position = 0
    let remainingHeight = imageHeight

    pdf.addImage(imageData, 'PNG', 0, position, pageWidth, imageHeight)
    remainingHeight -= pageHeight

    while (remainingHeight > 0) {
      position -= pageHeight
      pdf.addPage()
      pdf.addImage(imageData, 'PNG', 0, position, pageWidth, imageHeight)
      remainingHeight -= pageHeight
    }

    pdf.save(`SCL-90医院式结果单-${formatDate(new Date())}.pdf`)
    uni.showToast({
      title: 'PDF 已生成',
      icon: 'success'
    })
  } catch (error) {
    console.error('PDF export failed:', error)
    uni.showToast({
      title: 'PDF 生成失败',
      icon: 'none'
    })
  } finally {
    reportEl.remove()
    exporting.value = false
  }
}

function buildClinicalReportElement(report: Scl90Result, reportConclusion: string): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'clinical-pdf-host'
  el.style.position = 'fixed'
  el.style.left = '-10000px'
  el.style.top = '0'
  el.style.width = '794px'
  el.style.background = '#fff'
  el.style.zIndex = '-1'
  el.innerHTML = buildClinicalReportHtml(report, reportConclusion)
  return el
}

function buildClinicalReportHtml(report: Scl90Result, reportConclusion: string): string {
  const now = new Date()
  const factorRows = report.factors
    .map(
      (f) => `
        <tr>
          <td>${escapeHtml(factorReportName(f))}</td>
          <td>${f.total}</td>
          <td>${displayScore(f.average)}</td>
          <td>${escapeHtml(SEVERITY_TEXT[f.level])}</td>
          <td>${escapeHtml(factorReference(f))}</td>
        </tr>
      `
    )
    .join('')

  return `
    <style>
      .clinical-sheet {
        width: 794px;
        min-height: 1123px;
        padding: 38px 52px 42px;
        background: #fff;
        color: #222;
        font-family: "SimSun", "Songti SC", "Microsoft YaHei", Arial, sans-serif;
        box-sizing: border-box;
      }

      .clinical-title {
        text-align: center;
        font-size: 26px;
        font-weight: 700;
        letter-spacing: 2px;
        margin: 0 0 22px;
      }

      .clinical-subtitle {
        text-align: center;
        font-size: 14px;
        color: #555;
        margin-bottom: 18px;
      }

      .clinical-info {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px 24px;
        font-size: 13px;
        line-height: 1.6;
        padding: 0 4px 14px;
        border-bottom: 2px solid #333;
      }

      .clinical-summary {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        margin: 16px 0 12px;
      }

      .clinical-metric {
        border: 1px solid #d8d8d8;
        padding: 9px 10px;
        text-align: center;
      }

      .clinical-metric strong {
        display: block;
        font-size: 20px;
        line-height: 1.2;
        margin-bottom: 4px;
      }

      .clinical-metric span {
        font-size: 12px;
        color: #555;
      }

      .clinical-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 12px;
        font-size: 13px;
        line-height: 1.45;
      }

      .clinical-table th {
        font-weight: 700;
        text-align: center;
        border-bottom: 1.5px solid #333;
        padding: 6px 8px;
      }

      .clinical-table td {
        text-align: center;
        border-bottom: 1px solid #d7d7d7;
        padding: 5px 8px;
      }

      .clinical-table th:first-child,
      .clinical-table td:first-child {
        text-align: left;
      }

      .clinical-section-title {
        text-align: center;
        font-size: 18px;
        font-weight: 700;
        margin: 22px 0 8px;
      }

      .clinical-chart {
        margin-top: 4px;
        border-top: 1.5px solid #333;
        border-bottom: 1.5px solid #333;
        padding: 10px 0 4px;
      }

      .clinical-result {
        margin-top: 18px;
        border-top: 2px solid #333;
        padding-top: 12px;
        font-size: 13px;
        line-height: 1.8;
      }

      .clinical-result strong {
        display: block;
        font-size: 16px;
        margin-bottom: 5px;
      }

      .clinical-note {
        margin-top: 8px;
        color: #666;
        font-size: 12px;
      }
    </style>
    <div class="clinical-sheet">
      <h1 class="clinical-title">SCL-90症状自评量表结果单</h1>
      <div class="clinical-subtitle">测试结果仅供参考，不作诊断使用</div>

      <div class="clinical-info">
        <div>姓名：自测用户</div>
        <div>性别：--</div>
        <div>年龄：--</div>
        <div>文化程度：--</div>
        <div>科室：门诊</div>
        <div>测试日期：${formatDisplayDate(now)}</div>
        <div>婚姻：--</div>
        <div>职业：--</div>
        <div>测试耗时：--</div>
      </div>

      <div class="clinical-summary">
        <div class="clinical-metric"><strong>${report.totalScore}</strong><span>总分</span></div>
        <div class="clinical-metric"><strong>${displayScore(report.gsi)}</strong><span>总均分</span></div>
        <div class="clinical-metric"><strong>${report.positiveCount}</strong><span>阳性项目数</span></div>
        <div class="clinical-metric"><strong>${displayScore(report.psdi)}</strong><span>阳性症状均分</span></div>
      </div>

      <table class="clinical-table">
        <thead>
          <tr>
            <th>项目</th>
            <th>原始分</th>
            <th>平均分</th>
            <th>参考</th>
            <th>均分±标准差</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>总分</td><td>${report.totalScore}</td><td></td><td></td><td>129.96±38.76</td></tr>
          <tr><td>总均分</td><td></td><td>${displayScore(report.gsi)}</td><td></td><td>1.44±0.43</td></tr>
          <tr><td>阴性项目数</td><td>${report.negativeCount}</td><td></td><td></td><td>65.08±18.33</td></tr>
          <tr><td>阳性项目数</td><td>${report.positiveCount}</td><td></td><td></td><td>24.92±18.41</td></tr>
          <tr><td>阳性项目平均分</td><td></td><td>${displayScore(report.psdi)}</td><td></td><td></td></tr>
          ${factorRows}
        </tbody>
      </table>

      <div class="clinical-section-title">90项症状清单</div>
      <div class="clinical-chart">${buildLineChartSvg(report.factors)}</div>

      <div class="clinical-result">
        <strong>测评结果</strong>
        ${escapeHtml(reportConclusion)}
        <div class="clinical-note">说明：SCL-90 为症状自评筛查工具，分数越高提示对应维度主观困扰越明显；如结果提示异常或困扰持续，请咨询专业心理或精神科医生。</div>
      </div>
    </div>
  `
}

function buildLineChartSvg(factors: FactorResult[]): string {
  const width = 690
  const height = 326
  const left = 58
  const top = 18
  const right = 18
  const bottom = 84
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
  const verticalLines = points.map((p) => (
    `<line x1="${p.x}" y1="${top}" x2="${p.x}" y2="${top + chartHeight}" stroke="#333" stroke-width="1" />`
  )).join('')
  const labels = points.map((p) => {
    const labels = splitChartLabel(factorReportName(p.factor))
    const labelText = labels.map((label, index) => (
      `<tspan x="${p.x}" dy="${index === 0 ? 0 : 14}">${escapeHtml(label)}</tspan>`
    )).join('')
    return `
      <text x="${p.x}" y="${top + chartHeight + 25}" text-anchor="middle" font-size="13">
        ${labelText}
        <tspan x="${p.x}" dy="16">${displayScore(p.factor.average)}</tspan>
      </text>
    `
  }).join('')
  const dots = points.map((p) => (
    `<circle cx="${p.x}" cy="${p.y}" r="3.2" fill="#222" />`
  )).join('')

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${left}" y="${top}" width="${chartWidth}" height="${chartHeight}" fill="#fff" stroke="#333" stroke-width="1.4" />
      ${horizontalLines}
      ${verticalLines}
      <polyline points="${linePoints}" fill="none" stroke="#222" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" />
      ${dots}
      ${labels}
    </svg>
  `
}

function splitChartLabel(name: string): string[] {
  if (name === '人际关系敏感') return ['人际关系', '敏感']
  if (name.length > 4) return [name.slice(0, 4), name.slice(4)]
  return [name]
}

function factorDisplayName(factor: FactorResult): string {
  return FACTOR_DISPLAY_NAME[factor.key] || factor.name
}

function factorReportName(factor: FactorResult): string {
  return FACTOR_REPORT_NAME[factor.key] || factor.name
}

function factorReference(factor: FactorResult): string {
  return FACTOR_REFERENCE[factor.key] || '-'
}

function displayScore(score: number): string {
  return score.toFixed(2)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

function formatDisplayDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function retest() {
  uni.showModal({
    title: '重新测评',
    content: '确定要重新开始测评吗?当前结果将被清空。',
    success: (res) => {
      if (res.confirm) {
        resetQuiz()
        uni.reLaunch({ url: '/pages/index/index' })
      }
    }
  })
}

function backHome() {
  uni.reLaunch({ url: '/pages/index/index' })
}
</script>

<template>
  <view v-if="result" class="result">
    <view id="scl-report" class="report-body">
      <!-- 顶部结论卡 -->
      <view class="hero" :class="result.overallPositive ? 'hero--warn' : 'hero--ok'">
        <view class="hero__top">
          <text class="hero__title">测评结果</text>
          <view class="hero__tag">
            {{ result.overallPositive ? '建议关注' : '状态良好' }}
          </view>
        </view>
        <view class="hero__score">
          <text class="hero__score-num">{{ result.totalScore }}</text>
          <text class="hero__score-unit">总分</text>
        </view>
        <text class="hero__conclusion">{{ conclusion }}</text>
      </view>

      <!-- 核心指标 -->
      <view class="metrics">
        <view class="metric">
          <text class="metric__value">{{ result.gsi }}</text>
          <text class="metric__label">总均分 GSI</text>
        </view>
        <view class="metric">
          <text class="metric__value">{{ result.positiveCount }}</text>
          <text class="metric__label">阳性项目数</text>
        </view>
        <view class="metric">
          <text class="metric__value">{{ result.negativeCount }}</text>
          <text class="metric__label">阴性项目数</text>
        </view>
        <view class="metric">
          <text class="metric__value">{{ result.psdi }}</text>
          <text class="metric__label">阳性症状均分</text>
        </view>
      </view>

      <!-- 雷达图 -->
      <view class="section-title">
        <view class="dot" />
        <text>因子雷达图</text>
        <text class="section-title__hint">均分越高,提示该维度症状越明显</text>
      </view>

      <view class="radar-card">
        <view id="factor-radar" class="radar-chart" />
      </view>

      <!-- 因子得分列表 -->
      <view class="section-title">
        <view class="dot" />
        <text>各因子得分及测试情况</text>
        <text class="section-title__hint">均分 ≥ 2 提示该因子筛查阳性</text>
      </view>

      <view class="factor-table">
        <view class="factor-table__row factor-table__head">
          <text class="factor-table__cell factor-table__cell--name">因子名称</text>
          <text class="factor-table__cell">总分</text>
          <text class="factor-table__cell">平均分</text>
          <text class="factor-table__cell factor-table__cell--status">测试情况</text>
        </view>
        <view v-for="f in result.factors" :key="f.key" class="factor-table__row">
          <text class="factor-table__cell factor-table__cell--name">{{ factorDisplayName(f) }}</text>
          <text class="factor-table__cell factor-table__score">{{ f.total }}</text>
          <text class="factor-table__cell factor-table__score">{{ displayScore(f.average) }}</text>
          <view class="factor-table__cell factor-table__cell--status">
            <text
              class="factor-table__badge"
              :style="{ color: '#fff', background: SEVERITY_COLOR[f.level] }"
            >
              {{ SEVERITY_TEXT[f.level] }}
            </text>
          </view>
        </view>
      </view>

      <!-- 因子解释 -->
      <view class="section-title">
        <view class="dot" />
        <text>因子解释说明</text>
      </view>

      <view class="factors">
        <view v-for="f in result.factors" :key="f.key" class="factor">
          <view class="factor__head">
            <view class="factor__name-wrap">
              <text class="factor__name">{{ factorDisplayName(f) }}</text>
              <text
                class="factor__level"
                :style="{ color: SEVERITY_COLOR[f.level], background: SEVERITY_COLOR[f.level] + '1a' }"
              >
                {{ SEVERITY_TEXT[f.level] }}
              </text>
            </view>
            <text class="factor__avg" :style="{ color: SEVERITY_COLOR[f.level] }">
              {{ f.average }}
            </text>
          </view>
          <view class="factor__bar">
            <view
              class="factor__bar-fill"
              :style="{
                width: barPercent(f.average) + '%',
                background: SEVERITY_COLOR[f.level]
              }"
            />
          </view>
          <view class="factor__foot">
            <text class="factor__meta">总分 {{ f.total }} · {{ f.itemCount }} 题</text>
            <text v-if="f.positive" class="factor__flag" :style="{ color: SEVERITY_COLOR[f.level] }">
              筛查阳性
            </text>
          </view>
          <text class="factor__desc">{{ f.desc }}</text>
        </view>
      </view>

      <view class="disclaimer">
        <wd-icon name="info-circle" size="15px" color="#999" />
        <text class="disclaimer__text">
          本结果依据 SCL-90 标准计分,仅供自我了解参考,不作为临床诊断依据。
          如有持续困扰,请咨询专业心理或精神科医生。
        </text>
      </view>
    </view>

    <!-- 底部操作 -->
    <view class="actions">
      <wd-button plain size="large" :round="true" custom-class="btn-action" @click="backHome">
        返回首页
      </wd-button>
      <wd-button plain size="large" :round="true" custom-class="btn-action" :loading="exporting" @click="exportPdf">
        导出 PDF
      </wd-button>
      <wd-button type="primary" size="large" :round="true" custom-class="btn-action" @click="retest">
        重新测评
      </wd-button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.result {
  min-height: 100vh;
  padding: 0 32rpx calc(160rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.report-body {
  background: #f5f7fa;
}

.hero {
  margin-top: calc(24rpx + env(safe-area-inset-top));
  border-radius: 28rpx;
  padding: 40rpx 36rpx;
  color: #fff;

  &--ok {
    background: linear-gradient(135deg, #21b57a, #34c98c);
    box-shadow: 0 12rpx 32rpx rgba(33, 181, 122, 0.25);
  }

  &--warn {
    background: linear-gradient(135deg, #4a63e7, #6b82f0);
    box-shadow: 0 12rpx 32rpx rgba(74, 99, 231, 0.25);
  }

  &__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__title {
    font-size: 32rpx;
    font-weight: 600;
    opacity: 0.95;
  }

  &__tag {
    font-size: 24rpx;
    padding: 6rpx 20rpx;
    background: rgba(255, 255, 255, 0.25);
    border-radius: 100rpx;
  }

  &__score {
    display: flex;
    align-items: baseline;
    margin: 24rpx 0;

    &-num {
      font-size: 96rpx;
      font-weight: 800;
      line-height: 1;
    }

    &-unit {
      margin-left: 16rpx;
      font-size: 28rpx;
      opacity: 0.9;
    }
  }

  &__conclusion {
    display: block;
    font-size: 26rpx;
    line-height: 1.7;
    opacity: 0.95;
  }
}

.metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
  margin-top: 24rpx;
}

.metric {
  background: #fff;
  border-radius: 18rpx;
  padding: 28rpx 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 8rpx 24rpx rgba(74, 99, 231, 0.05);

  &__value {
    font-size: 40rpx;
    font-weight: 700;
    color: #4a63e7;
  }

  &__label {
    margin-top: 10rpx;
    font-size: 20rpx;
    color: #999;
    text-align: center;
  }
}

.section-title {
  display: flex;
  align-items: center;
  margin: 44rpx 0 24rpx;
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;

  .dot {
    width: 8rpx;
    height: 32rpx;
    background: #4a63e7;
    border-radius: 4rpx;
    margin-right: 16rpx;
  }

  &__hint {
    margin-left: auto;
    font-size: 22rpx;
    font-weight: 400;
    color: #aaa;
  }
}

.radar-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 20rpx 12rpx 12rpx;
  box-shadow: 0 8rpx 24rpx rgba(74, 99, 231, 0.05);
}

.radar-chart {
  width: 100%;
  height: 620rpx;
}

.factor-table {
  overflow: hidden;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(74, 99, 231, 0.05);

  &__row {
    display: grid;
    grid-template-columns: 2.1fr 0.9fr 1fr 1.25fr;
    min-height: 88rpx;
    align-items: center;
    border-bottom: 2rpx solid #eef0f5;

    &:last-child {
      border-bottom: 0;
    }
  }

  &__head {
    min-height: 72rpx;
    background: #f1f8ec;
    font-weight: 600;
  }

  &__cell {
    display: block;
    min-width: 0;
    padding: 0 10rpx;
    font-size: 28rpx;
    color: #253142;
    text-align: center;
    white-space: nowrap;
  }

  &__cell--name {
    padding-left: 24rpx;
    font-weight: 600;
    text-align: left;
  }

  &__cell--status {
    display: flex;
    justify-content: center;
  }

  &__score {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  &__badge {
    min-width: 72rpx;
    padding: 8rpx 12rpx;
    border-radius: 10rpx;
    font-size: 24rpx;
    font-weight: 600;
    line-height: 1;
    text-align: center;
  }
}

.factors {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.factor {
  background: #fff;
  border-radius: 20rpx;
  padding: 32rpx;
  box-shadow: 0 8rpx 24rpx rgba(74, 99, 231, 0.05);

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__name-wrap {
    display: flex;
    align-items: center;
  }

  &__name {
    font-size: 32rpx;
    font-weight: 600;
    color: #1a1a1a;
  }

  &__level {
    margin-left: 16rpx;
    font-size: 22rpx;
    padding: 4rpx 16rpx;
    border-radius: 100rpx;
  }

  &__avg {
    font-size: 44rpx;
    font-weight: 700;
  }

  &__bar {
    margin: 20rpx 0 12rpx;
    height: 14rpx;
    background: #eef0f5;
    border-radius: 100rpx;
    overflow: hidden;

    &-fill {
      height: 100%;
      border-radius: 100rpx;
      transition: width 0.5s ease;
    }
  }

  &__foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__meta {
    font-size: 24rpx;
    color: #999;
  }

  &__flag {
    font-size: 24rpx;
    font-weight: 600;
  }

  &__desc {
    display: block;
    margin-top: 16rpx;
    padding-top: 16rpx;
    border-top: 2rpx solid #f2f3f7;
    font-size: 24rpx;
    line-height: 1.7;
    color: #888;
  }
}

.disclaimer {
  display: flex;
  align-items: flex-start;
  margin-top: 32rpx;
  padding: 24rpx 28rpx;
  background: #f0f1f5;
  border-radius: 16rpx;

  &__text {
    margin-left: 12rpx;
    font-size: 22rpx;
    line-height: 1.6;
    color: #999;
  }
}

.actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 24rpx;
  padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom));
  background: linear-gradient(to top, #f5f7fa 70%, rgba(245, 247, 250, 0));

  :deep(.btn-action) {
    flex: 1;
    min-width: 0;
  }
}
</style>
