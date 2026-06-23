export {}

declare module "vue" {
  type Hooks = App.AppInstance & Page.PageInstance;
  interface ComponentCustomOptions extends Hooks {}
}

/**
 * 扩展 uni.request 的 method 类型以支持 PATCH
 *
 * - 原生 uni.request 类型在 dcloudio/types 中只暴露 GET/POST/PUT/DELETE/OPTIONS/HEAD/CONNECT
 * - NestJS 等后端框架的 PATCH 端点需要透传 method='PATCH'，运行时实际可用，仅类型缺失
 * - 通过 module augmentation 注入
 */
declare module '@dcloudio/types' {
  // 透传：使用同名 interface 合并
  namespace Uni {
    interface RequestOptions {
      method?:
        | 'GET'
        | 'POST'
        | 'PUT'
        | 'PATCH'
        | 'DELETE'
        | 'OPTIONS'
        | 'HEAD'
        | 'TRACE'
        | 'CONNECT';
    }
  }
}
export {}

declare module "vue" {
  type Hooks = App.AppInstance & Page.PageInstance;
  interface ComponentCustomOptions extends Hooks {}
}