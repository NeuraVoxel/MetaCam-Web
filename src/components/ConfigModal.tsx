import React, { useState } from "react";
import "./ConfigModal.css";
import rosService from "../services/ROSService";

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
  initialConfig,
}) => {
  const [config, setConfig] = useState(initialConfig);

  /**
   *
   * @param e autoExposure :  false autoSave :  false colorMode :  "height" contrast :  "31" exposure :  "29" frameRate :  "30" pointSize :  3 resolution :  "high" saveInterval :  60 showDebugPanel :  true whiteBalance :  "5300"
   */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setConfig({
      ...config,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    });

    try {
      rosService
        .callService<
          {
            mode: number;
            value: number;
            option: string;
            flags: number;
          },
          { success: boolean; message: string }
        >("/camera_control", "metacam_node/CameraControl", {
          mode: 11,
          value: 22,
          option: "auto",
          flags: 4,
        })
        .then((response: any) => {
          console.log("camera_control:", response);
        })
        .catch((err) => {
          console.error(err);
        });
    } catch (error) {
      console.error("服务调用失败:", error);
    }

    try {
      rosService
        .callService<
          {
            ip_subnet: string;
          },
          { success: boolean; message: string }
        >("/ip_config", "metacam_node/IPConfig", {
          ip_subnet: "192.168.0.33/24",
        })
        .then((response: any) => {
          console.log("ip_config:", response);
        })
        .catch((err) => {
          console.error(err);
        });
    } catch (error) {
      console.error("服务调用失败:", error);
    }
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
          <button className="close-button" onClick={onClose}>
            ×
          </button>
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
                <option value="1">1 fps</option>
                <option value="10">10 fps</option>
                <option value="30">30 fps</option>
                <option value="60">60 fps</option>
                <option value="120">120 fps</option>
              </select>
            </div>
          </div>

          {/* 新增相机控制参数部分 */}
          <div className="config-section">
            <h3>相机控制</h3>
            <div className="config-row">
              <label htmlFor="whiteBalance">白平衡 (K)</label>
              <div className="range-with-value">
                <input
                  type="range"
                  id="whiteBalance"
                  name="whiteBalance"
                  min="2500"
                  max="10000"
                  step="100"
                  value={config.whiteBalance || 5000}
                  onChange={handleChange}
                />
                <span>{config.whiteBalance || 5000}</span>
              </div>
            </div>
            <div className="config-row">
              <label htmlFor="exposure">曝光 (%)</label>
              <div className="range-with-value">
                <input
                  type="range"
                  id="exposure"
                  name="exposure"
                  min="0"
                  max="100"
                  value={config.exposure || 50}
                  onChange={handleChange}
                />
                <span>{config.exposure || 50}</span>
              </div>
            </div>
            <div className="config-row" style={{flexDirection:"row"}}>
              <label htmlFor="autoExposure">自动曝光</label>
              <input
                type="checkbox"
                id="autoExposure"
                name="autoExposure"
                checked={config.autoExposure || false}
                onChange={handleChange}
              />
            </div>
            <div className="config-row">
              <label htmlFor="contrast">对比度</label>
              <div className="range-with-value">
                <input
                  type="range"
                  id="contrast"
                  name="contrast"
                  min="0"
                  max="100"
                  value={config.contrast || 50}
                  onChange={handleChange}
                />
                <span>{config.contrast || 50}</span>
              </div>
            </div>
          </div>

          <div className="config-section">
            <h3>点云设置</h3>
            <div className="config-row">
              <label htmlFor="pointSize">点大小:  <span>{config.pointSize}</span></label>
              <input
                type="range"
                id="pointSize"
                name="pointSize"
                min="1"
                max="10"
                value={config.pointSize}
                onChange={handleChange}
              />
             
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
            {/* <div className="config-row" style={{flexDirection:"row"}}>
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
            </div> */}
            <div className="config-row">
              <label htmlFor="formatUsb">U盘管理</label>
              <div className="button-with-status">
                <button
                  type="button"
                  className="format-button"
                  onClick={() => {
                    if (
                      window.confirm(
                        "确定要格式化U盘吗？此操作将删除U盘上的所有数据！"
                      )
                    ) {
                      // 这里添加格式化U盘的逻辑

                      try {
                        rosService
                          .callService<
                            {
                              command: string;
                            },
                            { success: boolean; message: string }
                          >("/usb_operation", "metacam_node/USBOperation", {
                            command: "usb_operation",
                          })
                          .then((response: any) => {
                            console.log("usb_operation:", response);
                            alert("U盘格式化成功！");
                          })
                          .catch((err) => {
                            console.error(err);
                            alert("U盘格式化失败！");
                          });
                      } catch (error) {
                        console.error("服务调用失败:", error);
                      }
                    }
                  }}
                >
                  格式化U盘
                </button>
                {/* <span className="usb-status">
                  {config.usbConnected ? "已连接" : "未连接"}
                </span> */}
              </div>
            </div>
          </div>

          <div className="config-section">
            <h3>显示设置</h3>
            <div className="config-row" style={{flexDirection:"row"}}>
              <label htmlFor="showDebugPanel">显示调试面板</label>
              <input
                type="checkbox"
                id="showDebugPanel"
                name="showDebugPanel"
                checked={config.showDebugPanel || false}
                onChange={handleChange}
              />
            </div>
            <div className="config-row" style={{flexDirection:"row"}}>
              <label htmlFor="showStats">显示性能监视器</label>
              <input
                type="checkbox"
                id="showStats"
                name="showStats"
                checked={config.showStats || false}
                onChange={handleChange}
              />
            </div>
            <div className="config-row" style={{flexDirection:"row"}}>
              <label htmlFor="processImages">处理图片</label>
              <input
                type="checkbox"
                id="processImages"
                name="processImages"
                checked={config.processImages || false}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* 新增IP配置部分 */}
          <div className="config-section">
            <h3>网络设置</h3>
            <div className="config-row">
              <label htmlFor="deviceIp">设备IP地址</label>
              <input
                type="text"
                id="deviceIp"
                name="deviceIp"
                className="ip-input"
                placeholder="例如: 192.168.0.33"
                value={config.deviceIp || ""}
                onChange={handleChange}
                pattern="^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
                title="请输入有效的IP地址，例如: 192.168.0.33"
              />
            </div>
            {/* <div className="config-row">
              <label htmlFor="autoConnect">自动连接</label>
              <input
                type="checkbox"
                id="autoConnect"
                name="autoConnect"
                checked={config.autoConnect || false}
                onChange={handleChange}
              />
            </div>
            <div className="config-row">
              <label htmlFor="connectionPort">连接端口</label>
              <input
                type="number"
                id="connectionPort"
                name="connectionPort"
                min="1"
                max="65535"
                value={config.connectionPort || 8080}
                onChange={handleChange}
              />
            </div> */}
          </div>

          <div className="config-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="save-button">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConfigModal;
