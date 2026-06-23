/**
 * 推送服务 —— 客户端工具
 *
 * 职责：
 *  1. 初始化推送（uni.getPushClientId / subscribePush）
 *  2. 注册 / 注销 push token 到后端（POST /api/v1/push/register）
 *  3. 监听推送点击事件，按 scene 跳转到目标页面
 *  4. 4 个推送场景的页面路径映射（与后端 PushScene 枚举一一对应）
 *
 * 推送场景与跳转目标（与 gamden-backend/src/modules/push/push.service.ts 同步）：
 *
 * | scene                     | title                                | pagePath                       |
 * |---------------------------|--------------------------------------|--------------------------------|
 * | mini_program_unlocked     | 🎉 你解锁了个人专属小程序！          | /pages/invite/mini-program     |
 * | mini_program_certified    | ✅ 你的小程序认证已通过              | /pages/invite/mini-program     |
 * | mini_program_online       | 🎊 你的小程序已上线！                | /pages/invite/mini-program     |
 * | mini_program_stale        | ⏳ 你的小程序申请还没完成            | /pages/invite/mini-program     |
 *
 * 多端实现差异：
 *  - APP-PLUS:  uni.getPushClientId() + uni.onPushMessage(click)
 *  - MP-WEIXIN: wx.requestSubscribeMessage（V1.0 mock，仅占位）
 *  - H5:        Browser Notification API（push-helper.ts 已实现）
 */

import { http } from './request';
import { storage } from './storage';

/** 推送场景枚举（与后端 PushScene 一一对应） */
export type PushScene =
  | 'mini_program_unlocked'
  | 'mini_program_certified'
  | 'mini_program_online'
  | 'mini_program_stale';

/** 推送 payload 结构（透传业务数据） */
export interface IncomingPushPayload {
  scene: PushScene;
  title: string;
  content: string;
  pagePath: string;
  /** 透传业务参数（字符串/数字/布尔） */
  extras?: Record<string, string | number | boolean>;
  /** 内部消息 ID（uni-push / 微信订阅消息透传） */
  messageId?: string;
}

/** localStorage key：缓存当前 push client id（多端统一） */
const PUSH_CLIENT_ID_KEY = 'push_client_id';

/** 后端推送 token 注册接口 */
const PUSH_REGISTER_URL = '/v1/push/register';
const PUSH_UNREGISTER_URL = '/v1/push/unregister';

/** Scene → 目标页面映射（统一中心页） */
const SCENE_TO_PAGE: Readonly<Record<PushScene, string>> = {
  mini_program_unlocked: '/pages/invite/mini-program',
  mini_program_certified: '/pages/invite/mini-program',
  mini_program_online: '/pages/invite/mini-program',
  mini_program_stale: '/pages/invite/mini-program',
};

// ======================== 初始化 ========================

/**
 * 初始化推送服务
 * - APP-PLUS: 调用 uni.getPushClientId() 获取 cid，注册到后端，监听 click 事件
 * - MP-WEIXIN: V1.0 mock（订阅消息需要 formId 触发，V1.1 接入）
 * - H5:       V1.0 mock（依赖 push-helper.ts 的 Browser Notification）
 *
 * @returns 是否成功获取到 push client id
 */
export async function initPushService(): Promise<boolean> {
  // #ifdef APP-PLUS
  return initAppPlusPush();
  // #endif

  // #ifdef MP-WEIXIN
  console.log('[Push/MP-WEIXIN] 初始化（V1.0 mock，订阅消息待 V1.1 接入）');
  return false;
  // #endif

  // #ifdef H5
  console.log('[Push/H5] 初始化（依赖 push-helper.ts）');
  return false;
  // #endif
}

// #ifdef APP-PLUS
/**
 * APP-PLUS 端推送初始化
 * - 调用 uni.getPushClientId() 获取 cid
 * - 注册到后端 POST /v1/push/register
 * - 监听 uni.onPushMessage({ click }) 事件
 */
