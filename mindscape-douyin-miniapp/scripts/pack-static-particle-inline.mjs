/**
 * 将 data-single 粒子页压缩为单 bundle，gzip 后写入 staticParticleInline.generated.ts
 * 运行：npm run particle:pack-static
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const staticDir = path.join(root, 'h5', 'static');
const importedDir = path.join(staticDir, 'imported');
const libsDir = path.join(root, 'h5', 'libs');
const outFile = path.join(root, 'src', 'plugins', 'particle-cloud', 'staticParticleInline.generated.ts');
const manifestPath = path.join(root, 'src', 'data', 'staticParticleManifest.ts');

const IMAGE_MAX = 256;
const JPEG_QUALITY = 72;

/** 保留源图 data URL、不做 sharp 缩略（逗号分隔日期，默认含今日 2026-05-31） */
const RAW_IMAGE_DAYS = new Set(
  (process.env.PARTICLE_RAW_IMAGE_DAYS || '2026-05-31')
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean),
);

const SHELL_STYLE = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #F9F6F0; }
    #mindscape-canvas { display: block; width: 100vw; height: 100vh; }
    .particle-meta {
      position: fixed; left: 24px; bottom: 24px; max-width: min(420px, calc(100vw - 48px));
      padding: 16px 20px; border-radius: 12px;
      background: rgba(249, 246, 240, 0.82); backdrop-filter: blur(8px);
      border: 1px solid rgba(0,0,0,0.06); color: #4A4A4A;
      font: 14px/1.6 "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      pointer-events: none;
    }
    .particle-meta .date { font-size: 12px; letter-spacing: 0.08em; color: #8A8A8A; margin-bottom: 6px; }
    .particle-meta .dot {
      display: inline-block; width: 10px; height: 10px; border-radius: 50%;
      margin-right: 8px; vertical-align: middle;
    }
    #month-index {
      position: fixed; inset: 0; overflow: auto; padding: 32px 24px 48px;
      background: #F9F6F0; font: 15px/1.7 "PingFang SC", "Microsoft YaHei", sans-serif;
    }
    #month-index h1 { font-size: 20px; font-weight: 500; margin-bottom: 8px; color: #333; }
    #month-index p { color: #777; margin-bottom: 20px; }
    #month-index a { color: #5B6EAE; text-decoration: none; display: block; padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.06); }
`;

const BOOT_SCRIPT = `
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
function showMonthIndex(){
  var keys=Object.keys(window.__MS_DAYS__).sort().reverse();
  var html='<div id="month-index"><h1>2026年5月 · 粒子云</h1><p>共 '+keys.length+' 条日记</p>';
  keys.forEach(function(k){
    var d=window.__MS_DAYS__[k];
    html+='<a href="#'+k+'">'+esc(d.label)+' — '+esc(d.content)+'</a>';
  });
  html+='</div>';
  document.body.innerHTML=html;
  document.body.style.overflow='auto';
}
function applyMeta(d){
  var meta=document.getElementById('particle-meta');
  if(!meta)return;
  meta.style.display='block';
  meta.querySelector('.date').textContent=d.date;
  var dot=meta.querySelector('.dot');
  dot.style.background=d.themeColor;
  meta.querySelector('.content').textContent=d.content;
}
function boot(){
  var raw=(location.hash||'').replace(/^#/,'');
  if(raw==='__month__'){showMonthIndex();return;}
  var key=raw||window.__MS_DEFAULT__;
  var d=window.__MS_DAYS__[key];
  if(!d){key=window.__MS_DEFAULT__;d=window.__MS_DAYS__[key];}
  document.getElementById('mindscape-canvas').style.display='block';
  var meta=document.getElementById('particle-meta');
  if(meta)meta.style.display='block';
  applyMeta(d);
  if(window.__MS_PARTICLE__)window.__MS_PARTICLE__.dispose&&window.__MS_PARTICLE__.dispose();
  window.__MS_PARTICLE__=MindScapeParticle.init({
    canvas:document.getElementById('mindscape-canvas'),
    imageUrl:d.imageUrl,
    themeColor:d.themeColor
  });
}
window.addEventListener('DOMContentLoaded',boot);
window.addEventListener('hashchange',boot);
`;

function escapeForTs(s) {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

function findSourceHtmlFiles() {
  const dir = fs.existsSync(importedDir) ? importedDir : staticDir;
  return fs
    .readdirSync(dir)
    .filter((f) => /^particle-\d{4}-\d{2}-\d{2}\.html$/.test(f))
    .sort()
    .map((f) => path.join(dir, f));
}

function parsePage(html, fileName) {
  const dateMatch = html.match(/<div class="date">([^<]*)</);
  const contentMatch = html.match(/<p><span class="dot"><\/span>([^<]*)</);
  const themeMatch = html.match(/themeColor:\s*"([^"]+)"/);
  const imgMatch = html.match(/imageUrl:\s*"(data:image[^"]+)"/);
  const date = dateMatch?.[1]?.trim() || fileName.replace(/^particle-|\.html$/g, '');
  return {
    key: date,
    date,
    label: date.slice(5).replace('-', '.'),
    content: contentMatch?.[1]?.trim() || '',
    themeColor: themeMatch?.[1] || '#A78BFA',
    imageDataUrl: imgMatch?.[1] || '',
  };
}

async function compressImage(dataUrl) {
  if (!dataUrl || !dataUrl.includes('base64,')) return dataUrl;
  const [, b64] = dataUrl.split('base64,');
  const buf = Buffer.from(b64, 'base64');
  const jpeg = await sharp(buf).resize(IMAGE_MAX, IMAGE_MAX, { fit: 'inside' }).jpeg({ quality: JPEG_QUALITY }).toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
}

function readLibs() {
  const threePath = path.join(libsDir, 'three.min.js');
  const gsapPath = path.join(libsDir, 'gsap.min.js');
  const engPath = path.join(importedDir, 'particle-engine-standalone.js');
  const altEng = path.join(staticDir, 'particle-engine-standalone.js');
  if (!fs.existsSync(threePath) || !fs.existsSync(gsapPath)) {
    throw new Error('缺少 h5/libs（请先 npm run import:data-single）');
  }
  const engFile = fs.existsSync(engPath) ? engPath : altEng;
  if (!fs.existsSync(engFile)) throw new Error('缺少 particle-engine-standalone.js');
  return {
    three: fs.readFileSync(threePath, 'utf8'),
    gsap: fs.readFileSync(gsapPath, 'utf8'),
    engine: fs.readFileSync(engFile, 'utf8'),
  };
}

function buildBundleHtml(days, libs) {
  const daysJson = JSON.stringify(days);
  const defaultKey = Object.keys(days).sort()[0];
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MindScape · 粒子云</title>
  <style>${SHELL_STYLE}</style>
</head>
<body>
  <canvas id="mindscape-canvas"></canvas>
  <div class="particle-meta" id="particle-meta">
    <div class="date"></div>
    <p><span class="dot"></span><span class="content"></span></p>
  </div>
  <script>${libs.three}</script>
  <script>${libs.gsap}</script>
  <script>${libs.engine}</script>
  <script>
  window.__MS_DAYS__=${daysJson};
  window.__MS_DEFAULT__=${JSON.stringify(defaultKey)};
  ${BOOT_SCRIPT}
  </script>
</body>
</html>`;
}

