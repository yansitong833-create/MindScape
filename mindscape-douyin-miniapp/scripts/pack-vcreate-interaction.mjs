/**
 * 抖音虚拟创作平台 · 互动场景包体
 * https://vcreate.douyin.com/console/interaction
 *
 * 平台在浏览器（Edge）中打开 zip 根目录 index.html，须为完整 H5 应用（含 JS/CSS），
 * 不能上传 Taro tt 小程序产物（app.json / .ttml）。
 *
 * 用法：
 *   npm run pack:vcreate
 *   npm run pack:vcreate -- --skip-build
 *   TARO_APP_ID=tt71b2070fee98df5021 npm run pack:vcreate
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, process.env.TARO_OUTPUT_DIR || 'dist-vcreate');
const releaseDir = path.join(root, 'release');

const args = process.argv.slice(2);
const skipBuild = args.includes('--skip-build');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

/** 虚拟创作平台「作品 ID」= 抖音小程序 AppID */
const resolveWorkAppId = () => {
  const fromEnv = (process.env.TARO_APP_ID || process.env.VCREATE_WORK_APP_ID || '').trim();
  if (fromEnv) return fromEnv;
  const tt = path.join(root, 'project.tt.json');
  if (fs.existsSync(tt)) return readJson(tt).appid || 'touristappid';
  return 'touristappid';
};

function runBuild() {
  console.log('[pack:vcreate] 生产构建 H5 (publicPath=./)...');
  execSync('npm run build:h5', {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      TARO_H5_PUBLIC_PATH: './',
      TARO_OUTPUT_DIR: 'dist-vcreate',
    },
  });
}

/** 平台用 project.config.json 绑定作品（AppID） */
function writePlatformConfig(appid) {
  const projectConfig = {
    miniprogramRoot: './',
    projectname: 'MindScape',
    description: 'MindScape 虚拟创作互动包',
    appid,
    compileType: 'miniprogram',
    setting: {
      urlCheck: false,
      es6: true,
      postcss: true,
      minified: true,
    },
  };
  fs.writeFileSync(
    path.join(distDir, 'project.config.json'),
    `${JSON.stringify(projectConfig, null, 2)}\n`,
    'utf8',
  );
  fs.writeFileSync(
    path.join(distDir, 'vcreate.meta.json'),
    `${JSON.stringify({ workId: appid, workAppId: appid, entry: 'index.html', type: 'h5-interaction' }, null, 2)}\n`,
    'utf8',
  );
}

