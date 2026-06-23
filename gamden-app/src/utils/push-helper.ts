/**
 * 多端推送通知 Helper
 *
 * 各端推送通道封装（按平台条件编译）：
 *  - APP-PLUS:  uni.push（unipush / 个推）— V1.0 mock log
 *  - MP-WEIXIN: 微信小程序订阅消息（wx.requestSubscribeMessage）— V1.0 mock log
 *  - H5:        Browser Notification API（HTTPS 站点）
 *
 * 通知点击后的页面跳转：V1.0 走 URL scheme（#ifdef APP-PLUS 用 plus.runtime.openURL）
 *                     V2.0 接 unipush / 微信订阅消息时再切到原生 push payload
 *
 * 注：V1.0 暂为本地模拟，正式推送需在 gamden-backend 接入 unipush / 微信模板消息服务
 */

export interface PushOptions {
  title: string;
  content: string;
  /** 点击跳转目标 URL（绝对 / 相对页面路径） */
  redirectUrl?: string;
  /** 透传 payload（业务自定义） */
  payload?: Record<string, unknown>;
}

const DEFAULT_ICON = '/static/icons/notification-icon.png';

/**
 * 发送本地通知（应用未运行时通过系统通知中心 / 推送服务下发）
 */
export async function sendLocalPush(options: PushOptions): Promise<void> {
  // #ifdef APP-PLUS
  await sendAppPlusPush(options);
  // #endif

  // #ifdef MP-WEIXIN
  await sendMiniProgramPush(options);
  // #endif

  // #ifdef H5
  sendH5Push(options);
  // #endif
}

// ======================== 各端实现 ========================

// #ifdef APP-PLUS
async function sendAppPlusPush(options: PushOptions): Promise<void> {
  // V1.0 mock：控制台 log + 应用前台时显示 toast
  console.log('[Push/APP-PLUS]', options.title, options.content);
  if (options.redirectUrl) {
    console.log('  → 期望跳转:', options.redirectUrl);
  }
  // TODO V1.1: 接入 unipush
  //   const push = uni.requireNativePlugin('UniPush');
  //   push.createMessage({
  //     title: options.title,
  //     content: options.content,
  //     payload: JSON.stringify(options.payload ?? {}),
  //   });
}
// #endif

// #ifdef MP-WEIXIN
async function sendMiniProgramPush(options: PushOptions): Promise<void> {
  // V1.0 mock：控制台 log
  // 真实场景下需要先用 wx.requestSubscribeMessage 获得用户授权，
  // 然后由后端调用 https://api.weixin.qq.com/cgi-bin/message/subscribe/send 发送
  console.log('[Push/MP-WEIXIN]', options.title, options.content);
  if (options.redirectUrl) {
    console.log('  → 期望跳转:', options.redirectUrl);
  }
  // TODO V1.1: 接入微信订阅消息
}
// #endif

// #ifdef H5
function sendH5Push(options: PushOptions): void {
  // 仅 HTTPS 站点 + 用户已授权 Notification 时生效
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') {
    console.log('[Push/H5] 用户未授权 Notification，跳过');
    return;
  }
  try {
    const n = new Notification(options.title, {
      body: options.content,
      icon: DEFAULT_ICON,
      data: { url: options.redirectUrl, payload: options.payload },
    });
    n.onclick = (): void => {
      window.focus();
      if (options.redirectUrl) {
        window.location.href = options.redirectUrl;
      }
      n.close();
    };
  } catch (e) {
    console.warn('[Push/H5] 发送失败:', e);
  }
}
// #endif

// ======================== 业务封装 ========================

/**
 * 发送"解锁小程序资格"通知
 * - 应用前台：通常不发送本地推送（由 celebration store 弹层处理）
 * - 应用后台：调用此函数
 */
export async function pushMiniProgramUnlocked(
  redirectUrl = '/pages/celebration/index',
): Promise<void> {
  await sendLocalPush({
    title: '🎉 你解锁了个人专属小程序！',
    content: '邀请满 3 位好友，巢穴已为你敞开专属于你的城门口',
    redirectUrl,
    payload: { type: 'mini_program_unlocked' },
  });
}

/**
 * 请求 H5 通知权限（仅 H5 端有效）
 */
export async function requestH5NotificationPermission(): Promise<boolean> {
  // #ifdef H5
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
  // #endif
  // #ifndef H5
  return true;
  // #endif
}
