import React from 'react';
import { useNavigate } from 'react-router-dom';

const View = () => {
  const navigate = useNavigate();

  return (
    <div className="view-container">
      <h1>作业视图</h1>
      <button 
        className="back-button"
        onClick={() => navigate('/')}
      >
        返回首页
      </button>
      {/* 这里可以添加你的作业视图内容 */}
    </div>
  );
};

export default View;