function collectManifestKeys() {
  if (!fs.existsSync(manifestPath)) return null;
  const src = fs.readFileSync(manifestPath, 'utf8');
  const keys = [];
  const re = /['"](day:[^'"]+|month:[^'"]+)['"]\s*:/g;
  let m;
  while ((m = re.exec(src)) !== null) keys.push(m[1]);
  return keys;
}

async function main() {
  const files = findSourceHtmlFiles();
  if (!files.length) {
    console.error('未找到 particle-YYYY-MM-DD.html，请先 npm run import:data-single');
    process.exit(1);
  }

  const libs = readLibs();
  const days = {};
  let totalImgBefore = 0;
  let totalImgAfter = 0;

  for (const full of files) {
    const html = fs.readFileSync(full, 'utf8');
    const parsed = parsePage(html, path.basename(full));
    totalImgBefore += parsed.imageDataUrl.length;
    if (RAW_IMAGE_DAYS.has(parsed.key)) {
      parsed.imageUrl = parsed.imageDataUrl;
    } else {
      parsed.imageUrl = await compressImage(parsed.imageDataUrl);
    }
    totalImgAfter += parsed.imageUrl.length;
    delete parsed.imageDataUrl;
    days[parsed.key] = {
      date: parsed.date,
      label: parsed.label,
      content: parsed.content,
      themeColor: parsed.themeColor,
      imageUrl: parsed.imageUrl,
    };
  }

  const bundleHtml = buildBundleHtml(days, libs);
  const gz = zlib.gzipSync(Buffer.from(bundleHtml, 'utf8'), { level: 9 });
  const gzipB64 = gz.toString('base64');
  const dayKeys = Object.keys(days).sort();
  const manifestKeys = collectManifestKeys() || dayKeys.map((d) => `day:${d}`);

  const ts = `/* eslint-disable */
/** 由 scripts/pack-static-particle-inline.mjs 生成，勿手改 */
export const STATIC_PARTICLE_BUNDLE_GZIP_B64 = \`${escapeForTs(gzipB64)}\`;

export const STATIC_PARTICLE_DAY_KEYS: readonly string[] = ${JSON.stringify(dayKeys)};

export const STATIC_PARTICLE_CACHE_KEYS: readonly string[] = ${JSON.stringify([
    'default',
    'month:2026-05',
    ...manifestKeys.filter((k) => k.startsWith('day:')),
  ])};
`;

  fs.writeFileSync(outFile, ts, 'utf8');

  const bundleOut = path.join(staticDir, 'particle-bundle.html');
  fs.writeFileSync(bundleOut, bundleHtml, 'utf8');

  const rawKb = (Buffer.byteLength(bundleHtml, 'utf8') / 1024).toFixed(0);
  const gzKb = (gz.length / 1024).toFixed(0);
  const outKb = (Buffer.byteLength(ts, 'utf8') / 1024).toFixed(0);
  console.log(`图像 ${(totalImgBefore / 1024 / 1024).toFixed(1)} MB → ${(totalImgAfter / 1024).toFixed(0)} KB`);
  console.log(`Bundle 原始 ${rawKb} KB，gzip ${gzKb} KB，写入 ${outFile}（${outKb} KB）`);
  console.log(`已导出 ${bundleOut}（供 h5:serve / HTTPS 部署，抖音 web-view 须 http(s)）`);
  console.log(`共 ${dayKeys.length} 天，cacheKey 使用 day:YYYY-MM-DD 或 month:2026-05（#__month__）`);
  if (RAW_IMAGE_DAYS.size) {
    console.log(`未压缩原图日期: ${[...RAW_IMAGE_DAYS].sort().join(', ')}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
