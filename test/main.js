// 全局 ROS 连接
let ros;
let connected = false;

let serviceClients = {};
let durationSubscriber;
let batterySubscriber;
let storageSubscriber;
let driverStatusSubscriber;
let keyframeSubscriber;

// 初始化 ROS 连接
function initRosConnection() {
    ros = new ROSLIB.Ros({
        url: 'ws://' + window.location.hostname + ':9090'  // 自动使用当前主机名
    });

    ros.on('connection', function() {
        console.log('Connected to ROS Bridge server');
        document.getElementById('connectionStatus').textContent = '已连接';
        document.getElementById('connectionStatus').classList.add('connected');
        connected = true;
        
        // 初始化所有服务客户端
        initServiceClients();
        // 初始化订阅
        setupDurationSubscriber();
        setupBatterySubscriber();
        setupStorageSubscriber();
        setupDriverStatusSubscriber();
        setupKeyframeSubscriber();
    });

    ros.on('error', function(error) {
        console.error('Error connecting to ROS bridge server:', error);
        document.getElementById('connectionStatus').textContent = '连接错误';
        document.getElementById('connectionStatus').classList.remove('connected');
        connected = false;
    });

    ros.on('close', function() {
        console.log('Connection to ROS bridge server closed');
        document.getElementById('connectionStatus').textContent = '未连接';
        document.getElementById('connectionStatus').classList.remove('connected');
        connected = false;
        
        if (durationSubscriber) {
            durationSubscriber.unsubscribe();
        }
        if (batterySubscriber) {
            batterySubscriber.unsubscribe();
        }
        if (storageSubscriber) {
            storageSubscriber.unsubscribe();
        }
        if (driverStatusSubscriber) {
            driverStatusSubscriber.unsubscribe();
        }
        if (keyframeSubscriber) {
            keyframeSubscriber.unsubscribe();
        }
    });
}

// 初始化所有服务客户端
function initServiceClients() {
    serviceClients.versionClient = new ROSLIB.Service({
        ros: ros,
        name: '/get_version',
        serviceType: 'project_control/Base'
    });

    serviceClients.usbClient = new ROSLIB.Service({
        ros: ros,
        name: '/usb_operation',
        serviceType: 'project_control/Base'
    });

    serviceClients.projectListClient = new ROSLIB.Service({
        ros: ros,
        name: '/project_list',
        serviceType: 'project_control/Base'
    });

    serviceClients.projectDeleteClient = new ROSLIB.Service({
        ros: ros,
        name: '/project_delete',
        serviceType: 'project_control/Base'
    });

    serviceClients.imageClient = new ROSLIB.Service({
        ros: ros,
        name: '/project_image',
        serviceType: 'project_control/MultiBytes'
    });

    serviceClients.cloudClient = new ROSLIB.Service({
        ros: ros,
        name: '/project_cloud',
        serviceType: 'project_control/MultiBytes'
    });

    serviceClients.ipClient = new ROSLIB.Service({
        ros: ros,
        name: '/ip_config',
        serviceType: 'project_control/Base'
    });

    serviceClients.currentIpClient = new ROSLIB.Service({
        ros: ros,
        name: '/current_ip',
        serviceType: 'project_control/Base'
    });

    serviceClients.cameraControlService = new ROSLIB.Service({
        ros: ros,
        name: '/camera_control',
        serviceType: 'project_control/Base'
    });

    serviceClients.projectControlService = new ROSLIB.Service({
        ros: ros,
        name: '/project_control',
        serviceType: 'device_control/Base'
    });
}

function setupDurationSubscriber() {
    durationSubscriber = new ROSLIB.Topic({
        ros: ros,
        name: '/project_duration',
        messageType: 'std_msgs/Float64'
    });
    
    durationSubscriber.subscribe(function(message) {
        const durationElement = document.getElementById('projectDuration');
        durationElement.textContent = formatDuration(message.data);
    });
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return [hours, minutes, secs]
        .map(v => v < 10 ? "0" + v : v)
        .join(":");
}

function showResult(elementId, message, success = true) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    
    if (elementId === 'resultMessage') {
        const panel = document.getElementById('resultPanel');
        panel.style.display = 'block';
        panel.className = success ? 'result-panel success' : 'result-panel error';
        
        // 5秒后隐藏
        setTimeout(function() {
            panel.style.display = 'none';
        }, 5000);
    }
}


