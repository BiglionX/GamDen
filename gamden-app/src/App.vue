<script setup lang="ts">
import { computed } from 'vue';
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app';
import { useUserStore } from '@/stores/user';
import { useAgentStore } from '@/stores/agent';
import { useImStore } from '@/stores/im';
import { useCelebrationStore } from '@/stores/celebration';
import { initPushService } from '@/utils/push';
import { initTrack, flushTrackQueue } from '@/utils/track';
import AgentDialog from '@/components/agent/AgentDialog.vue';
import AgentGuideBubble from '@/components/agent/AgentGuideBubble.vue';
import GuestGuideModal from '@/components/agent/GuestGuideModal.vue';
import ConfettiCanvas from '@/components/celebration/ConfettiCanvas.vue';
import GuardianCelebrationDialog from '@/components/celebration/GuardianCelebrationDialog.vue';

const userStore = useUserStore();
const agentStore = useAgentStore();
const imStore = useImStore();
const celebrationStore = useCelebrationStore();

// 庆祝层展示条件
const showConfetti = computed(() => celebrationStore.phase === 'animating');
const showCelebrationDialog = computed(
  () => celebrationStore.phase === 'dialog' && !!celebrationStore.currentMilestone,
);

/** 守护灵主按钮：跳转到我的小程序 */
function onCelebrationPrimary(): void {
  celebrationStore.dismiss();
  uni.navigateTo({
    url: '/pages/invite/mini-program',
    fail: () => {
      // 兜底：跳到个人中心
      uni.switchTab({ url: '/pages/profile/index' });
    },
  });
}

/** 守护灵次按钮：稍后再说 */
function onCelebrationSecondary(): void {
  celebrationStore.dismiss();
}

/** 蒙层点击 */
function onCelebrationMask(): void {
  celebrationStore.dismiss();
}

// 游客态软引导 30 秒定时器
const GUEST_GUIDE_DELAY_MS = 30_000;
let guestGuideTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleGuestGuide() {
  // 仅在游客态下启用
  if (!userStore.isGuest) {
    if (guestGuideTimer) {
      clearTimeout(guestGuideTimer);
      guestGuideTimer = null;
    }
    return;
  }
  if (guestGuideTimer) return; // 已调度
  guestGuideTimer = setTimeout(() => {
    agentStore.showGuestGuide();
    guestGuideTimer = null;
  }, GUEST_GUIDE_DELAY_MS);
}

onLaunch(async () => {
  console.log('[GamDen] App Launch');

  // 0. 初始化埋点（恢复离线队列 + 启动定时 flush）
  initTrack();

  // 1. 恢复用户登录态（含 GamDen token + IM token）
  userStore.hydrate();

  // 2. 订阅守护灵事件总线（upgrade/invite/welcome 等）
  agentStore.bindEventBus();

  // 3. 启动 IM（初始化 SDK + 如有本地 IM token 自动登录）
  //    必须在业务逻辑之前，确保用户登录后 IM 即时可用
  imStore.bootstrap().catch((e) => {
    console.warn('[GamDen] IM bootstrap 失败:', e);
  });

  // 4. 尝试触发每日 welcome（仅注册用户）
  agentStore.tryDailyWelcome();

  // 5. 游客态：调度 30 秒软引导
  scheduleGuestGuide();

  // 6. 启动时检测是否需要播放庆祝动画（应用冷启动场景）
  celebrationStore.checkOnAppShow().catch((e) => {
    console.warn('[GamDen] 庆祝检查失败:', e);
  });

  // 7. 初始化推送服务（unipush / 微信订阅消息 / H5 Notification）
  //    - 仅注册用户初始化（游客态没必要推送）
  //    - 获取 push client id → 注册到后端 → 监听点击事件
  if (userStore.isLoggedIn) {
    initPushService().catch((e) => {
      console.warn('[GamDen] Push 初始化失败:', e);
    });
  }
});

onShow(() => {
  console.log('[GamDen] App Show');
  // 每次前台化时重新调度游客引导（保证新会话也能触发）
  if (userStore.isGuest) {
    scheduleGuestGuide();
  }
  // 每次前台化都做一次里程碑检测（覆盖"应用在后台时达到里程碑"的场景）
  celebrationStore.checkOnAppShow().catch((e) => {
    console.warn('[GamDen] 庆祝检查失败:', e);
  });
  // 已登录用户 → 推送服务初始化（App.vue onLaunch 期间可能 hydrate 尚未完成）
  // push.ts 内部会判断 push_client_id 缓存，避免重复注册
  if (userStore.isLoggedIn) {
    initPushService().catch((e) => {
      console.warn('[GamDen] Push 初始化失败:', e);
    });
  }
});

onHide(() => {
  console.log('[GamDen] App Hide');
  // 后台时清掉定时器，避免回到前台立即弹出
  if (guestGuideTimer) {
    clearTimeout(guestGuideTimer);
    guestGuideTimer = null;
  }
  // 通知 store 当前为后台态
  celebrationStore.checkOnAppHide().catch((e) => {
    console.warn('[GamDen] 庆祝 hide 检查失败:', e);
  });
  // 进入后台：立即 flush 埋点队列（避免事件丢失）
  flushTrackQueue().catch(() => {
    /* swallow */
  });
});
</script>

<template>
  <!-- 业务页面插槽 -->
  <slot />

  <!-- 全局守护灵对话气泡（z-index: 9000） -->
  <AgentDialog />

  <!-- 全局游客软引导气泡（z-index: 8000） -->
  <AgentGuideBubble />

  <!-- 全局游客引导弹窗（z-index: 9500，受限操作触发） -->
  <GuestGuideModal />

  <!-- 全局撒花动画（z-index: 9998） -->
  <ConfettiCanvas
    :visible="showConfetti"
    :duration="2000"
    :particle-count="50"
  />

  <!-- 全局守护灵庆祝弹窗（z-index: 9999） -->
  <GuardianCelebrationDialog
    :visible="showCelebrationDialog"
    guardian-icon="🧚"
    guardian-name="巢灵"
    guardian-color="#C9A87C"
    badge="🏰 里程碑达成"
    :title="celebrationStore.currentMilestone?.title ?? '🎉 恭喜解锁！'"
    :body="celebrationStore.currentMilestone?.guardianText ?? ''"
    :primary-button="{ text: '去看看我的小程序', primary: true }"
    :secondary-button="{ text: '稍后再说' }"
    @primary="onCelebrationPrimary"
    @secondary="onCelebrationSecondary"
    @dismiss="onCelebrationMask"
  />
</template>

<style lang="scss">
/* ============================================================
 * GamDen 全局样式系统
 * 加载顺序：
 *   1. uni.scss     - uview-plus 主题变量（$u-* 系列）
 *   2. global.scss  - 业务样式系统（$gamden-* + 古风 mixin + 全局类）
 * ============================================================ */

@import '@/uni.scss';
@import '@/styles/global.scss';
</style>
