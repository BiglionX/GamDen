import React from 'react';
import { AgentAvatar, GuardianType, getGuardianName } from './AgentAvatar';
import { Button } from '@/components/ui/button';

export interface NeighborInfo {
  user_id: number;
  nickname: string;
  level: number;
  guardian_type: GuardianType | string;
  signature?: string;
  territory_coord_x: number;
  territory_coord_y: number;
  game_tags?: string[];
}

interface NeighborPopoverProps {
  neighbor: NeighborInfo;
  onClose: () => void;
  onGreet?: () => void;
  className?: string;
}

/**
 * 邻居弹出卡 - 半透明卷轴卡片
 * 包含：邻居信息、游戏标签、招呼按钮
 */
export const NeighborPopover: React.FC<NeighborPopoverProps> = ({
  neighbor,
  onClose,
  onGreet,
  className = '',
}) => {
  return (
    <>
      {/* 点击外部关闭 */}
      <div
        className="fixed inset-0 z-30"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={[
          'absolute z-40 w-64 animate-fade-in',
          className,
        ].join(' ')}
        style={{
          background:
            'linear-gradient(135deg, rgba(42, 50, 43, 0.96), rgba(30, 36, 31, 0.96))',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(201, 168, 124, 0.4)',
          borderRadius: '8px',
          boxShadow:
            '0 0 24px rgba(201, 168, 124, 0.2), 0 8px 24px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* 卷轴顶部 */}
        <div
          className="h-1 rounded-t-md"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, #C9A87C 30%, #A8865E 50%, #C9A87C 70%, transparent 100%)',
          }}
        />

        <div className="p-4">
          {/* 头部 */}
          <div className="flex items-start gap-3 mb-3">
            <AgentAvatar type={neighbor.guardian_type} size="md" animated={false} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg text-brand-paper truncate">
                  {neighbor.nickname}
                </h3>
                <span className="text-xs px-1.5 py-0.5 bg-brand-gold/15 text-brand-gold rounded-nest-sm border border-brand-gold/30">
                  Lv.{neighbor.level}
                </span>
              </div>
              <p className="text-xs text-brand-paper-mute truncate">
                {getGuardianName(neighbor.guardian_type)}
              </p>
            </div>
          </div>

          {/* 签名 */}
          {neighbor.signature && (
            <p className="text-sm italic text-brand-paper-mute font-serif mb-3 pl-3 border-l-2 border-brand-gold-deep">
              "{neighbor.signature}"
            </p>
          )}

          {/* 游戏标签 */}
          {neighbor.game_tags && neighbor.game_tags.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-brand-mute mb-1.5 uppercase tracking-wider">
                最近在玩
              </div>
              <div className="flex flex-wrap gap-1">
                {neighbor.game_tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 bg-brand-ink-deep text-brand-paper-mute rounded-nest-sm border border-brand-gold-deep/30"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 坐标 */}
          <div className="text-xs text-brand-mute font-mono mb-3">
            ({neighbor.territory_coord_x}, {neighbor.territory_coord_y})
          </div>

          {/* 操作 */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={onClose}
            >
              收起
            </Button>
            <Button
              variant="primary"
              size="sm"
              fullWidth
              onClick={() => {
                onGreet?.();
                onClose();
              }}
            >
              打招呼
            </Button>
          </div>
        </div>

        {/* 卷轴底部 */}
        <div
          className="h-1 rounded-b-md"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, #C9A87C 30%, #A8865E 50%, #C9A87C 70%, transparent 100%)',
          }}
        />
      </div>
    </>
  );
};