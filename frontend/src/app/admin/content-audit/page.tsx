import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import '../../admin.css';

export default function AdminContentAudit() {
  const [auditList, setAuditList] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    content_type: '',
    status: '',
  });
  
  useEffect(() => {
    fetchAuditList();
  }, [filters.page]);
  
  const fetchAuditList = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // 构建查询参数
      const params = new URLSearchParams();
      params.append('page', filters.page.toString());
      params.append('limit', filters.limit.toString());
      if (filters.content_type) params.append('content_type', filters.content_type);
      if (filters.status) params.append('status', filters.status);
      
      const response = await fetch(`http://localhost:3000/api/admin/content-audit?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAuditList(data.data.audit_logs);
        setPagination(data.data.pagination);
      } else {
        alert('获取审核列表失败');
      }
    } catch (error) {
      console.error('获取审核列表失败:', error);
      alert('获取审核列表失败');
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
  
  const handleApprove = async (contentType: string, contentId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/admin/content-audit/approve', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content_type: contentType,
          content_id: contentId
        })
      });
      
      if (response.ok) {
        alert('审核通过');
        fetchAuditList();
      } else {
        alert('审核失败');
      }
    } catch (error) {
      console.error('审核失败:', error);
      alert('审核失败');
    }
  };
  
  const handleReject = async (contentType: string, contentId: number) => {
    const reason = prompt('请输入拒绝原因：');
    if (!reason) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/admin/content-audit/reject', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content_type: contentType,
          content_id: contentId,
          reason
        })
      });
      
      if (response.ok) {
        alert('审核拒绝');
        fetchAuditList();
      } else {
        alert('审核失败');
      }
    } catch (error) {
      console.error('审核失败:', error);
      alert('审核失败');
    }
  };
  
  if (loading && auditList.length === 0) {
    return <div>加载中...</div>;
  }
  
  return (
    <div>
      <h2>内容审核</h2>
      
      {/* 筛选栏 */}
      <div className="filter-bar">
        <div className="form-group">
          <label>内容类型</label>
          <select
            value={filters.content_type}
            onChange={(e) => handleFilterChange('content_type', e.target.value)}
          >
            <option value="">全部</option>
            <option value="signature">签名</option>
            <option value="post">帖子</option>
            <option value="reply">回帖</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>状态</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">全部</option>
            <option value="pending">待审核</option>
            <option value="approved">已通过</option>
            <option value="rejected">已拒绝</option>
          </select>
        </div>
        
        <button className="btn btn-primary" onClick={fetchAuditList}>
          搜索
        </button>
      </div>
      
      {/* 审核列表 */}
      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>内容类型</th>
              <th>内容ID</th>
              <th>用户ID</th>
              <th>AI结果</th>
              <th>人工结果</th>
              <th>审核原因</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {auditList.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>
                  {item.content_type === 'signature' ? '签名' :
                   item.content_type === 'post' ? '帖子' : '回帖'}
                </td>
                <td>{item.content_id}</td>
                <td>{item.user_id}</td>
                <td>
                  <span className={`status-tag ${
                    item.ai_result === 'pass' ? 'status-approved' :
                    item.ai_result === 'review' ? 'status-pending' : 'status-rejected'
                  }`}>
                    {item.ai_result === 'pass' ? '通过' :
                     item.ai_result === 'review' ? '待复审' : '拒绝'}
                  </span>
                </td>
                <td>
                  {item.manual_result ? (
                    <span className={`status-tag ${
                      item.manual_result === 'approved' ? 'status-approved' : 'status-rejected'
                    }`}>
                      {item.manual_result === 'approved' ? '通过' : '拒绝'}
                    </span>
                  ) : (
                    <span className="status-tag status-pending">待审核</span>
                  )}
                </td>
                <td>{item.audit_reason || '-'}</td>
                <td>{new Date(item.created_at).toLocaleString()}</td>
                <td>
                  {!item.manual_result && (
                    <>
                      <button
                        className="btn btn-success"
                        onClick={() => handleApprove(item.content_type, item.content_id)}
                        style={{ marginRight: '8px' }}
                      >
                        通过
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleReject(item.content_type, item.content_id)}
                      >
                        拒绝
                      </button>
                    </>
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
