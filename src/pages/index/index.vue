<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { QUESTIONS } from '@/data/questions'
import { FACTORS } from '@/data/factors'
import { resetQuiz } from '@/store/quiz'

const totalQuestions = QUESTIONS.length
const factorCount = FACTORS.length - 1 // 减去"其他",展示 9 大主因子

onLoad(() => {
  // 进入首页不重置,允许用户在结果页返回后继续查看
})

function startTest() {
  resetQuiz()
  uni.navigateTo({ url: '/pages/quiz/quiz' })
}
</script>

<template>
  <view class="intro">
    <view class="hero">
      <view class="hero__badge">心理测评</view>
      <text class="hero__title">SCL-90 症状自评量表</text>
      <text class="hero__subtitle">Symptom Checklist 90</text>
    </view>

    <view class="card">
      <view class="card__title">
        <view class="dot" />
        <text>量表简介</text>
      </view>
      <text class="card__text">
        SCL-90 是国际通用的心理健康自评工具,共 {{ totalQuestions }} 个项目,
        涵盖躯体化、焦虑、抑郁等 {{ factorCount }} 大症状因子,
        广泛用于评估个体近一周内的心理健康状况。
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
          <text class="rule__text">凭第一印象作答,共 {{ totalQuestions }} 题,约需 10-20 分钟。</text>
        </view>
      </view>
    </view>

    <view class="notice">
      <wd-icon name="warn-bold" size="16px" color="#f5a623" />
      <text class="notice__text">本测评仅供自我了解与参考,不能替代专业诊断。</text>
    </view>

    <view class="footer">
      <wd-button type="primary" size="large" block :round="true" @click="startTest">
        开始测评
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
    color: #999;
    letter-spacing: 1rpx;
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
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  background: linear-gradient(to top, #f5f7fa 70%, rgba(245, 247, 250, 0));
}
</style>
