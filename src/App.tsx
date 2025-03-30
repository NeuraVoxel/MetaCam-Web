import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import PointCloud from './components/PointCloud';

function LoginPage() {
  const handleStart = () => {
    window.location.href = '/point-cloud';
  };

  return (
    <div className="login-container">
      <h1>MetaCam 登录</h1>
      <button onClick={handleStart}>开始作业</button>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/point-cloud" element={
          <div className="App">
            <PointCloud 
              url="ws://192.168.1.11:9090"
              topic="/lidar_out"
              width={1200}
              height={800}
            />
          </div>
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
