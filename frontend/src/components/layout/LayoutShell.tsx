import React from 'react';

interface BottomTab {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface LayoutShellProps {
  children: React.ReactNode;
  activeTab?: string;
  topBarRight?: React.ReactNode;
  topBarLeft?: React.ReactNode;
  showBottomTabs?: boolean;
  className?: string;
}

const defaultTabs: BottomTab[] = [
  {
    key: 'map',
    label: '地图',
    href: '/territory',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="20" height="20" stroke="currentColor" strokeWidth="2">
        <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z" />
        <path d="M9 4v16M15 6v16" />
      </svg>
    ),
  },
  {
    key: 'club',
    label: '俱乐部',
    href: '/club',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="20" height="20" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    key: 'shop',
    label: '集市',
    href: '/shop',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="20" height="20" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l1-5h16l1 5M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9M9 13h6" />
      </svg>
    ),
  },
  {
    key: 'mine',
    label: '我的',
    href: '/agent',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="20" height="20" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-2a6 6 0 0112 0v2" />
      </svg>
    ),
  },
];

/**
 * 古风巢穴布局壳 - 顶部状态栏 + 内容 + 底部 4 Tab
 * 替代各页面散乱的导航，所有页面统一套用
 */
export const LayoutShell: React.FC<LayoutShellProps> = ({
  children,
  activeTab,
  topBarRight,
  topBarLeft,
  showBottomTabs = true,
  className = '',
}) => {
  return (
    <div
      className={[
        'min-h-screen flex flex-col bg-brand-ink text-brand-paper',
        className,
      ].join(' ')}
    >
      {/* 顶部状态栏 */}
      {(topBarLeft || topBarRight) && (
        <header className="sticky top-0 z-30 bg-brand-ink-deep/95 backdrop-blur border-b border-brand-gold-deep/40 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">{topBarLeft}</div>
          <div className="flex items-center gap-3">{topBarRight}</div>
        </header>
      )}

      {/* 内容区 */}
      <main className="flex-1 pb-20">{children}</main>

      {/* 底部 Tab */}
      {showBottomTabs && (
        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-brand-ink-deep/95 backdrop-blur border-t border-brand-gold-deep/40">
          <ul className="flex items-center justify-around px-2 py-1.5 max-w-md mx-auto">
            {defaultTabs.map((tab) => {
              const isActive = tab.key === activeTab;
              return (
                <li key={tab.key} className="flex-1">
                  <a
                    href={tab.href}
                    className={[
                      'flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-nest-sm transition-colors',
                      isActive
                        ? 'text-brand-gold'
                        : 'text-brand-paper-mute hover:text-brand-paper',
                    ].join(' ')}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span
                      className={[
                        'flex items-center justify-center transition-transform',
                        isActive ? 'scale-110' : '',
                      ].join(' ')}
                    >
                      {tab.icon}
                    </span>
                    <span className="text-xs font-medium">{tab.label}</span>
                    {isActive && (
                      <span className="block w-1 h-1 rounded-full bg-brand-gold mt-0.5" />
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
};