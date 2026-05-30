import type { ParticlePresetKey } from './presets';

/** 与 h5/particle-cloud/main.js drawPresetToCanvas 一致 */
export const drawPresetToCanvas = (
  key: ParticlePresetKey,
  ctx: CanvasRenderingContext2D | any,
  w: number,
  h: number,
) => {
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(w / 512, h / 512);
  ctx.translate(-256, -256);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = '#000000';

  if (key === 'tower') {
    ctx.fillRect(170, 120, 172, 320);
    ctx.fillRect(130, 400, 252, 60);
    ctx.beginPath();
    ctx.moveTo(256, 60);
    ctx.lineTo(190, 120);
    ctx.lineTo(322, 120);
    ctx.closePath();
    ctx.fill();
    ctx.clearRect(220, 180, 72, 72);
    ctx.clearRect(220, 280, 72, 72);
  } else if (key === 'ferris_wheel') {
    ctx.beginPath();
    ctx.arc(256, 230, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.clearRect(0, 0, 512, 512);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(256, 230, 150, 0, Math.PI * 2);
    ctx.lineWidth = 26;
    ctx.strokeStyle = '#000000';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(256, 230, 22, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 10; i += 1) {
      const a = i * ((Math.PI * 2) / 10);
      ctx.beginPath();
      ctx.moveTo(256, 230);
      ctx.lineTo(256 + Math.cos(a) * 150, 230 + Math.sin(a) * 150);
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#000000';
      ctx.stroke();
    }
    ctx.fillRect(140, 410, 232, 28);
    ctx.fillRect(170, 438, 172, 16);
  } else {
    ctx.beginPath();
    ctx.ellipse(256, 350, 85, 100, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(256, 210, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(185, 150);
    ctx.lineTo(135, 50);
    ctx.lineTo(225, 120);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(327, 150);
    ctx.lineTo(377, 50);
    ctx.lineTo(287, 120);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(226, 200, 15, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(286, 200, 15, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(256, 228);
    ctx.lineTo(248, 240);
    ctx.lineTo(264, 240);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
};

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** 与 Samples/H5 一致：512 画布、step=8、阈值 128、种子抖动 */
export const buildTargetsFromPresetDraw = (
  presetKey: ParticlePresetKey,
  seed: number,
  ctx: CanvasRenderingContext2D | any,
  canvas: { width: number; height: number },
): Float32Array => {
  const size = 512;
  canvas.width = size;
  canvas.height = size;
  drawPresetToCanvas(presetKey, ctx, size, size);

  const imgData = ctx.getImageData(0, 0, size, size);
  const data: Uint8ClampedArray = imgData.data;
  const step = 8;
  const brightnessThreshold = 128;
  const rnd = mulberry32(seed);
  const halfW = 256;
  const halfH = 256;
  const arr: number[] = [];

  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const idx = (y * size + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      const brightness = (r + g + b) / 3;
      if (brightness < brightnessThreshold && a > 128) {
        const vx = (x - halfW) * 0.05 + (rnd() - 0.5) * 0.2;
        const vy = -(y - halfH) * 0.05 + (rnd() - 0.5) * 0.2;
        const vz = (rnd() - 0.5) * 1.5;
        arr.push(vx, vy, vz);
      }
    }
  }

  if (arr.length >= 9) return new Float32Array(arr);

  const fallback: number[] = [];
  for (let i = 0; i < 3000; i += 1) {
    fallback.push((rnd() - 0.5) * 24);
  }
  return new Float32Array(fallback);
};
