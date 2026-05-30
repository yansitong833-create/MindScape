// 生成塔形剪影 PNG → MindScape/assets/tower.png
// 纯 Node.js + zlib，零外部依赖
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const W = 512;
const H = 512;

// ── CRC32 查表实现 ──
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[i] = c;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// ── PNG chunk 构建器 ──
function chunk(type, data) {
  const typeLen = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeLen, data])), 0);
  return Buffer.concat([len, typeLen, data, crc]);
}

// ── 绘制塔形 ──
const rgba = Buffer.alloc(W * H * 4, 0); // 全透明初始

function setPixel(x, y, r, g, b, a) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 4;
  rgba[i] = r;
  rgba[i + 1] = g;
  rgba[i + 2] = b;
  rgba[i + 3] = a;
}

function fillRect(rx, ry, rw, rh, r, g, b, a) {
  for (let dy = 0; dy < rh; dy++) {
    for (let dx = 0; dx < rw; dx++) {
      setPixel(rx + dx, ry + dy, r, g, b, a);
    }
  }
}

// 颜色：暖白 / 象牙色
const R = 240, G = 230, B = 210, A = 255;

// 底座 (宽)
fillRect(156, 400, 200, 30, R, G, B, A);
fillRect(176, 370, 160, 30, R, G, B, A);

// 塔身主体
fillRect(186, 160, 140, 210, R, G, B, A);

// 塔顶 (三角)
for (let dy = 0; dy < 100; dy++) {
  const rowW = Math.round(140 * (1 - dy / 100));
  const sx = 256 - Math.floor(rowW / 2);
  for (let dx = 0; dx < rowW; dx++) {
    setPixel(sx + dx, 160 - dy, R, G, B, A);
  }
}

// 尖顶装饰
fillRect(250, 56, 12, 10, R, G, B, A);

// 城门
fillRect(236, 360, 40, 50, 40, 30, 20, A);
// 城门拱形顶部
for (let dy = 0; dy < 16; dy++) {
  const arcW = Math.round(40 * (1 - dy / 16));
  const sx = 256 - Math.floor(arcW / 2);
  for (let dx = 0; dx < arcW; dx++) {
    setPixel(sx + dx, 360 - dy, 40, 30, 20, A);
  }
}

// 窗户 (左)
fillRect(214, 200, 22, 30, 60, 50, 30, A);
// 窗户 (右)
fillRect(276, 200, 22, 30, 60, 50, 30, A);
// 窗户 (中上)
fillRect(245, 250, 22, 30, 60, 50, 30, A);

// 城垛 (顶部两侧)
for (let bx = 186; bx < 326; bx += 24) {
  fillRect(bx, 148, 14, 16, R, G, B, A);
}

// ── 构建原始过滤数据 (每行前加 Filter None = 0x00) ──
const rawRows = Buffer.alloc(H * (1 + W * 4), 0);
for (let y = 0; y < H; y++) {
  const outOff = y * (1 + W * 4);
  rawRows[outOff] = 0x00; // Filter: None
  rgba.copy(rawRows, outOff + 1, y * W * 4, (y + 1) * W * 4);
}

// ── zlib 压缩 → IDAT ──
const idatData = zlib.deflateSync(rawRows);

// ── 组装 PNG ──
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const ihdrData = Buffer.alloc(13);
ihdrData.writeUInt32BE(W, 0);   // width
ihdrData.writeUInt32BE(H, 4);   // height
ihdrData[8] = 8;                 // bit depth
ihdrData[9] = 6;                 // color type: RGBA
ihdrData[10] = 0;                // compression
ihdrData[11] = 0;                // filter
ihdrData[12] = 0;                // interlace

const png = Buffer.concat([
  signature,
  chunk("IHDR", ihdrData),
  chunk("IDAT", idatData),
  chunk("IEND", Buffer.alloc(0)),
]);

const outDir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, "..", "assets");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "tower.png");
fs.writeFileSync(outPath, png);
console.log(`✔ tower.png → ${outPath} (${(png.length / 1024).toFixed(1)} KB)`);
