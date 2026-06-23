/**
 * GamDen 平台条件编译工具
 * ----------------------------------------------------------------------
 * 提供统一的平台判断 API，简化条件编译代码
 * 支持 H5 / 微信小程序 / Android App / iOS App 多端
 * ----------------------------------------------------------------------
 */

/** 平台类型枚举 */
export enum Platform {
  /** H5 网页 */
  H5 = 'h5',
  /** 微信小程序 */
  MP_WEIXIN = 'mp-weixin',
  /** 支付宝小程序 */
  MP_ALIPAY = 'mp-alipay',
  /** 百度小程序 */
  MP_BAIDU = 'mp-baidu',
  /** 字节跳动小程序 */
  MP_TOUTIAO = 'mp-toutiao',
  /** Android App */
  APP_ANDROID = 'app-android',
  /** iOS App */
  APP_IOS = 'app-ios',
  /** App（通用） */
  APP_PLUS = 'app-plus',
  /** 未知平台 */
  UNKNOWN = 'unknown',
}

/** 平台判断结果 */
export interface PlatformInfo {
  /** 当前平台 */
  platform: Platform;
  /** 是否为 H5 */
  isH5: boolean;
  /** 是否为微信小程序 */
  isMpWeixin: boolean;
  /** 是否为任意小程序 */
  isMp: boolean;
  /** 是否为 App */
  isApp: boolean;
  /** 是否为 Android App */
  isAndroid: boolean;
  /** 是否为 iOS App */
  isIos: boolean;
  /** 是否为移动端（小程序 + App） */
  isMobile: boolean;
  /** 是否支持微信支付 */
  supportsWechatPay: boolean;
  /** 是否支持地图 */
  supportsMap: boolean;
  /** 是否支持相机 */
  supportsCamera: boolean;
  /** 是否支持地理位置 */
  supportsLocation: boolean;
}

/**
 * 获取当前平台信息
 * 使用条件编译实现编译时平台确定
 */
export function getPlatformInfo(): PlatformInfo {
  let platform = Platform.UNKNOWN;
  let isH5 = false;
  let isMpWeixin = false;
  let isMp = false;
  let isApp = false;
  let isAndroid = false;
  let isIos = false;

  // #ifdef H5
  platform = Platform.H5;
  isH5 = true;
  // #endif

  // #ifdef MP-WEIXIN
  platform = Platform.MP_WEIXIN;
  isMpWeixin = true;
  isMp = true;
  // #endif

  // #ifdef MP-ALIPAY
  platform = Platform.MP_ALIPAY;
  isMp = true;
  // #endif

  // #ifdef MP-BAIDU
  platform = Platform.MP_BAIDU;
  isMp = true;
  // #endif

  // #ifdef MP-TOUTIAO
  platform = Platform.MP_TOUTIAO;
  isMp = true;
  // #endif

  // #ifdef APP-ANDROID
  platform = Platform.APP_ANDROID;
  isApp = true;
  isAndroid = true;
  // #endif

  // #ifdef APP-IOS
  platform = Platform.APP_IOS;
  isApp = true;
  isIos = true;
  // #endif

  // #ifdef APP-PLUS
  isApp = true;
  // #endif

  const isMobile = isMp || isApp;

  // 功能支持判断
  const supportsWechatPay = isMpWeixin || isApp;
  const supportsMap = true; // 所有平台都支持地图
  const supportsCamera = true; // 所有平台都支持相机
  const supportsLocation = true; // 所有平台都支持地理位置

  return {
    platform,
    isH5,
    isMpWeixin,
    isMp,
    isApp,
    isAndroid,
    isIos,
    isMobile,
    supportsWechatPay,
    supportsMap,
    supportsCamera,
    supportsLocation,
  };
}

/** 全局平台信息实例 */
export const platformInfo = getPlatformInfo();

/** 便捷判断方法 */
export const isH5 = platformInfo.isH5;
export const isMpWeixin = platformInfo.isMpWeixin;
export const isMp = platformInfo.isMp;
export const isApp = platformInfo.isApp;
export const isAndroid = platformInfo.isAndroid;
export const isIos = platformInfo.isIos;
export const isMobile = platformInfo.isMobile;

/**
 * 条件渲染帮助函数
 * @param options 各平台的渲染选项
 * @returns 当前平台应该渲染的内容
 */
