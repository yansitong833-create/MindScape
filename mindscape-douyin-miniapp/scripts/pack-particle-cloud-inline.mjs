/**
 * 将 h5/particle-cloud 打成单文件 HTML 模板，供开发态 data: WebView 使用（无外链、无 CDN）。
 * 运行：node scripts/pack-particle-cloud-inline.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const pcDir = path.join(root, 'h5', 'particle-cloud');
const outFile = path.join(root, 'src', 'components', 'ParticleCloudWebView', 'devInlineTemplate.generated.ts');

const CACHE_PLACEHOLDER = '__MS_CACHE_KEY__';
const TEXT_PLACEHOLDER = '__MS_INPUT_TEXT__';

function read(name) {
  const p = path.join(pcDir, name);
  if (!fs.existsSync(p)) {
    console.error(`缺少文件: ${p}\n请先执行: npm run h5:particle-cloud:libs`);
    process.exit(1);
  }
  return fs.readFileSync(p, 'utf8');
}

const three = read(path.join('libs', 'three.min.js'));
const gsap = read(path.join('libs', 'gsap.min.js'));
let main = read('main.js');

// 只替换 readPayload，保留 createStorage / storage（勿用跨函数贪婪正则）
main = main.replace(
  /function readPayload\(\) \{\s*const params[\s\S]*?\n  \}\n\n/,
  '',
);
main = main.replace(
  /const \{ cacheKey: CACHE_KEY, text: INPUT_TEXT \} = readPayload\(\);\n/,
  `const CACHE_KEY = ${JSON.stringify(CACHE_PLACEHOLDER)};\n  const INPUT_TEXT = ${JSON.stringify(TEXT_PLACEHOLDER)};\n`,
);

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"/>
<title>MindScape Particle Cloud (dev)</title>
<style>
html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#f9f6f0}
#wrap{width:100%;height:100%;position:relative}
canvas{width:100%;height:100%;display:block}
#err{display:none;position:absolute;inset:0;padding:24px;box-sizing:border-box;align-items:center;justify-content:center;text-align:center;font:14px/1.6 sans-serif;color:#4e5969;background:#f9f6f0}
#err.show{display:flex;flex-direction:column}
</style>
<script>${three}<\/script>
<script>${gsap}<\/script>
</head>
<body>
<div id="wrap"><canvas id="c"></canvas></div>
<div id="err"></div>
<script>${main}<\/script>
</body>
</html>`;

const escaped = html
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/\$\{/g, '\\${');

const ts = `/* eslint-disable */
/** 由 scripts/pack-particle-cloud-inline.mjs 生成，勿手改 */
export const PARTICLE_CLOUD_DEV_HTML_TEMPLATE = \`${escaped}\`;
`;

fs.writeFileSync(outFile, ts, 'utf8');
const kb = (Buffer.byteLength(ts, 'utf8') / 1024).toFixed(0);
console.log(`已写入 ${outFile} (${kb} KB)`);
