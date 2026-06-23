/**
 * GamDen 表情包数据
 * ----------------------------------------------------------------------
 * - 采用 unicode emoji，无需额外图片资源
 * - 按 9 个分类组织，覆盖玩家群聊高频场景
 * - 每条表情可附带搜索关键字，便于后续扩展为自定义图床
 */

export interface EmojiItem {
  /** 表情字符 */
  char: string;
  /** 中文描述（用于 a11y + 搜索） */
  name: string;
  /** 关键字（用于 fuzzy 搜索） */
  keywords: string[];
}

export interface EmojiCategory {
  id: string;
  label: string;
  icon: string;
  emojis: EmojiItem[];
}

/** 9 个分类、共 ~140 个表情 */
export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'smile',
    label: '表情',
    icon: '😀',
    emojis: [
      { char: '😀', name: '开心', keywords: ['开心', '笑', '高兴', 'smile'] },
      { char: '😂', name: '笑哭', keywords: ['笑哭', '哈哈', 'cry'] },
      { char: '🤣', name: '爆笑', keywords: ['笑死', '爆笑', 'rofl'] },
      { char: '😊', name: '微笑', keywords: ['微笑', '害羞', 'shy'] },
      { char: '😍', name: '喜爱', keywords: ['爱', '喜欢', 'love'] },
      { char: '🥰', name: '心动', keywords: ['心动', '爱慕', 'adore'] },
      { char: '😘', name: '飞吻', keywords: ['飞吻', '亲', 'kiss'] },
      { char: '😎', name: '酷', keywords: ['酷', '墨镜', 'cool'] },
      { char: '🤩', name: '星星眼', keywords: ['星星', '羡慕', 'star'] },
      { char: '😜', name: '吐舌', keywords: ['调皮', '吐舌', 'tongue'] },
      { char: '🤔', name: '思考', keywords: ['思考', '疑惑', 'think'] },
      { char: '😏', name: '得意', keywords: ['得意', '坏笑', 'smirk'] },
      { char: '😅', name: '尴尬', keywords: ['尴尬', '汗', 'awkward'] },
      { char: '😴', name: '睡觉', keywords: ['睡', '困', 'sleep'] },
      { char: '🤯', name: '震惊', keywords: ['震惊', '炸', 'mind'] },
      { char: '🥺', name: '可怜', keywords: ['可怜', '求', 'plead'] },
    ],
  },
  {
    id: 'gesture',
    label: '手势',
    icon: '👍',
    emojis: [
      { char: '👍', name: '点赞', keywords: ['赞', '顶', 'thumbs'] },
      { char: '👎', name: '踩', keywords: ['踩', '差评', 'down'] },
      { char: '👏', name: '鼓掌', keywords: ['鼓掌', '厉害', 'clap'] },
      { char: '🙏', name: '拜托', keywords: ['拜托', '请', 'pray'] },
      { char: '👋', name: '挥手', keywords: ['你好', '再见', 'wave'] },
      { char: '✌️', name: '胜利', keywords: ['胜利', '耶', 'peace'] },
      { char: '🤞', name: '好运', keywords: ['好运', '祈祷', 'cross'] },
      { char: '👊', name: '拳头', keywords: ['加油', '拳头', 'fist'] },
      { char: '💪', name: '肌肉', keywords: ['强', '肌肉', 'muscle'] },
      { char: '🫶', name: '比心', keywords: ['比心', '爱', 'heart'] },
    ],
  },
  {
    id: 'gaming',
    label: '游戏',
    icon: '🎮',
    emojis: [
      { char: '🎮', name: '手柄', keywords: ['游戏', '手柄', 'game'] },
      { char: '⚔️', name: '剑', keywords: ['战斗', '剑', 'sword'] },
      { char: '🛡️', name: '盾', keywords: ['防御', '盾', 'shield'] },
      { char: '🏹', name: '弓', keywords: ['弓箭', '射', 'bow'] },
      { char: '🪄', name: '魔杖', keywords: ['魔法', '魔杖', 'wand'] },
      { char: '🔮', name: '水晶球', keywords: ['占卜', '水晶', 'crystal'] },
      { char: '⚙️', name: '齿轮', keywords: ['机械', '齿轮', 'gear'] },
      { char: '🗡️', name: '匕首', keywords: ['匕首', '刀', 'dagger'] },
      { char: '🏆', name: '奖杯', keywords: ['冠军', '奖杯', 'trophy'] },
      { char: '🎯', name: '靶心', keywords: ['精准', '靶', 'target'] },
      { char: '💎', name: '钻石', keywords: ['钻石', '宝石', 'gem'] },
      { char: '🪙', name: '金币', keywords: ['金币', '钱', 'coin'] },
    ],
  },
  {
    id: 'life',
    label: '生活',
    icon: '🍜',
    emojis: [
      { char: '🍜', name: '拉面', keywords: ['吃', '拉面', 'noodle'] },
      { char: '🍱', name: '便当', keywords: ['便当', '饭', 'bento'] },
      { char: '🍣', name: '寿司', keywords: ['寿司', '日料', 'sushi'] },
      { char: '🍻', name: '干杯', keywords: ['喝', '干杯', 'beer'] },
      { char: '☕', name: '咖啡', keywords: ['咖啡', '提神', 'coffee'] },
      { char: '🍰', name: '蛋糕', keywords: ['蛋糕', '甜', 'cake'] },
      { char: '🚬', name: '吞云', keywords: ['吞云', '烟', 'smoke'] },
      { char: '💤', name: '打盹', keywords: ['睡', 'zzz', 'sleep'] },
      { char: '🎵', name: '音乐', keywords: ['音乐', '听歌', 'music'] },
      { char: '📚', name: '读书', keywords: ['看书', '学习', 'book'] },
    ],
  },
  {
    id: 'nest',
    label: '巢穴',
    icon: '🏯',
    emojis: [
      { char: '🏯', name: '巢穴', keywords: ['巢穴', '家', 'nest'] },
      { char: '🛖', name: '小屋', keywords: ['小屋', '房子', 'hut'] },
      { char: '🌳', name: '大树', keywords: ['树', '丛林', 'tree'] },
      { char: '🌿', name: '草药', keywords: ['草药', '草', 'herb'] },
      { char: '🍄', name: '蘑菇', keywords: ['蘑菇', '菌', 'mushroom'] },
      { char: '🦌', name: '灵鹿', keywords: ['鹿', '灵鹿', 'deer'] },
      { char: '🦊', name: '狐', keywords: ['狐', 'fox'] },
      { char: '🐉', name: '龙', keywords: ['龙', 'dragon'] },
      { char: '🦅', name: '鹰', keywords: ['鹰', 'eagle'] },
      { char: '🌙', name: '月', keywords: ['月', '夜', 'moon'] },
      { char: '⭐', name: '星', keywords: ['星', 'star'] },
      { char: '🔥', name: '烽火', keywords: ['烽火', '火', 'fire'] },
    ],
  },
  {
    id: 'quest',
    label: '任务',
    icon: '📜',
    emojis: [
      { char: '📜', name: '卷轴', keywords: ['任务', '卷轴', 'scroll'] },
      { char: '🗝️', name: '钥匙', keywords: ['钥匙', '解谜', 'key'] },
      { char: '🧭', name: '罗盘', keywords: ['罗盘', '探索', 'compass'] },
      { char: '🗺️', name: '地图', keywords: ['地图', 'map'] },
      { char: '⚗️', name: '炼金', keywords: ['炼金', 'alembic'] },
      { char: '🧪', name: '药水', keywords: ['药水', 'potion'] },
      { char: '💰', name: '钱袋', keywords: ['钱', '财', 'money'] },
      { char: '🎁', name: '礼物', keywords: ['礼物', '宝箱', 'gift'] },
      { char: '📯', name: '号角', keywords: ['号角', '召集', 'horn'] },
      { char: '🚩', name: '战旗', keywords: ['战旗', '旗', 'flag'] },
    ],
  },
  {
    id: 'emotion',
    label: '情绪',
    icon: '🥳',
    emojis: [
      { char: '🥳', name: '庆祝', keywords: ['庆祝', 'party'] },
      { char: '😭', name: '大哭', keywords: ['哭', '悲伤', 'cry'] },
      { char: '😡', name: '愤怒', keywords: ['怒', '生气', 'angry'] },
      { char: '😱', name: '尖叫', keywords: ['惊', '吓', 'scream'] },
      { char: '🤬', name: '口吐', keywords: ['骂', '口吐', 'curse'] },
      { char: '🥲', name: '含泪', keywords: ['含泪', '感动', 'tear'] },
      { char: '😴', name: '困倦', keywords: ['困', '累', 'tired'] },
      { char: '🤒', name: '生病', keywords: ['病', '发烧', 'sick'] },
    ],
  },
  {
    id: 'symbol',
    label: '符号',
    icon: '💯',
    emojis: [
      { char: '💯', name: '满分', keywords: ['满分', '100'] },
      { char: '✨', name: '闪光', keywords: ['闪光', '特效'] },
      { char: '💥', name: '爆炸', keywords: ['炸', '爆'] },
      { char: '💫', name: '眩晕', keywords: ['晕'] },
      { char: '⚡', name: '闪电', keywords: ['雷', '闪电'] },
      { char: '🌊', name: '海浪', keywords: ['海', '浪'] },
      { char: '🎉', name: '撒花', keywords: ['撒花', '庆祝'] },
      { char: '🎊', name: '彩球', keywords: ['彩球'] },
      { char: '♻️', name: '循环', keywords: ['循环'] },
      { char: '🆗', name: 'OK', keywords: ['ok', '好'] },
      { char: '🆒', name: '酷', keywords: ['cool'] },
      { char: '🆕', name: '新', keywords: ['new'] },
    ],
  },
  {
    id: 'guard',
    label: '守护',
    icon: '🛡️',
    emojis: [
      { char: '🛡️', name: '守护', keywords: ['守护', '盾'] },
      { char: '⚙️', name: '机械', keywords: ['机械'] },
      { char: '🌿', name: '精灵', keywords: ['精灵'] },
      { char: '🔮', name: '占星', keywords: ['占星'] },
      { char: '🏯', name: '领地', keywords: ['领地'] },
      { char: '🛖', name: '巢穴', keywords: ['巢穴'] },
      { char: '📯', name: '召集', keywords: ['召集'] },
      { char: '⚔️', name: '出征', keywords: ['出征', '战'] },
    ],
  },
];

/** 扁平化（用于搜索 / 最近使用） */
export const ALL_EMOJIS: EmojiItem[] = EMOJI_CATEGORIES.flatMap((c) => c.emojis);

/**
 * 关键字搜索
 */
export function searchEmoji(keyword: string, limit = 24): EmojiItem[] {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return [];
  return ALL_EMOJIS
    .filter(
      (e) =>
        e.name.includes(kw) ||
        e.keywords.some((k) => k.toLowerCase().includes(kw)),
    )
    .slice(0, limit);
}
