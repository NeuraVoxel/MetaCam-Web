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
          <span className="back-icon">←</span> 返回
        </button>
        
        <div className="status-bar">
          <div className="status-item">
            <span className="status-label">设备状态:</span>
            <span className={`status-value ${deviceStatus === '运行中' ? 'status-active' : ''}`}>{deviceStatus}</span>
          </div>
          <div className="status-item">
            <span className="status-label">作业时间:</span>
            <span className="status-value">{elapsedTime}</span>
          </div>
          <div className="status-item">
            <span className="status-label">存储空间:</span>
            <span className="status-value">{storageSpace}</span>
          </div>
          <div className="status-item">
            <span className="status-label">RTK:</span>
            <span className={`status-value ${rtkStatus === '已连接' ? 'status-connected' : 'status-disconnected'}`}>
              {rtkStatus}
            </span>
          </div>
          <div className="status-item signal-indicator">
            <span className="status-label">信号:</span>
            <div className="signal-level">
              {[1, 2, 3, 4].map(level => (
                <span 
                  key={level} 
                  className={`signal-bar ${level <= signalStrength ? 'active' : 'inactive'}`}
                  style={{ height: `${level * 3}px` }}
                ></span>
              ))}
            </div>
          </div>
          <div className="status-item battery-indicator">
            <span className="status-label">电量:</span>
            <div className="battery-container">
              <div 
                className="battery-level-fill"
                style={{ width: `${batteryLevel}%`, 
                  backgroundColor: batteryLevel > 50 ? '#4CAF50' : 
                                  batteryLevel > 20 ? '#FFC107' : '#F44336' 
                }}
              ></div>
            </div>
            <span className="battery-percentage">{batteryLevel}%</span>
          </div>
          <button className="settings-button">
            <span className="settings-icon">⚙️</span>
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