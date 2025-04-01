import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ProjectManagement.css';

interface Project {
  id: string;
  name: string;
  thumbnailUrl: string;
  createdAt: string;
  pointsCount: number;
}

const ProjectManagement: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 模拟从设备获取项目列表
    const fetchProjects = async () => {
      try {
        setLoading(true);
        // 这里应该是实际的API调用
        // const response = await fetch('http://device-ip/api/projects');
        // const data = await response.json();
        
        // 模拟数据
        const mockProjects: Project[] = [
          {
            id: '1',
            name: '客厅扫描',
            thumbnailUrl: 'https://via.placeholder.com/150?text=客厅',
            createdAt: '2025-04-15 14:30',
            pointsCount: 1250000
          },
          {
            id: '2',
            name: '卧室建模',
            thumbnailUrl: 'https://via.placeholder.com/150?text=卧室',
            createdAt: '2025-04-14 10:15',
            pointsCount: 980000
          },
          {
            id: '3',
            name: '办公室测量',
            thumbnailUrl: 'https://via.placeholder.com/150?text=办公室',
            createdAt: '2025-04-13 16:45',
            pointsCount: 1750000
          }
        ];
        
        // 延迟模拟网络请求
        setTimeout(() => {
          setProjects(mockProjects);
          setLoading(false);
        }, 1000);
      } catch (err) {
        console.error('获取项目列表失败:', err);
        setError('获取项目列表失败，请检查设备连接');
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const handleProjectClick = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  const formatPointsCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(2)}M 点`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K 点`;
    }
    return `${count} 点`;
  };

  return (
    <div className="project-management">
      <div className="header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← 返回
        </button>
        <h1>项目管理</h1>
      </div>

      {loading ? (
        <div className="loading">加载项目列表中...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <>
          <div className="projects-count">
            共 {projects.length} 个项目
          </div>
          <div className="projects-grid">
            {projects.map(project => (
              <div 
                key={project.id} 
                className="project-card"
                onClick={() => handleProjectClick(project.id)}
              >
                <div className="project-thumbnail">
                  <img src={project.thumbnailUrl} alt={project.name} />
                </div>
                <div className="project-info">
                  <h3>{project.name}</h3>
                  <p className="project-date">{project.createdAt}</p>
                  <p className="project-points">{formatPointsCount(project.pointsCount)}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ProjectManagement;