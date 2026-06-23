/**
 * 守护灵事件总线
 *
 * 用途：
 *  - 业务侧触发（如领地升级完成、邀请好友成功）→ publishAgentEvent
 *  - App.vue 监听 → 转发到 agent store → 渲染 AgentDialog
 *
 * 实现：mitt 风格的轻量 EventEmitter（避免引入额外依赖）
 */

type Handler = (payload: unknown) => void;

class EventBus {
  private listeners = new Map<string, Set<Handler>>();

  on(event: string, handler: Handler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: Handler): void {
    this.listeners.get(event)?.delete(handler);
  }

  emit(event: string, payload?: unknown): void {
    this.listeners.get(event)?.forEach((h) => {
      try {
        h(payload);
      } catch (err) {
        console.error(`[agent-bus] handler error for "${event}":`, err);
      }
    });
  }
}

export const agentBus = new EventBus();

/** 标准事件名 */
export const AGENT_EVENTS = {
  WELCOME: 'agent:welcome',
  UPGRADE: 'agent:upgrade',
  INVITE: 'agent:invite',
  GUEST_GUIDE: 'agent:guestGuide',
  TERRITORY: 'agent:territory',
} as const;

export type AgentEventName = (typeof AGENT_EVENTS)[keyof typeof AGENT_EVENTS];