let selectedProject = '';
function getVersion() {
    if (!connected || !serviceClients.versionClient) return;
    
    const request = new ROSLIB.ServiceRequest({});
    serviceClients.versionClient.callService(request, result => {
        showResult('versionStatus', result.message);
    }, error => {
        showResult('versionStatus', '获取失败: ' + error, false);
    });
}

function cleanUSB() {
    if (!connected || !serviceClients.usbClient) return;
    
    const request = new ROSLIB.ServiceRequest({});
    serviceClients.usbClient.callService(request, result => {
        showResult('usbStatus', result.success ? '清理成功' : '清理失败: ' + result.message, result.success);
    }, error => {
        showResult('usbStatus', '服务调用失败: ' + error, false);
    });
}

function loadProjects() {
    if (!connected || !serviceClients.projectListClient) return;
    
    const request = new ROSLIB.ServiceRequest({});
    serviceClients.projectListClient.callService(request, result => {
        const select = document.getElementById('projectList');
        select.innerHTML = '<option value="">选择项目</option>';
        if (result.success) {
            result.message.split(',').forEach(project => {
                if (project.trim()) {
                    const option = document.createElement('option');
                    option.value = project;
                    option.textContent = project;
                    select.appendChild(option);
                }
            });
        }
    });
}

function deleteProject() {
    if (!connected || !serviceClients.projectDeleteClient) {
        alert('未连接到ROS服务器');
        return;
    }
    
    const select = document.getElementById('projectList');
    const selectedProject = select.value;
    
    if (!selectedProject) {
        alert('请先选择要删除的项目');
        return;
    }
    
    if (!confirm(`确定要删除项目"${selectedProject}"吗？`)) {
        return;
    }
    
    const request = new ROSLIB.ServiceRequest({
        params: selectedProject
    });
    
    serviceClients.projectDeleteClient.callService(request, result => {
        if (result.success) {
            alert('项目删除成功');
            // 刷新项目列表
            loadProjects();
            const previewImage = document.getElementById('previewImage');
            if (previewImage) {
                previewImage.src = '';
            }
        } else {
            alert('删除失败: ' + result.message);
        }
    }, error => {
        alert('服务调用失败: ' + error);
    });
}

function onProjectSelected() {
    const select = document.getElementById('projectList');
    selectedProject = select.value;
    loadPreviewImage();
}

function loadPreviewImage() {
    if (!connected || !serviceClients.imageClient || !selectedProject) return;

    const request = new ROSLIB.ServiceRequest({
        project_name: selectedProject
    });

    serviceClients.imageClient.callService(request, result => {
        if (result.success) {
            if (result.data && result.data.length > 0) {
                let binaryData;
                
                if (result.data instanceof Array || result.data instanceof Uint8Array) {
                    console.log("result data is uint8 array");
                    binaryData = new Uint8Array(result.data);
                } 
                else if (typeof result.data === 'string') {
                    console.log("result data is string");
                    const base64Data = result.data.split(',')[1] || result.data; // 去除 data:image/png;base64, 前缀
                    binaryData = new Uint8Array(atob(base64Data).split('').map(c => c.charCodeAt(0)));
                }
    
                const blob = new Blob([binaryData], { type: 'image/png' });
                const img_ele = document.getElementById('previewImage');
                img_ele.src = URL.createObjectURL(blob);

                // 清理URL对象
                setTimeout(() => {
                    URL.revokeObjectURL(img_ele.src);
                }, 1000);
            } else {
                console.warn("Received empty image data");
                img_ele.src = ''; // 清空图片
            }
        } else {
            console.error("Service failed:", result.message);
        }
    });
}

