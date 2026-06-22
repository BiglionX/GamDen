import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import '../admin.css';

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchDashboardData();
  }, []);
  
  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data.data);
      } else {
        console.error('获取数据看板失败');
      }
    } catch (error) {
      console.error('获取数据看板失败:', error);
      alert('获取数据看板失败');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return <div>加载中...</div>;
  }
  
  return (
    <div>
      <h2>数据看板</h2>
      
      {/* 数据卡片 */}
      <div className="dashboard-cards">
        <div className="dashboard-card">
          <h3>日活跃用户（DAU）</h3>
          <div className="value">{dashboardData?.dau || 0}</div>
        </div>
        
        <div className="dashboard-card">
          <h3>新增用户</h3>
          <div className="value">{dashboardData?.new_users || 0}</div>
        </div>
        
        <div className="dashboard-card">
          <h3>金币流通量</h3>
          <div className="value">{dashboardData?.total_gold || 0}</div>
        </div>
        
        <div className="dashboard-card">
          <h3>俱乐部数量</h3>
          <div className="value">{dashboardData?.total_clubs || 0}</div>
        </div>
        
        <div className="dashboard-card">
          <h3>帖子数量</h3>
          <div className="value">{dashboardData?.total_posts || 0}</div>
        </div>
      </div>
      
      {/* 等级分布 */}
      {dashboardData?.level_distribution && (
        <div className="data-table">
          <h3>领地等级分布</h3>
          <table>
            <thead>
              <tr>
                <th>等级</th>
                <th>用户数</th>
                <th>占比</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.level_distribution.map((item: any) => (
                <tr key={item.level}>
                  <td>Lv.{item.level}</td>
                  <td>{item.count}</td>
                  <td>
                    {dashboardData.total_users
                      ? ((item.count / dashboardData.total_users) * 100).toFixed(2)
                      : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
