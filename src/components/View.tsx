import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './View.css';
import ConfigModal from './ConfigModal';
import PointCloud from './PointCloud'; // 导入PointCloud组件

const View = () => {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00:23');
  const [storageSpace, setStorageSpace] = useState('167G');
  const [rtkStatus, setRtkStatus] = useState('无解');
  const [signalStrength, setSignalStrength] = useState(4);
  const [batteryLevel, setBatteryLevel] = useState(85);
  const [dataCollecting, setDataCollecting] = useState(true);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [config, setConfig] = useState({
    resolution: 'high',
    frameRate: '30',
    pointSize: 3,
    colorMode: 'height',
    autoSave: true,
    saveInterval: 60
  });

  useEffect(() => {
    // 模拟计时器
    if (isRecording) {
      const timer = setInterval(() => {
        const [minutes, seconds] = elapsedTime.split(':').map(Number);
        let newSeconds = seconds + 1;
        let newMinutes = minutes;
        
        if (newSeconds >= 60) {
          newSeconds = 0;
          newMinutes += 1;
        }
        
        setElapsedTime(`${newMinutes.toString().padStart(2, '0')}:${newSeconds.toString().padStart(2, '0')}`);
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [isRecording, elapsedTime]);

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const openConfigModal = () => {
    setIsConfigModalOpen(true);
  };

  const closeConfigModal = () => {
    setIsConfigModalOpen(false);
  };

  const saveConfig = (newConfig: any) => {
    setConfig(newConfig);
    console.log('保存配置:', newConfig);
    // 这里可以添加将配置保存到后端或本地存储的逻辑
  };

  return (
    <div className="view-container">
      {/* 顶部状态栏 */}
      <div className="status-bar">
        <div className="left-controls">
          <button className="back-button" onClick={() => navigate('/')}>
            &lt; 返回
          </button>
          <div className={`status-indicator ${dataCollecting ? 'active' : ''}`}>
            数据采集中
          </div>
        </div>
        
        <div className="status-info">
          <div className="status-item">
            <span className="status-label">作业时间</span>
            <span className="status-value">{elapsedTime}</span>
          </div>
          <div className="status-item">
            <span className="status-label">剩余空间</span>
            <span className="status-value">{storageSpace}</span>
          </div>
          <div className="status-item">
            <span className="status-label">RTK</span>
            <span className="status-value">{rtkStatus}</span>
          </div>
          <div className="status-item">
            <div className="signal-strength">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className={`signal-bar ${i < signalStrength ? 'active' : ''}`}></div>
              ))}
            </div>
          </div>
          <div className="status-item">
            <div className="battery-indicator">
              <div className="battery-level" style={{ width: `${batteryLevel}%` }}></div>
            </div>
          </div>
          <button className="settings-button" onClick={openConfigModal}>⚙️</button>
        </div>
      </div>
      
      {/* 主视图区域 - 点云数据 */}
      <div className="main-view">
        {/* 集成PointCloud组件 */}
        <div className="point-cloud-container">
          <PointCloud 
            url="ws://192.168.1.11:9090"
            topic="/lidar_out"
            width={1200}
            height={800}
            pointSize={config.pointSize}
            colorMode={config.colorMode}
          />
        </div>
        
        {/* 中心标记 */}
        <div className="center-marker"></div>
        
        {/* 全景预览窗口 */}
        <div className="panorama-preview">
          <button className="close-preview">✕</button>
          <div className="panorama-image">
            {/* 全景图像将在这里显示 */}
          </div>
        </div>
        
        {/* 右侧功能按钮 */}
        <div className="right-controls">
          <button className={`record-button ${isRecording ? 'recording' : ''}`} onClick={toggleRecording}>
            <span className="record-icon"></span>
          </button>
          <button className="location-button">
            <span className="location-icon"></span>
          </button>
          <button className="files-button">
            <span className="files-icon"></span>
          </button>
        </div>
      </div>
      
      {/* 底部进度条 */}
      <div className="progress-bar">
        <div className="progress-indicator"></div>
      </div>

      {/* 配置弹窗 */}
      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={closeConfigModal}
        onSave={saveConfig}
        initialConfig={config}
      />
    </div>
  );
};

export default View;