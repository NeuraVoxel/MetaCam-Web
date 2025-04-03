
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
  
    export class ServiceRequest {
      constructor(values: any);
    }
  
    export interface ServiceOptions {
      ros: Ros;
      name: string;
      serviceType: string;
    }
  
    export class Service {
      constructor(options: ServiceOptions);
      
      callService(
        request: any, 
        callback: (response: any) => void, 
        failedCallback?: (error: any) => void
      ): void;
    }
  } 