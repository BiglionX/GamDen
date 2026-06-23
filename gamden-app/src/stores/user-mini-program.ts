import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type {
  UserMiniProgram,
  MiniProgramStatus,
  CertificationType,
  TutorialItem,
} from '@/types/mini-program';
import { STATUS_DISPLAY, ALLOWED_NEXT_STATUSES } from '@/types/mini-program';
import { miniProgramApi } from '@/utils/mini-program-api';

/**
 * 用户自主小程序申请 —— 状态管理
 *
 * 状态机：not_started → certifying → certified → deploying → reviewing → online
 * - record 为 null 表示：用户尚未解锁资格（邀请 < 3 人）
 * - record 不为 null：用户已解锁并可继续申请
 *
 * 与 gamden-backend/src/modules/mini-program/min-program.service.ts 对齐
 */
export const useUserMiniProgramStore = defineStore('user-mini-program', () => {
  // ======================== 状态 ========================

  /** 当前申请记录（未解锁或未拉取时为 null） */
  const record = ref<UserMiniProgram | null>(null);

  /** 加载状态 */
  const loading = ref(false);

  /** 提交操作进行中（用于按钮 loading 态） */
  const submitting = ref(false);

  /** 错误信息 */
  const error = ref<string | null>(null);

  /** 教程列表缓存 */
  const tutorials = ref<TutorialItem[]>([]);

  // ======================== 计算属性 ========================

  /** 当前状态（record 为 null 时视为 not_started 以便兜底 UI） */
  const status = computed<MiniProgramStatus>(
    () => record.value?.status ?? 'not_started',
  );

  /** 是否已解锁资格 */
  const unlocked = computed<boolean>(() => record.value !== null);

  /** 是否已上线 */
  const isOnline = computed<boolean>(() => status.value === 'online');

  /** 状态展示元数据 */
  const statusDisplay = computed(() => STATUS_DISPLAY[status.value]);

  /** 进度百分比（0-100） */
  const progressPercent = computed(() => {
    const p = statusDisplay.value.progress;
    return p.total === 0 ? 0 : Math.round((p.current / p.total) * 100);
  });

  /** 当前状态的合法下一状态集合（用于 UI 决定是否禁用按钮） */
  const nextStatuses = computed<readonly MiniProgramStatus[]>(
    () => ALLOWED_NEXT_STATUSES[status.value],
  );

  /** 主体类型标签 */
  const certificationLabel = computed<string | null>(() => {
    const t = record.value?.certificationType;
    if (!t) return null;
    return t === 'individual' ? '个人主体' : '企业 / 个体工商户';
  });

  // ======================== 动作 ========================

  /**
   * 拉取当前用户状态
   * - 用于页面 onMounted / onShow 刷新
   * - record=null 表示未解锁
   */
  async function fetchStatus(silent = false): Promise<void> {
    if (!silent) loading.value = true;
    error.value = null;
    try {
      record.value = await miniProgramApi.getStatus();
    } catch (e) {
      error.value = e instanceof Error ? e.message : '拉取状态失败';
    } finally {
      if (!silent) loading.value = false;
    }
  }

  /**
   * 开始申请（提交认证主体类型）
   * - not_started → certifying
   * - 同时刷新 record
   */
  async function apply(
    certificationType: CertificationType,
  ): Promise<UserMiniProgram> {
    submitting.value = true;
    error.value = null;
    try {
      const updated = await miniProgramApi.apply({ certificationType });
      record.value = updated;
      return updated;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '提交申请失败';
      throw e;
    } finally {
      submitting.value = false;
    }
  }

  /**
   * 提交 AppID + AppSecret
   * - certified → deploying
   * - 注意：成功后前端应引导用户进入"已部署"状态展示
   */
  async function submitAppid(
    appid: string,
    appSecret: string,
  ): Promise<UserMiniProgram> {
    submitting.value = true;
    error.value = null;
    try {
      const updated = await miniProgramApi.submitAppid({ appid, appSecret });
      record.value = updated;
      return updated;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '提交 AppID 失败';
      throw e;
    } finally {
      submitting.value = false;
    }
  }

  /**
   * 确认代码审核中（手动触发或自动触发）
   * - deploying → reviewing
   */
  async function confirmReviewing(): Promise<UserMiniProgram> {
    submitting.value = true;
    error.value = null;
    try {
      const updated = await miniProgramApi.confirmReviewing();
      record.value = updated;
      return updated;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '确认审核中失败';
      throw e;
    } finally {
      submitting.value = false;
    }
  }

  /**
   * 确认已上线
   * - reviewing → online
   */
  async function confirmOnline(): Promise<UserMiniProgram> {
    submitting.value = true;
    error.value = null;
    try {
      const updated = await miniProgramApi.confirmOnline();
      record.value = updated;
      return updated;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '确认上线失败';
      throw e;
    } finally {
      submitting.value = false;
    }
  }

  /**
   * 放弃申请（重置为 not_started）
   * - online 状态不可放弃
   */
  async function abandon(): Promise<UserMiniProgram> {
    submitting.value = true;
    error.value = null;
    try {
      const updated = await miniProgramApi.abandon();
      record.value = updated;
      return updated;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '放弃申请失败';
      throw e;
    } finally {
      submitting.value = false;
    }
  }

  /**
   * 加载教程列表（带简单缓存）
   */
  async function fetchTutorials(force = false): Promise<TutorialItem[]> {
    if (!force && tutorials.value.length > 0) return tutorials.value;
    try {
      tutorials.value = await miniProgramApi.getTutorials();
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载教程失败';
    }
    return tutorials.value;
  }

  /**
   * 清除错误
   */
  function clearError(): void {
    error.value = null;
  }

  /**
   * 重置（用于退出登录 / 切换账号）
   */
  function reset(): void {
    record.value = null;
    error.value = null;
    loading.value = false;
    submitting.value = false;
    tutorials.value = [];
  }

  return {
    // state
    record,
    loading,
    submitting,
    error,
    tutorials,
    // getters
    status,
    unlocked,
    isOnline,
    statusDisplay,
    progressPercent,
    nextStatuses,
    certificationLabel,
    // actions
    fetchStatus,
    apply,
    submitAppid,
    confirmReviewing,
    confirmOnline,
    abandon,
    fetchTutorials,
    clearError,
    reset,
  };
});
