<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { useTerritoryStore } from '@/stores/territory';
import type { NeighborNode } from '@/types/territory';

import TerritoryNode from '@/components/territory/TerritoryNode.vue';
import TerritoryCard from '@/components/territory/TerritoryCard.vue';
import MapStatusBar from '@/components/territory/MapStatusBar.vue';
import MapFog from '@/components/territory/MapFog.vue';
import { GUARDIAN_ICON } from '@/utils/im-custom-msg';

const userStore = useUserStore();
const territoryStore = useTerritoryStore();

/** 自定义导航栏高度（H5 / 小程序 共用） */
const statusBarHeight = ref(20);
const navBarHeight = ref(44);

// ---- 视口交互状态 ----

/** 拖动偏移（px） */
const panX = ref(0);
const panY = ref(0);
/** 缩放（从 store 镜像，避免修改时序问题） */
const scale = computed(() => territoryStore.viewport.scale);

/** 缩放按钮操作 */
function zoomIn() {
  territoryStore.zoomIn();
}
function zoomOut() {
  territoryStore.zoomOut();
}
function resetView() {
  panX.value = 0;
  panY.value = 0;
  territoryStore.resetViewport();
}

// ---- 邻居卡片 ----

const selectedNeighbor = ref<NeighborNode | null>(null);

function handleNodeTap(node: NeighborNode) {
  if (node.isOwn) return; // 自己不可点
  selectedNeighbor.value = node;
}

function closeCard() {
  selectedNeighbor.value = null;
}

function handleChat() {
  if (!selectedNeighbor.value) return;
  if (userStore.isGuest) {
    uni.showModal({
      title: '入驻巢穴',
      content: '私聊功能需要先入驻巢穴，是否前往？',
      confirmText: '去入驻',
      success: (res) => {
        if (res.confirm) {
          selectedNeighbor.value = null;
          uni.navigateTo({ url: '/pages/auth/login' });
        }
      },
    });
    return;
  }
  // 跳转单聊窗口（OpenIM 单聊能力 + GamDen 皮肤）
  const n = selectedNeighbor.value;
  uni.navigateTo({
    url: '/pages/im/chat',
    query: {
      userID: n.userId,
      nickname: encodeURIComponent(n.nickname),
      avatar: encodeURIComponent(GUARDIAN_ICON[n.guardianType] ?? '🛖'),
      conversationID: '',
      guardianType: n.guardianType ?? '',
    },
  });
  closeCard();
}

function handleVisit() {
  // 游客点击"拜访" → 引导注册
  closeCard();
  uni.navigateTo({ url: '/pages/auth/login' });
}

// ---- 顶部状态栏回调 ----

function gotoProfile() {
  uni.switchTab({ url: '/pages/profile/index' });
}

function gotoMessages() {
  if (userStore.isGuest) {
    uni.showModal({
      title: '入驻巢穴',
      content: '消息中心需要先入驻巢穴，是否前往？',
      confirmText: '去入驻',
      success: (res) => {
        if (res.confirm) uni.navigateTo({ url: '/pages/auth/login' });
      },
    });
    return;
  }
  uni.navigateTo({ url: '/pages/im/messages' });
}

async function handleRefresh() {
  await territoryStore.refresh(userStore.isGuest);
  uni.showToast({ title: '已刷新', icon: 'success', duration: 1000 });
}

// ---- 地图画布 transform ----

const canvasStyle = computed(() => {
  return {
    transform: `translate(${panX.value}px, ${panY.value}px) scale(${scale.value})`,
    transition: dragging.value ? 'none' : 'transform 0.18s ease',
  };
});

// ---- 手势识别：单指拖动 + 双指缩放 ----

/** 是否处于拖动状态（用于关闭过渡动画） */
const dragging = ref(false);

/** touchstart 时的状态快照 */
interface GestureStart {
  touches: Array<{ x: number; y: number }>;
  panX: number;
  panY: number;
  scale: number;
  /** 双指初始距离 */
  pinchDist: number;
  /** touch 时间戳（区分 tap 与 drag） */
  startTime: number;
  /** 是否已移动超阈值 */
  moved: boolean;
}

let startState: GestureStart | null = null;
/** tap 判定阈值（px） */
const TAP_THRESHOLD = 8;
/** tap 时间阈值（ms） */
const TAP_TIME = 250;

/** touch 点的最小集合（H5/小程序统一） */
interface MiniTouch {
  pageX?: number;
  pageY?: number;
}

function readTouchList(src: unknown): MiniTouch[] {
  if (!src) return [];
  // TouchList 在 H5 上有 length/index，小程序上是数组
  return Array.from(src as ArrayLike<MiniTouch>);
}