/** 修补 index.html：作品 ID、hash 首页、资源基路径 */
function patchIndexHtml(appid) {
  const indexPath = path.join(distDir, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  if (!html.includes('mindscape-work-appid')) {
    html = html.replace(
      '<title>MindScape</title>',
      `<title>MindScape</title>\n    <meta name="mindscape-work-appid" content="${appid}" />`,
    );
  }

  if (!/<script[^>]*>\s*!function\(n\)/.test(html) && /!function\(n\)\{function f\(\)/.test(html)) {
    html = html.replace(
      /!function\(n\)\{function f\(\)[\s\S]*?\}\(window\);/,
      (m) => `<script type="text/javascript">${m}</script>`,
    );
  }

  const remClamp = `<script type="text/javascript">
(function(){var cap=22,floor=17;function c(){var el=document.documentElement,n=parseFloat(el.style.fontSize);if(!n||isNaN(n))return;if(n>cap)el.style.fontSize=cap+'px';else if(n<floor)el.style.fontSize=floor+'px';}window.addEventListener('resize',c);setTimeout(c,0);setTimeout(c,100);})();
</script>`;
  if (!html.includes('clampRem') && html.includes('!function(n){function f()')) {
    html = html.replace(
      /<script type="text\/javascript">!function\(n\)\{function f\(\)[\s\S]*?\}\(window\);<\/script>/,
      (m) => `${m}\n    ${remClamp}`,
    );
  }

  const boot = `<script type="text/javascript">
(function () {
  window.__MINDSCAPE_WORK_APP_ID__ = '${appid}';
  try {
    var p = location.pathname || '/';
    var dir = p.endsWith('/') ? p : p.replace(/\\/[^/]*$/, '/');
    if (!dir) dir = './';
    window.__webpack_public_path__ = dir;
  } catch (e) {}
  var home = '#/pages/diary/index';
  var hash = location.hash || '';
  if (!hash || hash === '#' || hash === '#/') {
    location.replace((location.pathname || '/') + (location.search || '') + home);
  }
})();
</script>`;

  html = html.replace(
    /<script type="text\/javascript">\s*\(function \(\) \{\s*window\.__MINDSCAPE_WORK_APP_ID__[\s\S]*?\}\)\(\);\s*<\/script>\s*/g,
    '',
  );
  if (!html.includes('__MINDSCAPE_WORK_APP_ID__')) {
    html = html.replace('</head>', `${boot}</head>`);
  }

  fs.writeFileSync(indexPath, html, 'utf8');
}

function copyParticleStatic() {
  const src = path.join(root, 'h5', 'static', 'particle-bundle.html');
  const destDir = path.join(distDir, 'static');
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, path.join(destDir, 'particle-bundle.html'));
}

function validateDist() {
  const indexPath = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    throw new Error('缺少 dist-vcreate/index.html，H5 构建失败');
  }
  const html = fs.readFileSync(indexPath, 'utf8');
  if (!html.includes('id="app"') && !html.includes("id='app'")) {
    throw new Error('index.html 缺少 #app 挂载点');
  }
  if (!/<script\s/i.test(html)) {
    throw new Error('index.html 未注入应用脚本，请检查 H5 构建');
  }
  const jsDir = path.join(distDir, 'js');
  if (!fs.existsSync(jsDir) || fs.readdirSync(jsDir).filter((f) => f.endsWith('.js')).length === 0) {
    throw new Error('缺少 js/ 目录或其中无 .js 文件');
  }
}

function zipDist(outZip) {
  fs.mkdirSync(releaseDir, { recursive: true });
  if (fs.existsSync(outZip)) fs.unlinkSync(outZip);
  execSync(
    `tar -a -cf "${outZip}" -C "${distDir}" --exclude="*.map" --exclude="*.md" --exclude="*.LICENSE.txt" .`,
    { stdio: 'inherit' },
  );
}

function main() {
  if (!skipBuild) runBuild();
  if (!fs.existsSync(distDir)) {
    throw new Error(`构建输出不存在: ${distDir}`);
  }

  const workAppId = resolveWorkAppId();
  if (workAppId === 'touristappid') {
    console.warn('[pack:vcreate] 警告: 未设置作品 AppID，请设置 TARO_APP_ID=你的作品ID');
  }

  writePlatformConfig(workAppId);
  patchIndexHtml(workAppId);
  copyParticleStatic();
  validateDist();

  if (!fs.existsSync(path.join(distDir, 'project.config.json'))) {
    throw new Error('缺少 project.config.json（作品 AppID 绑定）');
  }

  const pkg = readJson(path.join(root, 'package.json'));
  const version = pkg.version || '0.0.0';
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
  const zipName = `mindscape-vcreate-${version}-${stamp}.zip`;
  const outZip = path.join(releaseDir, zipName);

  zipDist(outZip);

  const manifest = {
    platform: 'vcreate.douyin.com/console/interaction',
    version,
    builtAt: new Date().toISOString(),
    workAppId,
    zipFile: zipName,
    zipBytes: fs.statSync(outZip).size,
    entry: 'index.html',
    publicPath: './',
    uploadUrl: 'https://vcreate.douyin.com/console/interaction',
    note: '作品 ID 须与 project.config.json 中 appid 一致',
  };

  fs.writeFileSync(path.join(releaseDir, `${zipName}.manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`);

  console.log('\n[pack:vcreate] 完成');
  console.log(`  作品 AppID: ${workAppId}`);
  console.log(`  zip: ${outZip}`);
  console.log(`  上传: https://vcreate.douyin.com/console/interaction`);
}

main();
