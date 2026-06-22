import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import '../../admin.css';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    guardian_type: '',
    level_min: '',
    level_max: '',
    status: '',
    role: '',
    keyword: ''
  });
  
  useEffect(() => {
    fetchUsers();
  }, [filters.page]);
  
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // 构建查询参数
      const params = new URLSearchParams();
      params.append('page', filters.page.toString());
      params.append('limit', filters.limit.toString());
      if (filters.guardian_type) params.append('guardian_type', filters.guardian_type);
      if (filters.level_min) params.append('level_min', filters.level_min);
      if (filters.level_max) params.append('level_max', filters.level_max);
      if (filters.status) params.append('status', filters.status);
      if (filters.role) params.append('role', filters.role);
      if (filters.keyword) params.append('keyword', filters.keyword);
      
      const response = await fetch(`http://localhost:3000/api/admin/users?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data.users);
        setPagination(data.data.pagination);
      } else {
        alert('获取用户列表失败');
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
      alert('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };
  
  const handleFilterChange = (key: string, value: string) => {
    setFilters({
      ...filters,
      [key]: value,
      page: 1 // 重置页码
    });
  };
  
  const handleSearch = () => {
    fetchUsers();
  };
  
  const handleFreeze = async (userId: number) => {
    const reason = prompt('请输入冻结原因：');
    if (!reason) return;
    
    const duration = prompt('请输入冻结时长（24h/7d/permanent）：');
    if (!duration) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/admin/users/freeze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          reason,
          duration
        })
      });
      
      if (response.ok) {
        alert('账号已冻结');
        fetchUsers();
      } else {
        alert('冻结失败');
      }
    } catch (error) {
      console.error('冻结失败:', error);
      alert('冻结失败');
    }
  };
  
  if (loading && users.length === 0) {
    return <div>加载中...</div>;
  }
  
  return (
    <div>
      <h2>用户管理</h2>
      
      {/* 筛选栏 */}
      <div className="filter-bar">
        <div className="form-group">
          <label>守护灵类型</label>
          <select
            value={filters.guardian_type}
            onChange={(e) => handleFilterChange('guardian_type', e.target.value)}
          >
            <option value="">全部</option>
            <option value="mechanic">机械师</option>
            <option value="elf">精灵</option>
            <option value="astrologer">占星师</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>状态</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">全部</option>
            <option value="active">正常</option>
            <option value="frozen">已冻结</option>
            <option value="deleted">已删除</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>角色</label>
          <select
            value={filters.role}
            onChange={(e) => handleFilterChange('role', e.target.value)}
          >
            <option value="">全部</option>
            <option value="player">玩家</option>
            <option value="vip">VIP</option>
            <option value="club_admin">俱乐部管理员</option>
            <option value="operator">运营人员</option>
            <option value="super_admin">超级管理员</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>搜索（ID/手机号/邀请码）</label>
          <input
            type="text"
            value={filters.keyword}
            onChange={(e) => handleFilterChange('keyword', e.target.value)}
            placeholder="输入关键词"
          />
        </div>
        
        <button className="btn btn-primary" onClick={handleSearch}>
          搜索
        </button>
      </div>
      
      {/* 用户表格 */}
      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>手机号</th>
              <th>守护灵</th>
              <th>等级</th>
              <th>金币</th>
              <th>角色</th>
              <th>状态</th>
              <th>注册时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.phone}</td>
                <td>
                  {user.guardian_type === 'mechanic' ? '机械师' :
                   user.guardian_type === 'elf' ? '精灵' : '占星师'}
                </td>
                <td>Lv.{user.level}</td>
                <td>{user.gold_coins}</td>
                <td>{user.role}</td>
                <td>
                  <span className={`status-tag status-${user.status}`}>
                    {user.status === 'active' ? '正常' :
                     user.status === 'frozen' ? '已冻结' : '已删除'}
                  </span>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  {user.status === 'active' && (
                    <button
                      className="btn btn-danger"
                      onClick={() => handleFreeze(user.id)}
                    >
                      冻结
                    </button>
                  )}
                  {user.status === 'frozen' && (
                    <button
                      className="btn btn-success"
                      onClick={async () => {
                        const reason = prompt('请输入解冻原因：');
                        if (!reason) return;
                        
                        try {
                          const token = localStorage.getItem('token');
                          const response = await fetch('http://localhost:3000/api/admin/users/unfreeze', {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${token}`,
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                              user_id: user.id,
                              reason
                            })
                          });
                          
                          if (response.ok) {
                            alert('账号已解冻');
                            fetchUsers();
                          } else {
                            alert('解冻失败');
                          }
                        } catch (error) {
                          console.error('解冻失败:', error);
                          alert('解冻失败');
                        }
                      }}
                    >
                      解冻
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* 分页 */}
      {pagination && (
        <div className="pagination">
          <button
            disabled={filters.page <= 1}
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
          >
            上一页
          </button>
          
          <span className="current">
            {filters.page} / {pagination.total_pages}
          </span>
          
          <button
            disabled={filters.page >= pagination.total_pages}
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
