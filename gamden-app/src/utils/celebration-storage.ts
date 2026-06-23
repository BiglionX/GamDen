import { storage } from './storage';

/**
 * 庆祝事件记录（防止重复触发）
 * - key: 'celebrated_milestones'
 * - value: Record<milestoneKey, { at: number; userId: string }>
 *
 * 设计要点：
 *  - 按 userId 隔离，不同账号的庆祝状态独立
 *  - 按 milestoneKey 区分（如 'invite_3'），后续可扩展其他里程碑
 *  - 持久化在 localStorage，App 重启不丢失
 */
export interface CelebratedRecord {
  /** 庆祝时间戳（ms） */
  at: number;
  /** 触发该庆祝的用户 ID */
  userId: string;
}

const KEY = 'celebrated_milestones';

/**
 * 读取已庆祝记录
 */
export function getCelebratedMilestones(): Record<string, CelebratedRecord> {
  return storage.get<Record<string, CelebratedRecord>>(KEY, {}) ?? {};
}

/**
 * 判断某个里程碑是否已对当前用户庆祝过
 */
export function hasCelebrated(
  milestoneKey: string,
  userId: string,
): boolean {
  const records = getCelebratedMilestones();
  const rec = records[milestoneKey];
  return !!rec && rec.userId === userId;
}

/**
 * 标记某个里程碑已庆祝（同一用户同一里程碑只记录一次）
 */
export function markCelebrated(milestoneKey: string, userId: string): void {
  const records = getCelebratedMilestones();
  const key = `${userId}:${milestoneKey}`;
  if (records[key]) return; // 已存在，不覆盖
  records[key] = { at: Date.now(), userId };
  storage.set(KEY, records);
}

/**
 * 清除所有庆祝记录（用于账号切换 / 测试）
 */
export function clearCelebratedMilestones(): void {
  storage.remove(KEY);
}
