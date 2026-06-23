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

  // ---- 游客引导弹窗（受限操作触发） ----

  /** 引导弹窗是否显示 */
  const guideModalVisible = ref(false);

  /** 弹窗触发场景（用于差异化文案与埋点） */
  const guideModalScene = ref<GuestGuideScene>('default');

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
  };
});