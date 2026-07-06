<script setup lang="ts">
import { computed, ref } from 'vue'
import { QUESTIONS, SCORE_OPTIONS } from '@/data/questions'
import { quizStore, answeredCount } from '@/store/quiz'

const total = QUESTIONS.length
const current = ref(0) // 当前题目索引 0-89

const currentQuestion = computed(() => QUESTIONS[current.value])
const currentAnswer = computed(() => quizStore.answers[current.value])
const answered = computed(() => answeredCount())
const progressPercent = computed(() => Math.round((answered.value / total) * 100))
const isLast = computed(() => current.value === total - 1)

function select(value: number) {
  quizStore.answers[current.value] = value
  // 选择后短暂延迟自动跳到下一题(最后一题不跳)
  if (!isLast.value) {
    setTimeout(() => {
      if (current.value < total - 1) current.value++
    }, 220)
  }
}

function prev() {
  if (current.value > 0) current.value--
}

function next() {
  if (current.value < total - 1) current.value++
}

function goResult() {
  if (answered.value < total) {
    const firstUnanswered = quizStore.answers.findIndex((v) => v === 0)
    uni.showModal({
      title: '还有题目未作答',
      content: `尚有 ${total - answered.value} 题未作答,是否跳转到第 ${
        firstUnanswered + 1
      } 题继续?`,
      confirmText: '去作答',
      cancelText: '仍然提交',
      success: (res) => {
        if (res.confirm) {
          current.value = firstUnanswered
        } else {
          uni.redirectTo({ url: '/pages/result/result' })
        }
      }
    })
    return
  }
  uni.redirectTo({ url: '/pages/result/result' })
}

function back() {
  uni.navigateBack()
}
</script>

<template>
  <view class="quiz">
    <!-- 顶部导航 + 进度 -->
    <view class="topbar">
      <view class="topbar__row">
        <view class="back-btn" @click="back">
          <wd-icon name="arrow-left" size="20px" color="#333" />
        </view>
        <text class="topbar__count">
          <text class="cur">{{ current + 1 }}</text> / {{ total }}
        </text>
        <view class="placeholder" />
      </view>
      <view class="progress">
        <view class="progress__bar" :style="{ width: progressPercent + '%' }" />
      </view>
      <text class="progress__label">已完成 {{ answered }} / {{ total }} 题</text>
    </view>

    <!-- 题目 -->
    <view class="question">
      <text class="question__no">Q{{ current + 1 }}</text>
      <text class="question__text">{{ currentQuestion.text }}</text>
    </view>

    <!-- 选项 -->
    <view class="options">
      <view
        v-for="opt in SCORE_OPTIONS"
        :key="opt.value"
        class="option"
        :class="{ 'option--active': currentAnswer === opt.value }"
        @click="select(opt.value)"
      >
        <view class="option__radio">
          <view v-if="currentAnswer === opt.value" class="option__radio-inner" />
        </view>
        <text class="option__label">{{ opt.label }}</text>
        <text class="option__score">{{ opt.value }} 分</text>
      </view>
    </view>

    <!-- 底部操作 -->
    <view class="actions">
      <wd-button
        v-if="current > 0"
        plain
        size="large"
        :round="true"
        custom-class="btn-prev"
        @click="prev"
      >
        上一题
      </wd-button>
      <wd-button
        v-if="!isLast"
        type="primary"
        size="large"
        :round="true"
        custom-class="btn-next"
        @click="next"
      >
        下一题
      </wd-button>
      <wd-button
        v-else
        type="success"
        size="large"
        :round="true"
        custom-class="btn-next"
        @click="goResult"
      >
        提交并查看结果
      </wd-button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.quiz {
  min-height: 100vh;
  padding: 0 32rpx calc(160rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.topbar {
  padding-top: calc(24rpx + env(safe-area-inset-top));

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 72rpx;
  }

  &__count {
    font-size: 30rpx;
    color: #999;

    .cur {
      font-size: 40rpx;
      font-weight: 700;
      color: #4a63e7;
    }
  }
}

.back-btn,
.placeholder {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-btn {
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
}

.progress {
  margin-top: 16rpx;
  height: 12rpx;
  background: #e6e9f2;
  border-radius: 100rpx;
  overflow: hidden;

  &__bar {
    height: 100%;
    background: linear-gradient(90deg, #4a63e7, #6b82f0);
    border-radius: 100rpx;
    transition: width 0.3s ease;
  }

  &__label {
    display: block;
    margin-top: 12rpx;
    font-size: 22rpx;
    color: #aaa;
    text-align: right;
  }
}

.question {
  background: #fff;
  border-radius: 24rpx;
  padding: 48rpx 36rpx;
  margin-top: 32rpx;
  box-shadow: 0 8rpx 30rpx rgba(74, 99, 231, 0.06);

  &__no {
    display: inline-block;
    font-size: 26rpx;
    font-weight: 700;
    color: #4a63e7;
    background: #eef1fd;
    padding: 4rpx 20rpx;
    border-radius: 8rpx;
    margin-bottom: 24rpx;
  }

  &__text {
    display: block;
    font-size: 40rpx;
    font-weight: 600;
    line-height: 1.5;
    color: #1a1a1a;
  }
}

.options {
  margin-top: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.option {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 18rpx;
  padding: 30rpx 32rpx;
  border: 2rpx solid transparent;
  transition: all 0.2s ease;

  &--active {
    border-color: #4a63e7;
    background: #eef1fd;
  }

  &__radio {
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    border: 3rpx solid #cfd4e6;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 24rpx;
  }

  &--active &__radio {
    border-color: #4a63e7;
  }

  &__radio-inner {
    width: 22rpx;
    height: 22rpx;
    border-radius: 50%;
    background: #4a63e7;
  }

  &__label {
    flex: 1;
    font-size: 32rpx;
    color: #333;
  }

  &__score {
    font-size: 26rpx;
    color: #bbb;
  }

  &--active &__score {
    color: #4a63e7;
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

  :deep(.btn-prev) {
    flex: 1;
  }

  :deep(.btn-next) {
    flex: 2;
  }
}
</style>