function downloadPointCloud() {
    if (!connected || !serviceClients.cloudClient || !selectedProject) return;

    const request = new ROSLIB.ServiceRequest({
        project_name: selectedProject
    });

    serviceClients.cloudClient.callService(request, result => {
        if (result.data && result.data.length > 0) {
            // 检查响应数据类型，正确处理二进制数据
            let blob;
            
            if (result.data instanceof Uint8Array) {
                blob = new Blob([result.data], {type: 'application/octet-stream'});
            } else if (typeof result.data === 'string') {
                console.log("result data is string");
                const base64Data = result.data.split(',')[1] || result.data; // 去除 data:image/png;base64, 前缀
                binaryData = new Uint8Array(atob(base64Data).split('').map(c => c.charCodeAt(0)));
                blob = new Blob([binaryData], {type: 'text/plain'});
            } else {
               console.error('data error.')
            }
            
            // 创建临时链接并下载
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            
            // 确保文件扩展名正确
            const fileExtension = detectPointCloudFormat(result.data);
            link.download = `${selectedProject}${fileExtension}`;
            
            // 触发下载
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 清理URL对象
            setTimeout(() => {
                URL.revokeObjectURL(link.href);
            }, 1000);
            
            showResult('cloudStatus', '点云文件下载成功');
        } else {
            showResult('cloudStatus', '无法获取点云数据', false);
        }
    }, error => {
        showResult('cloudStatus', '下载点云文件失败: ' + error, false);
    });
}

// 检测点云数据格式，返回适当的文件扩展名
function detectPointCloudFormat(data) {
    // 默认扩展名
    let extension = '.pcd';
    
    // 检查数据的前几个字节来确定格式
    if (data instanceof Uint8Array || ArrayBuffer.isView(data)) {
        const header = new Uint8Array(data.slice(0, 20));
        const headerStr = String.fromCharCode.apply(null, header);
        
        // 检测常见点云格式的魔数或标识
        if (headerStr.includes('ply')) {
            extension = '.ply';
        } else if (headerStr.includes('PCD')) {
            extension = '.pcd';
        } else if (headerStr.includes('LASF')) {
            extension = '.las';
        } else if (headerStr.includes('# .PTS')) {
            extension = '.pts';
        } else if (headerStr.includes('OFF')) {
            extension = '.off';
        }
    } else if (typeof data === 'string') {
        const headerStr = data.substring(0, 100);
        
        if (headerStr.includes('ply')) {
            extension = '.ply';
        } else if (headerStr.includes('PCD')) {
            extension = '.pcd';
        } else if (headerStr.includes('# .PTS')) {
            extension = '.pts';
        } else if (headerStr.includes('OFF')) {
            extension = '.off';
        }
    }
    
    return extension;
}

function setIPConfig(event) {
    event.preventDefault();
    
    if (!connected || !serviceClients.ipClient) {
        showResult('ipStatus', '未连接到ROS服务器', false);
        return;
    }
    
    const params = [
        document.getElementById('ip').value,
        document.getElementById('mask').value,
        document.getElementById('gateway').value,
        document.getElementById('dns').value
    ].join('/');

    const request = new ROSLIB.ServiceRequest({
        params: params
    });

    serviceClients.ipClient.callService(request, result => {
        showResult('ipStatus', result.success ? '配置成功' : '配置失败: ' + result.message, result.success);
    }, error => {
        showResult('ipStatus', '服务调用失败: ' + error, false);
    });
}

function getCurrentIPConfig() {
    if (!connected || !serviceClients.currentIpClient) {
        showResult('ipStatus', '未连接到ROS服务器', false);
        return;
    }
    
    showResult('ipStatus', '正在获取当前网络配置...');
    
    const request = new ROSLIB.ServiceRequest({});
    
    serviceClients.currentIpClient.callService(request, result => {
        if (result.success) {
            const parts = result.message.split('/');
            if (parts.length >= 4) {
                document.getElementById('ip').value = parts[0];
                document.getElementById('mask').value = parts[1];
                document.getElementById('gateway').value = parts[2];
                document.getElementById('dns').value = parts[3];
                showResult('ipStatus', '已加载当前网络配置', true);
            } else {
                showResult('ipStatus', '配置数据格式错误', false);
            }
        } else {
            showResult('ipStatus', '获取配置失败: ' + result.message, false);
        }
    }, error => {
        showResult('ipStatus', '服务调用失败: ' + error, false);
    });
}

