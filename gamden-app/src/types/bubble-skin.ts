/**
 * GamDen 气泡皮肤类型定义
 * ----------------------------------------------------------------------
 * 与 wxo_bubble_customize.json / .plist 配置对应的 TypeScript 类型
 *
 * 用途：
 * - 前端组件类型检查
 * - 配置文件验证
 * - IDE 自动补全
 */

/**
 * 品牌色配置
 */
export interface SkinColors {
  /** 皮肤 ID */
  id: string;
  /** 皮肤名称 */
  name: string;
  /** 版本号 */
  version: number;
  /** 主题色（领地金） */
  themeColor: string;
  /** 主题色（深） */
  themeColorDark: string;
  /** 主题色（浅） */
  themeColorLight: string;
  /** 页面背景色 */
  bgColor: string;
  /** 主文字色 */
  textColor: string;
  /** 次文字色 */
  subTextColor: string;
  /** 强调色（守护灵 + 功能色） */
  accentColors: {
    'guardian.mechanical': string;
    'guardian.elf': string;
    'guardian.astrologer': string;
    fire: string;
    verdant: string;
  };
}

/**
 * 聊天背景配置
 */
export interface BackgroundConfig {
  /** 背景类型 */
  type: 'image+pattern' | 'image' | 'pattern' | 'color';
  /** SVG 背景图路径 */
  image?: string;
  /** CSS 背景兜底 */
  imageFallback?: string;
  /** 纹理 ID */
  patternId?: string;
  /** 基础色 */
  baseColor: string;
  /** 次级色 */
  secondaryColor?: string;
  /** 强调色 */
  accentColor?: string;
  /** CSS 背景表达式 */
  cssBackground?: string;
  /** 背景尺寸 */
  backgroundSize?: string;
}

/**
 * 导航栏配置
 */
export interface NavigationBarConfig {
  /** 背景色 */
  background: string;
  /** 标题颜色 */
  titleColor: string;
  /** 标题字体 */
  titleFontFamily?: string;
  /** 标题字号 */
  titleFontSize?: string;
  /** 标题字重 */
  titleFontWeight?: number;
  /** 返回按钮颜色 */
  backButtonColor: string;
  /** 返回按钮尺寸 */
  backButtonSize?: string;
  /** 底部边框 */
  borderBottom?: string;
  /** 阴影 */
  shadow?: string;
  /** 右侧按钮 */
  rightButtons?: {
    color: string;
    size: string;
  };
}

/**
 * 边框配置
 */
export interface BorderConfig {
  outer?: {
    width: string;
    color: string;
    radius?: string;
    comment?: string;
  };
  inner?: {
    width: string;
    color: string;
    inset: string;
    radius?: string;
  };
  texture?: {
    type: string;
    pattern: string;
    comment?: string;
  };
}

/**
 * 填充配置
 */
export interface FillConfig {
  type: string;
  value: string;
  comment?: string;
  pattern?: string;
  patternSize?: string;
}

/**
 * 气泡配置
 */
export interface BubbleConfig {
  /** 气泡 ID */
  id: string;
  /** 对齐方式 */
  alignment: 'left' | 'right' | 'center';
  /** 最大宽度 */
  maxWidth: string;
  /** 内边距 */
  padding: string;
  /** 圆角 */
  borderRadius: string;
  /** 填充 */
  fill: FillConfig;
  /** 边框 */
  border?: BorderConfig;
  /** 文字颜色 */
  textColor: string;
  /** 文字字重 */
  textWeight?: number;
  /** 阴影 */
  shadow?: string;
  /** 注释 */
  comment?: string;
}

/**
 * 气泡集合
 */
