import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import "./App.css";
import View from "./components/View";
import DownloadCenter from "./components/DownloadCenter";
import ProjectManagement from "./components/ProjectManagement";
import ProjectDetail from "./components/ProjectDetail";
import { useNavigate } from "react-router-dom";
import rosService from "./services/ROSService";

// 全局ROS服务器配置
// const DEFAULT_ROS_SERVER = "192.168.117.6";
const DEFAULT_ROS_SERVER = "192.168.1.11";

// ROS连接状态上下文
export const ROSContext = React.createContext({
  isConnected: false,
  batteryLevel: 100,
  connectToROS: (url: string) => {},
  disconnectROS: () => {},
  rosServerIp: DEFAULT_ROS_SERVER,
  setRosServerIp: (ip: string) => {},
});

function LoginPage() {
  const navigate = useNavigate();
  const [isDeviceConnected, setIsDeviceConnected] = useState(false);
  const { connectToROS, rosServerIp, setRosServerIp } = React.useContext(ROSContext);

  // 模拟设备连接状态检查
  useEffect(() => {
    connectToROS(`ws://${rosServerIp}:9090`);
    // 监听ROS连接状态变化
    const unsubscribe = rosService.onConnectionChange((status) => {
      setIsDeviceConnected(status === "connected");
    });
    // 清理函数
    return () => {
      unsubscribe();
    };
  }, [rosServerIp]);

  const handleStart = () => {
    if (isDeviceConnected) {
      // 连接到ROS服务器
      navigate("/view"); // 修改为跳转到view页面
    }
  };

  return (
    <div className="login-container">
      <div className="top-right-buttons">
        <button
          className="top-right-button"
          onClick={() => alert("隐私政策")}
          title="隐私政策"
        >
          ❓
        </button>
        <button
          className="top-right-button"
          onClick={() => alert("联系方式")}
          title="联系方式"
        >
          ✉️
        </button>
        <button
          className="top-right-button"
          onClick={() => {
            navigate("/download");
            // alert('软件/固件下载')
          }}
          title="软件/固件下载"
        >
          ⬇️
        </button>
        <button
          className="top-right-button"
          onClick={() => {
            const ipAddress = prompt("请输入ROS服务器IP地址", rosServerIp);
            if (ipAddress) {
              const url = `ws://${ipAddress}:9090`;
              // 更新全局IP地址
              setRosServerIp(ipAddress);
              connectToROS(url);
              console.log(`正在连接到ROS服务器: ${url}`);
            }
          }}
          title="连接ROS服务器"
        >
          🔌
        </button>
      </div>
      <h1>MetaCam</h1>

      <div className="card-container horizontal">
        {/* 连接设备状态 */}
        <div
          className="card-button"
          onClick={() => {
            if (!rosService.isConnected()) {
              connectToROS(`ws://${rosServerIp}:9090`);
            }
          }}
        >
          <div className="card-button" >
            <i
              className={`status-indicator ${
                isDeviceConnected? "status-connected" : "status-disconnected"
              }`}
            />
             <span>{isDeviceConnected? "设备已连接" : "设备未连接"}</span>
          </div>
        </div>

        {/* 项目管理按钮 - 新增 */}
        <div className="card-button" onClick={() => navigate("/projects")}>
          <i>📊</i>
          <span>项目管理</span>
        </div>

        {/* 使用教程按钮 */}
        <div className="card-button" onClick={() => alert("打开使用教程")}>
          <i>📚</i>
          <span>使用教程</span>
        </div>

        {/* 文件管理按钮 */}
        {/* <div className="card-button" onClick={() => alert("打开文件管理")}>
          <i>📁</i>
          <span>文件管理</span>
        </div> */}

        {/* 开始作业按钮 */}
        <div
          className={`card-button ${!isDeviceConnected ? "disabled" : ""}`}
          onClick={handleStart}
        >
          <i>🚀</i>
          <span>{isDeviceConnected ? "开始作业" : "尚未连接设备"}</span>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const batteryListenerRef = React.useRef<any>(null);
  const [rosServerIp, setRosServerIp] = useState(DEFAULT_ROS_SERVER);

  async function exampleServiceCall() {
    try {
      // 调用服务并等待响应
      const promise = rosService.callService<
        { a: number; b: number },
        { success: boolean; message: string }
      >("/add_two_ints", "metacam_node/AddTwoInts", { a: 33, b: 44 });

      promise
        .then((response: any) => {
          console.log(response);
          console.log("服务调用成功:", response, "33 + 44 = ", response.sum);
        })
        .catch((err) => {
          console.error(err);
        });
    } catch (error) {
      console.error("服务调用失败:", error);
    }
  }

  // 连接到ROS服务器
  const connectToROS = (url: string) => {
    // 使用rosService连接
    rosService.connect(url);

    // 监听连接状态变化
    rosService.onConnectionChange((status) => {
      setIsConnected(status === "connected");
      if (status === "connected") {
        setupSubscribers();
        exampleServiceCall();
      } else if (status === "disconnected" || status === "error") {
        cleanupSubscribers();
      }
    });
  };

  // 断开ROS连接
  const disconnectROS = () => {
    rosService.disconnect();
  };

  // 设置订阅
  const setupSubscribers = () => {
    cleanupSubscribers();
  };

  // 清理订阅
  const cleanupSubscribers = () => {};

  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      cleanupSubscribers();
      disconnectROS();
    };
  }, []);

  return (
    <ROSContext.Provider
      value={{
        isConnected,
        batteryLevel,
        connectToROS,
        disconnectROS,
        rosServerIp,
        setRosServerIp,
      }}
    >
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/view" element={<View />} />
          <Route path="/download" element={<DownloadCenter />} />
          <Route path="/projects" element={<ProjectManagement />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </ROSContext.Provider>
  );
}

export default App;