function applyCameraSettings() {
    if (!connected || !serviceClients.cameraControlService) {
        showResult('cameraStatus', '未连接到ROS服务器', false);
        return;
    }
    
    const resolution = document.getElementById('resolution').value;
    const frameRate = document.getElementById('frameRate').value;
    const whiteBalance = document.getElementById('whiteBalance').value;
    const exposure = document.getElementById('exposure').value;

    // resolution/frameRate/exposure/whiteBalance
    const request = new ROSLIB.ServiceRequest({
        params: `${resolution}/${frameRate}/${whiteBalance}/${exposure}`
    });
    
    showResult('cameraStatus', '正在应用设置...');
    
    serviceClients.cameraControlService.callService(request, function(result) {
        showResult('cameraStatus', result.success ? '设置成功: ' + result.message : '设置失败: ' + result.message, result.success);
    }, function(error) {
        showResult('cameraStatus', '服务调用错误: ' + error, false);
    });
}

function callProjectControl(action) {
    if (!connected || !serviceClients.projectControlService) {
        showResult('resultMessage', '未连接到ROS服务器', false);
        return;
    }
    
    const taskName = document.getElementById('taskName').value.trim();
    if (!taskName) {
        showResult('resultMessage', '请输入任务名称', false);
        return;
    }
    
    const request = new ROSLIB.ServiceRequest({
        params: `${taskName}/${action}`
    });
    
    serviceClients.projectControlService.callService(request, function(result) {
        showResult('resultMessage', result.message, result.success);
    }, function(error) {
        showResult('resultMessage', `服务调用失败: ${error}`, false);
    });
}


function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // 移除所有活动标签
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // 设置活动标签
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
}


document.addEventListener('DOMContentLoaded', function() {
    // 设置标签切换
    setupTabs();
    
    // 初始化ROS连接
    initRosConnection();
    
    // 设备控制事件监听
    document.getElementById('getVersionBtn').addEventListener('click', getVersion);
    document.getElementById('cleanUSBBtn').addEventListener('click', cleanUSB);
    document.getElementById('loadProjectsBtn').addEventListener('click', loadProjects);
    document.getElementById('projectList').addEventListener('change', onProjectSelected);
    document.getElementById('downloadCloudBtn').addEventListener('click', downloadPointCloud);
    document.getElementById('deleteProjectBtn').addEventListener('click', deleteProject);
    document.getElementById('ipConfigForm').addEventListener('submit', setIPConfig);
    document.getElementById('getCurrentIPBtn').addEventListener('click', getCurrentIPConfig);
    
    // 相机控制事件监听
    document.getElementById('applySettings').addEventListener('click', applyCameraSettings);
    
    // 项目控制事件监听
    document.getElementById('startButton').addEventListener('click', () => callProjectControl('start'));
    document.getElementById('stopButton').addEventListener('click', () => callProjectControl('stop'));
});

// 文件上传与解压相关脚本
document.addEventListener('DOMContentLoaded', function() {
    const uploadBtn = document.getElementById('uploadArchiveBtn');
    const fileInput = document.getElementById('archiveFile');
    const statusDiv = document.getElementById('uploadStatus');
    const progressBar = document.getElementById('uploadProgress');
    const progressFill = progressBar.querySelector('.progress-fill');
    
    uploadBtn.addEventListener('click', function() {
        const file = fileInput.files[0];
        if (!file) {
            statusDiv.textContent = '请先选择文件';
            statusDiv.style.color = 'var(--error-color)';
            return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        
        // 显示上传状态
        statusDiv.textContent = '正在上传文件...';
        statusDiv.style.color = 'var(--text-color)';
        progressBar.style.display = 'block';
        progressFill.style.width = '0%';
        
        const xhr = new XMLHttpRequest();
        
        // 进度处理
        xhr.upload.addEventListener('progress', function(e) {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                progressFill.style.width = percentComplete + '%';
            }
        });
        
        // 完成处理
        xhr.addEventListener('load', function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                statusDiv.textContent = '固件上传成功';
                statusDiv.style.color = 'var(--success-color)';
            } else {
                try {
                    const response = JSON.parse(xhr.responseText);
                    statusDiv.textContent = '错误: ' + response.message;
                } catch (e) {
                    statusDiv.textContent = '上传失败，状态码: ' + xhr.status;
                }
                statusDiv.style.color = 'var(--error-color)';
            }
            setTimeout(() => {
                progressBar.style.display = 'none';
            }, 2000);
        });
        
        // 错误处理
        xhr.addEventListener('error', function() {
            statusDiv.textContent = '网络错误，上传失败';
            statusDiv.style.color = 'var(--error-color)';
            progressBar.style.display = 'none';
        });
        
        // 发送请求
        xhr.open('POST', '/upload', true);
        xhr.send(formData);
    });
    
    // 文件选择变化时更新状态
    fileInput.addEventListener('change', function() {
        const file = fileInput.files[0];
        if (file) {
            statusDiv.textContent = `已选择: ${file.name} (${formatFileSize(file.size)})`;
            statusDiv.style.color = 'var(--text-color)';
        } else {
            statusDiv.textContent = '就绪';
            statusDiv.style.color = 'var(--text-color)';
        }
    });
    
    // 格式化文件大小
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
        else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB';
        else return (bytes / 1073741824).toFixed(2) + ' GB';
    }
});

