/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */
declare const self: DedicatedWorkerGlobalScope;

const parsePointCloud = (msg: any) => {
  const buffer = new Uint8Array(msg.data).buffer;
  const dataView = new DataView(buffer);

  const points: number[] = [];
  const colors: number[] = [];

  for (let i = 0; i < msg.width; i++) {
    const pointOffset = i * msg.point_step;

    msg.fields.forEach((field: any) => {
      const byteOffset = pointOffset + field.offset;
      const name = field.name;

      switch (field.datatype) {
        case 7:  // FLOAT32 (x/y/z) // UINT32 (rgb)
          if (name === 'x' || name === 'y' || name === 'z') {
            points.push(dataView.getFloat32(byteOffset, !msg.is_bigendian));
          } else if (name === 'rgb') {
            const rgbInt = dataView.getUint32(byteOffset, !msg.is_bigendian);
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
  }

  return {
    points,
    colors
  };
};

self.onmessage = (e: MessageEvent) => {
  const result = parsePointCloud(e.data);
  self.postMessage(result);
};

self.postMessage({
  type: 'READY',
});

export { }; 