// 生成猫形剪影 PNG → MindScape/assets/cat.png
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
  const typeLen = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([typeLen, data])), 0);
  return Buffer.concat([len, typeLen, data, crc]);
}

const rgba = Buffer.alloc(W * H * 4, 0);
function setPixel(x, y, r, g, b, a) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 4;
  rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = a;
}
function fillCircle(cx, cy, r, R, G, B, A) {
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++)
      if (dx * dx + dy * dy <= r * r) setPixel(cx + dx, cy + dy, R, G, B, A);
}
function fillEllipse(cx, cy, rx, ry, R, G, B, A) {
  for (let dy = -ry; dy <= ry; dy++)
    for (let dx = -rx; dx <= rx; dx++)
      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) setPixel(cx + dx, cy + dy, R, G, B, A);
}
function fillTriangle(x1, y1, x2, y2, x3, y3, R, G, B, A) {
  const minX = Math.max(0, Math.min(x1, x2, x3) - 1);
  const maxX = Math.min(W - 1, Math.max(x1, x2, x3) + 1);
  const minY = Math.max(0, Math.min(y1, y2, y3) - 1);
  const maxY = Math.min(H - 1, Math.max(y1, y2, y3) + 1);
  const area = (x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1);
  const absArea = Math.abs(area);
  for (let y = minY; y <= maxY; y++)
    for (let x = minX; x <= maxX; x++) {
      const a = Math.abs((x2 - x1) * (y - y1) - (x - x1) * (y2 - y1));
      const b = Math.abs((x3 - x2) * (y - y2) - (x - x2) * (y3 - y2));
      const c = Math.abs((x1 - x3) * (y - y3) - (x - x3) * (y1 - y3));
      if (Math.abs(a + b + c - absArea) < 2) setPixel(x, y, R, G, B, A);
    }
}

const R = 255, G = 220, B = 180, A = 255; // 暖橘猫色
const DR = 240, DG = 180, DB = 140;          // 深色斑纹
const PR = 255, PG = 180, PB = 180;          // 粉色 (耳朵内)

// 身体 (椭圆)
fillEllipse(256, 350, 85, 100, R, G, B, A);

// 头 (大圆)
fillCircle(256, 210, 90, R, G, B, A);

// 左耳 (三角)
fillTriangle(185, 150, 135, 50, 225, 120, R, G, B, A);
fillTriangle(193, 140, 152, 70, 215, 125, PR, PG, PB, 200); // 内耳

// 右耳 (三角)
fillTriangle(327, 150, 377, 50, 287, 120, R, G, B, A);
fillTriangle(319, 140, 360, 70, 297, 125, PR, PG, PB, 200); // 内耳

// 眼睛
fillEllipse(226, 200, 15, 18, 60, 60, 50, A);
fillEllipse(286, 200, 15, 18, 60, 60, 50, A);
fillCircle(226, 198, 7, 255, 255, 255, A);  // 高光
fillCircle(286, 198, 7, 255, 255, 255, A);

// 鼻子
fillTriangle(256, 228, 248, 240, 264, 240, PR, PG, PB, A);

// 胡须 (短线)
for (let w = 0; w < 40; w += 4) {
  for (let t = 0; t < 3; t++) {
    setPixel(175 + w, 220 + t, 180, 150, 120, 200);
    setPixel(175 + w, 235 + t, 180, 150, 120, 200);
    setPixel(295 + w, 220 + t, 180, 150, 120, 200);
    setPixel(295 + w, 235 + t, 180, 150, 120, 200);
  }
}

// 尾巴 (从身体左下弯曲)
for (let t = 0; t < 80; t++) {
  const angle = 2.2 - t * 0.025;
  const tx = 180 + Math.cos(angle) * (50 + t * 0.8);
  const ty = 370 + Math.sin(angle) * (30 + t * 0.6);
  for (let r = 0; r < 8; r++) {
    fillCircle(Math.round(tx), Math.round(ty), 10 - r * 0.3, R, G, B, A);
  }
}

// 前爪
fillEllipse(216, 440, 22, 16, R, G, B, A);
fillEllipse(296, 440, 22, 16, R, G, B, A);

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
fs.writeFileSync(path.join(__dirname, "..", "assets", "cat.png"), png);
console.log(`✔ cat.png → ${(png.length / 1024).toFixed(1)} KB`);
