import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PointCloud from "./PointCloud";
import "./ProjectDetail.css";
import rosService from "../services/ROSService";

interface ProjectDetails {
  id: string;
  name: string;
  thumbnailUrl: string;
  createdAt: string;
  pointsCount: number;
  description: string;
  pointCloudUrl: string;
}

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 模拟从设备获取项目详情
    const fetchProjectDetails = async () => {
      try {
        setLoading(true);
        // 这里应该是实际的API调用
        // const response = await fetch(`http://device-ip/api/projects/${id}`);
        // const data = await response.json();

        // 模拟数据
        const mockProject: ProjectDetails = {
          id: id || "1",
          name:
            id === "1" ? "客厅扫描" : id === "2" ? "卧室建模" : "办公室测量",
          thumbnailUrl: `https://via.placeholder.com/300?text=${
            id === "1" ? "客厅" : id === "2" ? "卧室" : "办公室"
          }`,
          createdAt: "2025-04-15 14:30",
          pointsCount: 1250000,
          description:
            "这是一个使用MetaCam采集的3D点云项目，包含完整的空间扫描数据。",
          pointCloudUrl: "ws://192.168.1.11:9090",
        };

        // 延迟模拟网络请求
        setTimeout(() => {
          setProject(mockProject);
          setLoading(false);
        }, 1000);
      } catch (err) {
        console.error("获取项目详情失败:", err);
        setError("获取项目详情失败，请检查设备连接");
        setLoading(false);
      }
    };

    if (id) {
      fetchProjectDetails();
    }
  }, [id]);

  const formatPointsCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(2)}M 点`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K 点`;
    }
    return `${count} 点`;
  };

  return (
    <div className="project-detail">
      <div className="header">
        <button className="back-button" onClick={() => navigate("/projects")}>
          ← 返回项目列表
        </button>
        {project && <h1>{project.name}</h1>}
      </div>

      {loading ? (
        <div className="loading">加载项目详情中...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : project ? (
        <div className="project-content">
          <div className="project-info-panel">
            <div className="project-thumbnail">
              <img src={project.thumbnailUrl} alt={project.name} />
            </div>
            <div className="project-metadata">
              <h2>{project.name}</h2>
              <p className="project-date">创建时间: {project.createdAt}</p>
              <p className="project-points">
                点数量: {formatPointsCount(project.pointsCount)}
              </p>
              <p className="project-description">{project.description}</p>
              <div className="project-actions">
                <button className="action-button download-button">
                  下载点云数据
                </button>
                <button className="action-button share-button">分享项目</button>
              </div>
            </div>
          </div>

          <div className="point-cloud-viewer">
            <h3>点云预览</h3>
            <div className="point-cloud-container">
              <PointCloud
                url={project.pointCloudUrl}
                topic="/lidar_out"
                width={800}
                height={500}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="error">项目不存在</div>
      )}
    </div>
  );
};

export default ProjectDetail;
