<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { QUESTIONS, SCORE_OPTIONS } from '@/data/questions'
import { quizStore, answeredCount, firstUnansweredIndex } from '@/store/quiz'
import type { AnswerValue, ScoreValue } from '@/data/questions'

const total = QUESTIONS.length
const current = ref(0) // 当前题目索引 0-89
const showNavigator = ref(false)

onLoad(() => {
  if (!quizStore.startedAt) {
    quizStore.startedAt = Date.now()
  }
  const answered = answeredCount()
  if (answered > 0 && answered < total) {
    current.value = firstUnansweredIndex()
  }
})

const currentQuestion = computed(() => QUESTIONS[current.value])
const currentAnswer = computed(() => quizStore.answers[current.value])
const answered = computed(() => answeredCount())
const progressPercent = computed(() => Math.round((answered.value / total) * 100))
const isLast = computed(() => current.value === total - 1)
const allAnswered = computed(() => answered.value === total)
const primaryActionText = computed(() => {
  if (allAnswered.value) return '提交并查看结果'
  if (isLast.value) return '检查漏题'
  return '下一题'
})
const primaryActionType = computed(() => (allAnswered.value ? 'success' : 'primary'))
const unansweredCount = computed(() => total - answered.value)

function select(value: ScoreValue) {
  const selectedIndex = current.value
  quizStore.answers[current.value] = value

  setTimeout(() => {
    if (current.value !== selectedIndex) return

    if (allAnswered.value) {
      uni.showToast({
        title: '已全部作答,可以提交',
        icon: 'none'
      })
      return
    }

    if (selectedIndex < total - 1) {
      current.value = selectedIndex + 1
    }
  }, 220)
}

function prev() {
  if (current.value > 0) current.value--
}

function next() {
  if (current.value < total - 1) current.value++
}

function primaryAction() {
  if (allAnswered.value || isLast.value) {
    goResult()
    return
  }
  next()
}

