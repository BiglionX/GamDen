/**
 * 数据埋点工具 —— 客户端
 *
 * 职责：
 *  1. track()：埋点入口，自动入队 + 批量发送
 *  2. flushTrackQueue()：立即上报（页面切换 / 卸载前调用）
 *  3. TrackEvent：事件名常量（与后端 PushScene / 后端埋点表一一对应）
 *
 * 多端兼容：
 *  - H5 / 微信小程序 / APP 均通过 http.post 上报到后端 /api/v1/track/batch
 *  - 通过 X-Device-ID 头关联游客态埋点
 *
 * 设计原则：
 *  - 队列批量：每 10 个事件或 5 秒触发一次上报
 *  - 失败重试：上报失败的事件暂存到本地 storage，下次启动时恢复
 *  - fire-and-forget：不阻塞业务调用
 */

import { http } from './request';

// ======================== 事件常量 ========================

/**
 * 埋点事件名常量
 * - 与后端 mini-program.service.ts 埋点调用、需求文档一致
 * - 前端必须使用此常量，不允许拼字符串
 */
export const TrackEvent = {
  // ========== 小程序相关 ==========
  /** 用户邀请满 3 人（后端触发：AuthService.register） */
  MpQualificationUnlocked: 'mp_qualification_unlocked',
  /** 用户点击"开始申请"（前端按钮：mini-program.vue） */
  MpApplyStart: 'mp_apply_start',
  /** 用户确认已提交认证（前端按钮：certification-type.vue） */
  MpCertSubmitted: 'mp_cert_submitted',
  /** 用户提交 AppID（后端触发：MiniProgramService.submitAppid） */
  MpAppidSubmitted: 'mp_appid_submitted',
  /** 代码提交审核（后端触发：MiniProgramService.confirmReviewing） */
  MpCodeSubmitted: 'mp_code_submitted',
  /** 小程序上线（后端触发：MiniProgramService.confirmOnline） */
  MpOnline: 'mp_online',
  /** 用户查看教程（前端触发：HelpCenterSheet 切换 Tab） */
  MpGuideViewed: 'mp_guide_viewed',
  /** 用户放弃申请（后端触发：MiniProgramService.abandon） */
  MpAbandon: 'mp_abandon',
  /** 用户点击联系客服（前端按钮：HelpCenterSheet） */
  MpHelpClicked: 'mp_help_clicked',

  // ========== 入驻引导流程 ==========
  /** 软引导气泡弹出 */
  OnboardingGuideBubbleShown: 'onboarding_guide_bubble_shown',
  /** 用户点击软引导气泡 */
  OnboardingGuideClicked: 'onboarding_guide_clicked',
  /** 用户进入注册页 */
  OnboardingRegisterStarted: 'onboarding_register_started',
  /** 用户完成守护灵选择 */
  OnboardingGuardianSelected: 'onboarding_guardian_selected',
  /** 领地分配动画完成 */
  OnboardingTerritoryLanded: 'onboarding_territory_landed',
  /** 用户完成新手任务 */
  OnboardingCompleted: 'onboarding_completed',

  // ========== 守护灵升级系统 ==========
  /** 经验值增加 */
  AgentExpGained: 'agent_exp_gained',
  /** 守护灵升级 */
  AgentLevelUp: 'agent_level_up',
  /** 亲密度增加 */
  AgentBondGained: 'agent_bond_gained',
  /** 亲密度升阶 */
  AgentBondUp: 'agent_bond_up',
  /** 彩蛋触发 */
  AgentEggTriggered: 'agent_egg_triggered',
  /** 主动关心触发 */
  AgentCareTriggered: 'agent_care_triggered',
  /** 用户发起对话 */
  AgentDialogueInit: 'agent_dialogue_init',
  /** 守护灵回复 */
  AgentDialogueResp: 'agent_dialogue_resp',
  /** 查看守护灵详情页 */
  AgentDetailViewed: 'agent_detail_viewed',
} as const;

export type TrackEventName = (typeof TrackEvent)[keyof typeof TrackEvent];

/** 教程类型 */
export type GuideType = 'apply' | 'appid' | 'review' | 'online' | 'faq' | 'overview';

// ======================== 队列与上报 ========================

interface QueuedEvent {
  eventName: string;
  properties?: Record<string, unknown>;
  pageUrl?: string;
  platform?: string;
  ts: number;
}

/** 内存事件队列 */
const eventQueue: QueuedEvent[] = [];

/** 本地持久化 key（App 卸载前未上报的事件存这里） */
const PENDING_STORAGE_KEY = 'gamden_pending_track_events';

/** 队列触发阈值：达到此数量立即上报 */
const FLUSH_THRESHOLD = 10;
/** 队列自动 flush 间隔（毫秒） */
const FLUSH_INTERVAL = 5000;

