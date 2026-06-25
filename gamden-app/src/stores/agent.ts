import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { AgentLine, AgentTriggerPayload, GuardianType, GuestGuideScene } from '@/types/agent';
import { getAgentLine, getGuestGuideLine } from '@/utils/agent-lines';
import { agentBus, AGENT_EVENTS } from '@/utils/agent-bus';
import { useUserStore } from '@/stores/user';
import { storage } from '@/utils/storage';

const LAST_WELCOME_KEY = 'gamden_agent_last_welcome_date';
const GUEST_GUIDE_BUBBLE_KEY = 'gamden_agent_guest_guide_bubble_shown';
/**
 * 频次控制记录（游客引导弹窗触发时间戳数组）
 * - 存储结构：number[]（毫秒时间戳，最近 10 次）
 * - 滑动窗口：30 分钟内最多 2 次
 */
const GUIDE_FREQUENCY_KEY = 'gamden_agent_guide_frequency';
/** 滑动窗口时长（30 分钟） */
const GUIDE_WINDOW_MS = 30 * 60 * 1000;
/** 窗口内允许的最大触发次数 */
const GUIDE_WINDOW_MAX = 2;
/** 软引导气泡自动淡出时间（15 秒） */
const GUEST_BUBBLE_DURATION_MS = 15_000;

/** 入驻流程完成标记 */
const ONBOARDING_COMPLETE_KEY = 'gamden_onboarding_complete';
/** 新手任务完成标记 */
const NEW_USER_TASK_COMPLETE_KEY = 'gamden_new_user_task_complete';

/** 入驻流程步骤枚举 */
export enum OnboardingStep {
  /** 未开始 */
  NOT_STARTED = 0,
  /** 注册页 */
  REGISTER = 1,
  /** 守护灵选择 */
  SELECT_GUARDIAN = 2,
  /** 领地分配 */
  TERRITORY = 3,
  /** 完成 */
  COMPLETE = 4,
}

/**
 * 守护灵状态管理
 * - 当前展示的话术队列（最多同时 1 条，新消息替换或排队）
 * - 今日是否已触发过 welcome（持久化日期）
 * - 游客态是否已显示过软引导（持久化 bool）
 * - **游客引导弹窗**：30 分钟内最多 2 次滑动窗口限流
 */
