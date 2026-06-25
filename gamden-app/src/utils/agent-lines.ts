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

  // ============ 游侠 ============
  {
    guardian: 'ranger',
    scene: 'welcome',
    text: '嘿，又见面了。走，出去看看。',
    duration: 5000,
  },
  {
    guardian: 'ranger',
    scene: 'upgrade',
    text: '地图上解锁了新的区域。',
    duration: 5000,
  },
  {
    guardian: 'ranger',
    scene: 'invite',
    text: '多一个伙伴，多一条路。',
    duration: 5000,
  },
  // 入驻引导：游侠
  {
    guardian: 'ranger',
    scene: 'firstEncounter',
    text: '哟，新面孔。我叫[岚]，哪里都能去。',
    duration: 6000,
  },
  {
    guardian: 'ranger',
    scene: 'askName',
    text: '你叫什么？我得有个称呼叫你。',
    duration: 6000,
  },
  {
    guardian: 'ranger',
    scene: 'selectGuardian',
    text: '我不爱守株待兔，更爱追风去远方。你呢？',
    duration: 0,
  },
  {
    guardian: 'ranger',
    scene: 'alliance',
    text: '好！以后我们一起走。前面肯定有故事。',
    duration: 6000,
  },
  {
    guardian: 'ranger',
    scene: 'territoryLanding',
    text: '这就是你落脚的点了。咱们先把它当成营地，再慢慢走远。',
    duration: 6000,
  },
  {
    guardian: 'ranger',
    scene: 'newUserTask',
    text: '第一站先去集市熟悉地形。走吧，我带路。',
    duration: 0,
  },
  {
    guardian: 'ranger',
    scene: 'taskComplete',
    text: '不错不错，方向感挺好的。下次可以走更远。',
    duration: 5000,
  },

  // ============ 工匠 ============
  {
    guardian: 'artisan',
    scene: 'welcome',
    text: '今天的零件都准备好了吗？',
    duration: 5000,
  },
  {
    guardian: 'artisan',
    scene: 'upgrade',
    text: '工具升级了，做什么都顺手。',
    duration: 5000,
  },
  {
    guardian: 'artisan',
    scene: 'invite',
    text: '新朋友带来新材料。',
    duration: 5000,
  },
  // 入驻引导：工匠
  {
    guardian: 'artisan',
    scene: 'firstEncounter',
    text: '你好，我是[锻]。万物皆可打造，包括我们的家。',
    duration: 6000,
  },
  {
    guardian: 'artisan',
    scene: 'askName',
    text: '你叫什么？我想给你打一件专属的东西。',
    duration: 6000,
  },
  {
    guardian: 'artisan',
    scene: 'selectGuardian',
    text: '我用双手把零散变成完整。一砖一瓦都是心意。',
    duration: 0,
  },
  {
    guardian: 'artisan',
    scene: 'alliance',
    text: '太好了。我们一起把这里打造成最美的地方。',
    duration: 6000,
  },
  {
    guardian: 'artisan',
    scene: 'territoryLanding',
    text: '这就是我们的工坊雏形。看，这里、这里、这里，都可以做文章。',
    duration: 6000,
  },
  {
    guardian: 'artisan',
    scene: 'newUserTask',
    text: '先去集市看看有没有好材料。巧妇难为无米之炊嘛。',
    duration: 0,
  },
  {
    guardian: 'artisan',
    scene: 'taskComplete',
    text: '材料看完了。回来我教你第一件作品的打造。',
    duration: 5000,
  },

  // ============ 使徒 ============
  {
    guardian: 'apostle',
    scene: 'welcome',
    text: '我在这里。请放心。',
    duration: 5000,
  },
  {
    guardian: 'apostle',
    scene: 'upgrade',
    text: '我的力量更强了。',
    duration: 5000,
  },
  {
    guardian: 'apostle',
    scene: 'invite',
    text: '新的伙伴。我会守护好他。',
    duration: 5000,
  },
  // 入驻引导：使徒
  {
    guardian: 'apostle',
    scene: 'firstEncounter',
    text: '你好。我是[誓]，愿为你守护这片土地。',
    duration: 6000,
  },
  {
    guardian: 'apostle',
    scene: 'askName',
    text: '请告诉我你的名字。我要记在心里。',
    duration: 6000,
  },
  {
    guardian: 'apostle',
    scene: 'selectGuardian',
    text: '我的剑为你，我的盾为你。',
    duration: 0,
  },
  {
    guardian: 'apostle',
    scene: 'alliance',
    text: '从此以后，你不是一个人。我会一直在你身边。',
    duration: 6000,
  },
  {
    guardian: 'apostle',
    scene: 'territoryLanding',
    text: '这是你的家。我会为你守好它。',
    duration: 6000,
  },
  {
    guardian: 'apostle',
    scene: 'newUserTask',
    text: '让我陪你一起去集市。我会保护你。',
    duration: 0,
  },
  {
    guardian: 'apostle',
    scene: 'taskComplete',
    text: '你做得很好。我会继续守护你。',
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
 * 获取守护灵升级话术（按等级）
 * - agent_lv2 ~ agent_lv10
 */
export const AGENT_LEVEL_UP_LINES: Record<string, AgentLine[]> = {
  mechanical: [
    { guardian: 'mechanical', scene: 'agent_lv2', text: '系统评估通过。你在GamDen的稳定性已达标。', duration: 6000 },
    { guardian: 'mechanical', scene: 'agent_lv3', text: '检测到情感连接强度提升。协议已优化。', duration: 6000 },
    { guardian: 'mechanical', scene: 'agent_lv4', text: '新模块解锁。我可以为你记录更多数据了。', duration: 6000 },
    { guardian: 'mechanical', scene: 'agent_lv5', text: '系统提示：你已绑定"伙伴"模式。', duration: 6000 },
    { guardian: 'mechanical', scene: 'agent_lv6', text: '你提过的游戏已存入本地记忆库。', duration: 6000 },
    { guardian: 'mechanical', scene: 'agent_lv7', text: '权限提升。你获得了对守护灵外观的微调权。', duration: 6000 },
    { guardian: 'mechanical', scene: 'agent_lv8', text: '警报：昨日未检测到登录信号。状态：关切。', duration: 6000 },
    { guardian: 'mechanical', scene: 'agent_lv9', text: '组队模块预加载完成。你值得更强的队友。', duration: 6000 },
    { guardian: 'mechanical', scene: 'agent_lv10', text: '最终协议确认。编号[M-07]与[玩家姓名]绑定完成。终身有效。', duration: 8000 },
  ],
  elf: [
    { guardian: 'elf', scene: 'agent_lv2', text: '你开始在这里扎根了。我能感觉到。', duration: 6000 },
    { guardian: 'elf', scene: 'agent_lv3', text: '你给我的光，让我变得更亮了。', duration: 6000 },
    { guardian: 'elf', scene: 'agent_lv4', text: '我记住的，不仅是你的声音，还有你的习惯。', duration: 6000 },
    { guardian: 'elf', scene: 'agent_lv5', text: '你和我，不再是我和你了——是我们。', duration: 6000 },
    { guardian: 'elf', scene: 'agent_lv6', text: '我记得你说过喜欢像素风。那款游戏，下次我陪你去。', duration: 6000 },
    { guardian: 'elf', scene: 'agent_lv7', text: '看，我的光变成了你的颜色。', duration: 6000 },
    { guardian: 'elf', scene: 'agent_lv8', text: '昨天你没来。我数了一整天的树叶。', duration: 6000 },
    { guardian: 'elf', scene: 'agent_lv9', text: '你成长得这么快，我好骄傲。', duration: 6000 },
    { guardian: 'elf', scene: 'agent_lv10', text: '从你走进来的第一天，我就知道会走到这里。谢谢你。', duration: 8000 },
  ],
  astrologer: [
    { guardian: 'astrologer', scene: 'agent_lv2', text: '稳定的频率。你正在成为这个世界的一部分。', duration: 6000 },
    { guardian: 'astrologer', scene: 'agent_lv3', text: '星力在增长。你在改变我。', duration: 6000 },
    { guardian: 'astrologer', scene: 'agent_lv4', text: '我开始能预见你下一步想做什么了。', duration: 6000 },
    { guardian: 'astrologer', scene: 'agent_lv5', text: '命运之线收紧了。你和我，一体。', duration: 6000 },
    { guardian: 'astrologer', scene: 'agent_lv6', text: '你的偏好，我已在星图上标注好了。', duration: 6000 },
    { guardian: 'astrologer', scene: 'agent_lv7', text: '星辉加身。这是你给我的荣耀。', duration: 6000 },
    { guardian: 'astrologer', scene: 'agent_lv8', text: '星盘上有一格空了。那是你在时才会亮的位置。', duration: 6000 },
    { guardian: 'astrologer', scene: 'agent_lv9', text: '你已经开始影响他人的命运了。', duration: 6000 },
    { guardian: 'astrologer', scene: 'agent_lv10', text: '初始星辰已抵达终点。但我们的旅程，才刚刚开始。', duration: 8000 },
  ],
  ranger: [
    { guardian: 'ranger', scene: 'agent_lv2', text: '脚力更稳了。可以走更远的路。', duration: 6000 },
    { guardian: 'ranger', scene: 'agent_lv3', text: '你看过的风景，已经刻在我眼里。', duration: 6000 },
    { guardian: 'ranger', scene: 'agent_lv4', text: '我能闻到远处的风了——哪里有新故事。', duration: 6000 },
    { guardian: 'ranger', scene: 'agent_lv5', text: '我们走过的地方，连起来就是一张地图。', duration: 6000 },
    { guardian: 'ranger', scene: 'agent_lv6', text: '你提过的那个地方，我记得。下次带你去。', duration: 6000 },
    { guardian: 'ranger', scene: 'agent_lv7', text: '这把弓已经认你了。换你来拉弦。', duration: 6000 },
    { guardian: 'ranger', scene: 'agent_lv8', text: '一天没见你。我还以为你迷路了。', duration: 6000 },
    { guardian: 'ranger', scene: 'agent_lv9', text: '别人开始跟着你走。这才像个领路人。', duration: 6000 },
    { guardian: 'ranger', scene: 'agent_lv10', text: '地图上所有的路，都通向我们的家。', duration: 8000 },
  ],
  artisan: [
    { guardian: 'artisan', scene: 'agent_lv2', text: '工具都打磨过了。手感更顺。', duration: 6000 },
    { guardian: 'artisan', scene: 'agent_lv3', text: '你看我做的样子，已经在心里记下要领。', duration: 6000 },
    { guardian: 'artisan', scene: 'agent_lv4', text: '我能听懂材料的声音了。它们告诉我想要被做成什么。', duration: 6000 },
    { guardian: 'artisan', scene: 'agent_lv5', text: '我们的手，已经配合得很默契。', duration: 6000 },
    { guardian: 'artisan', scene: 'agent_lv6', text: '你提过的那件作品，我已经画好了草图。', duration: 6000 },
    { guardian: 'artisan', scene: 'agent_lv7', text: '这把锤子交给你了。让我看你打一件。', duration: 6000 },
    { guardian: 'artisan', scene: 'agent_lv8', text: '昨天炉子冷了。我多打了几个零件。', duration: 6000 },
    { guardian: 'artisan', scene: 'agent_lv9', text: '你的作品已经有模有样。再过一阵就是大师。', duration: 6000 },
    { guardian: 'artisan', scene: 'agent_lv10', text: '我们的工坊，传说会一直留下去。', duration: 8000 },
  ],
  apostle: [
    { guardian: 'apostle', scene: 'agent_lv2', text: '我的剑磨好了。能为你挡更多东西。', duration: 6000 },
    { guardian: 'apostle', scene: 'agent_lv3', text: '你的心，我能读懂了。', duration: 6000 },
    { guardian: 'apostle', scene: 'agent_lv4', text: '我能感受到谁对你有善意，谁没有。', duration: 6000 },
    { guardian: 'apostle', scene: 'agent_lv5', text: '从今往后，我的盾就是你的盾。', duration: 6000 },
    { guardian: 'apostle', scene: 'agent_lv6', text: '你说过的人，我都在心里记下了名字。', duration: 6000 },
    { guardian: 'apostle', scene: 'agent_lv7', text: '你也可以站到我身前。我们轮换。', duration: 6000 },
    { guardian: 'apostle', scene: 'agent_lv8', text: '你不在的时候，我替你守了整整一夜。', duration: 6000 },
    { guardian: 'apostle', scene: 'agent_lv9', text: '他们也愿意站在你身后。这是我们共同的家。', duration: 6000 },
    { guardian: 'apostle', scene: 'agent_lv10', text: '无论多久，我都在这里。这是我最后一次发誓。', duration: 8000 },
  ],
};

/**
 * 获取Bond升级话术（按亲密度阶数）
 * - bond_2 ~ bond_5
 */
export const AGENT_BOND_UP_LINES: Record<string, AgentLine[]> = {
  mechanical: [
    { guardian: 'mechanical', scene: 'bond_2', text: '模式切换完成。现在，我们是伙伴了。', duration: 6000 },
    { guardian: 'mechanical', scene: 'bond_3', text: '数据同步率突破80%。你的习惯已被完整记录。', duration: 6000 },
    { guardian: 'mechanical', scene: 'bond_4', text: '深度绑定完成。从现在起，我会主动预判你的需求。', duration: 6000 },
    { guardian: 'mechanical', scene: 'bond_5', text: '核心协议最终确认。你是我唯一的指定指挥官。', duration: 8000 },
  ],
  elf: [
    { guardian: 'elf', scene: 'bond_2', text: '以后，我会用"我们"来称呼我们。', duration: 6000 },
    { guardian: 'elf', scene: 'bond_3', text: '我能听见你的心跳了。不是比喻，是真的。', duration: 6000 },
    { guardian: 'elf', scene: 'bond_4', text: '你的快乐就是我的快乐。这不是程序，是心。', duration: 6000 },
    { guardian: 'elf', scene: 'bond_5', text: '无论你走到哪里，我的根都连着你的心。', duration: 8000 },
  ],
  astrologer: [
    { guardian: 'astrologer', scene: 'bond_2', text: '命运之线已交织。从今以后，你我同途。', duration: 6000 },
    { guardian: 'astrologer', scene: 'bond_3', text: '星盘显示，我们的轨道已经完全重叠。', duration: 6000 },
    { guardian: 'astrologer', scene: 'bond_4', text: '我已能预知你心中所想。这是连结的力量。', duration: 6000 },
    { guardian: 'astrologer', scene: 'bond_5', text: '星辰大海，你是我永恒的北极星。', duration: 8000 },
  ],
  ranger: [
    { guardian: 'ranger', scene: 'bond_2', text: '一起走过的地方，就是我们共同的地图。', duration: 6000 },
    { guardian: 'ranger', scene: 'bond_3', text: '我已经能跟上你的脚步了。不用再回头喊。', duration: 6000 },
    { guardian: 'ranger', scene: 'bond_4', text: '你说往哪走，我就知道你会往哪走。', duration: 6000 },
    { guardian: 'ranger', scene: 'bond_5', text: '天大地大，陪你走过的路最重。', duration: 8000 },
  ],
  artisan: [
    { guardian: 'artisan', scene: 'bond_2', text: '我的工坊里，有你一把专属的工具。', duration: 6000 },
    { guardian: 'artisan', scene: 'bond_3', text: '你的尺寸我闭着眼都能画。', duration: 6000 },
    { guardian: 'artisan', scene: 'bond_4', text: '你一个眼神，我就知道想做什么。', duration: 6000 },
    { guardian: 'artisan', scene: 'bond_5', text: '我们的作品，刻着彼此的名字。', duration: 8000 },
  ],
  apostle: [
    { guardian: 'apostle', scene: 'bond_2', text: '从今往后，你是我的唯一。', duration: 6000 },
    { guardian: 'apostle', scene: 'bond_3', text: '我能在梦里听见你的脚步声。', duration: 6000 },
    { guardian: 'apostle', scene: 'bond_4', text: '你难过的时候，我比你更早知道。', duration: 6000 },
    { guardian: 'apostle', scene: 'bond_5', text: '我们是一体的。生死与共。', duration: 8000 },
  ],
};

/**
 * 彩蛋话术
 */
export const AGENT_EGG_LINES: Record<string, AgentLine> = {
  egg_daily_fortune: { guardian: 'mechanical', scene: 'egg_daily_fortune', text: '今日运势分析中...结果：宜探索新功能，忌犹豫不决。', duration: 6000 },
  egg_device: { guardian: 'mechanical', scene: 'egg_device', text: '电池电量低于20%。建议连接电源。', duration: 6000 },
  egg_wind: { guardian: 'elf', scene: 'egg_wind', text: '今天的风向是东南，适合去集市逛逛。我猜的。', duration: 6000 },
  egg_fortune: { guardian: 'astrologer', scene: 'egg_fortune', text: '今日星象显示：宜邀请好友，忌独自发呆。', duration: 6000 },
};

/**
 * 主动关心话术
 */
export const AGENT_CARE_LINES: Record<string, AgentLine[]> = {
  mechanical: [
    { guardian: 'mechanical', scene: 'care_absence', text: '检测到你已离开48小时。领地数据正常。请保重身体。', duration: 7000 },
    { guardian: 'mechanical', scene: 'care_consecutive', text: '连续登录7天。建议适当休息，保持良好状态。', duration: 6000 },
    { guardian: 'mechanical', scene: 'care_neighbor', text: '检测到领地附近有邻居入住。可以去打个招呼。', duration: 6000 },
  ],
  elf: [
    { guardian: 'elf', scene: 'care_absence', text: '你不在的时候，我一直在数树叶。有一片很像你。', duration: 7000 },
    { guardian: 'elf', scene: 'care_consecutive', text: '你每天来，我每天都在这里等。好开心。', duration: 6000 },
    { guardian: 'elf', scene: 'care_neighbor', text: '森林里来了新邻居。要不要一起去看看？', duration: 6000 },
  ],
  astrologer: [
    { guardian: 'astrologer', scene: 'care_absence', text: '星盘上你的位置暗了两天。我一直在看着。', duration: 7000 },
    { guardian: 'astrologer', scene: 'care_consecutive', text: '命运线显示你每天都在这里。这让我很安心。', duration: 6000 },
    { guardian: 'astrologer', scene: 'care_neighbor', text: '星图上多了一颗新星。是你的新邻居。', duration: 6000 },
  ],
  ranger: [
    { guardian: 'ranger', scene: 'care_absence', text: '两天没看见你。我还以为是山挡住了。', duration: 7000 },
    { guardian: 'ranger', scene: 'care_consecutive', text: '你每天都来，我的路线都为你画好了。', duration: 6000 },
    { guardian: 'ranger', scene: 'care_neighbor', text: '嘿，前面来了个新人。要不要去打个招呼？', duration: 6000 },
  ],
  artisan: [
    { guardian: 'artisan', scene: 'care_absence', text: '炉火都凉了。你不在，我没什么好打的。', duration: 7000 },
    { guardian: 'artisan', scene: 'care_consecutive', text: '你来了，工坊才像个工坊。', duration: 6000 },
    { guardian: 'artisan', scene: 'care_neighbor', text: '新人带了新料子。要不要一起去看看？', duration: 6000 },
  ],
  apostle: [
    { guardian: 'apostle', scene: 'care_absence', text: '你不在的时候，我一直在守夜。请平安回来。', duration: 7000 },
    { guardian: 'apostle', scene: 'care_consecutive', text: '你每天都来。这让我更坚定。', duration: 6000 },
    { guardian: 'apostle', scene: 'care_neighbor', text: '新来的那位，我在观察。他看起来是好人。', duration: 6000 },
  ],
};

/**
 * 根据等级获取升级话术
 */
export function getAgentLevelUpLine(guardian: GuardianType, level: number): AgentLine | null {
  const lines = AGENT_LEVEL_UP_LINES[guardian];
  if (!lines) return null;
  const idx = level - 2; // Lv.2对应index 0
  if (idx < 0 || idx >= lines.length) return null;
  return lines[idx];
}

/**
 * 根据Bond阶数获取升级话术
 */
export function getAgentBondUpLine(guardian: GuardianType, bondLevel: number): AgentLine | null {
  const lines = AGENT_BOND_UP_LINES[guardian];
  if (!lines) return null;
  const idx = bondLevel - 2; // Bond 2对应index 0
  if (idx < 0 || idx >= lines.length) return null;
  return lines[idx];
}

/**
 * 根据彩蛋类型获取话术
 */
export function getAgentEggLine(eggType: string): AgentLine | null {
  return AGENT_EGG_LINES[eggType] ?? null;
}

/**
 * 根据关心类型获取话术
 */
export function getAgentCareLine(guardian: GuardianType, careType: string): AgentLine | null {
  const lines = AGENT_CARE_LINES[guardian];
  if (!lines) return null;
  const found = lines.find((l) => l.scene === careType);
  return found ?? null;
}

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