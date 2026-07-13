<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { QUESTIONS } from '@/data/questions'
import { FACTORS } from '@/data/factors'
import { answeredCount, hasQuizProgress, resetQuiz } from '@/store/quiz'

const totalQuestions = QUESTIONS.length
const factorCount = FACTORS.length - 1 // 减去"其他",展示 9 大主因子

const canResume = ref(false)
const resumeCount = ref(0)

onShow(() => {
  canResume.value = hasQuizProgress()
  resumeCount.value = answeredCount()
})

function startTest() {
  if (canResume.value) {
    uni.showModal({
      title: '检测到未完成的测评',
      content: `已作答 ${resumeCount.value} / ${totalQuestions} 题,是否继续上次进度?`,
      confirmText: '继续作答',
      cancelText: '重新开始',
      success: (res) => {
        if (res.confirm) {
          uni.navigateTo({ url: '/pages/quiz/quiz' })
        } else {
          resetQuiz()
          uni.navigateTo({ url: '/pages/quiz/quiz' })
        }
      }
    })
    return
  }
  resetQuiz()
  uni.navigateTo({ url: '/pages/quiz/quiz' })
}

function resumeTest() {
  uni.navigateTo({ url: '/pages/quiz/quiz' })
}
</script>

<template>
  <view class="intro">
    <view class="hero">
      <view class="hero__badge">心理测评</view>
      <text class="hero__title">SCL-90 症状自评量表</text>
      <text class="hero__subtitle">Symptom Checklist 90</text>
      <text class="hero__tagline">约 10 分钟，获取 {{ factorCount }} 维度症状画像</text>
    </view>

    <view class="highlights">
      <view class="highlight">
        <text class="highlight__icon">⏱</text>
        <text class="highlight__title">10 分钟</text>
        <text class="highlight__desc">进度自动保存，可随时中断</text>
      </view>
      <view class="highlight">
        <text class="highlight__icon">📊</text>
        <text class="highlight__title">{{ factorCount }} 维画像</text>
        <text class="highlight__desc">雷达图直观呈现症状分布</text>
      </view>
      <view class="highlight">
        <text class="highlight__icon">📄</text>
        <text class="highlight__title">可导出</text>
        <text class="highlight__desc">支持医院式 PDF 结果单</text>
      </view>
    </view>

    <view class="card">
      <view class="card__title">
        <view class="dot" />
        <text>量表简介</text>
      </view>
      <text class="card__text">
        SCL-90 是国际通用的心理健康自评工具,共 {{ totalQuestions }} 个项目, 涵盖躯体化、焦虑、抑郁等
        {{ factorCount }} 大症状因子, 广泛用于评估个体近一周内的心理健康状况。
      </text>
    </view>

    <view class="card">
      <view class="card__title">
        <view class="dot" />
        <text>作答说明</text>
      </view>
      <view class="rules">
        <view class="rule">
          <text class="rule__idx">1</text>
          <text class="rule__text">请根据【最近一周】的实际感受作答,无对错之分。</text>
        </view>
        <view class="rule">
          <text class="rule__idx">2</text>
          <text class="rule__text">每题按困扰程度分五级:没有 / 很轻 / 中等 / 偏重 / 严重。</text>
        </view>
        <view class="rule">
          <text class="rule__idx">3</text>
          <text class="rule__text"
            >凭第一印象作答,共 {{ totalQuestions }} 题,约需 10-20 分钟。</text
          >
        </view>
      </view>
    </view>

    <view class="notice">
      <wd-icon name="warn-bold" size="16px" color="#f5a623" />
      <text class="notice__text">本测评仅供自我了解与参考,不能替代专业诊断。</text>
    </view>

    <view class="footer">
      <wd-button
        v-if="canResume"
        plain
        size="large"
        block
        :round="true"
        custom-class="btn-resume"
        @click="resumeTest"
      >
        继续作答(已完成 {{ resumeCount }} / {{ totalQuestions }})
      </wd-button>
      <wd-button type="primary" size="large" block :round="true" @click="startTest">
        {{ canResume ? '重新开始' : '开始测评' }}
      </wd-button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.intro {
  min-height: 100vh;
  padding: 0 32rpx calc(180rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.hero {
  padding: calc(88rpx + env(safe-area-inset-top)) 0 56rpx;
  display: flex;
  flex-direction: column;
  align-items: center;

  &__badge {
    font-size: 24rpx;
    color: #4a63e7;
    background: #eef1fd;
    padding: 8rpx 24rpx;
    border-radius: 100rpx;
    margin-bottom: 28rpx;
  }

  &__title {
    font-size: 52rpx;
    font-weight: 700;
    color: #1a1a1a;
    letter-spacing: 2rpx;
  }

  &__subtitle {
    margin-top: 12rpx;
    font-size: 26rpx;
    color: #6b7280;
    letter-spacing: 1rpx;
  }

  &__tagline {
    margin-top: 24rpx;
    font-size: 26rpx;
    color: #4a63e7;
    font-weight: 500;
    letter-spacing: 0.5rpx;
  }
}

.highlights {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  margin-bottom: 28rpx;
}

.highlight {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx 16rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: 0 6rpx 20rpx rgba(74, 99, 231, 0.05);

  &__icon {
    font-size: 40rpx;
    line-height: 1;
    margin-bottom: 12rpx;
  }

  &__title {
    font-size: 28rpx;
    font-weight: 600;
    color: #1a1a1a;
    margin-bottom: 6rpx;
  }

  &__desc {
    font-size: 22rpx;
    line-height: 1.5;
    color: #6b7280;
  }
}

.card {
  background: #fff;
  border-radius: 24rpx;
  padding: 36rpx 32rpx;
  margin-bottom: 28rpx;
  box-shadow: 0 8rpx 30rpx rgba(74, 99, 231, 0.06);

  &__title {
    display: flex;
    align-items: center;
    font-size: 32rpx;
    font-weight: 600;
    color: #1a1a1a;
    margin-bottom: 24rpx;

    .dot {
      width: 8rpx;
      height: 32rpx;
      background: #4a63e7;
      border-radius: 4rpx;
      margin-right: 16rpx;
    }
  }

  &__text {
    font-size: 28rpx;
    line-height: 1.8;
    color: #666;
  }
}

.rules {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.rule {
  display: flex;
  align-items: flex-start;

  &__idx {
    flex-shrink: 0;
    width: 40rpx;
    height: 40rpx;
    line-height: 40rpx;
    text-align: center;
    background: #eef1fd;
    color: #4a63e7;
    border-radius: 50%;
    font-size: 24rpx;
    margin-right: 20rpx;
  }

  &__text {
    flex: 1;
    font-size: 28rpx;
    line-height: 1.6;
    color: #666;
  }
}

.notice {
  display: flex;
  align-items: center;
  padding: 20rpx 28rpx;
  background: #fff9ec;
  border-radius: 16rpx;
  margin-bottom: 32rpx;

  &__text {
    margin-left: 12rpx;
    font-size: 24rpx;
    color: #b7791f;
    line-height: 1.5;
  }
}

.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  background: linear-gradient(to top, #f5f7fa 70%, rgba(245, 247, 250, 0));
}
</style>
