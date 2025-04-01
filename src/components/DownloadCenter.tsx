import React, { useState, useEffect } from 'react';
import './DownloadCenter.css';

interface Version {
  version: string;
  downloadUrl: string;
  releaseDate: string;
  description: string;
}

const DownloadCenter: React.FC = () => {
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [latestVersion, setLatestVersion] = useState<Version | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 获取当前版本号（从package.json中读取）
    const localVersion = process.env.REACT_APP_VERSION || '0.1.0';
    setCurrentVersion(localVersion);

    // 模拟从服务器获取最新版本信息
    // 实际应用中，这里应该是一个API请求
    setTimeout(() => {
      try {
        // 模拟API响应
        const mockLatestVersion: Version = {
          version: '0.2.0',
          downloadUrl: 'https://www.baidu.com', // 替换为实际的下载链接
          releaseDate: '2025-04-15',
          description: '修复了多个bug，提升了性能，新增了点云渲染功能'
        };
        
        setLatestVersion(mockLatestVersion);
        setLoading(false);
      } catch (err) {
        setError('获取最新版本信息失败');
        setLoading(false);
      }
    }, 1000);
  }, []);

  const hasNewVersion = latestVersion && latestVersion.version !== currentVersion;

  return (
    <div className="download-center">
      <h2>软件/固件下载中心</h2>
      
      {loading ? (
        <div className="loading">正在获取版本信息...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <div className="version-info">
          <div className="current-version">
            <h3>当前版本</h3>
            <p>{currentVersion}</p>
          </div>
          
          {latestVersion && (
            <div className="latest-version">
              <h3>最新版本</h3>
              <p className="version-number">{latestVersion.version}</p>
              <p className="release-date">发布日期: {latestVersion.releaseDate}</p>
              <p className="description">{latestVersion.description}</p>
              
              {hasNewVersion ? (
                <div className="update-notification">
                  <p className="update-message">发现新版本！</p>
                  <a 
                    href={latestVersion.downloadUrl} 
                    className="download-button"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    下载最新版本
                  </a>
                </div>
              ) : (
                <p className="up-to-date">您的软件已是最新版本</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DownloadCenter;