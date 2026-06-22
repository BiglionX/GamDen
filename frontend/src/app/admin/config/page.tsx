import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import '../../admin.css';

export default function AdminConfig() {
  const [beastConfig, setBeastConfig] = useState<any>(null);
  const [goldConfig, setGoldConfig] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'beast' | 'gold'>('beast');
  
  useEffect(() => {
    fetchConfigData();
  }, []);
  
  const fetchConfigData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // 获取野兽潮配置
      const beastResponse = await fetch('http://localhost:3000/api/admin/beast-config', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (beastResponse.ok) {
        const beastData = await beastResponse.json();
        setBeastConfig(beastData.data);
      }
      
      // 获取金币规则配置
      const goldResponse = await fetch('http://localhost:3000/api/admin/gold-config', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (goldResponse.ok) {
        const goldData = await goldResponse.json();
        setGoldConfig(goldData.data);
      }
    } catch (error) {
      console.error('获取配置失败:', error);
      alert('获取配置失败');
    } finally {
      setLoading(false);
    }
  };
  
  const handleBeastConfigChange = (key: string, value: any) => {
    setBeastConfig({
      ...beastConfig,
      [key]: value
    });
  };
  
  const handleGoldConfigChange = (index: number, value: number) => {
    const newConfig = [...goldConfig];
    newConfig[index].config_value = value;
    setGoldConfig(newConfig);
  };
  
  const saveBeastConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/admin/beast-config', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          check_interval: beastConfig.check_interval,
          trigger_probability: beastConfig.trigger_probability,
          min_level: beastConfig.min_level,
          max_level: beastConfig.max_level,
          affect_range: beastConfig.affect_range,
          defense_fail_probability: beastConfig.defense_fail_probability
        })
      });
      
      if (response.ok) {
        alert('野兽潮配置保存成功');
      } else {
        alert('保存失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败');
    }
  };
  
  const saveGoldConfig = async (configKey: string, configValue: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/admin/gold-config', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          config_key: configKey,
          config_value: configValue
        })
      });
      
      if (response.ok) {
        alert('金币规则配置保存成功');
      } else {
        alert('保存失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败');
    }
  };
  
  if (loading) {
    return <div>加载中...</div>;
  }
  
  return (
    <div>
      <h2>系统配置</h2>
      
      {/* 标签页切换 */}
      <div style={{ marginBottom: '20px', borderBottom: '1px solid #e8e8e8' }}>
        <button
          className={activeTab === 'beast' ? 'btn btn-primary' : 'btn'}
          onClick={() => setActiveTab('beast')}
          style={{ marginRight: '10px' }}
        >
          野兽潮配置
        </button>
        <button
          className={activeTab === 'gold' ? 'btn btn-primary' : 'btn'}
          onClick={() => setActiveTab('gold')}
        >
          金币规则配置
        </button>
      </div>
      
      {/* 野兽潮配置 */}
      {activeTab === 'beast' && beastConfig && (
        <div className="data-table" style={{ padding: '20px' }}>
          <h3>野兽潮参数配置</h3>
          
          <div className="form-group">
            <label>刷新时间间隔（小时）</label>
            <input
              type="number"
              value={beastConfig.check_interval}
              onChange={(e) => handleBeastConfigChange('check_interval', parseInt(e.target.value))}
              min="1"
              max="24"
            />
            <small>多久检查一次是否触发野兽潮（1~24小时）</small>
          </div>
          
          <div className="form-group">
            <label>触发概率（%）</label>
            <input
              type="number"
              value={beastConfig.trigger_probability}
              onChange={(e) => handleBeastConfigChange('trigger_probability', parseInt(e.target.value))}
              min="0"
              max="100"
            />
            <small>每次检查时触发野兽潮的概率（0%~100%）</small>
          </div>
          
          <div className="form-group">
            <label>最小强度（等级）</label>
            <input
              type="number"
              value={beastConfig.min_level}
              onChange={(e) => handleBeastConfigChange('min_level', parseInt(e.target.value))}
              min="1"
              max="5"
            />
            <small>野兽潮最低等级（1~5）</small>
          </div>
          
          <div className="form-group">
            <label>最大强度（等级）</label>
            <input
              type="number"
              value={beastConfig.max_level}
              onChange={(e) => handleBeastConfigChange('max_level', parseInt(e.target.value))}
              min="1"
              max="5"
            />
            <small>野兽潮最高等级（1~5）</small>
          </div>
          
          <div className="form-group">
            <label>影响范围（格）</label>
            <input
              type="number"
              value={beastConfig.affect_range}
              onChange={(e) => handleBeastConfigChange('affect_range', parseInt(e.target.value))}
              min="10"
              max="50"
            />
            <small>野兽潮影响周围多少格（10~50格）</small>
          </div>
          
          <div className="form-group">
            <label>防御失败概率（%）</label>
            <input
              type="number"
              value={beastConfig.defense_fail_probability}
              onChange={(e) => handleBeastConfigChange('defense_fail_probability', parseInt(e.target.value))}
              min="0"
              max="100"
            />
            <small>Lv.3以下领地防御失败的概率（0%~100%）</small>
          </div>
          
          <button className="btn btn-primary" onClick={saveBeastConfig}>
            保存配置
          </button>
        </div>
      )}
      
      {/* 金币规则配置 */}
      {activeTab === 'gold' && (
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>配置项</th>
                <th>当前值</th>
                <th>说明</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {goldConfig.map((config, index) => (
                <tr key={config.id}>
                  <td>{config.config_key}</td>
                  <td>
                    <input
                      type="number"
                      value={config.config_value}
                      onChange={(e) => handleGoldConfigChange(index, parseInt(e.target.value))}
                      min="0"
                    />
                  </td>
                  <td>{config.description}</td>
                  <td>
                    <button
                      className="btn btn-primary"
                      onClick={() => saveGoldConfig(config.config_key, config.config_value)}
                    >
                      保存
                    </button>
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