async function initAppPlusPush(): Promise<boolean> {
  try {
    // 1. 获取推送客户端 ID
    const cidInfo = await getPushClientId();
    if (!cidInfo || !cidInfo.cid) {
      console.warn('[Push/APP-PLUS] 未获取到 push client id');
      return false;
    }

    console.log('[Push/APP-PLUS] 获取到 push client id:', cidInfo.cid.slice(0, 12) + '***');

    // 2. 注册到后端
    const prevCid = storage.get<string>(PUSH_CLIENT_ID_KEY);
    if (prevCid !== cidInfo.cid) {
      try {
        await http.post(PUSH_REGISTER_URL, {
          token: cidInfo.cid,
          clientId: cidInfo.cid,
          platform: 'app-plus',
          os: cidInfo.os ?? 'unknown',
        });
        storage.set(PUSH_CLIENT_ID_KEY, cidInfo.cid);
        console.log('[Push/APP-PLUS] token 注册成功');
      } catch (e) {
        console.warn('[Push/APP-PLUS] token 注册失败（不影响推送接收）:', e);
      }
    }

    // 3. 监听推送点击事件
    bindPushClickHandler();

    return true;
  } catch (e) {
    console.warn('[Push/APP-PLUS] 初始化失败:', e);
    return false;
  }
}

/**
 * 获取推送客户端 ID
 * - V1.0 mock: 部分 SDK 在未接入个推时会返回空 cid，函数本身仍可调用
 */
function getPushClientId(): Promise<{ cid: string; os?: string } | null> {
  return new Promise((resolve) => {
    try {
      uni.getPushClientId({
        // 透传回调 result（类型为 dcloud 内部定义的 GetPushClientIdSuccessData）
        success: (result) => {
          // 用 as 断言简化跨平台类型差异（H5/App 返回值字段不完全一致）
          const r = result as unknown as { cid: string; os?: string };
          resolve({ cid: r.cid, os: r.os });
        },
        fail: () => resolve(null),
      });
    } catch {
      resolve(null);
    }
  });
}

/**
 * 绑定推送点击事件处理
 * - 在 APP 启动时调用一次（onLaunch），避免重复绑定
 */
function bindPushClickHandler(): void {
  try {
    // 监听点击事件（uni.onPushMessage 是全局的，多次调用会重复触发，这里用 offPushMessage 清掉旧的）
    try {
      uni.offPushMessage?.();
    } catch {
      // 忽略：H5 / 微信小程序可能不支持 offPushMessage
    }
    uni.onPushMessage((res) => {
      // res.type === 'click' 表示用户点击了通知
      // 透传 payload 在 res.data / res.payload 字段中（个推 / unipush / 系统推送 SDK 各有差异）
      const r = res as unknown as {
        type: string;
        payload?: IncomingPushPayload;
        data?: IncomingPushPayload;
      };
      if (r.type === 'click') {
        handlePushClick(r.payload ?? r.data);
      }
    });
  } catch (e) {
    console.warn('[Push/APP-PLUS] 绑定点击事件失败:', e);
  }
}
// #endif

// ======================== 推送点击跳转 ========================

/**
 * 处理推送点击
 * - 解析 payload 中的 scene 字段
 * - 跳转到对应的页面
 * - 若未登录，先跳转登录页
 */
function handlePushClick(payload: IncomingPushPayload | undefined): void {
  if (!payload || !payload.scene) {
    console.warn('[Push] 收到空 payload，忽略');
    return;
  }

  const scene = payload.scene as PushScene;
  const targetPage = SCENE_TO_PAGE[scene] ?? payload.pagePath ?? '/pages/invite/mini-program';

  console.log(`[Push] 点击 scene=${scene} 跳转 ${targetPage}`);

  // 检查登录态
  const token = uni.getStorageSync('gamden_token') as string | '';
  if (!token) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    uni.reLaunch({ url: '/pages/auth/login' });
    return;
  }

  // 跳转目标页面（页面路径都是 tabBar 之外的普通页，用 navigateTo）
  uni.navigateTo({
    url: targetPage,
    fail: (err) => {
      console.warn('[Push] 跳转失败，回退到个人中心:', err);
      uni.switchTab({ url: '/pages/profile/index' });
    },
  });
}

// ======================== 注销 ========================

/**
 * 注销 push token（用户关闭推送时调用）
 * - V1.0 mock: 仅删除本地存储 + 调用后端注销接口
 */
export async function unregisterPushToken(): Promise<void> {
  const cid = storage.get<string>(PUSH_CLIENT_ID_KEY);
  if (!cid) return;

  try {
    await http.delete(PUSH_UNREGISTER_URL, { token: cid });
  } catch (e) {
    console.warn('[Push] 注销失败:', e);
  }
  storage.remove(PUSH_CLIENT_ID_KEY);
}

/**
 * 获取 scene 对应的页面路径（供其他模块查询）
 */
export function getPagePathByScene(scene: PushScene): string {
  return SCENE_TO_PAGE[scene] ?? '/pages/invite/mini-program';
}
