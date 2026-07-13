<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { quizStore, resetQuiz } from '@/store/quiz'
import {
  calcResult,
  overallConclusion,
  SEVERITY_TEXT,
  SEVERITY_COLOR,
  type Scl90Result
} from '@/utils/score'
import { barPercent, displayScore, factorDisplayName } from '@/utils/report'
import { OVERALL_NORMS } from '@/data/norms'
import { buildRadarSvg } from '@/utils/charts'
import { exportClinicalPdf } from '@/utils/pdfReport'

const result = ref<Scl90Result | null>(null)
const conclusion = ref('')
const exporting = ref(false)
const showNormalFactors = ref(false)
const radarSvg = computed(() => (result.value ? buildRadarSvg(result.value.factors) : ''))
const positiveFactors = computed(() => {
  if (!result.value) return []
  return result.value.factors
    .filter((f) => f.positive)
    .slice()
    .sort((a, b) => b.average - a.average)
})
const normalFactors = computed(() => {
  if (!result.value) return []
  return result.value.factors
    .filter((f) => !f.positive)
    .slice()
    .sort((a, b) => b.average - a.average)
})
const positiveFactorCount = computed(
  () => positiveFactors.value.filter((f) => f.key !== 'other').length
)
const heroSummary = computed(() => {
  const r = result.value
  if (!r) return ''
  if (!r.overallPositive) return '总体处于正常范围'
  const parts: string[] = []
  if (r.positiveCount > 0) parts.push(`${r.positiveCount} 项阳性`)
  if (positiveFactorCount.value > 0) parts.push(`${positiveFactorCount.value} 个因子偏高`)
  return parts.join(' · ')
})
const heroTag = computed(() => {
  const r = result.value
  if (!r) return ''
  if (!r.overallPositive) return '状态良好'
  if (positiveFactorCount.value >= 3) return '建议咨询'
  return '建议关注'
})

onLoad(() => {
  const r = calcResult(quizStore.answers)
  result.value = r
  conclusion.value = overallConclusion(r)
})