export interface BubblesConfig {
  /** 他人消息（左） */
  text_others: BubbleConfig;
  /** 自己消息（右） */
  text_self: BubbleConfig;
  /** 大表情 */
  emoji: BubbleConfig;
  /** 守护灵通知 */
  guardian: BubbleConfig & {
    borderLeft: {
      width: string;
      style: string;
      color: string;
    };
    avatar: {
      size: string;
      shape: string;
      borderWidth: string;
      glow: boolean;
      glowColor: string;
    };
    title: {
      fontSize: string;
      color: string;
      fontWeight: number;
    };
    subtitle: {
      fontSize: string;
      color: string;
      fontWeight: number;
      letterSpacing: string;
    };
    content: {
      fontSize: string;
      color: string;
      lineHeight: number;
    };
    levelTag: {
      fontSize: string;
      padding: string;
      borderRadius: string;
      bgColor: string;
      textColor: string;
    };
  };
  /** 入群欢迎 */
  welcome: BubbleConfig & {
    layout: string;
    outerFrame: {
      type: string;
      value: string;
    };
    inner: {
      padding: string;
      borderRadius: string;
      fill: FillConfig;
    };
    avatar: {
      size: string;
      shape: string;
      borderColor: string;
      borderWidth: string;
    };
    nameText: {
      fontSize: string;
      color: string;
      fontWeight: number;
    };
    actionText: {
      fontSize: string;
      color: string;
      text: string;
      letterSpacing: string;
    };
    greetingText: {
      fontSize: string;
      fontWeight: number;
      gradient: string;
      lineHeight: number;
    };
    footerDivider: {
      type: string;
      color: string;
    };
  };
}

/**
 * 头像配置
 */
export interface AvatarConfig {
  size: string;
  shape: 'circle' | 'square' | 'rounded';
  background: string;
  borderWidth: string;
  borderColor: string;
  shadow: string;
}

/**
 * 输入栏配置
 */
export interface InputBarConfig {
  background: string;
  borderTop: string;
  padding?: string;
  safeAreaBottom?: boolean;
  textarea: {
    background: string;
    border: string;
    borderRadius: string;
    padding: string;
    fontSize: string;
    color: string;
    placeholderColor?: string;
    lineHeight?: number;
    minHeight?: string;
    maxHeight?: string;
  };
  sendButton: {
    comment?: string;
    background: string;
    color: string;
    fontWeight: number;
    borderRadius: string;
    padding: string;
    shadow: string;
    border: string;
  };
  emojiButton?: {
    background: string;
    borderColor: string;
    iconColor: string;
    size: string;
  };
  moreButton?: {
    background: string;
    borderColor: string;
    iconColor: string;
    size: string;
  };
}

/**
 * 成员面板配置
 */
export interface MemberPanelConfig {
  width: string;
  maxWidth: string;
  background: string;
  backgroundPattern?: string;
  backgroundSize?: string;
  shadow: string;
  headerBackground?: string;
  headerTextColor?: string;
  roleBadge: {
    owner: {
      background: string;
      color: string;
      text: string;
    };
    admin: {
      background: string;
      color: string;
      text: string;
    };
  };
  onlineDot: {
    color: string;
    border: string;
  };
}

/**
 * 顶部头配置（兼容老字段）
 */
export interface HeaderConfig {
  comment?: string;
  background: string;
  borderBottom: string;
  backdropFilter?: string;
}

/**
 * 自定义消息类型映射
 */
export interface CustomMessageTypes {
  _comment?: string;
  TEXT: number;
  IMAGE: number;
  VOICE: number;
  VIDEO: number;
  FILE: number;
  AT: number;
  REVOKE: number;
  EMOJI: number;
  GUARDIAN_NOTICE: number;
  WELCOME: number;
}

/**
 * 平台说明
 */
export interface PlatformNotes {
  UniApp_Web: string;
  iOS_Native: string;
  Android_Native: string;
  MiniProgram: string;
}

/**
 * 完整皮肤配置
 */
export interface BubbleSkinConfig {
  _comment?: string;
  _version: number;
  _updated?: string;
  _for?: string;
  _design_spec?: string;
  _architecture_note?: string;

  skin: SkinColors;
  background: BackgroundConfig;
  navigationBar: NavigationBarConfig;
  bubbles: BubblesConfig;
  avatar: AvatarConfig;
  inputBar: InputBarConfig;
  memberPanel: MemberPanelConfig;
  header: HeaderConfig;
  customMessageTypes: CustomMessageTypes;
  _platform_notes?: PlatformNotes;
}

/**
 * 默认导出：皮肤配置类型
 */
export default BubbleSkinConfig;