export function conditionalRender<T>(options: {
  h5?: T;
  mpWeixin?: T;
  mp?: T;
  app?: T;
  android?: T;
  ios?: T;
  default?: T;
}): T | undefined {
  if (isH5 && options.h5 !== undefined) return options.h5;
  if (isMpWeixin && options.mpWeixin !== undefined) return options.mpWeixin;
  if (isMp && options.mp !== undefined) return options.mp;
  if (isAndroid && options.android !== undefined) return options.android;
  if (isIos && options.ios !== undefined) return options.ios;
  if (isApp && options.app !== undefined) return options.app;
  return options.default;
}

/**
 * 获取平台特定的样式
 * @param styles 各平台的样式对象
 * @returns 当前平台的样式
 */
export function getPlatformStyle(styles: {
  h5?: Record<string, string | number>;
  mpWeixin?: Record<string, string | number>;
  mp?: Record<string, string | number>;
  app?: Record<string, string | number>;
  android?: Record<string, string | number>;
  ios?: Record<string, string | number>;
}): Record<string, string | number> {
  const result: Record<string, string | number> = {};

  if (isH5 && styles.h5) Object.assign(result, styles.h5);
  else if (isMpWeixin && styles.mpWeixin) Object.assign(result, styles.mpWeixin);
  else if (isMp && styles.mp) Object.assign(result, styles.mp);
  else if (isAndroid && styles.android) Object.assign(result, styles.android);
  else if (isIos && styles.ios) Object.assign(result, styles.ios);
  else if (isApp && styles.app) Object.assign(result, styles.app);

  return result;
}

/**
 * 获取安全区域信息
 * 用于处理异形屏适配
 */
export function getSafeArea() {
  const systemInfo = uni.getSystemInfoSync();
  
  return {
    top: systemInfo.safeAreaInsets?.top || 0,
    bottom: systemInfo.safeAreaInsets?.bottom || 0,
    left: systemInfo.safeAreaInsets?.left || 0,
    right: systemInfo.safeAreaInsets?.right || 0,
    statusBarHeight: systemInfo.statusBarHeight || 0,
    windowHeight: systemInfo.windowHeight,
    screenHeight: systemInfo.screenHeight,
  };
}

/**
 * 获取导航栏高度
 * 不同平台导航栏高度不同
 */
export function getNavBarHeight(): number {
  // #ifdef H5
  return 44;
  // #endif

  // #ifdef MP-WEIXIN
  const info = uni.getSystemInfoSync();
  return (info.statusBarHeight || 0) + 44;
  // #endif

  // #ifdef APP-PLUS
  const appInfo = uni.getSystemInfoSync();
  return (appInfo.statusBarHeight || 0) + 44;
  // #endif

  return 44;
}

/**
 * 显示平台特定的分享菜单
 */
export function showShareMenu(options?: {
  title?: string;
  path?: string;
  imageUrl?: string;
}): void {
  // #ifdef MP-WEIXIN
  if (options) {
    uni.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline'],
    });
  }
  // #endif

  // #ifdef H5
  // H5 分享需要引入微信 JS-SDK
  console.log('[Platform] H5 分享需要微信 JS-SDK');
  // #endif

  // #ifdef APP-PLUS
  // App 分享使用原生分享
  uni.share({
    provider: 'weixin',
    scene: 'WXSceneSession',
    type: 0,
    title: options?.title || 'GamDen 游戏巢穴',
    href: options?.path,
    imageUrl: options?.imageUrl,
    success: () => console.log('[Platform] 分享成功'),
    fail: (err) => console.error('[Platform] 分享失败:', err),
  });
  // #endif
}

/**
 * 拨打电话
 */
export function makePhoneCall(phoneNumber: string): void {
  // #ifdef H5
  window.location.href = `tel:${phoneNumber}`;
  // #endif

  // #ifdef MP-WEIXIN || APP-PLUS
  uni.makePhoneCall({
    phoneNumber,
    fail: (err) => console.error('[Platform] 拨打电话失败:', err),
  });
  // #endif
}

/**
 * 保存图片到相册
 */
export function saveImageToPhotosAlbum(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // #ifdef H5
    // H5 需要创建下载链接
    const link = document.createElement('a');
    link.href = filePath;
    link.download = filePath.split('/').pop() || 'image.png';
    link.click();
    resolve();
    // #endif

    // #ifdef MP-WEIXIN || APP-PLUS
    uni.saveImageToPhotosAlbum({
      filePath,
      success: () => resolve(),
      fail: (err) => reject(err),
    });
    // #endif
  });
}
