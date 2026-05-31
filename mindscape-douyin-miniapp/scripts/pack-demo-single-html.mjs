/**
 * 导出 Demo（虚拟创作平台：全内联 HTML，无外链 js/css）
 *
 * 用法：npm run pack:demo-html
 *       npm run pack:demo-html -- --external   # 仅调试：外链 js zip（平台预览易白屏）
 *
 * 产出：
 *   release/mindscape-demo-vcreate-inline.zip  ← 推荐上传（仅 index.html）
 *   release/mindscape-demo-vcreate.html         ← 可直接上传的同源单文件
 *   release/mindscape-demo.html                 ← 与 vcreate.html 内容一致（别名）
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import {
  sanitizeJsForPlatform,
  assertFullHtmlSafe,
  findBlockedInSource,
} from './platform-script-sanitize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist-demo');
const releaseDir = path.join(root, 'release');
const outVcreateHtml = path.join(releaseDir, 'mindscape-demo-vcreate.html');
const outAliasHtml = path.join(releaseDir, 'mindscape-demo.html');
const outInlineZip = path.join(releaseDir, 'mindscape-demo-vcreate-inline.zip');
const inlineZipDir = path.join(releaseDir, 'mindscape-demo-vcreate-inline');
const legacyZip = path.join(releaseDir, 'mindscape-demo-vcreate.zip');
const legacyDir = path.join(releaseDir, 'mindscape-demo-vcreate');

const args = process.argv.slice(2);
const skipBuild = args.includes('--skip-build');
const buildExternal = args.includes('--external');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

function resolveWorkAppId() {
  const fromEnv = (process.env.TARO_APP_ID || process.env.VCREATE_WORK_APP_ID || '').trim();
  if (fromEnv) return fromEnv;
  const tt = path.join(root, 'project.tt.json');
  if (fs.existsSync(tt)) return readJson(tt).appid || 'touristappid';
  return 'touristappid';
}

function runBuild() {
  console.log('[pack:demo-html] 构建 H5（单 chunk）…');
  execSync('npm run particle:pack-static && taro build --type h5', {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      DEMO_SINGLE_HTML: '1',
      TARO_H5_PUBLIC_PATH: './',
      TARO_OUTPUT_DIR: 'dist-demo',
    },
  });
}

function escapeScript(js) {
  return js.replace(/<\/script/gi, '<\\/script');
}

function sortJsFiles(files) {
  return files.sort((a, b) => {
    const score = (n) => {
      if (/^bundle\./.test(n)) return 0;
      if (/^app\./.test(n)) return 2;
      return 1;
    };
    return score(a) - score(b) || a.localeCompare(b);
  });
}

function loadSanitizedChunks() {
  const jsDir = path.join(distDir, 'js');
  const jsFiles = sortJsFiles(
    fs.readdirSync(jsDir).filter((f) => f.endsWith('.js') && !f.includes('.LICENSE')),
  );
  const chunks = {};
  for (const f of jsFiles) {
    chunks[f] = sanitizeJsForPlatform(fs.readFileSync(path.join(jsDir, f), 'utf8'));
    const left = findBlockedInSource(chunks[f]);
    if (left.length) {
      throw new Error(`js/${f} 净化后仍含: ${left.join(', ')}`);
    }
  }
  return { jsFiles, chunks };
}

function readCssText() {
  const cssDir = path.join(distDir, 'css');
  if (!fs.existsSync(cssDir)) return '';
  return fs
    .readdirSync(cssDir)
    .filter((f) => f.endsWith('.css'))
    .map((f) => fs.readFileSync(path.join(cssDir, f), 'utf8'))
    .join('\n');
}

const BOOT_INLINE = `<script type="text/javascript">
(function () {
  window.__webpack_public_path__ = '';
  var home = '#/pages/diary/index';
  if (!location.hash || location.hash === '#' || location.hash === '#/') {
    location.replace(location.href.split('#')[0] + home);
  }
})();
</script>`;

const REM_INLINE = `<script type="text/javascript">!function(n){function f(){var e=n.document.documentElement,r=e.getBoundingClientRect(),width=r.width,height=r.height,arr=[width,height].filter(function(value){return Boolean(value)}),w=Math.min.apply(Math,arr),x=22*w/375;e.style.fontSize=x>=40?"40px":x<=20?"20px":x+"px"}; n.addEventListener("resize",(function(){f()})),f()}(window);</script>`;

/** 虚拟创作上传页：CSS + JS 全内联，无 defer / 无外链 */
function buildVcreateInlineHtml({ jsFiles, chunks, cssText, workAppId }) {
  const scripts = jsFiles.map((f) => `/* ${f} */\n${escapeScript(chunks[f])}`).join('\n;\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
  <meta name="format-detection" content="telephone=no,address=no" />
  <title>MindScape · Demo</title>
  <meta name="mindscape-work-appid" content="${workAppId}" />
  <style>
    html, body, #app { margin: 0; padding: 0; width: 100%; height: 100%; background: #f9f6f0; }
    ${cssText}
  </style>
${BOOT_INLINE}
</head>
<body>
  <div id="app"></div>
${REM_INLINE}
  <script type="text/javascript">
${scripts}
  </script>
</body>
</html>`;
}

function writeInlineArtifacts(html) {
  assertFullHtmlSafe(html, 'mindscape-demo-vcreate');
  fs.mkdirSync(releaseDir, { recursive: true });

  fs.writeFileSync(outVcreateHtml, html, 'utf8');
  fs.writeFileSync(outAliasHtml, html, 'utf8');

  fs.rmSync(inlineZipDir, { recursive: true, force: true });
  fs.mkdirSync(inlineZipDir, { recursive: true });
  fs.writeFileSync(path.join(inlineZipDir, 'index.html'), html, 'utf8');

  if (fs.existsSync(outInlineZip)) fs.unlinkSync(outInlineZip);
  execSync(`tar -a -cf "${outInlineZip}" -C "${inlineZipDir}" .`, { stdio: 'inherit' });
}

/** 仅 --external：外链 js（平台预览易白屏，勿上传） */
function buildExternalZip(jsFiles, chunks, workAppId) {
  fs.rmSync(legacyDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(legacyDir, 'js'), { recursive: true });

  for (const f of jsFiles) {
    fs.writeFileSync(path.join(legacyDir, 'js', f), chunks[f], 'utf8');
  }
  if (fs.existsSync(path.join(distDir, 'css'))) {
    fs.mkdirSync(path.join(legacyDir, 'css'), { recursive: true });
    for (const f of fs.readdirSync(path.join(distDir, 'css')).filter((x) => x.endsWith('.css'))) {
      fs.copyFileSync(path.join(distDir, 'css', f), path.join(legacyDir, 'css', f));
    }
  }

  const scriptTags = jsFiles.map((f) => `  <script defer src="./js/${f}"></script>`).join('\n');
  const cssLink = fs.existsSync(path.join(legacyDir, 'css'))
    ? '  <link rel="stylesheet" href="./css/bundle.css" />\n'
    : '';

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
  <meta name="format-detection" content="telephone=no,address=no" />
  <title>MindScape · Demo</title>
  <meta name="mindscape-work-appid" content="${workAppId}" />
${cssLink}${BOOT_INLINE}
</head>
<body>
  <div id="app"></div>
${REM_INLINE}
${scriptTags}
</body>
</html>`;

  assertFullHtmlSafe(html, 'mindscape-demo-vcreate-external/index.html');
  fs.writeFileSync(path.join(legacyDir, 'index.html'), html, 'utf8');

  if (fs.existsSync(legacyZip)) fs.unlinkSync(legacyZip);
  execSync(`tar -a -cf "${legacyZip}" -C "${legacyDir}" .`, { stdio: 'inherit' });
}

function main() {
  if (!skipBuild) runBuild();
  if (!fs.existsSync(distDir)) throw new Error(`缺少 ${distDir}，请先构建`);

  const workAppId = resolveWorkAppId();
  const { jsFiles, chunks } = loadSanitizedChunks();
  const cssText = readCssText();
  const html = buildVcreateInlineHtml({ jsFiles, chunks, cssText, workAppId });

  writeInlineArtifacts(html);

  if (buildExternal) {
    buildExternalZip(jsFiles, chunks, workAppId);
  }

  const zipMb = (fs.statSync(outInlineZip).size / 1024 / 1024).toFixed(2);
  const htmlMb = (fs.statSync(outVcreateHtml).size / 1024 / 1024).toFixed(2);

  console.log('');
  console.log('[pack:demo-html] 通过平台 script 安全校验（全内联）');
  console.log('[pack:demo-html] 推荐上传虚拟创作（二选一，内容相同）:');
  console.log(`  ${outInlineZip}  (${zipMb} MB，zip 内仅 index.html)`);
  console.log(`  ${outVcreateHtml}  (${htmlMb} MB)`);
  console.log(`  别名: ${outAliasHtml}`);
  console.log('[pack:demo-html] 勿上传含 js/ 外链的旧包（平台预览易白屏）');
  if (buildExternal) {
    const extMb = (fs.statSync(legacyZip).size / 1024 / 1024).toFixed(2);
    console.log('[pack:demo-html] --external 调试包（勿上传）:');
    console.log(`  ${legacyZip}  (${extMb} MB)`);
  }
}

main();