function getTouches(
  e: { touches?: unknown; changedTouches?: unknown },
): Array<{ x: number; y: number }> {
  const list = readTouchList(e.touches).length
    ? readTouchList(e.touches)
    : readTouchList(e.changedTouches);
  return list.map((t) => ({
    x: (t.pageX ?? 0) as number,
    y: (t.pageY ?? 0) as number,
  }));
}

function pinchDistance(t1: { x: number; y: number }, t2: { x: number; y: number }): number {
  return Math.hypot(t2.x - t1.x, t2.y - t1.y);
}

function onTouchStart(e: { touches?: unknown; changedTouches?: unknown }) {
  const touches = getTouches(e);
  if (touches.length === 0) return;

  startState = {
    touches,
    panX: panX.value,
    panY: panY.value,
    scale: scale.value,
    pinchDist: touches.length >= 2 ? pinchDistance(touches[0], touches[1]) : 0,
    startTime: Date.now(),
    moved: false,
  };
  dragging.value = true;
}

function onTouchMove(e: { touches?: unknown; changedTouches?: unknown; preventDefault?: () => void }) {
  if (!startState) return;
  const touches = getTouches(e);
  if (touches.length === 0) return;

  // 阻止地图被原生滚动带走（H5）
  // #ifdef H5
  if (typeof e.preventDefault === 'function') e.preventDefault();
  // #endif

  if (touches.length >= 2 && startState.touches.length >= 2) {
    // 双指缩放
    const newDist = pinchDistance(touches[0], touches[1]);
    if (startState.pinchDist > 0) {
      const ratio = newDist / startState.pinchDist;
      territoryStore.setScale(startState.scale * ratio);
    }
    startState.moved = true;
  } else if (touches.length === 1 && startState.touches.length === 1) {
    // 单指拖动
    const dx = touches[0].x - startState.touches[0].x;
    const dy = touches[0].y - startState.touches[0].y;
    if (Math.abs(dx) > TAP_THRESHOLD || Math.abs(dy) > TAP_THRESHOLD) {
      startState.moved = true;
    }
    panX.value = startState.panX + dx;
    panY.value = startState.panY + dy;
  }
}

function onTouchEnd(e: { touches?: unknown; changedTouches?: unknown }) {
  dragging.value = false;
  if (!startState) return;

  const elapsed = Date.now() - startState.startTime;
  const isTap = !startState.moved && elapsed < TAP_TIME;

  if (isTap && startState.touches.length === 1) {
    // 通过 changedTouches 找到 tap 位置的节点
    const changed = getTouches(e);
    void changed;
  }

  startState = null;
}

// ---- 生命周期 ----

onMounted(async () => {
  try {
    const info = uni.getSystemInfoSync();
    statusBarHeight.value = info.statusBarHeight ?? 20;
  } catch {
    /* ignore */
  }

  await territoryStore.loadAll(userStore.isGuest);
});
</script>

<template>
  <view class="page-map">
    <!-- 自定义导航栏 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar__inner" :style="{ height: navBarHeight + 'px' }">
        <text class="navbar__title">
          我的领地
        </text>
        <text class="navbar__subtitle" @tap="resetView">
          ({{ territoryStore.viewport.centerX }}, {{ territoryStore.viewport.centerY }})
        </text>
      </view>
    </view>

    <!-- 地图主区域 -->
    <view
      class="map-canvas"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchEnd"
    >
      <!-- 迷雾层 -->
      <MapFog :scale="scale" />

      <!-- 网格 + 节点（可拖动可缩放的整体） -->
      <view class="grid" :style="canvasStyle">
        <!-- 网格背景线 -->
        <view class="grid__bg" />

        <!-- 领地节点 -->
        <TerritoryNode
          v-for="node in territoryStore.allNodes"
          :key="node.id"
          :node="node"
          :center-x="territoryStore.viewport.centerX"
          :center-y="territoryStore.viewport.centerY"
          :cell-size="territoryStore.viewport.cellSize"
          @tap="handleNodeTap"
        />
      </view>

      <!-- 缩放控件 -->
      <view class="zoom-controls">
        <view class="zoom-controls__btn" @tap="zoomIn">
          <text class="zoom-controls__icon">
            +
          </text>
        </view>
        <view class="zoom-controls__btn" @tap="zoomOut">
          <text class="zoom-controls__icon">
            −
          </text>
        </view>
        <view class="zoom-controls__btn zoom-controls__btn--reset" @tap="resetView">
          <text class="zoom-controls__icon">
            ⊙
          </text>
        </view>
      </view>

      <!-- 操作提示（首次进入） -->
      <view v-if="!dragging" class="gesture-hint">
        <text>双指缩放 · 单指拖动 · 点击邻居打招呼</text>
      </view>

      <!-- 错误提示条 -->
      <view v-if="territoryStore.error" class="error-bar">
        <text class="error-bar__text">
          {{ territoryStore.error }}
        </text>
      </view>
    </view>

    <!-- 顶部状态栏 -->
    <view class="map-status-wrap">
      <MapStatusBar
        :territory="territoryStore.mine"
        :user="userStore.profile"
        :scale="scale"
        :loading="territoryStore.loading"
        @messages="gotoMessages"
        @profile="gotoProfile"
        @refresh="handleRefresh"
      />
    </view>

    <!-- 邻居卡片 -->
    <TerritoryCard
      v-if="selectedNeighbor"
      :neighbor="selectedNeighbor"
      :is-guest="userStore.isGuest"
      @close="closeCard"
      @chat="handleChat"
      @visit="handleVisit"
    />

    <!-- 游客模式底部 banner -->
    <view v-if="userStore.isGuest" class="guest-banner">
      <text class="guest-banner__text">
        巢穴之门已为你打开，私聊与升级需先入驻
      </text>
      <view class="guest-banner__btn" @tap="handleVisit">
        <text>立即入驻</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page-map {
  position: relative;
  min-height: 100vh;
  background: $u-bg-color;
  overflow: hidden;
}