async function exportPdf() {
  if (exporting.value) return
  if (!result.value) {
    uni.showToast({ title: '报告内容未加载', icon: 'none' })
    return
  }

  exporting.value = true
  try {
    await exportClinicalPdf(result.value, conclusion.value)
    uni.showToast({ title: 'PDF 已生成', icon: 'success' })
  } catch (error) {
    console.error('PDF export failed:', error)
    uni.showToast({ title: 'PDF 生成失败', icon: 'none' })
  } finally {
    exporting.value = false
  }
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
          <view class="hero__tag">{{ heroTag }}</view>
        </view>
        <view class="hero__score">
          <text class="hero__score-num">{{ result.totalScore }}</text>
          <text class="hero__score-unit">总分</text>
        </view>
        <text v-if="heroSummary" class="hero__summary">{{ heroSummary }}</text>
        <text class="hero__conclusion">{{ conclusion }}</text>
      </view>

      <!-- 核心指标 -->
      <view class="metrics">
        <view class="metric">
          <text class="metric__value">{{ result.gsi }}</text>
          <text class="metric__label">总均分 GSI</text>
          <text class="metric__ref">常模 {{ OVERALL_NORMS.gsi }}</text>
        </view>
        <view class="metric">
          <text class="metric__value">{{ result.positiveCount }}</text>
          <text class="metric__label">阳性项目数</text>
          <text class="metric__ref">常模 {{ OVERALL_NORMS.positiveCount }}</text>
        </view>
        <view class="metric">
          <text class="metric__value">{{ result.negativeCount }}</text>
          <text class="metric__label">阴性项目数</text>
          <text class="metric__ref">常模 {{ OVERALL_NORMS.negativeCount }}</text>
        </view>
        <view class="metric">
          <text class="metric__value">{{ result.psdi }}</text>
          <text class="metric__label">阳性症状均分</text>
          <text class="metric__ref">范围 2–5 分</text>
        </view>
      </view>

      <!-- 雷达图 -->
      <view class="section-title">
        <view class="dot" />
        <text>因子雷达图</text>
        <text class="section-title__hint">均分越高,提示该维度症状越明显</text>
      </view>

      <view class="radar-card">
        <view class="radar-chart" v-html="radarSvg" />
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
          <text class="factor-table__cell factor-table__cell--name">{{
            factorDisplayName(f)
          }}</text>
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
        <template v-if="positiveFactors.length">
          <view v-for="f in positiveFactors" :key="f.key" class="factor">
            <view class="factor__head">
              <view class="factor__name-wrap">
                <text class="factor__name">{{ factorDisplayName(f) }}</text>
                <text
                  class="factor__level"
                  :style="{
                    color: SEVERITY_COLOR[f.level],
                    background: SEVERITY_COLOR[f.level] + '1a'
                  }"
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
              <text class="factor__flag" :style="{ color: SEVERITY_COLOR[f.level] }">
                筛查阳性
              </text>
            </view>
            <text class="factor__desc">{{ f.desc }}</text>
          </view>
        </template>

        <view v-if="normalFactors.length" class="factors__toggle-wrap">
          <view
            class="factors__toggle"
            role="button"
            tabindex="0"
            :aria-expanded="showNormalFactors ? 'true' : 'false'"
            @click="showNormalFactors = !showNormalFactors"
            @keydown.enter.prevent="showNormalFactors = !showNormalFactors"
            @keydown.space.prevent="showNormalFactors = !showNormalFactors"
          >
            <text class="factors__toggle-text">
              {{ showNormalFactors ? '收起' : '展开' }}正常范围因子({{ normalFactors.length }})
            </text>
            <wd-icon
              :name="showNormalFactors ? 'arrow-up' : 'arrow-down'"
              size="16px"
              color="#4a63e7"
            />
          </view>
        </view>

        <template v-if="showNormalFactors">
          <view v-for="f in normalFactors" :key="f.key" class="factor factor--muted">
            <view class="factor__head">
              <view class="factor__name-wrap">
                <text class="factor__name">{{ factorDisplayName(f) }}</text>
                <text
                  class="factor__level"
                  :style="{
                    color: SEVERITY_COLOR[f.level],
                    background: SEVERITY_COLOR[f.level] + '1a'
                  }"
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
            </view>
            <text class="factor__desc">{{ f.desc }}</text>
          </view>
        </template>
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
      <wd-button
        plain
        size="large"
        :round="true"
        custom-class="btn-action"
        :loading="exporting"
        @click="exportPdf"
      >
        导出 PDF
      </wd-button>
      <wd-button
        type="primary"
        size="large"
        :round="true"
        custom-class="btn-action"
        @click="retest"
      >
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
    background: linear-gradient(135deg, #f59e0b, #fb923c);
    box-shadow: 0 12rpx 32rpx rgba(245, 158, 11, 0.28);
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

  &__summary {
    display: block;
    margin-bottom: 12rpx;
    font-size: 26rpx;
    font-weight: 600;
    letter-spacing: 1rpx;
    opacity: 0.95;
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
    color: #6b7280;
    text-align: center;
  }

  &__ref {
    margin-top: 8rpx;
    font-size: 18rpx;
    color: #8a93a3;
    text-align: center;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    transform: scale(0.92);
    transform-origin: center top;
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
    color: #6b7280;
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

  &__toggle-wrap {
    display: flex;
    justify-content: center;
    margin: 8rpx 0;
  }

  &__toggle {
    display: inline-flex;
    align-items: center;
    gap: 10rpx;
    padding: 16rpx 32rpx;
    background: #eef1fd;
    border-radius: 100rpx;

    &:active {
      opacity: 0.85;
    }
  }

  &__toggle-text {
    font-size: 26rpx;
    font-weight: 600;
    color: #4a63e7;
  }
}

.factor {
  background: #fff;
  border-radius: 20rpx;
  padding: 32rpx;
  box-shadow: 0 8rpx 24rpx rgba(74, 99, 231, 0.05);

  &--muted {
    background: #fafbfd;
    box-shadow: none;
    border: 2rpx solid #eef0f5;
  }

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
    color: #6b7280;
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
    color: #565b66;
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
    color: #6b7280;
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
