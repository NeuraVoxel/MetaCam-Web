import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import PointCloud from './components/PointCloud';
import View from './components/View';
import DownloadCenter from './components/DownloadCenter';
import ProjectManagement from './components/ProjectManagement';
import ProjectDetail from './components/ProjectDetail';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const navigate = useNavigate(); // Add this line
  const [isDeviceConnected, setIsDeviceConnected] = useState(false);

  // 模拟设备连接状态检查
  useEffect(() => {
    // 这里应该是实际的设备连接检查逻辑
    const checkConnection = async () => {
      try {
        // 替换为实际的连接检查
        const connected = true; // 默认为未连接
        setIsDeviceConnected(connected);
      } catch (error) {
        console.error('检查设备连接失败:', error);
        setIsDeviceConnected(false);
      }
    };
    checkConnection();
  }, []);

  const handleStart = () => {
    if (isDeviceConnected) {
      navigate('/view'); // 修改为跳转到view页面
    }
  };

  return (
    <div className="login-container">
      <div className="top-right-buttons">
        <button 
          className="top-right-button" 
          onClick={() => alert('隐私政策')}
          title="隐私政策"
        >
          ❓
        </button>
        <button 
          className="top-right-button" 
          onClick={() => alert('联系方式')}
          title="联系方式"
        >
          ✉️
        </button>
        <button 
          className="top-right-button" 
          onClick={() => {
            navigate('/download'); 
            // alert('软件/固件下载')
          }}
          title="软件/固件下载"
        >
          ⬇️
        </button>
      </div>
      <h1>MetaCam</h1>
      
      <div className="card-container">
        {/* 连接设备状态 */}
        <div className="card-button" onClick={() => alert('设备连接管理')}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className={`status-indicator ${isDeviceConnected ? 'status-connected' : 'status-disconnected'}`} />
            {isDeviceConnected ? '设备已连接' : '设备未连接'}
          </div>
        </div>

        {/* 项目管理按钮 - 新增 */}
        <div className="card-button" onClick={() => navigate('/projects')}>
          <i>📊</i>
          <span>项目管理</span>
        </div>

        {/* 使用教程按钮 */}
        <div className="card-button" onClick={() => alert('打开使用教程')}>
          <i>📚</i>
          <span>使用教程</span>
        </div>

        {/* 文件管理按钮 */}
        <div className="card-button" onClick={() => alert('打开文件管理')}>
          <i>📁</i>
          <span>文件管理</span>
        </div>

        {/* 开始作业按钮 */}
        <div 
          className={`card-button ${!isDeviceConnected ? 'disabled' : ''}`} 
          onClick={handleStart}
        >
          <i>🚀</i>
          <span>{isDeviceConnected ? '开始作业' : '尚未连接设备'}</span>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        {/* <Route path="/point-cloud" element={
          <div className="App">
            <PointCloud 
              url="ws://192.168.1.11:9090"
              topic="/lidar_out"
              width={1200}
              height={800}
            />
          </div>
        } /> */}
        <Route path="/view" element={<View />} />
        <Route path="/download" element={<DownloadCenter />} />
        <Route path="/projects" element={<ProjectManagement />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