function goResult() {
  if (answered.value < total) {
    const firstUnanswered = quizStore.answers.findIndex((v: AnswerValue) => v === 0)
    uni.showModal({
      title: '还有题目未作答',
      content: `尚有 ${unansweredCount.value} 题未作答,是否打开题号导航查看?`,
      confirmText: '打开导航',
      cancelText: '继续下一题',
      success: (res) => {
        if (res.confirm) {
          showNavigator.value = true
        } else if (firstUnanswered !== -1) {
          current.value = firstUnanswered
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

function openNavigator() {
  showNavigator.value = true
}

function closeNavigator() {
  showNavigator.value = false
}

function jumpTo(index: number) {
  current.value = index
  showNavigator.value = false
}

function jumpToFirstUnanswered() {
  const idx = quizStore.answers.findIndex((v: AnswerValue) => v === 0)
  if (idx !== -1) {
    current.value = idx
  }
  showNavigator.value = false
}

function onOptionKey(e: KeyboardEvent, value: ScoreValue, idx: number) {
  const total = SCORE_OPTIONS.length
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault()
    select(value)
    return
  }
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
    e.preventDefault()
    focusOption((idx + 1) % total)
    return
  }
  if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    e.preventDefault()
    focusOption((idx - 1 + total) % total)
  }
}

function focusOption(idx: number) {
  const opt = SCORE_OPTIONS[idx]
  if (!opt || typeof document === 'undefined') return
  const el = document.getElementById(`opt-${opt.value}`)
  if (el) el.focus()
}
</script>

<template>
  <view class="quiz">
    <!-- 顶部导航 + 进度 -->
    <view class="topbar">
      <view class="topbar__row">
        <view
          class="back-btn"
          role="button"
          tabindex="0"
          aria-label="返回上一页"
          @click="back"
          @keydown.enter.prevent="back"
          @keydown.space.prevent="back"
        >
          <wd-icon name="arrow-left" size="20px" color="#333" />
        </view>
        <text class="topbar__count">
          <text class="cur">{{ current + 1 }}</text> / {{ total }}
        </text>
        <view
          class="nav-btn"
          role="button"
          tabindex="0"
          aria-label="打开题号导航"
          @click="openNavigator"
          @keydown.enter.prevent="openNavigator"
          @keydown.space.prevent="openNavigator"
        >
          <wd-icon name="app" size="20px" color="#4a63e7" />
        </view>
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
    <view class="options" role="radiogroup" :aria-label="`第 ${current + 1} 题选项`">
      <view
        v-for="(opt, idx) in SCORE_OPTIONS"
        :id="`opt-${opt.value}`"
        :key="opt.value"
        class="option"
        :class="{ 'option--active': currentAnswer === opt.value }"
        role="radio"
        :aria-checked="currentAnswer === opt.value ? 'true' : 'false'"
        :aria-label="`${opt.label},${opt.value} 分`"
        :tabindex="currentAnswer === opt.value || (currentAnswer === 0 && idx === 0) ? 0 : -1"
        @click="select(opt.value)"
        @keydown="onOptionKey($event, opt.value, idx)"
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
        :type="primaryActionType"
        size="large"
        :round="true"
        custom-class="btn-next"
        @click="primaryAction"
      >
        {{ primaryActionText }}
      </wd-button>
    </view>

    <!-- 题号导航抽屉 -->
    <view
      v-if="showNavigator"
      class="navigator-mask"
      role="dialog"
      aria-modal="true"
      aria-label="题号导航"
      @click="closeNavigator"
    >
      <view class="navigator" @click.stop>
        <view class="navigator__header">
          <text class="navigator__title">题号导航</text>
          <view
            class="navigator__close"
            role="button"
            tabindex="0"
            aria-label="关闭题号导航"
            @click="closeNavigator"
            @keydown.enter.prevent="closeNavigator"
            @keydown.space.prevent="closeNavigator"
          >
            <wd-icon name="close" size="18px" color="#666" />
          </view>
        </view>
        <view class="navigator__legend">
          <view class="legend-item">
            <view class="legend-dot legend-dot--current" />
            <text>当前</text>
          </view>
          <view class="legend-item">
            <view class="legend-dot legend-dot--answered" />
            <text>已答</text>
          </view>
          <view class="legend-item">
            <view class="legend-dot legend-dot--unanswered" />
            <text>未答</text>
          </view>
          <text class="legend-summary">未答 {{ unansweredCount }} 题</text>
        </view>
        <scroll-view class="navigator__body" scroll-y>
          <view class="grid" role="list" aria-label="题号列表">
            <view
              v-for="(ans, idx) in quizStore.answers"
              :key="idx"
              class="grid__cell"
              :class="{
                'grid__cell--current': idx === current,
                'grid__cell--answered': ans > 0 && idx !== current,
                'grid__cell--unanswered': ans === 0 && idx !== current
              }"
              role="button"
              tabindex="0"
              :aria-label="`第 ${idx + 1} 题${
                idx === current ? ',当前题目' : ans > 0 ? ',已作答' : ',未作答'
              }`"
              :aria-current="idx === current ? 'true' : undefined"
              @click="jumpTo(idx)"
              @keydown.enter.prevent="jumpTo(idx)"
              @keydown.space.prevent="jumpTo(idx)"
            >
              {{ idx + 1 }}
            </view>
          </view>
        </scroll-view>
        <view class="navigator__footer">
          <wd-button
            v-if="unansweredCount > 0"
            plain
            size="large"
            block
            :round="true"
            custom-class="btn-nav-unans"
            @click="jumpToFirstUnanswered"
          >
            跳到首个未答题
          </wd-button>
          <wd-button
            v-else
            type="success"
            size="large"
            block
            :round="true"
            custom-class="btn-nav-submit"
            @click="goResult"
          >
            提交并查看结果
          </wd-button>
        </view>
      </view>
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
    color: #666;

    .cur {
      font-size: 40rpx;
      font-weight: 700;
      color: #4a63e7;
    }
  }
}

.back-btn,
.nav-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
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
    color: #555;
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
    color: #555;
  }

  &--active &__score {
    color: #4a63e7;
  }

  &:focus,
  &:focus-visible {
    outline: 3rpx solid #4a63e7;
    outline-offset: 2rpx;
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

/* 题号导航抽屉 */
.navigator-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 999;
  display: flex;
  align-items: flex-end;
}

.navigator {
  width: 100%;
  max-height: 82vh;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 32rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  animation: slide-up 0.28s ease;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20rpx;
  }

  &__title {
    font-size: 34rpx;
    font-weight: 700;
    color: #1a1a1a;
  }

  &__close {
    width: 60rpx;
    height: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #f2f3f7;
  }

  &__legend {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 20rpx;
    padding: 16rpx 8rpx;
    margin-bottom: 12rpx;
    border-bottom: 2rpx solid #f2f3f7;
  }

  &__body {
    flex: 1;
    max-height: 56vh;
    overflow-y: auto;
    padding: 12rpx 4rpx 20rpx;
  }

  &__footer {
    padding-top: 20rpx;
    border-top: 2rpx solid #f2f3f7;
  }
}

.legend-item {
  display: flex;
  align-items: center;
  font-size: 24rpx;
  color: #666;
}

.legend-summary {
  margin-left: auto;
  font-size: 24rpx;
  color: #e8534e;
  font-weight: 600;
}

.legend-dot {
  width: 24rpx;
  height: 24rpx;
  border-radius: 6rpx;
  margin-right: 10rpx;

  &--current {
    background: #4a63e7;
  }

  &--answered {
    background: #d7dcee;
  }

  &--unanswered {
    background: #fff;
    border: 2rpx solid #cfd4e6;
  }
}

.grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16rpx;
}

.grid__cell {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  font-size: 28rpx;
  font-weight: 600;
  transition: transform 0.15s ease;

  &:active {
    transform: scale(0.94);
  }

  &--current {
    background: #4a63e7;
    color: #fff;
    box-shadow: 0 4rpx 12rpx rgba(74, 99, 231, 0.35);
  }

  &--answered {
    background: #eef1fd;
    color: #4a63e7;
  }

  &--unanswered {
    background: #fff;
    color: #666;
    border: 2rpx solid #d7dcee;
  }
}

@keyframes slide-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
</style>
