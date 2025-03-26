import React from 'react';
import './App.css';
import PointCloud from './components/PointCloud';

function App() {
  return (
    <div className="App">
        <PointCloud 
          url="ws://192.168.1.11:9090"  // ROS WebSocket服务器地址
          // topic="/point_cloud"  // 点云数据的话题名称
          topic="/lidar_out"  // 点云数据的话题名称
          width={1200}
          height={800}
        />
    </div>
  );
}

export default App;