let flushTimer: ReturnType<typeof setTimeout> | null = null;
let initialized = false;

/**
 * 初始化埋点（App.vue onLaunch 调用）
 * - 恢复上次未上报的离线事件
 * - 启动定时 flush
 */
export function initTrack(): void {
  if (initialized) return;
  initialized = true;
  recoverPending();
  // 启动定时 flush（避免长会话中事件堆积）
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = setInterval(() => flushTrackQueue(), FLUSH_INTERVAL);
}

/**
 * 上报单个埋点事件
 *
 * @param eventName 事件名（推荐使用 TrackEvent 常量）
 * @param properties 业务附加字段
 * @param options.pageUrl 当前页面路径（可选，默认自动取 currentPage）
 *
 * @example
 *   track(TrackEvent.MpApplyStart, { certification_type: 'individual' });
 *   track(TrackEvent.MpGuideViewed, { guide_type: 'apply' });
 */
export function track(
  eventName: TrackEventName | string,
  properties?: Record<string, unknown>,
  options?: { pageUrl?: string },
): void {
  const evt: QueuedEvent = {
    eventName,
    properties,
    pageUrl: options?.pageUrl ?? getCurrentPageUrl(),
    platform: getPlatform(),
    ts: Date.now(),
  };

  eventQueue.push(evt);

  // 达到阈值立即上报
  if (eventQueue.length >= FLUSH_THRESHOLD) {
    flushTrackQueue();
  }
}

/**
 * 立即上报队列中所有事件（页面 onUnload / App.onHide 时调用）
 */
export async function flushTrackQueue(): Promise<void> {
  if (eventQueue.length === 0) return;

  // 复制并清空（避免上报过程中新增事件丢失）
  const batch = eventQueue.splice(0, eventQueue.length);

  try {
    await http.post(
      '/v1/track/batch',
      { events: batch.map((e) => ({
        eventName: e.eventName,
        properties: e.properties,
        pageUrl: e.pageUrl,
        platform: e.platform,
      })) },
      { silent: true, skipAuthRedirect: true },
    );
  } catch (e) {
    // 上报失败：暂存到本地，下次启动时恢复
    persistPending(batch);
    if (typeof console !== 'undefined') {
      console.warn('[Track] 批量上报失败，已暂存离线队列:', batch.length, e);
    }
  }
}

// ======================== 离线恢复 ========================

function persistPending(events: QueuedEvent[]): void {
  try {
    const raw = uni.getStorageSync(PENDING_STORAGE_KEY);
    const list: QueuedEvent[] = raw ? (JSON.parse(raw as string) as QueuedEvent[]) : [];
    list.push(...events);
    // 上限 100 条（防止本地存储爆炸）
    const trimmed = list.slice(-100);
    uni.setStorageSync(PENDING_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore
  }
}

function recoverPending(): void {
  try {
    const raw = uni.getStorageSync(PENDING_STORAGE_KEY);
    if (!raw) return;
    const list: QueuedEvent[] = JSON.parse(raw as string) as QueuedEvent[];
    if (list.length === 0) return;
    eventQueue.unshift(...list);
    uni.removeStorageSync(PENDING_STORAGE_KEY);
    if (typeof console !== 'undefined') {
      console.log('[Track] 恢复离线事件:', list.length);
    }
  } catch {
    // ignore
  }
}

// ======================== 辅助函数 ========================

/**
 * 获取当前页面路径
 * - 优先 getCurrentPages()（多端通用）
 * - fallback: '/'
 */
function getCurrentPageUrl(): string {
  // 统一用宽松类型（多端 Page 实例字段不完全一致）
  type PageLike = { route?: string };
  type PageWithMeta = { $page?: { fullPath?: string } };

  try {
    if (typeof getCurrentPages !== 'function') return '/';
    const pages = getCurrentPages() as Array<PageLike & PageWithMeta>;
    if (!pages || pages.length === 0) return '/';

    const top = pages[pages.length - 1]!;
    return top.$page?.fullPath ?? `/${top.route ?? ''}`;
  } catch {
    return '/';
  }
}

/**
 * 获取客户端平台
 * - H5 / mp-weixin / mp-alipay / app-plus
 */
function getPlatform(): string {
  try {
    // #ifdef H5
    return 'h5';
    // #endif
    // #ifdef MP-WEIXIN
    return 'mp-weixin';
    // #endif
    // #ifdef MP-ALIPAY
    return 'mp-alipay';
    // #endif
    // #ifdef APP-PLUS
    return 'app-plus';
    // #endif
    return 'unknown';
  } catch {
    return 'unknown';
  }
}
