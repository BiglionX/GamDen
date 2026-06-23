import { http } from './request';
import type { Territory, NeighborNode, TerritoryLevel } from '@/types/territory';

/**
 * 领地相关 API（与 gamden-backend 对齐）
 *
 * - 后端 NestJS 模块：/api/v1/territories
 * - 真实接入时去掉 mock fallbacks
 */

export const territoryApi = {
  /**
   * 获取我的领地
   * GET /territories/me
   */
  async getMyTerritory(): Promise<Territory> {
    return http.get<Territory>('/territories/me', undefined, {
      silent: true,
    });
  },

  /**
   * 获取领地详情（按 ID）
   * GET /territories/:id
   */
  async getTerritoryById(id: string): Promise<Territory> {
    return http.get<Territory>(`/territories/${id}`);
  },

  /**
   * 查询指定坐标周围的邻居
   * GET /territories/:id/neighbors?range=10
   *
   * V1.0：以后端领地 ID 为参数（自动取其坐标）
   */
  async getNeighborsByTerritory(
    territoryId: string,
    range = 10,
  ): Promise<NeighborNode[]> {
    return http.get<NeighborNode[]>(
      `/territories/${territoryId}/neighbors`,
      { range },
      { silent: true },
    );
  },

  /**
   * 兼容旧调用：以坐标为中心查询邻居（不带后端时使用）
   * - V1.0 后端不支持纯坐标查询，保留作为本地 mock 接口
   */
  async getNeighbors(
    _centerX: number,
    _centerY: number,
    range: number,
  ): Promise<NeighborNode[]> {
    // 真实接入后改为：
    // return this.getNeighborsByTerritory(territoryId, range)
    void range;
    return mockNeighbors();
  },
};

// ---- Mock 数据（API 不可用时使用） ----

async function mockNeighbors(): Promise<NeighborNode[]> {
  // 模拟网络延迟
  await new Promise((r) => setTimeout(r, 200));
  return [
    { id: 't1', userId: 'u1', nickname: '暗夜猎人',   coordX: -2, coordY:  1, level: 2 as TerritoryLevel, exp: 120, guardianType: 'mechanical', invitedCount: 1, isOwn: false, gameTags: ['原神', '艾尔登法环'] },
    { id: 't2', userId: 'u2', nickname: '月下老人',   coordX:  3, coordY: -1, level: 3 as TerritoryLevel, exp: 380, guardianType: 'elf',       invitedCount: 4, isOwn: false, gameTags: ['原神', '崩坏3'] },
    { id: 't3', userId: 'u3', nickname: '星轨观察者', coordX: -1, coordY: -3, level: 1 as TerritoryLevel, exp:  30, guardianType: 'astrologer', invitedCount: 0, isOwn: false, gameTags: ['星轨'] },
    { id: 't4', userId: 'u4', nickname: '永夜远征军', coordX:  4, coordY:  4, level: 4 as TerritoryLevel, exp: 520, guardianType: 'mechanical', invitedCount: 7, isOwn: false, gameTags: ['黑神话悟空'] },
    { id: 't5', userId: 'u5', nickname: '桃林隐士',   coordX: -4, coordY:  2, level: 2 as TerritoryLevel, exp: 200, guardianType: 'elf',       invitedCount: 2, isOwn: false, gameTags: ['原神', '塞尔达'] },
  ];
}
