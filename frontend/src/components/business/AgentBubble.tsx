import React from 'react';
import { AgentAvatar, GuardianType } from './AgentAvatar';

interface AgentBubbleProps {
  type: GuardianType | string;
  text: string;
  timestamp?: string;
  triggerEvent?: string;
  className?: string;
}

/**
 * 守护灵消息气泡 - 区别于普通用户气泡：
 * 1. 守护灵头像带光晕
 * 2. 气泡左侧特殊金色边框
 * 3. 不可回复（视觉上无输入提示）
 */
export const AgentBubble: React.FC<AgentBubbleProps> = ({
  type,
  text,
  timestamp,
  triggerEvent,
  className = '',
}) => {
  return (
    <div
      className={[
        'flex items-start gap-3 p-3 rounded-nest-md',
        'bg-brand-ink-raised border-l-4 border-brand-gold shadow-nest-card',
        'animate-fade-in',
        className,
      ].join(' ')}
    >
      <AgentAvatar type={type} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-brand-gold font-semibold uppercase tracking-wider">
            守护灵
          </span>
          {timestamp && (
            <span className="text-xs text-brand-mute">{timestamp}</span>
          )}
        </div>
        <p className="text-brand-paper font-serif leading-relaxed whitespace-pre-wrap">
          {text}
        </p>
        {triggerEvent && (
          <div className="mt-1 text-xs text-brand-mute italic">
            触发事件：{triggerEvent}
          </div>
        )}
      </div>
    </div>
  );
};