import type { AgentLine, GuardianType, GuestGuideScene } from '@/types/agent';

/**
 * 守护灵话术库（V1.0 固定话术 + 条件触发）
 *
 * 数据源策略：
 *  - V1.0 前端硬编码（PRD 已明确话术）
 *  - V1.1+ 可改为从后端 /agent/lines 接口拉取
 *
 * 场景说明：
 *  - welcome     每日首次登录（按 guardianType 推送）
 *  - upgrade     领地升级祝贺（任意等级 +1 触发）
 *  - invite      邀请好友成功（邀请人 + 被邀请人均触发）
 *  - guestGuide  游客态浏览 30 秒软引导（与 guardian 无关，统一文案）
 */
export const AGENT_LINES: AgentLine[] = [
  // ============ 机械师 ============
  {
    guardian: 'mechanical',
    scene: 'welcome',
    text: '检测到信号，欢迎回巢。',
    duration: 5000,
  },
  {
    guardian: 'mechanical',
    scene: 'upgrade',
    text: '锻造炉温度上升。',
    duration: 5000,
  },
  {
    guardian: 'mechanical',
    scene: 'invite',
    text: '新坐标已锁定。',
    duration: 5000,
  },

  // ============ 精灵 ============
  {
    guardian: 'elf',
    scene: 'welcome',
    text: '晨光落在你领地上了。',
    duration: 5000,
  },
  {
    guardian: 'elf',
    scene: 'upgrade',
    text: '树又长高了。',
    duration: 5000,
  },
  {
    guardian: 'elf',
    scene: 'invite',
    text: '新芽破土了！',
    duration: 5000,
  },

  // ============ 占星师 ============
  {
    guardian: 'astrologer',
    scene: 'welcome',
    text: '星轨显示，今日宜签到。',
    duration: 5000,
  },
  {
    guardian: 'astrologer',
    scene: 'upgrade',
    text: '星力涌动，境界突破。',
    duration: 5000,
  },
  {
    guardian: 'astrologer',
    scene: 'invite',
    text: '命运之线已连接。',
    duration: 5000,
  },
];

/**
 * 游客软引导气泡（30 秒定时触发后显示，15 秒后自动消失）
 * - 与 guardian 无关，统一文案
 */
export const GUEST_GUIDE_LINES: AgentLine[] = [
  {
    guardian: 'mechanical',
    scene: 'guestGuide',
    text: '巢穴之门已为你打开，私聊与升级需先入驻。',
    duration: 15000,
  },
];

/**
 * 游客引导弹窗话术（受限操作触发）
 * - 按 GuestGuideScene 区分
 * - 弹窗不自动关闭
 */
export interface GuestGuideLine {
  scene: GuestGuideScene;
  title: string;
  text: string;
}

export const GUEST_GUIDE_MODAL_LINES: GuestGuideLine[] = [
  {
    scene: 'default',
    title: '欢迎来到巢穴',
    text: '巢穴深处还有许多秘密，想体验完整玩法，先领一块属于你的领地吧。',
  },
  {
    scene: 'like',
    title: '点赞是一种鼓励',
    text: '每一次点赞都是对邻居的祝福，但入巢后才能把心意送达。',
  },
  {
    scene: 'reply',
    title: '想加入讨论？',
    text: '帖子下热闹非凡，先领一块领地，就能与巢友把话接上。',
  },
  {
    scene: 'exchange',
    title: '这件道具很配你',
    text: '集市里的宝贝都在等你带回家，先入驻就能直接兑换入袋。',
  },
  {
    scene: 'greet',
    title: '邻居在向你招手',
    text: '和邻居打个招呼是巢穴里最温暖的礼节，先入巢就能聊起来。',
  },
  {
    scene: 'post',
    title: '分享你的故事',
    text: '你的经历对别人也许就是一束光，先领一块领地就能发帖。',
  },
  {
    scene: 'sendMessage',
    title: '私聊已就绪',
    text: '私聊是与好友深度交流的地方，先入巢解锁完整 IM 能力。',
  },
];

/**
 * 根据守护灵 + 场景获取话术（V1.0 固定模板）
 * 找不到时返回 null（调用方决定 fallback）
 */
export function getAgentLine(
  guardian: GuardianType | null,
  scene: AgentLine['scene'],
): AgentLine | null {
  if (scene === 'guestGuide') {
    return GUEST_GUIDE_LINES[0] ?? null;
  }
  if (!guardian) return null;
  return (
    AGENT_LINES.find((l) => l.guardian === guardian && l.scene === scene) ??
    null
  );
}

/**
 * 根据场景获取游客引导弹窗话术
 * - 默认走 'default' 兜底文案
 * - 未命中时也返回兜底，保证 UI 一定有内容展示
 */
export function getGuestGuideLine(
  _guardian: GuardianType,
  scene: GuestGuideScene,
): GuestGuideLine {
  const hit = GUEST_GUIDE_MODAL_LINES.find((l) => l.scene === scene);
  if (hit) return hit;
  return (
    GUEST_GUIDE_MODAL_LINES.find((l) => l.scene === 'default') ??
    GUEST_GUIDE_MODAL_LINES[0]
  );
}