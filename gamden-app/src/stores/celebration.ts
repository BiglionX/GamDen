import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useUserStore } from './user';
import { useInviteStore } from './invite';
import {
  hasCelebrated,
  markCelebrated,
} from '@/utils/celebration-storage';
import { pushMiniProgramUnlocked } from '@/utils/push-helper';

/**
 * 邀请裂变里程碑定义
 */
export interface Milestone {
  /** 里程碑 key（用于持久化去重） */
  key: string;
  /** 触发条件：已邀请人数 */
  requiredInvited: number;
  /** 庆祝标题 */
  title: string;
  /** 守护灵对话气泡文案 */
  guardianText: string;
  /** 推送通知标题（应用未在前台时使用） */
  pushTitle: string;
  /** 推送通知内容 */
  pushContent: string;
}

/**
 * GamDen 庆祝里程碑配置
 * - V1.0: 仅 "邀请满 3 人解锁个人小程序" 一个里程碑
 * - 后续可扩展：邀请满 10 人 / 30 人等
 */
export const MILESTONES: Milestone[] = [
  {
    key: 'invite_3',
    requiredInvited: 3,
    title: '🏰 解锁个人专属小程序',
    guardianText:
      '你的领地已经容不下更多邻居了——是时候拥有一个属于自己的「城门口」了！',
    pushTitle: '🎉 你解锁了个人专属小程序！',
    pushContent: '邀请满 3 位好友，巢穴已为你敞开专属于你的城门口',
  },
];

/**
 * 庆祝事件状态机：
 *   idle      无待展示
 *   animating Canvas 撒花动画中
 *   dialog    动画结束，弹窗展示
 *   done      关闭后回到 idle
 */
export type CelebrationPhase = 'idle' | 'animating' | 'dialog' | 'done';

export const useCelebrationStore = defineStore('celebration', () => {
  // --------------------- 状态 ---------------------

  const phase = ref<CelebrationPhase>('idle');
  const currentMilestone = ref<Milestone | null>(null);
  const animationProgress = ref(0); // 0~1，动画进度（供 UI 同步使用）

  /** 个人中心 Tab 红点（独立于 phase 的"未读"状态） */
  const profileRedDot = ref(false);

  /** 应用是否在前台（用于决定走弹层还是推送） */
  const isAppForeground = ref(true);

  // --------------------- 计算 ---------------------

  const isVisible = computed(
    () => phase.value === 'animating' || phase.value === 'dialog',
  );

  // --------------------- 内部 ---------------------

  /**
   * 根据当前已邀请人数，匹配第一个未庆祝的里程碑
   */
  function matchMilestone(
    invitedCount: number,
    userId: string,
  ): Milestone | null {
    for (const m of MILESTONES) {
      if (invitedCount >= m.requiredInvited && !hasCelebrated(m.key, userId)) {
        return m;
      }
    }
    return null;
  }

  /**
   * 触发庆祝流程（在前台时调用）
   * - 启动 2s Canvas 动画
   * - 动画结束后切换到 dialog 阶段
   */
  async function trigger(milestone: Milestone, userId: string): Promise<void> {
    if (phase.value !== 'idle') return; // 已有进行中的庆祝，忽略
    currentMilestone.value = milestone;
    phase.value = 'animating';
    animationProgress.value = 0;

    // 标记已庆祝（即使后续用户中断也视为已触发，避免重复打扰）
    markCelebrated(milestone.key, userId);

    // 红点点亮（用户点进"我的小程序"后清除）
    profileRedDot.value = true;

    // 2s 动画后切换到弹窗阶段
    setTimeout(() => {
      if (phase.value === 'animating') {
        phase.value = 'dialog';
        animationProgress.value = 1;
      }
    }, 2000);
  }

  /**
   * 由 App.vue 的 onShow 调用：检测是否有新里程碑
   * - 应用前台：直接 trigger 弹层
   * - 应用后台：调用 push helper
   */
  async function checkOnAppShow(): Promise<void> {
    isAppForeground.value = true;
    const userStore = useUserStore();
    if (userStore.isGuest || !userStore.profile?.id) return;

    const userId = userStore.profile.id;
    const inviteStore = useInviteStore();

    // 加载最新的邀请统计（不阻塞 UI）
    inviteStore.loadStats().catch(() => {/* 忽略 */});
    // 等到 next tick 拿到最新 stats
    await new Promise((r) => setTimeout(r, 0));

    const invitedCount = inviteStore.stats?.totalInvited ?? 0;
    const milestone = matchMilestone(invitedCount, userId);
    if (!milestone) return;

    await trigger(milestone, userId);
  }

  /**
   * 由 App.vue 的 onHide 调用：检测并发送推送
   * - 在用户切到后台的瞬间，如果刚达到里程碑，发本地推送
   * - 注意：trigger 已经会标记为已庆祝，所以这里需要专门追踪"未触达的里程碑"
   */
  async function checkOnAppHide(): Promise<void> {
    isAppForeground.value = false;
    const userStore = useUserStore();
    if (userStore.isGuest || !userStore.profile?.id) return;

    // 仅在 phase=animating/dialog 时视为"应用在前台时已触达"，不重复推
    if (phase.value !== 'idle') return;

    const userId = userStore.profile.id;
    const inviteStore = useInviteStore();
    const invitedCount = inviteStore.stats?.totalInvited ?? 0;
    const milestone = matchMilestone(invitedCount, userId);
    if (!milestone) return;

    // 后台：标记为已庆祝 + 发推送（避免回到前台再次弹层）
    markCelebrated(milestone.key, userId);
    profileRedDot.value = true;
    await pushMiniProgramUnlocked();
  }

  // --------------------- 用户动作 ---------------------

  /**
   * 关闭弹窗（点"稍后再说"或点蒙层）
   */
  function dismiss(): void {
    phase.value = 'done';
    // 短延迟后回到 idle，给关闭动画时间
    setTimeout(() => {
      phase.value = 'idle';
      currentMilestone.value = null;
      animationProgress.value = 0;
    }, 300);
  }

  /**
   * 进入"我的小程序"页面（清除红点）
   */
  function clearProfileRedDot(): void {
    profileRedDot.value = false;
  }

  /**
   * 接收 WebSocket 推送（外部事件总线注入）
   * - IM 系统消息 / 自定义消息体中包含 type: 'mini_program_unlocked'
   */
  function onImSystemEvent(payload: { type: string; userId?: string }): void {
    if (payload.type !== 'mini_program_unlocked') return;
    const userStore = useUserStore();
    if (!userStore.profile?.id) return;
    const milestone = MILESTONES.find((m) => m.key === 'invite_3');
    if (!milestone) return;
    if (hasCelebrated(milestone.key, userStore.profile.id)) return;
    void trigger(milestone, userStore.profile.id);
  }

  return {
    // state
    phase,
    currentMilestone,
    animationProgress,
    profileRedDot,
    isAppForeground,
    // getters
    isVisible,
    // actions
    checkOnAppShow,
    checkOnAppHide,
    dismiss,
    clearProfileRedDot,
    onImSystemEvent,
  };
});
