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
  type Scl90Result
} from '@/utils/score'

const result = ref<Scl90Result | null>(null)
const conclusion = ref('')
const exporting = ref(false)
let radarChart: echarts.ECharts | null = null

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
        name: f.name === '其他(饮食睡眠)' ? '其他' : f.name,
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

  const reportEl = document.getElementById('scl-report')
  if (!reportEl) {
    uni.showToast({
      title: '报告内容未加载',
      icon: 'none'
    })
    return
  }

  exporting.value = true
  try {
    await nextTick()
    resizeRadar()

    const canvas = await html2canvas(reportEl, {
      scale: Math.min(2, window.devicePixelRatio || 2),
      useCORS: true,
      backgroundColor: '#f5f7fa',
      scrollY: -window.scrollY
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

    pdf.save(`SCL-90测评报告-${formatDate(new Date())}.pdf`)
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
    exporting.value = false
  }
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
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

      <!-- 因子明细 -->
      <view class="section-title">
        <view class="dot" />
        <text>各因子得分</text>
        <text class="section-title__hint">均分 ≥ 2 提示该因子筛查阳性</text>
      </view>

      <view class="factors">
        <view v-for="f in result.factors" :key="f.key" class="factor">
          <view class="factor__head">
            <view class="factor__name-wrap">
              <text class="factor__name">{{ f.name }}</text>
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
