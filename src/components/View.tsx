import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './View.css';

const View = () => {
  const navigate = useNavigate();
  const [deviceStatus, setDeviceStatus] = useState('运行中');
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [storageSpace, setStorageSpace] = useState('128GB / 256GB');
  const [rtkStatus, setRtkStatus] = useState('已连接');
  const [signalStrength, setSignalStrength] = useState(4);
  const [batteryLevel, setBatteryLevel] = useState(85);

  useEffect(() => {
    // 模拟计时器
    const timer = setInterval(() => {
      const startTime = new Date(0);
      const totalSeconds = elapsedTime.split(':').reduce((acc, time) => (60 * acc) + +time, 0);
      startTime.setSeconds(totalSeconds + 1);
      setElapsedTime(startTime.toISOString().substr(11, 8));
    }, 1000);

    return () => clearInterval(timer);
  }, [elapsedTime]);

  return (
    <div className="view-container">
      <div className="view-header">
        <button 
          className="back-button"
          onClick={() => navigate('/')}
        >
          ← 返回
        </button>
        
        <div className="status-bar">
          <div className="status-item">
            <span>设备状态: {deviceStatus}</span>
          </div>
          <div className="status-item">
            <span>作业时间: {elapsedTime}</span>
          </div>
          <div className="status-item">
            <span>存储空间: {storageSpace}</span>
          </div>
          <div className="status-item">
            <span>RTK: {rtkStatus}</span>
          </div>
          <div className="status-item">
            <span>信号: {Array(signalStrength).fill('📶').join('')}</span>
          </div>
          <div className="status-item battery-indicator">
            <span>电量: </span>
            <div className="battery-level">
              {Array(Math.ceil(batteryLevel/20)).fill('▮').map((_, i) => (
                <span key={i} className={`battery-segment ${i === 0 ? 'first' : ''} ${i === 4 ? 'last' : ''}`}></span>
              ))}
            </div>
            <span>{batteryLevel}%</span>
          </div>
          <button className="settings-button">
            ⚙️ 参数设置
          </button>
        </div>
      </div>

      <div className="view-content">
        {/* 这里可以添加作业视图内容 */}
      </div>
    </div>
  );
};

export default View;