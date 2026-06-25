/**
 * OpenIM 自定义消息类型定义
 * - 用于守护灵系统与 OpenIM 集成的消息格式
 */

/**
 * 守护灵升级消息
 */
export interface AgentUpgradeMessage {
  type: 'agent_upgrade';
  data: {
    newLevel: number;
    oldLevel: number;
    text: string;
  };
}

/**
 * 亲密度升阶消息
 */
export interface AgentBondUpMessage {
  type: 'agent_bond_up';
  data: {
    newBondLevel: number;
    oldBondLevel: number;
    text: string;
  };
}

/**
 * 守护灵彩蛋消息
 */
export interface AgentEggMessage {
  type: 'agent_egg';
  data: {
    eggType: string;
    text: string;
  };
}

/**
 * 守护灵主动关心消息
 */
export interface AgentCareMessage {
  type: 'agent_care';
  data: {
    careType: string;
    text: string;
  };
}

/**
 * 守护灵话术消息
 */
export interface AgentLineMessage {
  type: 'agent_line';
  data: {
    scene: string;
    text: string;
  };
}

/**
 * 所有守护灵相关的 OpenIM 消息类型联合
 */
export type AgentIMMessage =
  | AgentUpgradeMessage
  | AgentBondUpMessage
  | AgentEggMessage
  | AgentCareMessage
  | AgentLineMessage;

/**
 * 检查消息是否为守护灵相关消息
 */
export function isAgentMessage(message: unknown): message is AgentIMMessage {
  if (!message || typeof message !== 'object') return false;
  const msg = message as Record<string, unknown>;
  return (
    msg.type === 'agent_upgrade' ||
    msg.type === 'agent_bond_up' ||
    msg.type === 'agent_egg' ||
    msg.type === 'agent_care' ||
    msg.type === 'agent_line'
  );
}

/**
 * 解析守护灵消息内容
 */
export function parseAgentMessage(message: unknown): AgentIMMessage | null {
  if (!isAgentMessage(message)) return null;
  return message as AgentIMMessage;
}
