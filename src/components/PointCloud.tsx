import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import ROSLIB from 'roslib';
import * as ROS3D from 'ros3d';
import BatteryIndicator from './BatteryIndicator';
import ConnectionControl from './ConnectionControl';
import DebugPanel from "./DebugPanel";
import './PointCloud.css';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'three/examples/jsm/libs/stats.module';
import FixedLengthArray from '../utils/FixedLengthArray';
import FrameRateController from "../utils/FrameRateController";
import FPSCounter from "../utils/FPSCounter";

interface PointCloudProps {
  url: string;
  topic: string;
  frameId?: string;
  width?: number;
  height?: number;
  batteryTopic?: string;
}

const PointCloud: React.FC<PointCloudProps> = ({
  url,
  topic,
  frameId = 'camera_init',
  width = "100%",
  height = "100%",
  batteryTopic = '/battery_state'
}) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const viewerId = 'pointcloud-viewer';
  const [batteryLevel, setBatteryLevel] = useState<number>(100);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const rosRef = useRef<ROSLIB.Ros | null>(null);
  const viewerRef3D = useRef<any>(null);
  const batteryListenerRef = useRef<ROSLIB.Topic | null>(null);
  const tfClientRef = useRef<ROSLIB.TFClient | null>(null);
  const animationFrameRef = useRef<number>(0);
  const stats = new Stats();
  let scene: THREE.Scene;
  let renderer: THREE.WebGLRenderer;
  let camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  let controls: OrbitControls;
  const particlesGeometry = new THREE.BufferGeometry();
  const particlesMaterial = new THREE.PointsMaterial({
    size: 0.1,
    color: 0xffffff,
    vertexColors: true, // 若启用需确认颜色数据存在
    transparent: true,  // 移动端避免透明材质（可能引发性能问题）
    alphaTest: 0.5      // 解决边缘锯齿
  });
  let pointCloud = new THREE.Points(particlesGeometry, particlesMaterial);

  const maxPointNumber = 1000000 * 3;
  let allPoints: FixedLengthArray = new FixedLengthArray(maxPointNumber);
  let allColors: FixedLengthArray = new FixedLengthArray(maxPointNumber);
  const fpsController = new FrameRateController(25);
  const workerRef = useRef<Worker | null>(null);
  let decodedWith: string = 'no worker';
  let isWorkerLoaded: boolean = false;
  const [debugInfo, setDebugInfo] = useState({
    fps: 0,
    pointCount: 0,
    isWorkerSupported: false,
    isWorkerLoaded: false,
    decodedWith: decodedWith,
    cameraPosition: { x: 0, y: 0, z: 0 },
    controlsTarget: { x: 0, y: 0, z: 0 }
  });
  const connectToROS = () => {
    if (rosRef.current) {
      rosRef.current.close();
    }

    const ros = new ROSLIB.Ros({
      url: url
    });

    ros.on('connection', () => {
      console.log('Connected to websocket server.');
      setIsConnected(true);
      setupSubscribers(ros);
    });

    ros.on('error', (error: Error) => {
      console.error('Error connecting to websocket server:', error);
      setIsConnected(false);
    });

    ros.on('close', () => {
      console.log('Connection to websocket server closed.');
      setIsConnected(false);
      cleanupSubscribers();
    });


    ros.on(topic, (msg: any) => {
      // console.log(workerRef.current);
      if (workerRef.current) {
        workerRef.current.postMessage(msg);
        decodedWith = 'worker: postMessage';
      } else {
        decodedWith = 'no worker';
        const result = parsePointCloud(msg);

        allPoints.push(...result.points);
        allColors.push(...result.colors);

        renderPoints(allPoints.array, allColors.array);
      }
    })

    rosRef.current = ros;
  };

  const cleanupSubscribers = () => {
    if (batteryListenerRef.current) {
      batteryListenerRef.current.unsubscribe();
      batteryListenerRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    tfClientRef.current = null;

    if (allPoints) {
      allPoints.clear();
    } else {
      allPoints = new FixedLengthArray(maxPointNumber);
    }

    if (allColors) {
      allColors.clear();
    } else {
      allColors = new FixedLengthArray(maxPointNumber);
    }
  };

  const setupSubscribers = (ros: ROSLIB.Ros) => {
    // 清理旧的订阅
    cleanupSubscribers();

    // 订阅电池状态
    const batteryListener = new ROSLIB.Topic({
      ros: ros,
      name: batteryTopic,
      messageType: 'sensor_msgs/BatteryState'
    });

    batteryListener.subscribe((message: any) => {
      setBatteryLevel(message.percentage * 100);
    });

    batteryListenerRef.current = batteryListener;

    // 设置TF客户端
    const tfClient = new ROSLIB.TFClient({
      ros: ros,
      fixedFrame: frameId,
      angularThres: 0.01,
      transThres: 0.01,
    });

    tfClientRef.current = tfClient;

    new ROS3D.PointCloud2({
      ros: rosRef.current,
      topic: topic,
      tfClient: tfClientRef.current,
      // rootObject: viewerRef3D.current.scene,
    });
  };

  const isWorkerSupported = (): boolean => {
    return typeof window.Worker !== "undefined";
  };

  const handleToggleConnection = () => {
    if (isConnected && rosRef.current) {
      rosRef.current.close();
    } else {
      connectToROS();
    }
  };

  const renderPoints = (points: any, colors: any) => {
    if (points.length === 0) {
      console.warn('No valid points found in point cloud');
      return;
    }

    particlesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    particlesGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    particlesGeometry.attributes.position.needsUpdate = true;
    particlesGeometry.attributes.color.needsUpdate = true;
  }

  useEffect(() => {
    if (!viewerRef.current) return;
    let worker ;
    // Initialize Web Worker
    if (isWorkerSupported()) {
      console.info("当前环境支持 Web Worker");
      // let worker = new Worker(
      //   new URL("../workers/pointCloudParser.worker.ts", import.meta.url)
      // );

      // console.log(new URL("../workers/pointCloudParser.worker.ts", import.meta.url));
  
      // worker.onmessage = (e: MessageEvent) => {
      //   if (e.data.type === "READY") {
      //     console.log("Worker 加载成功");
      //     isWorkerLoaded = true;
      //     workerRef.current = worker;
      //   }else {
      //     decodedWith = 'worker: onmessage';
      //     const { points, colors } = e.data;
      //     allPoints.push(...points);
      //     allColors.push(...colors);
      //     renderPoints(allPoints.array, allColors.array);
      //   }
      // };

      // worker.onerror = (event) => {
      //   console.error("Worker 加载失败:", event);
      //   isWorkerLoaded = false;
      //   worker.terminate();
      //   workerRef.current = null;
      // }

      const workerScript = `
      function parsePointCloud(msg) {
    console.log(msg);
    var buffer = new Uint8Array(msg.data).buffer;
    var dataView = new DataView(buffer);

    var points = [];
    var colors = [];

    for (let i = 0; i < msg.width; i++) {
        var pointOffset = i * msg.point_step;

        msg.fields.forEach((field) => {
            var byteOffset = pointOffset + field.offset;
            var name = field.name;

            switch (field.datatype) {
                case 7:
                    if (name === 'x' || name === 'y' || name === 'z') {
                        points.push(dataView.getFloat32(byteOffset, !msg.is_bigendian));
                    } else if (name === 'rgb') {
                        var rgbInt = dataView.getUint32(byteOffset, !msg.is_bigendian);
                        var rgb = {
                            r: ((rgbInt >> 16) & 0xff) / 255,
                            g: ((rgbInt >> 8) & 0xff) / 255,
                            b: (rgbInt & 0xff) / 255
                        };
                        colors.push(rgb.r, rgb.g, rgb.b);
                    }
                    break;
            }
        });
    }
    console.log('parse ok');
    return {
        points,
        colors
    };
}

self.onmessage = (e) => {
    const result = parsePointCloud(e.data);
    self.postMessage(result);
};

self.postMessage({
    type: 'READY',
}); 
    `;

const blob = new Blob([workerScript], { type: 'application/javascript' });
const worker2 = new Worker(URL.createObjectURL(blob));

worker2.onmessage = (e: MessageEvent) => {
  if (e.data.type === "READY") {
    console.log("Worker2 加载成功");
    isWorkerLoaded = true;
    workerRef.current = worker2;
  }else {
    decodedWith = 'worker: onmessage';
    const { points, colors } = e.data;
    allPoints.push(...points);
    allColors.push(...colors);
    renderPoints(allPoints.array, allColors.array);
  }
};

worker2.onerror = (event) => {
  console.error("Worker2 加载失败:", event);
  isWorkerLoaded = false;
  worker2.terminate();
  workerRef.current = null;
}
    } else {
      console.error("当前环境不支持 Web Worker");
      decodedWith = 'no worker';
    }

    // 初始连接
    connectToROS();

    // 清理函数
    return () => {
      cleanupSubscribers();
      if (rosRef.current) {
        rosRef.current.close();
      }
      if (viewerRef.current) {
        while (viewerRef.current.firstChild) {
          viewerRef.current.removeChild(viewerRef.current.firstChild);
        }
      }
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [url, topic, frameId, width, height, batteryTopic]);

  useEffect(() => {
    if (!viewerRef.current) return;

    // Stats setup
    stats.showPanel(0);

    stats.dom.style.position = "absolute";
    stats.dom.style.top = "0px";
    // viewerRef.current.appendChild(stats.dom);

    console.log(THREE.REVISION);

    // 1. 创建场景
    if (!scene) {
      scene = new THREE.Scene();
    }
    scene.background = new THREE.Color(0x000000);

    // 2. 创建透视相机（参数：视场角、宽高比、近裁剪面、远裁剪面）
    if (!camera) {
      camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );

      // const aspect = window.innerWidth / window.innerHeight;
      // const frustumSize = 10;
      // camera = new THREE.OrthographicCamera(
      //   -frustumSize * aspect / 2,
      //   frustumSize * aspect / 2,
      //   frustumSize / 2,
      //   -frustumSize / 2,
      //   0.1,
      //   1000
      // );
    }
    camera.up.set(0, 1, 0); // 默认是 (0, 1, 0) 即 Y 轴向上
    camera.lookAt(0, 0, 0);
    camera.position.set(0, 20, -50);
    // 3. 创建渲染器
    if (!renderer) {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: "low-power"
      });
    }
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio); // 适配高分辨率屏幕
    viewerRef.current.appendChild(renderer.domElement);

    const context = renderer.getContext();
    console.log(context.getParameter(context.VERSION));
    if (context.getParameter(context.VERSION).includes('WebGL 1.0')) {
      console.warn('降级到 WebGL 1.0 模式运行');
    }

    // 创建坐标轴辅助器，长度设为 5
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);

    // Controls setup
    // 初始化控制器（需传入相机和渲染器 DOM）
    if (!controls) {
      controls = new OrbitControls(camera, renderer.domElement);
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: THREE.MOUSE.DOLLY
      };

      // 关键参数配置
      controls.enableDamping = true;     // 启用阻尼惯性（提升操作流畅性）[1,6](@ref)
      controls.dampingFactor = 0.05;    // 阻尼强度（值越小惯性越明显）
      controls.enableZoom = true;       // 允许缩放
      controls.zoomSpeed = 1.5;         // 缩放灵敏度
      controls.enableRotate = true;     // 允许旋转
      controls.rotateSpeed = 0.8;       // 旋转灵敏度
      controls.enablePan = true;        // 允许平移
      controls.panSpeed = 0.5;          // 平移速度
      controls.screenSpacePanning = false; // 禁用屏幕空间平移（更适合 3D 场景）[6](@ref)
    }

    // 添加物体
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // Create point cloud
    if (!pointCloud) {
      pointCloud = new THREE.Points(particlesGeometry, particlesMaterial);
    }
    scene.add(pointCloud);

    // Create default waveform point cloud for debug
    const createDebugPointCloud = () => {
      const points: number[] = [];
      const colors: number[] = [];
      const amplitude = 5;
      const frequency = 0.1;

      for (let i = 0; i < maxPointNumber; i++) {
        const x = i * 0.1;
        const y = Math.sin(x * frequency) * amplitude;
        const z = Math.cos(x * frequency) * amplitude;

        points.push(x, y, z);

        // Create a gradient color from blue to red based on height
        const normalizedY = (y + amplitude) / (2 * amplitude);
        const r = Math.floor(255 * normalizedY);
        const b = Math.floor(255 * (1 - normalizedY));
        colors.push(r, 0, b);
      }

      // 生成随机点数据和颜色
      for (let i = 0; i < maxPointNumber; i++) {
        // 随机位置（范围：-20到20）
        points.push(
          Math.random() * 40 - 20,
          Math.random() * 40 - 20,
          Math.random() * 40 - 20
        );

        // 随机初始颜色
        colors.push(
          Math.random(),   // R
          Math.random(),   // G
          Math.random()    // B
        );
      }
      particlesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
      particlesGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      particlesGeometry.attributes.position.needsUpdate = true;
      particlesGeometry.attributes.color.needsUpdate = true;
    };

    // Initialize default waveform
    createDebugPointCloud();

    console.log(scene);

    // Handle window resize
    const handleResize = () => {
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      } else {
        camera.updateProjectionMatrix();
      }

    };
    window.addEventListener("resize", handleResize);

    // Update the animation loop to include debug info
    const fpsCounter = new FPSCounter();

    fpsController.start((deltaTime, frameCount) => {
      stats.begin();

      const currentFPS = fpsCounter.update();

      // Update debug information
      setDebugInfo({
        fps: currentFPS,
        pointCount: particlesGeometry.attributes.position.count,
        isWorkerSupported: isWorkerSupported(),
        isWorkerLoaded: isWorkerLoaded,
        decodedWith: decodedWith,
        cameraPosition: {
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z
        },
        controlsTarget: {
          x: controls.target.x,
          y: controls.target.y,
          z: controls.target.z
        }
      });

      controls.update();
      renderer.render(scene, camera);
      stats.end();
    });

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);

      if (viewerRef.current) {
        viewerRef.current.removeChild(renderer.domElement);
        viewerRef.current.removeChild(stats.dom);
      }

      scene.clear();

      particlesGeometry.dispose();
      particlesMaterial.dispose();
    };
  }, []);

  const parsePointCloud = (msg: any) => {
    console.log("not from web worker");
    const buffer = new Uint8Array(msg.data).buffer;
    const dataView = new DataView(buffer);

    const points: number[] = [];
    const colors: number[] = [];
    // 遍历每个点
    for (let i = 0; i < msg.width; i++) {
      const pointOffset = i * msg.point_step; // 每个点的起始字节位置
      const point: any = {};

      // 解析每个字段
      msg.fields.forEach((field: any) => {
        const byteOffset = pointOffset + field.offset;
        const name = field.name;

        switch (field.datatype) {
          case 7: // FLOAT32 (x/y/z) // UINT32 (rgb)
            if (name === "x" || name === "y" || name === "z") {
              // point[field.name] = dataView.getFloat32(byteOffset, !msg.is_bigendian);
              points.push(dataView.getFloat32(byteOffset, !msg.is_bigendian));
            } else if (name === "rgb") {
              const rgbInt = dataView.getUint32(byteOffset, !msg.is_bigendian);
              // point.rgb = {
              //   r: (rgbInt >> 16) & 0xff,
              //   g: (rgbInt >> 8) & 0xff,
              //   b: rgbInt & 0xff
              // };
              const rgb = {
                r: ((rgbInt >> 16) & 0xff) / 255,
                g: ((rgbInt >> 8) & 0xff) / 255,
                b: (rgbInt & 0xff) / 255
              };
              colors.push(rgb.r, rgb.g, rgb.b);
            }
            break;
          case 6:
            break;
        }
      });

      points.push(point);
    }

    return {
      points,
      colors,
    };
  };

  return (
    <div className="pointcloud-container">
      <DebugPanel debugInfo={debugInfo} />
      {
        <div className="pointcloud-header">
          <BatteryIndicator percentage={batteryLevel} />
          <ConnectionControl
            isConnected={isConnected}
            onToggleConnection={handleToggleConnection}
          />
        </div>
      }
      <div id={viewerId} ref={viewerRef} />
    </div>
  );
};

export default PointCloud; 