export const useAgentStore = defineStore('agent', () => {
  // ---- 状态 ----

  /** 当前展示的话术（最多一条，多条会被替换或排队） */
  const current = ref<AgentLine | null>(null);

  /** 排队中的下一条（当前展示完后自动展示） */
  const queued = ref<AgentLine | null>(null);

  /** 游客态软引导气泡是否显示（底部浮起） */
  const guestGuideVisible = ref(false);

  /** 守卫：是否在显示中（用于防止重复触发） */
  const showing = ref(false);

  // ---- 入驻引导状态 ----

  /** 入驻流程当前步骤 */
  const onboardingStep = ref<OnboardingStep>(OnboardingStep.NOT_STARTED);

  /** 已选择的守护灵类型（入驻流程中） */
  const onboardingGuardian = ref<GuardianType | null>(null);

  /** 是否已完成入驻流程 */
  const onboardingComplete = ref(false);

  /** 是否已完成新手任务 */
  const newUserTaskComplete = ref(false);

  // ---- 游客引导弹窗（受限操作触发） ----

  /** 引导弹窗是否显示 */
  const guideModalVisible = ref(false);

  /** 弹窗触发场景（用于差异化文案与埋点） */
  const guideModalScene = ref<GuestGuideScene>('default');

  // ---- 守护灵升级系统状态 ----

  /** 守护灵成长状态 */
  const agentState = ref<{
    agentLevel: number;
    exp: number;
    bondLevel: number;
    bondPoints: number;
    personalityTags: string[];
    unlockedEggs: string[];
    consecutiveDays: number;
    lastActiveAt: string;
    lastLevelUpAt: string | null;
  } | null>(null);

  /** 今日EXP进度 */
  const dailyProgress = ref<{
    signInCount: number;
    postCount: number;
    likeCount: number;
    inviteCount: number;
    marketCount: number;
    expGained: number;
    bondGained: number;
  } | null>(null);

  /** 守护灵状态加载中 */
  const agentStateLoading = ref(false);

  /** 是否显示升级特效 */
  const showUpgradeEffect = ref(false);

  /** 升级特效数据 */
  const upgradeEffectData = ref<{
    newLevel: number;
    text: string;
  } | null>(null);

  // ---- AI 智能对话系统状态 ----

  /** 能量状态 */
  const energyStatus = ref<{
    dailyUsed: number;
    dailyFree: number;
    purchasedBalance: number;
    remaining: number;
    total: number;
    percentage: number;
    level: 'abundant' | 'low' | 'depleted';
  } | null>(null);

  /** 对话历史 */
  const chatHistory = ref<{
    role: string;
    content: string;
    created_at?: string;
  }[]>([]);

  /** 长期记忆列表 */
  const memories = ref<any[]>([]);

  /** 对话加载中 */
  const chatLoading = ref(false);

  /** 能量加载中 */
  const energyLoading = ref(false);

  // ---- 计算 ----

  const userStore = useUserStore();

  const guardianType = computed<GuardianType | null>(
    () => userStore.profile?.guardianType ?? 'mechanical',
  );

  const isGuest = computed(() => userStore.isGuest);

  // ---- 动作 ----

  /**
   * 触发一条话术
   * - 已有展示中：进入排队
   * - 无展示中：立即展示
   */
  function trigger(payload: AgentTriggerPayload): void {
    const line = resolveLine(payload);
    if (!line) return;

    if (showing.value && current.value) {
      // 排队
      queued.value = line;
    } else {
      show(line);
    }
  }

  /**
   * 通过事件总线触发（供业务侧调用）
   */
  function publish(scene: AgentTriggerPayload['scene'], text?: string, duration?: number): void {
    trigger({ scene, text, duration });
  }

  /** 显示下一条 */
  function showNext(): void {
    if (queued.value) {
      const next = queued.value;
      queued.value = null;
      show(next);
    }
  }

  /** 手动关闭当前话术 */
  function dismiss(): void {
    showing.value = false;
    current.value = null;
    // 排队下一条
    setTimeout(() => showNext(), 200);
  }

  // ---- 游客软引导气泡（30 秒定时触发） ----

  /**
   * 显示游客软引导（30 秒触发后调用）
   * - 同一会话只显示一次（持久化到 storage）
   * - 15 秒后自动消失
   * - 点击由 AgentGuideBubble → useGuestRestriction 链路 → showGuideModal() 升级为完整弹窗
   */
  function showGuestGuide(): void {
    if (!isGuest.value) return;
    const shown = storage.get<boolean>(GUEST_GUIDE_BUBBLE_KEY, false);
    if (shown) return; // 已展示过

    storage.set(GUEST_GUIDE_BUBBLE_KEY, true);
    guestGuideVisible.value = true;

    setTimeout(() => {
      guestGuideVisible.value = false;
    }, GUEST_BUBBLE_DURATION_MS);
  }

  // ---- 入驻引导流程方法 ----

  /** 初始化入驻状态（从 storage 恢复） */
  function initOnboardingState(): void {
    onboardingComplete.value = storage.get<boolean>(ONBOARDING_COMPLETE_KEY, false) ?? false;
    newUserTaskComplete.value = storage.get<boolean>(NEW_USER_TASK_COMPLETE_KEY, false) ?? false;
  }

  /** 开始入驻流程（进入注册页） */
  function startOnboarding(): void {
    onboardingStep.value = OnboardingStep.REGISTER;
  }

  /** 设置已选择的守护灵并进入下一阶段 */
  function setOnboardingGuardian(type: GuardianType): void {
    onboardingGuardian.value = type;
    onboardingStep.value = OnboardingStep.SELECT_GUARDIAN;
  }

  /** 完成守护灵选择，进入领地分配 */
  function confirmGuardianSelection(): void {
    if (!onboardingGuardian.value) return;
    onboardingStep.value = OnboardingStep.TERRITORY;
  }

  /** 完成领地分配，标记入驻完成 */
  function completeOnboarding(): void {
    onboardingStep.value = OnboardingStep.COMPLETE;
    onboardingComplete.value = true;
    storage.set(ONBOARDING_COMPLETE_KEY, true);
  }

  /** 触发初次相遇话术 */
  function triggerFirstEncounter(): void {
    publish('firstEncounter');
  }

  /** 触发新手任务引导话术 */
  function triggerNewUserTask(): void {
    if (newUserTaskComplete.value) return;
    publish('newUserTask');
  }

  /** 标记新手任务完成并触发祝贺话术 */
  function completeNewUserTask(): void {
    newUserTaskComplete.value = true;
    storage.set(NEW_USER_TASK_COMPLETE_KEY, true);
    publish('taskComplete');
  }

  /** 检查是否需要展示新手任务引导 */
  function shouldShowNewUserTask(): boolean {
    return onboardingComplete.value && !newUserTaskComplete.value;
  }

  /** 关闭游客引导气泡 */
  function hideGuestGuide(): void {
    guestGuideVisible.value = false;
  }

  /** 重置气泡展示标记（用户从弹窗点"再看看"后允许再次显示） */
  function resetGuestGuideBubble(): void {
    storage.set(GUEST_GUIDE_BUBBLE_KEY, false);
  }

  // ---- 游客引导弹窗（受限操作触发） ----

  /**
   * 频次控制：滑动窗口（30 分钟内最多 2 次）
   * - 命中配额：返回 false（不显示）
   * - 未命中：返回 true（已记录本次触发）
   */
  function acquireGuideSlot(): boolean {
    const now = Date.now();
    const history = storage.get<number[]>(GUIDE_FREQUENCY_KEY, []) ?? [];
    // 过滤掉窗口外的旧记录
    const recent = history.filter((ts) => now - ts < GUIDE_WINDOW_MS);
    if (recent.length >= GUIDE_WINDOW_MAX) {
      // 同步写回（剪枝后的历史）
      storage.set(GUIDE_FREQUENCY_KEY, recent);
      return false;
    }
    recent.push(now);
    storage.set(GUIDE_FREQUENCY_KEY, recent);
    return true;
  }

  /**
   * 显示游客引导弹窗（受限操作触发）
   * - 自动应用频次控制：30 分钟内最多 2 次
   * - 超限时静默忽略，不打扰用户
   * - 同时会隐藏底部软引导气泡（避免双层 UI）
   */
  function showGuideModal(scene: GuestGuideScene = 'default'): boolean {
    if (!isGuest.value) return false;
    if (!acquireGuideSlot()) return false;

    guideModalScene.value = scene;
    guideModalVisible.value = true;
    // 触发弹窗时主动隐藏气泡，避免双层引导同屏
    guestGuideVisible.value = false;
    return true;
  }

  /** 关闭游客引导弹窗 */
  function dismissGuideModal(): void {
    guideModalVisible.value = false;
  }

  /** 当前弹窗应当展示的台词 */
  const guideModalLine = computed(() => {
    if (!guideModalVisible.value) return null;
    return getGuestGuideLine(guardianType.value ?? 'mechanical', guideModalScene.value);
  });

  // ---- 内部方法 ----

  function resolveLine(payload: AgentTriggerPayload): AgentLine | null {
    // 优先用自定义文案
    if (payload.text) {
      return {
        guardian: guardianType.value ?? 'mechanical',
        scene: payload.scene,
        text: payload.text,
        duration: payload.duration ?? 5000,
      };
    }
    // 否则查话术库
    return getAgentLine(guardianType.value, payload.scene);
  }

  function show(line: AgentLine): void {
    current.value = line;
    showing.value = true;

    // 自动关闭（默认 5 秒，游客引导 15 秒）
    const duration = line.duration ?? 5000;
    setTimeout(() => {
      if (current.value === line) {
        dismiss();
      }
    }, duration);

    // TODO: V1.1 OpenIM 自定义消息
    // await openim.sendCustomMessage({
    //   type: 'agent:line',
    //   payload: { guardian, scene, text },
    // });
  }

  // ---- 守护灵升级系统方法 ----

  /** 获取守护灵成长状态 */
  async function fetchAgentState(): Promise<void> {
    const userStore = useUserStore();
    if (!userStore.isLoggedIn) return;

    agentStateLoading.value = true;
    try {
      const res = await uni.request({
        url: '/api/agent/state',
        method: 'GET',
      });
      if (res.statusCode === 200 && res.data) {
        agentState.value = res.data as typeof agentState.value;
      }
    } catch (e) {
      console.error('[AgentStore] fetchAgentState error:', e);
    } finally {
      agentStateLoading.value = false;
    }
  }

  /** 获取今日EXP进度 */
  async function fetchDailyProgress(): Promise<void> {
    const userStore = useUserStore();
    if (!userStore.isLoggedIn) return;

    try {
      const res = await uni.request({
        url: '/api/agent/daily-progress',
        method: 'GET',
      });
      if (res.statusCode === 200 && res.data) {
        dailyProgress.value = res.data as typeof dailyProgress.value;
      }
    } catch (e) {
      console.error('[AgentStore] fetchDailyProgress error:', e);
    }
  }

  /** 触发升级特效 */
  function triggerUpgradeEffect(newLevel: number, text: string): void {
    upgradeEffectData.value = { newLevel, text };
    showUpgradeEffect.value = true;
  }

  /** 隐藏升级特效 */
  function hideUpgradeEffect(): void {
    showUpgradeEffect.value = false;
    upgradeEffectData.value = null;
  }

  // ---- AI 智能对话系统方法 ----

  /** 获取能量状态 */
  async function fetchEnergyStatus(): Promise<void> {
    if (!userStore.isLoggedIn) return;

    energyLoading.value = true;
    try {
      const res = await uni.request({
        url: '/api/agent/energy',
        method: 'GET',
      });
      if (res.statusCode === 200 && (res.data as any)?.data) {
        energyStatus.value = (res.data as any).data;
      }
    } catch (e) {
      console.error('[AgentStore] fetchEnergyStatus error:', e);
    } finally {
      energyLoading.value = false;
    }
  }

  /** 发送 AI 对话消息 */
  async function sendChatMessage(message: string): Promise<{
    text: string;
    tokensUsed: number;
    isDegraded: boolean;
    degradedReason?: string;
  } | null> {
    if (!userStore.isLoggedIn) return null;

    chatLoading.value = true;
    try {
      const res = await uni.request({
        url: '/api/agent/chat',
        method: 'POST',
        data: { message },
      });
      if (res.statusCode === 200 && (res.data as any)?.data) {
        const data = (res.data as any).data;
        // 更新对话历史
        chatHistory.value.push(
          { role: 'user', content: message },
          { role: 'agent', content: data.text }
        );
        // 更新能量状态
        if (energyStatus.value) {
          energyStatus.value.remaining = data.remainingToken;
          energyStatus.value.dailyUsed += data.tokensUsed;
        }
        return {
          text: data.text,
          tokensUsed: data.tokensUsed,
          isDegraded: data.isDegraded,
          degradedReason: data.degradedReason
        };
      }
      return null;
    } catch (e) {
      console.error('[AgentStore] sendChatMessage error:', e);
      return null;
    } finally {
      chatLoading.value = false;
    }
  }

  /** 获取对话历史 */
  async function fetchChatHistory(): Promise<void> {
    if (!userStore.isLoggedIn) return;

    chatLoading.value = true;
    try {
      const res = await uni.request({
        url: '/api/agent/conversations',
        method: 'GET',
      });
      if (res.statusCode === 200 && (res.data as any)?.data) {
        const data = (res.data as any).data;
        chatHistory.value = data.conversations || [];
        if (energyStatus.value) {
          energyStatus.value.level = data.energyLevel;
        }
      }
    } catch (e) {
      console.error('[AgentStore] fetchChatHistory error:', e);
    } finally {
      chatLoading.value = false;
    }
  }

  /** 清空对话历史 */
  async function clearChatHistory(): Promise<boolean> {
    if (!userStore.isLoggedIn) return false;

    try {
      const res = await uni.request({
        url: '/api/agent/history',
        method: 'DELETE',
      });
      if (res.statusCode === 200) {
        chatHistory.value = [];
        return true;
      }
      return false;
    } catch (e) {
      console.error('[AgentStore] clearChatHistory error:', e);
      return false;
    }
  }

  /** 获取记忆列表 */
  async function fetchMemories(): Promise<void> {
    if (!userStore.isLoggedIn) return;

    try {
      const res = await uni.request({
        url: '/api/agent/memories',
        method: 'GET',
      });
      if (res.statusCode === 200 && (res.data as any)?.data) {
        memories.value = (res.data as any).data.memories || [];
      }
    } catch (e) {
      console.error('[AgentStore] fetchMemories error:', e);
    }
  }

  /** 是否降智模式 */
  const isDegraded = computed(() => energyStatus.value?.level === 'depleted');

  /** 能量百分比 */
  const energyPercentage = computed(() => {
    if (!energyStatus.value) return 0;
    return Math.round(energyStatus.value.percentage * 100);
  });

  // ---- 事件总线桥接 ----

  /**
   * 在 App.vue 的 onMounted 中调用一次，订阅 agentBus 转发到 store
   */
  function bindEventBus(): () => void {
    const offs = [
      agentBus.on(AGENT_EVENTS.WELCOME, () => publish('welcome')),
      agentBus.on(AGENT_EVENTS.UPGRADE, (p) => {
        const payload = p as { text?: string } | undefined;
        publish('upgrade', payload?.text);
      }),
      agentBus.on(AGENT_EVENTS.INVITE, (p) => {
        const payload = p as { text?: string } | undefined;
        publish('invite', payload?.text);
      }),
      agentBus.on(AGENT_EVENTS.GUEST_GUIDE, () => showGuestGuide()),
      agentBus.on(AGENT_EVENTS.TERRITORY, (p) => {
        const payload = p as { text?: string } | undefined;
        publish('territory', payload?.text);
      }),
    ];
    return () => offs.forEach((off) => off());
  }

  // ---- 守卫：每日首次登录 welcome ----

  /**
   * 在 App.vue onLaunch 调用
   * - 游客态不触发（让游客看到的是引导，不是欢迎）
   * - 已注册用户：今日首次登录时触发 welcome
   */
  function tryDailyWelcome(): void {
    if (isGuest.value) return;
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const last = storage.get<string>(LAST_WELCOME_KEY, '');
    if (last === today) return; // 今天已经欢迎过
    storage.set(LAST_WELCOME_KEY, today);
    // 延迟 1 秒，等首屏渲染完成
    setTimeout(() => publish('welcome'), 1000);
  }

  return {
    // state
    current,
    queued,
    guestGuideVisible,
    showing,
    guideModalVisible,
    guideModalScene,
    guideModalLine,
    onboardingStep,
    onboardingGuardian,
    onboardingComplete,
    newUserTaskComplete,
    // 守护灵升级系统状态
    agentState,
    dailyProgress,
    agentStateLoading,
    showUpgradeEffect,
    upgradeEffectData,
    // getters
    guardianType,
    isGuest,
    // actions
    trigger,
    publish,
    showNext,
    dismiss,
    showGuestGuide,
    hideGuestGuide,
    resetGuestGuideBubble,
    showGuideModal,
    dismissGuideModal,
    acquireGuideSlot,
    bindEventBus,
    tryDailyWelcome,
    // 入驻引导
    initOnboardingState,
    startOnboarding,
    setOnboardingGuardian,
    confirmGuardianSelection,
    completeOnboarding,
    triggerFirstEncounter,
    triggerNewUserTask,
    completeNewUserTask,
    shouldShowNewUserTask,
    // 守护灵升级系统方法
    fetchAgentState,
    fetchDailyProgress,
    triggerUpgradeEffect,
    hideUpgradeEffect,
    // AI 智能对话系统状态
    energyStatus,
    chatHistory,
    memories,
    chatLoading,
    energyLoading,
    // AI 智能对话系统方法
    fetchEnergyStatus,
    sendChatMessage,
    fetchChatHistory,
    clearChatHistory,
    fetchMemories,
    // AI 计算属性
    isDegraded,
    energyPercentage,
  };
});