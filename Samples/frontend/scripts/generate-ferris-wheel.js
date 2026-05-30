// 生成摩天轮剪影 PNG → MindScape/assets/ferris_wheel.png
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const W = 512, H = 512;

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[i] = c;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const l = Buffer.alloc(4); l.writeUInt32BE(data.length, 0);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([l, t, data, c]);
}

const rgba = Buffer.alloc(W * H * 4, 0);
function setPixel(x, y, r, g, b, a) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 4;
  rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = a;
}
function fillCircle(cx, cy, rad, R, G, B, A) {
  for (let dy = -rad; dy <= rad; dy++)
    for (let dx = -rad; dx <= rad; dx++)
      if (dx * dx + dy * dy <= rad * rad) setPixel(cx + dx, cy + dy, R, G, B, A);
}
// 空心圆环
function strokeCircle(cx, cy, rad, thickness, R, G, B, A) {
  for (let dy = -rad; dy <= rad; dy++)
    for (let dx = -rad; dx <= rad; dx++) {
      const d2 = dx * dx + dy * dy;
      if (d2 <= rad * rad && d2 >= (rad - thickness) * (rad - thickness))
        setPixel(cx + dx, cy + dy, R, G, B, A);
    }
}
function fillRect(rx, ry, rw, rh, R, G, B, A) {
  for (let dy = 0; dy < rh; dy++)
    for (let dx = 0; dx < rw; dx++)
      setPixel(rx + dx, ry + dy, R, G, B, A);
}

const C = 200, M = 180, Y = 120; // 暖铜色
const A = 255;

const CX = 256, CY = 200, RR = 170; // 轮心 + 半径

// 外圈 (双重环)
strokeCircle(CX, CY, RR, 7, C, M, Y, A);
strokeCircle(CX, CY, RR - 14, 4, 220, 200, 150, A);

// 内圈
strokeCircle(CX, CY, 30, 5, C, M, Y, A);

// 12 根辐条 + 吊舱
for (let i = 0; i < 12; i++) {
  const angle = (i / 12) * Math.PI * 2;
  const sx = CX + Math.cos(angle) * 30;
  const sy = CY + Math.sin(angle) * 30;
  const ex = CX + Math.cos(angle) * (RR - 7);
  const ey = CY + Math.sin(angle) * (RR - 7);

  // 辐条 (Bresenham 粗线)
  const len = Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2);
  const steps = Math.ceil(len);
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const px = Math.round(sx + (ex - sx) * t);
    const py = Math.round(sy + (ey - sy) * t);
    fillCircle(px, py, 2, C, M, Y, A);
  }

  // 吊舱
  const cx = CX + Math.cos(angle) * (RR - 4);
  const cy = CY + Math.sin(angle) * (RR - 4);
  fillCircle(cx, cy, 10, 230, 210, 160, A);
  // 吊舱小窗
  fillCircle(cx, cy - 2, 5, 100, 80, 50, A);
}

// 转轴
fillCircle(CX, CY, 14, 240, 220, 170, A);
fillCircle(CX, CY, 8, 180, 150, 100, A);

// A 型支架
const baseY = 420;
const legLX = CX - 80, legRX = CX + 80;
for (let t = 0; t <= 1; t += 0.002) {
  // 左腿
  const lx = Math.round(CX + (legLX - CX) * t);
  const ly = Math.round(CY + (baseY - CY) * t);
  fillCircle(lx, ly, 5, C, M, Y, A);
  // 右腿
  const rx = Math.round(CX + (legRX - CX) * t);
  const ry = Math.round(CY + (baseY - CY) * t);
  fillCircle(rx, ry, 5, C, M, Y, A);
}
// 横梁
for (let t = 0; t <= 1; t += 0.01) {
  const bx = Math.round(legLX + (legRX - legLX) * t);
  const by = Math.round(CY + 80 + (baseY - CY - 80) * 0.4);
  fillCircle(bx, by, 4, C, M, Y, A);
}

// 底座平台
fillRect(CX - 110, baseY - 5, 220, 18, C, M, Y, A);
fillRect(CX - 90, baseY + 13, 180, 10, C, M, Y, A);
// 底座装饰灯
for (let i = 0; i < 11; i++) {
  fillCircle(CX - 90 + i * 18, baseY + 4, 5, 255, 240, 200, A);
}

// PNG encode
const rawRows = Buffer.alloc(H * (1 + W * 4), 0);
for (let y = 0; y < H; y++) {
  rawRows[y * (1 + W * 4)] = 0x00;
  rgba.copy(rawRows, y * (1 + W * 4) + 1, y * W * 4, (y + 1) * W * 4);
}
const idatData = zlib.deflateSync(rawRows);
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdrData = Buffer.alloc(13);
ihdrData.writeUInt32BE(W, 0); ihdrData.writeUInt32BE(H, 4);
ihdrData[8] = 8; ihdrData[9] = 6; ihdrData[10] = 0; ihdrData[11] = 0; ihdrData[12] = 0;
const png = Buffer.concat([signature, chunk("IHDR", ihdrData), chunk("IDAT", idatData), chunk("IEND", Buffer.alloc(0))]);
fs.writeFileSync(path.join(__dirname, "..", "assets", "ferris_wheel.png"), png);
console.log(`✔ ferris_wheel.png → ${(png.length / 1024).toFixed(1)} KB`);