.navbar {
  position: relative;
  z-index: 10;
  background: $u-bg-color;
  border-bottom: 1rpx solid $u-border-color;

  &__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 32rpx;
  }
  &__title {
    font-size: 36rpx;
    font-weight: 600;
    color: $u-main-color;
  }
  &__subtitle {
    font-size: 22rpx;
    color: $u-tips-color;
    padding: 8rpx 16rpx;
    background: rgba(201, 168, 124, 0.1);
    border-radius: 16rpx;
  }
}

.map-canvas {
  position: relative;
  width: 100%;
  height: calc(100vh - 88rpx);
  background:
    radial-gradient(circle at center, $u-bg-color-light 0%, $u-bg-color 70%),
    $u-bg-color;
  overflow: hidden;
  touch-action: none;
}

.grid {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-origin: center center;
  will-change: transform;

  &__bg {
    position: absolute;
    inset: -2000px;
    background-image:
      linear-gradient(rgba(201, 168, 124, 0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(201, 168, 124, 0.04) 1px, transparent 1px);
    background-size: 64px 64px;
    pointer-events: none;
  }
}

.zoom-controls {
  position: absolute;
  right: 32rpx;
  bottom: 240rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  z-index: 20;

  &__btn {
    width: 80rpx;
    height: 80rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(30, 36, 31, 0.92);
    border: 1rpx solid rgba(201, 168, 124, 0.4);
    border-radius: 50%;
    backdrop-filter: blur(12rpx);
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.3);
    transition: transform 0.15s;
    &:active { transform: scale(0.9); }

    &--reset {
      background: rgba(201, 168, 124, 0.18);
    }
  }
  &__icon {
    font-size: 40rpx;
    font-weight: 600;
    color: $u-primary;
    line-height: 1;
  }
}

.gesture-hint {
  position: absolute;
  bottom: 280rpx;
  left: 50%;
  transform: translateX(-50%);
  padding: 12rpx 24rpx;
  background: rgba(30, 36, 31, 0.75);
  border: 1rpx solid rgba(201, 168, 124, 0.25);
  border-radius: 20rpx;
  font-size: 22rpx;
  color: $u-tips-color;
  backdrop-filter: blur(8rpx);
  z-index: 5;
  animation: hint-fade 6s ease-in-out forwards;
}

@keyframes hint-fade {
  0%, 60% { opacity: 1; }
  100%   { opacity: 0; }
}

.error-bar {
  position: absolute;
  top: 32rpx;
  left: 32rpx;
  right: 32rpx;
  padding: 16rpx 24rpx;
  background: rgba(192, 57, 43, 0.2);
  border: 1rpx solid rgba(192, 57, 43, 0.5);
  border-radius: 12rpx;
  z-index: 30;

  &__text {
    font-size: 24rpx;
    color: #f5f0e6;
  }
}

.map-status-wrap {
  position: absolute;
  top: 96rpx;
  left: 32rpx;
  right: 32rpx;
  z-index: 15;
}

.guest-banner {
  position: absolute;
  left: 32rpx;
  right: 32rpx;
  bottom: 180rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(38, 45, 39, 0.95);
  border: 1rpx solid $u-border-color;
  border-radius: 16rpx;
  padding: 24rpx;
  backdrop-filter: blur(20rpx);
  z-index: 18;

  &__text {
    font-size: 26rpx;
    color: $u-content-color;
    flex: 1;
    margin-right: 16rpx;
  }
  &__btn {
    padding: 12rpx 28rpx;
    background: linear-gradient(135deg, $u-primary 0%, $u-primary-dark 100%);
    color: $u-bg-color;
    border-radius: 24rpx;
    font-size: 24rpx;
    font-weight: 600;
  }
}
</style>
