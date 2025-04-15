function decode64(
    data: any,
    buffer: any,
    point_step: any,
    pointRatio: any
  ): any {
    throw new Error("Function not implemented.");
  }

  const isWorkerSupported = (): boolean => {
    return typeof window.Worker !== "undefined";
  };

  export { decode64,isWorkerSupported };