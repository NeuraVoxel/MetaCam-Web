import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import ROSLIB from "roslib";
import * as ROS3D from "ros3d";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import DebugPanel from "./DebugPanel";
import "./PointCloud.css";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "three/examples/jsm/libs/stats.module";
import FixedLengthArray from "../utils/FixedLengthArray";
import FrameRateController from "../utils/FrameRateController";
import FPSCounter from "../utils/FPSCounter";
import rosService from "../services/ROSService";

ROS3D.PointCloud2.prototype.processMessage = function (msg) {
  return;
  console.time("processMessage");
  if (!this.points.setup(msg.header.frame_id, msg.point_step, msg.fields)) {
    return;
  }

  var n,
    pointRatio = this.points.pointRatio;
  var bufSz = this.max_pts * msg.point_step;

  if (msg.data.buffer) {
    this.buffer = msg.data.slice(0, Math.min(msg.data.byteLength, bufSz));
    n = Math.min(
      (msg.height * msg.width) / pointRatio,
      this.points.positions.array.length / 3
    );
  } else {
    if (!this.buffer || this.buffer.byteLength < bufSz) {
      this.buffer = new Uint8Array(bufSz);
    }
    n = decode64(msg.data, this.buffer, msg.point_step, pointRatio);
    pointRatio = 1;
  }

  var dv = new DataView(this.buffer.buffer);
  var littleEndian = !msg.is_bigendian;
  var x = this.points.fields.x.offset;
  var y = this.points.fields.y.offset;
  var z = this.points.fields.z.offset;
  var base, color;
  console.log(n);
  for (var i = 0; i < n; i++) {
    base = i * pointRatio * msg.point_step;
    this.points.positions.array[3 * i] = dv.getFloat32(base + x, littleEndian);
    this.points.positions.array[3 * i + 1] = dv.getFloat32(
      base + y,
      littleEndian
    );
    this.points.positions.array[3 * i + 2] = dv.getFloat32(
      base + z,
      littleEndian
    );

    if (this.points.colors) {
      color = this.points.colormap(
        this.points.getColor(dv, base, littleEndian)
      );
      this.points.colors.array[3 * i] = color.r;
      this.points.colors.array[3 * i + 1] = color.g;
      this.points.colors.array[3 * i + 2] = color.b;
    }
  }
  this.points.update(n);
  console.timeEnd("processMessage");
};

interface PointCloudProps {
  url: string;
  topic: string;
  frameId?: string;
  width?: number;
  height?: number;
  batteryTopic?: string;
  pointSize?: number;
  colorMode?: string;
  showDebugPanel?: boolean; // 添加控制DebugPanel显示隐藏的属性
  stlPath?: string; // 添加STL文件路径属性
}