// 设置电池状态订阅
function setupBatterySubscriber() {
    batterySubscriber = new ROSLIB.Topic({
        ros: ros,
        name: '/battery',
        messageType: 'sensor_msgs/BatteryState'
    });
    
    batterySubscriber.subscribe(function(message) {
        const batteryElement = document.getElementById('batteryStatus');
        const batterySpan = batteryElement.querySelector('span');
        const batteryIcon = batteryElement.querySelector('i');
        
        // 更新电池百分比
        const percentage = Math.round(message.percentage);
        batterySpan.textContent = `${percentage}%`;
        
    });
}

// 设置存储空间订阅
function setupStorageSubscriber() {
    storageSubscriber = new ROSLIB.Topic({
        ros: ros,
        name: '/storage',
        messageType: 'std_msgs/String'
    });
    
    storageSubscriber.subscribe(function(message) {
        const storageElement = document.getElementById('storageStatus');
        const storageSpan = storageElement.querySelector('span');
        
        // 更新存储空间信息
        storageSpan.textContent = message.data;
    });
}

// 设置驱动状态订阅
function setupDriverStatusSubscriber() {
    driverStatusSubscriber = new ROSLIB.Topic({
        ros: ros,
        name: '/driver_status',
        messageType: 'std_msgs/UInt8'
    });
    
    driverStatusSubscriber.subscribe(function(message) {
        // 8 bytes. 0,0,0,0,SD,SLAM,CAM,LiDAR
        const statusArray = [
            message.data & 0x01,          
            (message.data >> 1) & 0x01,               
            (message.data >> 2) & 0x01,   
            (message.data >> 3) & 0x01];
        
        console.log("Driver status received:", message.data, "Parsed status:", statusArray);
        
        updateDeviceStatus('lidarStatus', statusArray[0]);
        updateDeviceStatus('camStatus', statusArray[1]);
        updateDeviceStatus('slamStatus', statusArray[2]);
        updateDeviceStatus('sdStatus', statusArray[3]);
    });
}

// 更新设备状态指示灯
function updateDeviceStatus(elementId, statusCode) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const indicator = element.querySelector('.status-indicator');
    if (!indicator) return;
    
    // 清除旧的状态类
    indicator.classList.remove('active', 'error', 'warning');
    
    // 根据状态码设置指示灯
    switch (statusCode) {
        case 0: 
            break;
        case 1: 
            indicator.classList.add('active');
            break;
        case 2: 
            indicator.classList.add('warning');
            break;
        default:
            break;
    }
}

// 设置关键帧图像订阅
function setupKeyframeSubscriber() {
    let isSubscribed = true;
    const keyframeImage = document.getElementById('keyframeImage');
    
    if (!keyframeImage) {
        console.error("Keyframe HTML elements not found");
        return;
    }
    
    keyframeSubscriber = new ROSLIB.Topic({
        ros: ros,
        name: '/keyframe',
        messageType: 'sensor_msgs/CompressedImage'
    });
    
    keyframeSubscriber.subscribe(function(message) {
        if (!isSubscribed) return;
        
        try {
            const canvas = document.getElementById('keyframeImage');
            if(message.format == "jpeg" || message.format == "png"){
                const image = new Image();
                image.src = "data:image/"+message.format+";base64," + message.data;
                image.onload = function() {
                    canvas.width = image.width;
                    canvas.height = image.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(image, 0, 0, image.width, image.height);
                }
            }
        } catch (error) {
            console.error('Error processing keyframe image:', error);
        }
    });
    
   
}