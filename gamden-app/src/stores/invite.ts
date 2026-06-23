import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  InviteStats,
  InviteeItem,
  InvitePosterData,
  MiniProgramCodeData,
} from '@/types/invite';
import { inviteApi } from '@/utils/invite-api';

/**
 * 邀请裂变状态管理
 * - 邀请统计
 * - 被邀请人列表
 * - 海报数据
 * - 小程序码
 */
export const useInviteStore = defineStore('invite', () => {
  // ---- 状态 ----

  /** 邀请统计 */
  const stats = ref<InviteStats | null>(null);

  /** 被邀请人列表 */
  const invitees = ref<InviteeItem[]>([]);

  /** 海报数据 */
  const posterData = ref<InvitePosterData | null>(null);

  /** 小程序码 */
  const miniProgramCode = ref<MiniProgramCodeData | null>(null);

  /** 加载状态 */
  const loading = ref(false);
  const error = ref<string | null>(null);

  // ---- 计算 ----

  /** 当前用户邀请码（从 stats 提取） */
  const inviteCode = computed(() => stats.value?.code ?? '');

  /** 是否解锁小程序码 */
  const miniProgramUnlocked = computed(
    () => stats.value?.unlockedMiniProgram ?? false,
  );

  /** 解锁进度（0-1） */
  const unlockProgress = computed(() => {
    if (!stats.value) return 0;
    const { totalInvited, unlockThreshold } = stats.value;
    return Math.min(1, totalInvited / unlockThreshold);
  });

  /** 还需邀请人数（解锁小程序） */
  const remainingToUnlock = computed(() => {
    if (!stats.value) return 3;
    return Math.max(0, stats.value.unlockThreshold - stats.value.totalInvited);
  });

  // ---- 动作 ----

  /** 加载统计 */
  async function loadStats(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      stats.value = await inviteApi.getStats();
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载邀请统计失败';
      // 兜底 mock
      if (!stats.value) {
        stats.value = {
          code: 'ABC23456',
          totalInvited: 1,
          todayInvited: 0,
          weekInvited: 1,
          unlockThreshold: 3,
          unlockedMiniProgram: false,
          expiresAt: null,
        };
      }
    } finally {
      loading.value = false;
    }
  }

  /** 加载被邀请人 */
  async function loadInvitees(limit = 50): Promise<void> {
    try {
      invitees.value = await inviteApi.getInvitees(limit);
    } catch {
      invitees.value = [];
    }
  }

  /** 加载海报数据 */
  async function loadPosterData(): Promise<void> {
    try {
      posterData.value = await inviteApi.getPosterData();
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载海报数据失败';
      // 兜底 mock
      posterData.value = {
        nickname: '巢友9527',
        guardianType: 'mechanical',
        inviteCode: stats.value?.code ?? 'ABC23456',
        inviteUrl: 'https://gamden.matux.tech/pages/auth/login?inviteCode=ABC23456',
        totalInvited: stats.value?.totalInvited ?? 0,
        qrCodeDataUrl: '',
      };
    }
  }

  /** 加载小程序码 */
  async function loadMiniProgramCode(): Promise<void> {
    try {
      miniProgramCode.value = await inviteApi.getMiniProgramCode();
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载小程序码失败';
    }
  }

  /** 复制邀请码到剪贴板 */
  async function copyInviteCode(): Promise<void> {
    if (!inviteCode.value) return;
    try {
      uni.setClipboardData({ data: inviteCode.value });
      uni.showToast({ title: '已复制邀请码', icon: 'success' });
    } catch {
      uni.showToast({ title: '复制失败，请手动选择', icon: 'none' });
    }
  }

  /** 重置 */
  function reset(): void {
    stats.value = null;
    invitees.value = [];
    posterData.value = null;
    miniProgramCode.value = null;
    error.value = null;
  }

  return {
    // state
    stats,
    invitees,
    posterData,
    miniProgramCode,
    loading,
    error,
    // getters
    inviteCode,
    miniProgramUnlocked,
    unlockProgress,
    remainingToUnlock,
    // actions
    loadStats,
    loadInvitees,
    loadPosterData,
    loadMiniProgramCode,
    copyInviteCode,
    reset,
  };
});
