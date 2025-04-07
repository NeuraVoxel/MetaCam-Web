import React, { useState, useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./View.css";
import ConfigModal from "./ConfigModal";
import PointCloud from "./PointCloud"; // 导入PointCloud组件
import BatteryIndicator from "./BatteryIndicator"; // 导入电池指示器组件
import ConnectionControl from "./ConnectionControl"; // 导入连接控制组件
import { ROSContext } from "../App"; // 导入ROS上下文
import rosService from "../services/ROSService";
import ROSLIB from "roslib";

const View = () => {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("0.1h");
  const [storageSpace, setStorageSpace] = useState("167G");
  const [rtkStatus, setRtkStatus] = useState("无解");
  const [signalStrength, setSignalStrength] = useState(4);
  const [batteryLevel, setBatteryLevel] = useState(85);
  const [dataCollecting, setDataCollecting] = useState(true);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const { disconnectROS, connectToROS } = useContext(ROSContext);

  // 添加引用
  const batteryListenerRef = useRef<ROSLIB.Topic | null>(null);
  const storageListenerRef = useRef<ROSLIB.Topic | null>(null);
  const elapsedTimeListenerRef = useRef<ROSLIB.Topic | null>(null);
  const keyframeImageListenerRef = useRef<ROSLIB.Topic | null>(null);
  const driverStatusListenerRef = useRef<ROSLIB.Topic | null>(null);
  // const odometryListenerRef = useRef<ROSLIB.Topic | null>(null);
  const keyframeCanvasRef = useRef<HTMLCanvasElement>(null);

  // 设置订阅
  const setupSubscribers = () => {
    cleanupSubscribers();

    try {
      if (rosService.isConnected()) {
        // 订阅电池状态
        batteryListenerRef.current = rosService.subscribeTopic(
          "/battery",
          "sensor_msgs/BatteryState",
          (message: any) => {
            // console.log("收到电池状态消息:", message);
            setBatteryLevel(message.percentage * 100);
          }
        );

        // 订阅U盘内存
        storageListenerRef.current = rosService.subscribeTopic(
          "/storage",
          "std_msgs/String",
          (message: any) => {
            // console.log("收到U盘内存:", message);
            setStorageSpace(message.data);
          }
        );

        // 订阅任务时长
        elapsedTimeListenerRef.current = rosService.subscribeTopic(
          "/project_duration",
          "std_msgs/Float32",
          (message: any) => {
            // console.log("收到任务时长:", message);
            setElapsedTime(`${message.data.toFixed(2)}h`);
          }
        );

        // 订阅缩略图 keyframe image
        keyframeImageListenerRef.current = rosService.subscribeTopic(
          "/camera/right/jpeg",
          "sensor_msgs/CompressedImage",
          (message: any) => {
            // console.log("收到缩略图:", message);
            // console.log(keyframeCanvasRef);
            if (keyframeCanvasRef.current) {
              const canvas = keyframeCanvasRef.current as HTMLCanvasElement;
              // 检查元素是否存在
              if (!canvas) {
                throw new Error('Canvas element with id "panorama" not found.');
              }

              // 检查是否为 Canvas 元素
              if (!(canvas instanceof HTMLCanvasElement)) {
                throw new Error('Element with id "panorama" is not a canvas.');
              }

              try {
                if (message.format == "jpeg" || message.format == "png") {
                  const image = new Image();
                  image.src =
                    "data:image/" + message.format + ";base64," + message.data;
                  image.onload = function () {
                    canvas.width = image.width;
                    canvas.height = image.height;
                    const ctx = canvas.getContext("2d");
                    ctx?.drawImage(image, 0, 0, image.width, image.height);
                  };
                }
              } catch (error) {
                console.error("Error processing keyframe image:", error);
              }
            }
          }
        );

        // 订阅系统状态
        driverStatusListenerRef.current = rosService.subscribeTopic(
          "/driver_status",
          "std_msgs/UInt8",
          (message: any) => {
            // console.log("收到系统状态:", message);
            // 8 bytes. 0,0,0,0,SD,SLAM,CAM,LiDAR
            const statusArray = [
              message.data & 0x01,
              (message.data >> 1) & 0x01,
              (message.data >> 2) & 0x01,
              (message.data >> 3) & 0x01,
            ];

            // console.log(
            //   "Driver status received:",
            //   message.data,
            //   "Parsed status:",
            //   statusArray
            // );

            setSystemStatus({
              sdCard: {
                status: !!statusArray[0] ? "active" : "warning",
                label: "SD卡",
              },
              slam: {
                status: !!statusArray[1] ? "active" : "warning",
                label: "SLAM",
              },
              cam: {
                status: !!statusArray[2] ? "active" : "warning",
                label: "CAM",
              },
              lidar: {
                status: !!statusArray[3] ? "active" : "warning",
                label: "LIDAR",
              },
            });
          }
        );

        // // 订阅Odometry
        // odometryListenerRef.current = rosService.subscribeTopic(
        //   "/Odometry",
        //   "nav_msgs/Odometry",
        //   (message: any) => {
        //     console.log("收到Odometry:", message);
        //     const pose: any = message.pose?.pose;
        //     const { orientation, position } = pose;
        //     console.log(orientation, position);
        //   }
        // );
      }
    } catch (error) {
      console.error("设置电池状态订阅时出错:", error);
    }
  };

  // 清理订阅
  const cleanupSubscribers = () => {
    if (batteryListenerRef.current) {
      rosService.unsubscribeTopic(batteryListenerRef.current);
      batteryListenerRef.current = null;
    }

    if (storageListenerRef.current) {
      rosService.unsubscribeTopic(storageListenerRef.current);
      storageListenerRef.current = null;
    }

    if (elapsedTimeListenerRef.current) {
      rosService.unsubscribeTopic(elapsedTimeListenerRef.current);
      elapsedTimeListenerRef.current = null;
    }

    if (keyframeImageListenerRef.current) {
      rosService.unsubscribeTopic(keyframeImageListenerRef.current);
      keyframeImageListenerRef.current = null;
    }
  };

  // 监听ROS连接状态变化
  useEffect(() => {
    const unsubscribe = rosService.onConnectionChange((status) => {
      if (status === "connected") {
        setupSubscribers();
      } else {
        cleanupSubscribers();
      }
    });

    // 如果已连接，立即设置订阅
    if (rosService.isConnected()) {
      setupSubscribers();
    }

    // 组件卸载时清理资源
    return () => {
      unsubscribe();
      cleanupSubscribers();
    };
  }, []);

  const handleToggleConnection = () => {
    if (rosService.isConnected()) {
      disconnectROS();
    } else {
      connectToROS("ws://192.168.1.11:9090");
    }
  };

  // 添加系统状态
  const [systemStatus, setSystemStatus] = useState({
    sdCard: { status: "active", label: "SD卡" },
    slam: { status: "warning", label: "SLAM" },
    cam: { status: "active", label: "CAM" },
    lidar: { status: "active", label: "LIDAR" },
  });

  // 其他状态保持不变
  const [config, setConfig] = useState({
    resolution: "high",
    frameRate: "30",
    pointSize: 3,
    colorMode: "height",
    autoSave: false,
    saveInterval: 60,
    showDebugPanel: true,
  });

  useEffect(() => {
    // 模拟计时器
    if (isRecording) {
      const timer = setInterval(() => {
        const [minutes, seconds] = elapsedTime.split(":").map(Number);
        let newSeconds = seconds + 1;
        let newMinutes = minutes;

        if (newSeconds >= 60) {
          newSeconds = 0;
          newMinutes += 1;
        }

        setElapsedTime(
          `${newMinutes.toString().padStart(2, "0")}:${newSeconds
            .toString()
            .padStart(2, "0")}`
        );
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
    console.log("保存配置:", newConfig);
    // 这里可以添加将配置保存到后端或本地存储的逻辑
  };

  return (
    <div className="view-container">
      {/* 顶部状态栏 */}
      <div className="status-bar">
        <div className="left-controls">
          <button className="back-button" onClick={() => navigate("/")}>
            &lt; 返回
          </button>
          {/* 添加电池指示器和连接控制组件 */}
          {/* <div className="status-item">
            <BatteryIndicator percentage={batteryLevel} />
          </div> */}
          <div className="status-item">
            <ConnectionControl
              isConnected={rosService.isConnected()}
              onToggleConnection={handleToggleConnection}
            />
          </div>

          <div className={`status-indicator ${dataCollecting ? "active" : ""}`}>
            数据采集中
          </div>

          {/* 添加系统状态指示器 */}
          <div className="system-status-container">
            {Object.entries(systemStatus).map(([key, value]) => (
              <div key={key} className="system-status-item">
                <div
                  className={`system-status-indicator ${value.status}`}
                ></div>
                <span className="system-status-label">{value.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="status-info">
          <div className="status-item">
            <span className="status-label">任务时长</span>
            <span className="status-value">{elapsedTime}</span>
          </div>
          <div className="status-item">
            <span className="status-label">U盘内存</span>
            <span className="status-value">{storageSpace}</span>
          </div>
          {/* <div className="status-item">
            <span className="status-label">RTK</span>
            <span className="status-value">{rtkStatus}</span>
          </div> */}
          {/* <div className="status-item">
            <div className="signal-strength">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className={`signal-bar ${
                      i < signalStrength ? "active" : ""
                    }`}
                  ></div>
                ))}
            </div>
          </div> */}
          <div className="status-item">
            <div className="battery-indicator">
              <div
                className="battery-level"
                style={{ width: `${batteryLevel}%` }}
              >
                {" "}
              </div>
            </div>
          </div>
          <button className="settings-button" onClick={openConfigModal}>
            ⚙️
          </button>
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
            showDebugPanel={config.showDebugPanel} // 传递showDebugPanel属性
            stlPath="/assets/8888.stl"
          />
        </div>

        {/* 中心标记 */}
        <div className="center-marker"></div>

        {/* 全景预览窗口 */}
        <div className="panorama-preview">
          <button className="close-preview">✕</button>
          {<canvas className="panorama-image" ref={keyframeCanvasRef}></canvas>}
          {/* <div className="panorama-image">
            {<canvas id="panorama"></canvas>}
          </div> */}
        </div>

        {/* 右侧功能按钮 */}
        <div className="right-controls">
          <button
            className={`record-button ${isRecording ? "recording" : ""}`}
            onClick={toggleRecording}
          >
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
      {/* <div className="progress-bar">
        <div className="progress-indicator"></div>
      </div> */}

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
