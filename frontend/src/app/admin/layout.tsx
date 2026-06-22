'use client';

import React from 'react';
import Link from 'next/link';
import './admin.css';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-layout">
      {/* 侧边栏 */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <h2>GamDen 后台管理</h2>
        </div>
        
        <nav className="sidebar-nav">
          <ul>
            <li>
              <Link href="/admin">
                <span className="nav-icon">📊</span>
                数据看板
              </Link>
            </li>
            <li>
              <Link href="/admin/users">
                <span className="nav-icon">👥</span>
                用户管理
              </Link>
            </li>
            <li>
              <Link href="/admin/content-audit">
                <span className="nav-icon">✅</span>
                内容审核
              </Link>
            </li>
            <li>
              <Link href="/admin/clubs">
                <span className="nav-icon">🎮</span>
                俱乐部管理
              </Link>
            </li>
            <li>
              <Link href="/admin/config">
                <span className="nav-icon">⚙️</span>
                系统配置
              </Link>
            </li>
            <li>
              <Link href="/admin/logs">
                <span className="nav-icon">📝</span>
                操作日志
              </Link>
            </li>
          </ul>
        </nav>
        
        <div className="sidebar-footer">
          <Link href="/">
            <span className="nav-icon">🏠</span>
            返回首页
          </Link>
        </div>
      </aside>
      
      {/* 主内容区 */}
      <main className="admin-main">
        <header className="admin-header">
          <h1>后台管理系统</h1>
          <div className="header-actions">
            <span>管理员：Admin</span>
            <button onClick={() => {
              localStorage.removeItem('token');
              window.location.href = '/auth/login';
            }}>
              退出登录
            </button>
          </div>
        </header>
        
        <div className="admin-content">
          {children}
        </div>
      </main>
    </div>
  );
}