const PointCloud: React.FC<PointCloudProps> = ({
  url,
  topic,
  frameId = "camera_init",
  width = "100%",
  height = "100%",
  batteryTopic = "/battery_state",
  showDebugPanel = false,
  // stlPath = "/assets/8888.stl", // 默认STL文件路径
  stlPath = "http://192.168.1.11:8080/assets/8888.stl",
}) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const viewerId = "pointcloud-viewer";
  const tfClientRef = useRef<ROSLIB.TFClient | null>(null);
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
    transparent: true, // 移动端避免透明材质（可能引发性能问题）
    alphaTest: 0.5, // 解决边缘锯齿
    sizeAttenuation: false,
  });
  let pointCloud = new THREE.Points(particlesGeometry, particlesMaterial);
  pointCloud.frustumCulled = false;

  // 添加STL模型和轨迹线的引用
  const stlModelRef = useRef<THREE.Mesh | null>(null);
  const trajectoryRef = useRef<THREE.Line | null>(null);

  const maxPointNumber = 1000000 * 3;
  let allPoints: FixedLengthArray = new FixedLengthArray(maxPointNumber);
  let allColors: FixedLengthArray = new FixedLengthArray(maxPointNumber);
  const fpsController = new FrameRateController(25);
  const workerRef = useRef<Worker | null>(null);
  let decodedWith: string = "no worker";
  let isWorkerLoaded: boolean = false;
  const [debugInfo, setDebugInfo] = useState({
    fps: 0,
    pointCount: 0,
    isWorkerSupported: false,
    isWorkerLoaded: false,
    decodedWith: decodedWith,
    cameraPosition: { x: 0, y: 0, z: 0 },
    controlsTarget: { x: 0, y: 0, z: 0 },
  });

  const odometryListenerRef = useRef<ROSLIB.Topic | null>(null);
  // 添加轨迹点数组引用
  const trajectoryPointsRef = useRef<THREE.Vector3[]>([]);
  // 添加轨迹线对象引用
  const odometryTrajectoryRef = useRef<THREE.Line | null>(null);
  // 设置轨迹线最大长度
  const maxTrajectoryLength = 10000;

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

  const setupSubscribers = () => {
    cleanupSubscribers();

    const ros = rosService.getROSInstance();

    // 订阅点云话题
    ros?.on(topic, (msg: any) => {
      if (rosService.isConnected()) {
        if (workerRef.current) {
          
          workerRef.current.postMessage(msg);

          decodedWith = "worker: postMessage";
        } else {
          decodedWith = "no worker";

          const result = parsePointCloud(msg);

          allPoints.push(...result.points);
          allColors.push(...result.colors);

          renderPoints(allPoints.array, allColors.array);
        }
      }
    });

    try {
      if (rosService.isConnected()) {
        // 订阅Odometry
        odometryListenerRef.current = rosService.subscribeTopic(
          "/Odometry",
          "nav_msgs/Odometry",
          (message: any) => {
            // console.log("收到Odometry:", message);
            const pose: any = message.pose?.pose;
            const { orientation, position } = pose;
            // console.log(orientation, position);

            if (stlModelRef.current) {
              const center = new THREE.Vector3();
              let boundingBox = stlModelRef.current.geometry.boundingBox;
              const mesh = stlModelRef.current;
              if (boundingBox) {
                boundingBox.getCenter(center);
              } else {
                stlModelRef.current.geometry.computeBoundingBox();
                boundingBox = stlModelRef.current.geometry.boundingBox;
                boundingBox?.getCenter(center);
              }
              const size: THREE.Vector3 = new THREE.Vector3();
              boundingBox?.getSize(size);

              stlModelRef.current.position.set(
                position.x - (size.x / 2) * mesh.scale.x,
                position.y - (size.y / 2) * mesh.scale.y,
                position.z - (size.z / 2) * mesh.scale.z
              );
              stlModelRef.current.quaternion.set(
                orientation.x,
                orientation.y,
                orientation.z,
                orientation.w
              );
              stlModelRef.current.updateMatrixWorld(true);

              // 更新相机目标位置，始终看向STL模型
              if (controls) {
                // 设置轨道控制器的目标为STL模型的位置
                controls.target.set(position.x, position.y, position.z);

                // 确保相机与模型保持一定距离
                // const cameraOffset = new THREE.Vector3(-6, 0, 2); // 相机相对于模型的偏移量
                // const modelPosition = new THREE.Vector3(
                //   position.x,
                //   position.y,
                //   position.z
                // );

                // 计算相机新位置（模型位置 + 偏移量）
                // const newCameraPosition = modelPosition.clone().add(cameraOffset);
                // camera.position.copy(newCameraPosition);
                // camera.lookAt(modelPosition);

                // 更新控制器
                controls.update();
              }
            }

            // 添加轨迹点并更新轨迹线
            updateTrajectory(position);
          }
        );

        // // 订阅电池状态
        // batteryListenerRef.current = rosService.subscribeTopic(
        //   batteryTopic,
        //   "sensor_msgs/BatteryState",
        //   (message: any) => {
        //     setBatteryLevel(message.percentage * 100);
        //   }
        // );

        // 设置TF客户端
        tfClientRef.current = rosService.createTFClient({
          fixedFrame: frameId,
          angularThres: 0.01,
          transThres: 0.01,
        });

        // 使用ROS3D处理点云数据
        const ros = rosService.getROSInstance();
        if (ros) {
          new ROS3D.PointCloud2({
            ros: ros!,
            topic: topic,
            tfClient: tfClientRef.current,
            max_pts: 100000,
          });
        }
      }
    } catch (error) {
      console.error("设置电池状态订阅时出错:", error);
    }
  };

  // 添加更新轨迹的函数
  const updateTrajectory = (position: any) => {
    if (!scene) return;

    // 创建新的轨迹点
    const newPoint = new THREE.Vector3(position.x, position.y, position.z);

    // 将新点添加到轨迹点数组
    trajectoryPointsRef.current.push(newPoint);

    // 如果轨迹点超过最大长度，移除最早的点
    if (trajectoryPointsRef.current.length > maxTrajectoryLength) {
      trajectoryPointsRef.current.shift();
    }

    // 更新或创建轨迹线
    if (trajectoryPointsRef.current.length > 1) {
      // 创建轨迹线几何体
      const geometry = new THREE.BufferGeometry().setFromPoints(
        trajectoryPointsRef.current
      );

      // 如果轨迹线已存在，更新几何体
      if (odometryTrajectoryRef.current) {
        odometryTrajectoryRef.current.geometry.dispose();
        odometryTrajectoryRef.current.geometry = geometry;
      } else {
        // 创建轨迹线材质
        const material = new THREE.LineBasicMaterial({
          color: 0x00ff00, // 绿色轨迹线
          linewidth: 4,
        });

        // 创建轨迹线
        const trajectoryLine = new THREE.Line(geometry, material);
        trajectoryLine.name = "OdometryTrajectory";

        // 添加到场景
        scene.add(trajectoryLine);

        // 保存轨迹线引用
        odometryTrajectoryRef.current = trajectoryLine;
      }
    }
  };

  // 清理订阅
  const cleanupSubscribers = () => {
    if (odometryListenerRef.current) {
      rosService.unsubscribeTopic(odometryListenerRef.current);
      odometryListenerRef.current = null;
    }

    // 清理轨迹线
    if (odometryTrajectoryRef.current && scene) {
      scene.remove(odometryTrajectoryRef.current);
      odometryTrajectoryRef.current.geometry.dispose();
      odometryTrajectoryRef.current = null;
    }

    // 清空轨迹点数组
    trajectoryPointsRef.current = [];

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

  useEffect(() => {
    if (!viewerRef.current) return;
    // Initialize Web Worker
    if (isWorkerSupported()) {
      console.info("当前环境支持 Web Worker");

      let worker = new Worker(
        new URL("../workers/pointCloudParser.worker.ts", import.meta.url)
      );

      // console.log(
      //   new URL("../workers/pointCloudParser.worker.ts", import.meta.url)
      // );

      worker.onmessage = (e: MessageEvent) => {
        if (e.data.type === "READY") {
          console.log("Worker 加载成功");
          isWorkerLoaded = true;
          workerRef.current = worker;
        } else {
          decodedWith = "worker1: onmessage";
          const { points, colors } = e.data;
          allPoints.push(...points);
          allColors.push(...colors);
          renderPoints(allPoints.array, allColors.array);
        }
      };

      worker.onerror = (event) => {
        console.error("Worker 加载失败:", event);
        isWorkerLoaded = false;
        worker.terminate();
        workerRef.current = null;

        const workerScript = `
        function parsePointCloud(msg) {
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

        const blob = new Blob([workerScript], {
          type: "application/javascript",
        });
        const worker2 = new Worker(URL.createObjectURL(blob));

        worker2.onmessage = (e: MessageEvent) => {
          if (e.data.type === "READY") {
            console.log("Worker2 加载成功");
            isWorkerLoaded = true;
            workerRef.current = worker2;
          } else {
            decodedWith = "worker2: onmessage";
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
        };
      };
    } else {
      console.error("当前环境不支持 Web Worker");
      decodedWith = "no worker";
    }

    // 清理函数
    return () => {
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
    viewerRef.current.appendChild(stats.dom);

    console.log(THREE.REVISION);

    // 1. 创建场景
    if (!scene) {
      scene = new THREE.Scene();
    }
    scene.background = new THREE.Color(0x000000);

    (window as any).scene = scene;

    // 2. 创建透视相机（参数：视场角、宽高比、近裁剪面、远裁剪面）
    if (!camera) {
      camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.01,
        15000
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
    // camera.up.set(0, 1, 0); // 默认是 (0, 1, 0) 即 Y 轴向上
    // camera.lookAt(0, 0, 0);
    // camera.position.set(0, 20, -50);

    camera.up.set(0, 0, 1);
    camera.position.set(0, 100, 0); // 将相机放在Y轴上方（原Z轴方向）
    camera.lookAt(0, 0, 0);

    // 3. 创建渲染器
    if (!renderer) {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: "low-power",
      });
    }
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio); // 适配高分辨率屏幕
    viewerRef.current.appendChild(renderer.domElement);

    const context = renderer.getContext();
    console.log(context.getParameter(context.VERSION));
    if (context.getParameter(context.VERSION).includes("WebGL 1.0")) {
      console.warn("降级到 WebGL 1.0 模式运行");
    }

    // 创建坐标轴辅助器，长度设为 5
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);

    const cameraHelper = new THREE.CameraHelper(camera);
    scene.add(cameraHelper);

    // Controls setup
    // 初始化控制器（需传入相机和渲染器 DOM）
    if (!controls) {
      controls = new OrbitControls(camera, renderer.domElement);
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: THREE.MOUSE.DOLLY,
      };

      // 关键参数配置
      controls.enableDamping = true; // 启用阻尼惯性（提升操作流畅性）
      controls.dampingFactor = 0.05; // 阻尼强度（值越小惯性越明显）
      controls.enableZoom = true; // 允许缩放
      controls.zoomSpeed = 1.5; // 缩放灵敏度
      controls.enableRotate = true; // 允许旋转
      controls.rotateSpeed = 0.8; // 旋转灵敏度
      controls.enablePan = true; // 允许平移
      controls.panSpeed = 0.5; // 平移速度
      controls.screenSpacePanning = false; // 禁用屏幕空间平移（更适合 3D 场景）
    }

    // 添加物体
    const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const material = new THREE.MeshBasicMaterial({ color: 0xcdcdcd });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // 加载STL模型
    const loadSTLModel = () => {
      const loader = new STLLoader();
      loader.load(
        stlPath,
        (geometry) => {
          // 计算包围盒以便将模型居中
          geometry.computeBoundingBox();
          const boundingBox = geometry.boundingBox;

          if (boundingBox) {
            // 计算模型中心点
            const center = new THREE.Vector3();
            boundingBox.getCenter(center);
            // console.log(boundingBox);

            // 创建材质
            const material = new THREE.MeshPhongMaterial({
              color: 0xcdcdcd,
              specular: 0x111111,
              shininess: 200,
            });

            // 创建网格
            const mesh = new THREE.Mesh(geometry, material);

            // 将模型缩小100倍
            mesh.scale.set(0.01, 0.01, 0.01);

            // 将模型放置在坐标系原点
            mesh.position.set(
              -center.x * mesh.scale.x,
              -center.y * mesh.scale.y,
              -center.z * mesh.scale.z
            );

            // 添加到场景
            scene.add(mesh);

            // 保存模型引用
            stlModelRef.current = mesh;
            // 创建颜色数组
            mesh.name = "STLModel";

            console.log("STL模型加载成功，已缩小100倍并放置在坐标系原点");
          }
        },
        (xhr) => {
          console.log((xhr.loaded / xhr.total) * 100 + "% 已加载");
        },
        (error) => {
          console.error("STL加载错误:", error);
        }
      );
    };

    // 创建sin函数轨迹线
    const createTrajectory = () => {
      // 定义轨迹参数
      const length = 100; // 轨迹长度
      const points = [];
      const amplitude = 5; // sin波振幅
      const frequency = 0.2; // sin波频率

      // 生成轨迹点
      for (let i = 0; i <= length; i++) {
        const x = i - length / 2;
        const y = Math.sin(x * frequency) * amplitude;
        const z = 0;
        points.push(new THREE.Vector3(x, y, z));
      }

      // 创建曲线
      const curve = new THREE.CatmullRomCurve3(points);

      // 创建轨迹线几何体
      const geometry = new THREE.BufferGeometry().setFromPoints(
        curve.getPoints(200) // 获取更多点以使曲线更平滑
      );

      // 创建轨迹线材质
      const material = new THREE.LineBasicMaterial({
        color: 0xff0000,
        linewidth: 2,
      });

      // 创建轨迹线
      const trajectoryLine = new THREE.Line(geometry, material);

      // 添加到场景
      scene.add(trajectoryLine);

      // 保存轨迹线引用和曲线
      trajectoryRef.current = trajectoryLine;

      return { curve, trajectoryLine };
    };

    // 执行STL模型加载
    loadSTLModel();

    // createTrajectory();

    // 添加光源以便能够看到STL模型
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(1, 1, 1);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight2.position.set(-1, -1, -1);
    scene.add(directionalLight2);

    // Create point cloud
    if (!pointCloud) {
      pointCloud = new THREE.Points(particlesGeometry, particlesMaterial);
      pointCloud.frustumCulled = true;
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
          Math.random(), // R
          Math.random(), // G
          Math.random() // B
        );
      }
      particlesGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(points, 3)
      );
      particlesGeometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(colors, 3)
      );
      particlesGeometry.attributes.position.needsUpdate = true;
      particlesGeometry.attributes.color.needsUpdate = true;
    };

    // Initialize default waveform
    // createDebugPointCloud();
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
    // const fpsCounter = new FPSCounter();

    // 创建轨迹曲线并保存引用
    // const { curve } = createTrajectory();

    // 动画参数
    let progress = 0; // 轨迹进度，0-1之间
    const speed = 0.00005; // 移动速度

    // 相机跟随参数
    const cameraOffset = new THREE.Vector3(0, 5, -10); // 相机相对于模型的偏移量

    fpsController.start((deltaTime, frameCount) => {
      stats.begin();

      // const currentFPS = fpsCounter.update();

      // 更新STL模型位置和相机位置
      /*  if (stlModelRef.current && curve) {
        // 更新进度
        progress += speed * deltaTime;
        if (progress > 1) progress = 0; // 循环移动

        // 获取当前轨迹点位置
        const position = curve.getPointAt(progress);

        // 更新模型位置
        stlModelRef.current.position.copy(position);

        // 计算切线方向（使模型朝向运动方向）
        const tangent = curve.getTangentAt(progress);
        const lookAtPoint = new THREE.Vector3(
          position.x + tangent.x,
          position.y + tangent.y,
          position.z + tangent.z
        );
        stlModelRef.current.lookAt(lookAtPoint);

        // // 更新相机位置，使其跟随模型
        // // 创建一个基于模型朝向的本地坐标系
        // const modelDirection = new THREE.Vector3().subVectors(lookAtPoint, position).normalize();
        // const modelRight = new THREE.Vector3(0, 1, 0).cross(modelDirection).normalize();
        // const modelUp = new THREE.Vector3().crossVectors(modelDirection, modelRight).normalize();

        // // 计算相机位置（模型后方偏上）
        // const cameraPosition = new THREE.Vector3()
        //   .copy(position)
        //   .add(modelDirection.clone().multiplyScalar(-cameraOffset.z)) // 后方
        //   .add(modelUp.clone().multiplyScalar(cameraOffset.y)); // 上方

        // // 更新相机位置和朝向
        // camera.position.copy(cameraPosition);
        // camera.lookAt(position); // 相机始终看向模型
      } */

      // Update debug information
      setDebugInfo({
        fps: 0,
        pointCount: particlesGeometry.attributes.position?.count,
        isWorkerSupported: isWorkerSupported(),
        isWorkerLoaded: isWorkerLoaded,
        decodedWith: decodedWith,
        cameraPosition: {
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z,
        },
        controlsTarget: {
          x: controls.target.x,
          y: controls.target.y,
          z: controls.target.z,
        },
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
        if (viewerRef.current.contains(stats.dom)) {
          viewerRef.current.removeChild(stats.dom);
        }
      }
      scene.clear();
      particlesGeometry.dispose();
      particlesMaterial.dispose();
    };
  }, [stlPath]);

  const renderPoints = (points: any, colors: any) => {
    if (points.length === 0) {
      console.warn("No valid points found in point cloud");
      return;
    }

    particlesGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(points, 3)
    );
    particlesGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, 3)
    );

    particlesGeometry.attributes.position.needsUpdate = true;
    particlesGeometry.attributes.color.needsUpdate = true;
  };
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
                b: (rgbInt & 0xff) / 255,
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

  const isWorkerSupported = (): boolean => {
    return typeof window.Worker !== "undefined";
  };

  return (
    <div className="pointcloud-container">
      {showDebugPanel && <DebugPanel debugInfo={debugInfo} />}
      <div id={viewerId} ref={viewerRef} />
    </div>
  );
};

export default PointCloud;
function decode64(
  data: any,
  buffer: any,
  point_step: any,
  pointRatio: any
): any {
  throw new Error("Function not implemented.");
}
