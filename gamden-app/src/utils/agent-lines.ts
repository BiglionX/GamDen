import type { AgentLine, GuardianType, GuestGuideScene } from '@/types/agent';

/**
 * 守护灵话术库（V1.0 固定话术 + 条件触发）
 *
 * 数据源策略：
 *  - V1.0 前端硬编码（PRD 已明确话术）
 *  - V1.1+ 可改为从后端 /agent/lines 接口拉取
 *
 * 场景说明：
 *  - welcome          每日首次登录（按 guardianType 推送）
 *  - upgrade          领地升级祝贺（任意等级 +1 触发）
 *  - invite           邀请好友成功（邀请人 + 被邀请人均触发）
 *  - guestGuide       游客态浏览 30 秒软引导（与 guardian 无关，统一文案）
 *  - firstEncounter   入驻引导：初次相遇
 *  - askName          入驻引导：询问名字
 *  - selectGuardian   入驻引导：守护灵选择（卡片悬停台词）
 *  - alliance         入驻引导：结盟确认
 *  - territoryLanding 入驻引导：领地落地祝贺
 *  - newUserTask      入驻引导：新手任务引导
 *  - taskComplete     入驻引导：任务完成祝贺
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
  // 入驻引导：机械师
  {
    guardian: 'mechanical',
    scene: 'firstEncounter',
    text: '信号同步中。我的编号是[M-07]，GamDen巢穴的守夜人。',
    duration: 6000,
  },
  {
    guardian: 'mechanical',
    scene: 'askName',
    text: '你的领地坐标已锁定，等待指挥官确认身份——请告诉我你的名字。',
    duration: 6000,
  },
  {
    guardian: 'mechanical',
    scene: 'selectGuardian',
    text: '机械不会说谎。我会用数据为你守护每一寸领地。',
    duration: 0, // 选择卡片悬停时显示，不自动消失
  },
  {
    guardian: 'mechanical',
    scene: 'alliance',
    text: '指令确认。人机绑定完成。欢迎归队，指挥官。',
    duration: 6000,
  },
  {
    guardian: 'mechanical',
    scene: 'territoryLanding',
    text: '领地已落地，坐标已锁定。这是你的起点，请开始建设。',
    duration: 6000,
  },
  {
    guardian: 'mechanical',
    scene: 'newUserTask',
    text: '建议执行初始任务：浏览集市。寻找领地升级所需资源。是否立即执行？',
    duration: 0, // 常驻显示
  },
  {
    guardian: 'mechanical',
    scene: 'taskComplete',
    text: '任务完成。初步建设已启动。继续前进。',
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
  // 入驻引导：精灵
  {
    guardian: 'elf',
    scene: 'firstEncounter',
    text: '终于，你走过来了。我叫[灵]，这片森林的守护者。',
    duration: 6000,
  },
  {
    guardian: 'elf',
    scene: 'askName',
    text: '你的领地在等你。但在这之前，告诉我你的名字。',
    duration: 6000,
  },
  {
    guardian: 'elf',
    scene: 'selectGuardian',
    text: '风会带来远方的消息。我陪你等每一个邻居到来。',
    duration: 0,
  },
  {
    guardian: 'elf',
    scene: 'alliance',
    text: '你选了我。真好。那么——欢迎回家。',
    duration: 6000,
  },
  {
    guardian: 'elf',
    scene: 'territoryLanding',
    text: '你看，这里就是你的领地了。现在它很小，但风会帮你带来邻居。我保证。',
    duration: 6000,
  },
  {
    guardian: 'elf',
    scene: 'newUserTask',
    text: '要不要先去集市看看？那里有可以让领地变漂亮的东西。我陪你。',
    duration: 0,
  },
  {
    guardian: 'elf',
    scene: 'taskComplete',
    text: '你去了集市！真好。领地会一天天变好看的。',
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
  // 入驻引导：占星师
  {
    guardian: 'astrologer',
    scene: 'firstEncounter',
    text: '星辰已经等到了它的观星者。我等你很久了。',
    duration: 6000,
  },
  {
    guardian: 'astrologer',
    scene: 'askName',
    text: '请告诉我，我该用什么名字呼唤你？',
    duration: 6000,
  },
  {
    guardian: 'astrologer',
    scene: 'selectGuardian',
    text: '星辰的轨迹里，我已经看到了你的未来。跟我来。',
    duration: 0,
  },
  {
    guardian: 'astrologer',
    scene: 'alliance',
    text: '命运之线，从此缠绕。我陪你看未来的每一颗星。',
    duration: 6000,
  },
  {
    guardian: 'astrologer',
    scene: 'territoryLanding',
    text: '第一个坐标，是命运给你的礼物。以后这里会开满属于你的故事。',
    duration: 6000,
  },
  {
    guardian: 'astrologer',
    scene: 'newUserTask',
    text: '你的第一步，应该是去集市看看那些为你准备的"星尘"。走吧，我引路。',
    duration: 0,
  },
  {
    guardian: 'astrologer',
    scene: 'taskComplete',
    text: '第一步已经迈出。星途漫漫，我陪你走。',
    duration: 5000,
  },
];

/**
 * 游客软引导气泡话术（30 秒定时触发后显示，15 秒后自动消失）
 * - 与 guardian 无关，三选一随机
 * - 按需求文档 3.1 节话术库
 */
export const GUEST_GUIDE_LINES: AgentLine[] = [
  {
    guardian: 'mechanical',
    scene: 'guestGuide',
    text: '检测到正在执行"观望"指令。已持续45秒，建议进入"决策"阶段。',
    duration: 15000,
  },
  {
    guardian: 'elf',
    scene: 'guestGuide',
    text: '你站在迷雾边缘很久了。风里有一种熟悉的气息——这里，也曾经是我的家。',
    duration: 15000,
  },
  {
    guardian: 'astrologer',
    scene: 'guestGuide',
    text: '星盘上有一颗新的光点正在靠近。是你，对吗？',
    duration: 15000,
  },
];

/**
 * 获取随机软引导话术（用于气泡展示）
 */
export function getRandomGuestGuideLine(): AgentLine {
  const idx = Math.floor(Math.random() * GUEST_GUIDE_LINES.length);
  return GUEST_GUIDE_LINES[idx];
}

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
    // 软引导话术：三选一随机
    return getRandomGuestGuideLine();
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