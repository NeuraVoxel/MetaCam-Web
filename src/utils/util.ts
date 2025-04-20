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

const getCurrentTimestamp = () => {
  const now = new Date();
  // 获取Unix时间戳(毫秒)
  const timestamp = now.getTime();
  return timestamp.toString();
}

export { decode64, isWorkerSupported, getCurrentTimestamp };