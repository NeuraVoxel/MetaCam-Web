declare module 'ros3d' {
  export interface ViewerOptions {
    divID: string;
    width: number;
    height: number;
    antialias?: boolean;
    background?: string;
    cameraPose?: any;
    alpha?: number;
    [key: string]: any;
  }

  export interface PointCloud2Options {
    ros: any;
    topic: string;
    tfClient?: any;
    rootObject?: any;
    material?: {
      size?: number;
      color?: number;
    };
    [key: string]: any;
  }

  export class Viewer {
    constructor(options: ViewerOptions);
    addObject(object: any): void;
    scene: any;
  }

  export class Grid {
    constructor(options?: any);
  }

  export class Axes {
    constructor(options?: any);
  }

  export class PointCloud2 {
    handleMessage: (message: any) => void;
    processMessage: (msg: any)  => void;
    constructor(options: PointCloud2Options);
  }
}

declare module 'roslib' {
  export interface RosOptions {
    url: string;
  }

  export interface TFClientOptions {
    ros: Ros;
    fixedFrame?: string;
    angularThres?: number;
    transThres?: number;
  }

  export interface TopicOptions {
    ros: Ros;
    name: string;
    messageType: string;
  }

  export class Ros {
    constructor(options: RosOptions);
    on(event: string, callback: (event?: any) => void): void;
    close(): void;
  }

  export class TFClient {
    constructor(options: TFClientOptions);
  }

  export class Topic {
    constructor(options: TopicOptions);
    subscribe(callback: (message: any) => void): void;
    unsubscribe(): void;
  }
} 