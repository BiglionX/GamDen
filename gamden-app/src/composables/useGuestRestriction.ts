import type { App, Directive, DirectiveBinding } from 'vue';
import { useUserStore } from '@/stores/user';
import { useAgentStore } from '@/stores/agent';
import type { GuestGuideScene } from '@/types/agent';

/**
 * 游客态权限控制
 *
 * 设计目标：
 * 1. 业务侧可一行接入：通过组合式函数 useGuestRestriction() 拿到 guard()，
 *    在受限操作的回调里第一行调用即可
 * 2. 模板侧可零侵入接入：通过 v-guest-restricted 指令绑定元素点击事件，
 *    游客态点击会拦截并弹引导弹窗
 *
 * 触发逻辑：
 * - 已注册用户：guard() 返回 true，原逻辑继续执行
 * - 游客用户：guard() 返回 false，触发引导弹窗并阻止原操作
 *
 * 频次控制由 agent store 的 showGuideModal() 内部负责（30 分钟最多 2 次）
 */

export interface GuestRestrictionOptions {
  /** 弹窗场景（决定话术文案与埋点） */
  scene?: GuestGuideScene;
  /**
   * 自定义登录跳转 URL（默认 /pages/auth/login）
   * - 在弹窗点主按钮时跳转
   */
  loginUrl?: string;
}

export interface UseGuestRestrictionReturn {
  /** 当前是否为游客态 */
  isGuest: ReturnType<typeof useUserStore>['isGuest'];
  /**
   * 守卫函数：在受限操作入口处调用
   * - 返回 true 表示已放行（已注册用户或游客已经过引导后仍允许本次）
   * - 返回 false 表示被拦截（已触发引导弹窗，原操作不要继续）
   */
  guard: (opts?: GuestRestrictionOptions) => boolean;
  /**
   * 主动唤起引导弹窗
   * - 不需要等用户点击也能调用（例如页面 onLoad 时根据场景预唤起）
   */
  prompt: (scene?: GuestGuideScene) => boolean;
}

/**
 * 组合式函数：在 setup() 中调用拿到守卫
 *
 * @example
 * ```ts
 * const { guard } = useGuestRestriction();
 *
 * function handleLike() {
 *   if (!guard({ scene: 'like' })) return;
 *   // ...真实点赞逻辑
 * }
 * ```
 */
export function useGuestRestriction(): UseGuestRestrictionReturn {
  const userStore = useUserStore();
  const agentStore = useAgentStore();

  function guard(opts: GuestRestrictionOptions = {}): boolean {
    if (!userStore.isGuest) return true;
    agentStore.showGuideModal(opts.scene ?? 'default');
    return false;
  }

  function prompt(scene: GuestGuideScene = 'default'): boolean {
    return agentStore.showGuideModal(scene);
  }

  return {
    isGuest: userStore.isGuest,
    guard,
    prompt,
  };
}

/**
 * v-guest-restricted 指令
 *
 * 用法：
 *   <button v-guest-restricted="'like'" @click="onLike">点赞</button>
 *   <button v-guest-restricted="{ scene: 'post' }" @click="onPost">发帖</button>
 *
 * 工作原理：
 * - 在 bind 阶段给元素绑定一个 tap 捕获事件
 * - 触发顺序：先于业务侧 @click 之前判断
 * - 已注册用户：放行，业务侧 @click 正常触发
 * - 游客用户：阻止事件传播 + 唤起引导弹窗（不进入业务侧 @click）
 *
 * 注意：
 * - 在小程序端 uni-app 中，事件修饰符 .stop / .capture 不一定生效，
 *   因此通过 handler 在事件触发时返回 false 来阻止业务侧事件
 */
type RestrictValue = GuestGuideScene | GuestRestrictionOptions | undefined | null;

function resolveOptions(value: RestrictValue): GuestRestrictionOptions {
  if (!value) return { scene: 'default' };
  if (typeof value === 'string') return { scene: value };
  return value;
}

const directive: Directive<HTMLElement, RestrictValue> = {
  mounted(el, binding) {
    const handler = (e: Event) => {
      const opts = resolveOptions(binding.value);
      const userStore = useUserStore();
      const agentStore = useAgentStore();
      if (!userStore.isGuest) return; // 已注册用户放行
      // 游客：阻止冒泡并阻止默认行为
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      e.preventDefault?.();
      agentStore.showGuideModal(opts.scene ?? 'default');
    };
    // 使用 tap 事件（uni-app 友好），同时兼容 click
    el.addEventListener('tap', handler as EventListener, true);
    el.addEventListener('click', handler as EventListener, true);
    // 保存引用以便 unmounted 清理
    (el as HTMLElement & { __guestRestrictedHandler__?: typeof handler }).__guestRestrictedHandler__ =
      handler;
  },
  unmounted(el) {
    const handler = (el as HTMLElement & { __guestRestrictedHandler__?: (e: Event) => void })
      .__guestRestrictedHandler__;
    if (handler) {
      el.removeEventListener('tap', handler as EventListener, true);
      el.removeEventListener('click', handler as EventListener, true);
      delete (el as HTMLElement & { __guestRestrictedHandler__?: unknown }).__guestRestrictedHandler__;
    }
  },
};

/** 在 main.ts 中注册：app.directive('guest-restricted', guestRestrictedDirective) */
export const guestRestrictedDirective = directive;

/**
 * 兼容 Vue 模板中以 'v-guest-restricted' 的形式注册：
 * - 直接 export directive 对象即可
 * - main.ts 调用：app.directive('guest-restricted', guestRestrictedDirective)
 */
export default directive;