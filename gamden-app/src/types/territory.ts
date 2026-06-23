import type { GuardianType } from './user';

/**
 * 领地等级 1-5
 *  1 🌱 树苗       单一小植物
 *  2 🌿 小树林     几棵树 + 围栏
 *  3 🏡 木屋       一栋小木屋
 *  4 🏘️ 石屋群     多栋房屋 + 院子
 *  5 🏯 小型寨落   完整院落 + 旗帜
 */
export type TerritoryLevel = 1 | 2 | 3 | 4 | 5;

export interface Territory {
  id: string;
  userId: string;
  nickname: string;
  coordX: number;
  coordY: number;
  level: TerritoryLevel;
  exp: number;
  /** 升级到下一级所需经验 */
  nextLevelExp?: number;
  guardianType: GuardianType;
  invitedCount: number;
}

/**
 * 地图网格上的邻居节点
 * - isOwn: 是否是当前用户自己的领地（中心）
 * - isFuzzy: 游客态坐标模糊化（±5 格偏移）
 * - gameTags: 最近常玩游戏列表（V1.0 客户端聚合，无后端字段）
 */
export interface NeighborNode extends Territory {
  isOwn: boolean;
  isFuzzy?: boolean;
  gameTags?: string[];
}

/**
 * 2D 地图视口参数
 */
export interface MapViewport {
  /** 中心 X 坐标（用户领地） */
  centerX: number;
  /** 中心 Y 坐标（用户领地） */
  centerY: number;
  /** 邻居查询半径（默认 10） */
  range: number;
  /** 缩放级别 0.5x ~ 2x */
  scale: number;
  /** 单格像素尺寸 */
  cellSize: number;
}

/**
 * 领地等级对应的视觉资源
 */
export interface TerritoryVisual {
  emoji: string;
  label: string;
  /** 节点背景色（金色梯度） */
  bgColor: string;
  /** 节点边框色 */
  borderColor: string;
  /** 节点尺寸 (px) */
  size: number;
  /** 是否启用脉冲光晕 */
  pulse: boolean;
}

export const TERRITORY_VISUALS: Record<TerritoryLevel, TerritoryVisual> = {
  1: { emoji: '🌱', label: '树苗',     bgColor: 'rgba(90, 143, 108, 0.6)',  borderColor: '#5A8F6C', size: 48, pulse: false },
  2: { emoji: '🌿', label: '小树林',   bgColor: 'rgba(122, 158, 110, 0.6)', borderColor: '#7AA06E', size: 52, pulse: false },
  3: { emoji: '🏡', label: '木屋',     bgColor: 'rgba(201, 168, 124, 0.4)', borderColor: '#C9A87C', size: 56, pulse: false },
  4: { emoji: '🏘️', label: '石屋群',   bgColor: 'rgba(201, 168, 124, 0.6)', borderColor: '#D8BE95', size: 60, pulse: false },
  5: { emoji: '🏯', label: '小型寨落', bgColor: 'rgba(201, 168, 124, 0.8)', borderColor: '#F5DCAE', size: 64, pulse: true  },
};
