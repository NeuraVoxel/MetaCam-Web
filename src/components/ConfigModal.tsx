import React, { useState } from 'react';
import './ConfigModal.css';

// 在ConfigModal组件中添加showDebugPanel属性
interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig: any;
}

const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialConfig
}) => {
  const [config, setConfig] = useState(initialConfig);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setConfig({
      ...config,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(config);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="config-modal-overlay">
      <div className="config-modal">
        <div className="config-modal-header">
          <h2>参数配置</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="config-section">
            <h3>设备参数</h3>
            <div className="config-row">
              <label htmlFor="resolution">分辨率</label>
              <select 
                id="resolution" 
                name="resolution" 
                value={config.resolution} 
                onChange={handleChange}
              >
                <option value="high">高 (1920x1080)</option>
                <option value="medium">中 (1280x720)</option>
                <option value="low">低 (640x480)</option>
              </select>
            </div>
            <div className="config-row">
              <label htmlFor="frameRate">帧率</label>
              <select 
                id="frameRate" 
                name="frameRate" 
                value={config.frameRate} 
                onChange={handleChange}
              >
                <option value="30">30 fps</option>
                <option value="60">60 fps</option>
                <option value="120">120 fps</option>
              </select>
            </div>
          </div>
          
          <div className="config-section">
            <h3>点云设置</h3>
            <div className="config-row">
              <label htmlFor="pointSize">点大小</label>
              <input 
                type="range" 
                id="pointSize" 
                name="pointSize" 
                min="1" 
                max="10" 
                value={config.pointSize} 
                onChange={handleChange}
              />
              <span>{config.pointSize}</span>
            </div>
            <div className="config-row">
              <label htmlFor="colorMode">颜色模式</label>
              <select 
                id="colorMode" 
                name="colorMode" 
                value={config.colorMode} 
                onChange={handleChange}
              >
                <option value="height">高度</option>
                <option value="intensity">强度</option>
                <option value="rgb">RGB</option>
              </select>
            </div>
          </div>
          
          <div className="config-section">
            <h3>存储设置</h3>
            <div className="config-row">
              <label htmlFor="autoSave">自动保存</label>
              <input 
                type="checkbox" 
                id="autoSave" 
                name="autoSave" 
                checked={config.autoSave} 
                onChange={handleChange}
              />
            </div>
            <div className="config-row">
              <label htmlFor="saveInterval">保存间隔 (秒)</label>
              <input 
                type="number" 
                id="saveInterval" 
                name="saveInterval" 
                min="5" 
                max="3600" 
                value={config.saveInterval} 
                onChange={handleChange}
                disabled={!config.autoSave}
              />
            </div>
          </div>
          
          <div className="config-section">
            <h3>显示设置</h3>
            <div className="config-row">
              <label htmlFor="showDebugPanel">显示调试面板</label>
              <input 
                type="checkbox" 
                id="showDebugPanel" 
                name="showDebugPanel" 
                checked={config.showDebugPanel} 
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div className="config-actions">
            <button type="button" className="cancel-button" onClick={onClose}>取消</button>
            <button type="submit" className="save-button">保存</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConfigModal;