/**
 * 生产构建并打包为抖音开放平台可导入 / 可上传的 zip。
 *
 * 产物：release/mindscape-tt-<version>-<timestamp>.zip
 *  zip 根目录即小程序代码根（含 app.json、project.config.json），符合开发者工具导入结构。
 *
 * 用法：
 *   node scripts/pack-douyin-open-platform.mjs
 *   node scripts/pack-douyin-open-platform.mjs --skip-build
 *   TARO_APP_ID=ttxxxx npm run pack:tt
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, process.env.TARO_OUTPUT_DIR || 'dist');
const releaseDir = path.join(root, 'release');

const MAIN_PKG_LIMIT_BYTES = 4 * 1024 * 1024;

const args = process.argv.slice(2);
const skipBuild = args.includes('--skip-build');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

const UPLOAD_INDEX_HTML = path.join(root, 'h5', 'douyin-upload-entry', 'index.html');
const REQUIRED_ROOT = ['index.html', 'app.json', 'app.js', 'project.config.json'];
const REQUIRED_PAGE_SUFFIX = ['.js', '.json', '.ttml'];

function runBuild() {
  console.log('[pack:tt] 生产构建 (NODE_ENV=production, build:tt)...');
  execSync('npm run build:tt', {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' },
  });
}

/** 开放平台 ZIP 校验要求根目录 index.html（与 app.json 并存，非 H5 运行入口） */
function writeUploadIndexHtml() {
  if (!fs.existsSync(UPLOAD_INDEX_HTML)) {
    throw new Error(`缺少上传入口模板: ${UPLOAD_INDEX_HTML}`);
  }
  fs.copyFileSync(UPLOAD_INDEX_HTML, path.join(distDir, 'index.html'));
}

/** 合并上传用 project.config.json（Taro 已从 project.tt.json 生成基础项） */
function applyUploadProjectConfig() {
  const distConfigPath = path.join(distDir, 'project.config.json');
  if (!fs.existsSync(distConfigPath)) {
    throw new Error(`缺少 ${distConfigPath}，请先完成 build:tt`);
  }
  const base = readJson(distConfigPath);
  const srcTt = path.join(root, 'project.tt.json');
  const overlay = fs.existsSync(srcTt) ? readJson(srcTt) : {};

  const appid = process.env.TARO_APP_ID || overlay.appid || base.appid;
  const merged = {
    ...overlay,
    ...base,
    miniprogramRoot: './',
    compileType: 'miniprogram',
    appid,
    projectname: overlay.projectname || base.projectname || 'MindScape',
    description: overlay.description || base.description || 'MindScape',
    setting: {
      ...(overlay.setting || {}),
      ...(base.setting || {}),
      urlCheck: true,
      es6: true,
      postcss: true,
      minified: true,
      uploadWithSourceMap: false,
    },
    packOptions: {
      ...(overlay.packOptions || {}),
      include: [
        { type: 'file', value: 'index.html' },
        ...((overlay.packOptions && overlay.packOptions.include) || []),
      ],
      ignore: [
        { type: 'suffix', value: '.map' },
        { type: 'suffix', value: '.md' },
        { type: 'file', value: '.DS_Store' },
        { type: 'file', value: 'Thumbs.db' },
        { type: 'suffix', value: '.LICENSE.txt' },
        { type: 'folder', value: 'node_modules' },
        { type: 'folder', value: 'src' },
        { type: 'folder', value: 'h5' },
        ...((overlay.packOptions && overlay.packOptions.ignore) || []),
      ],
    },
  };

  fs.writeFileSync(distConfigPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  return merged;
}

function validateDist() {
  for (const f of REQUIRED_ROOT) {
    const p = path.join(distDir, f);
    if (!fs.existsSync(p)) {
      throw new Error(`代码包缺少必需文件: ${f}`);
    }
  }

  const app = readJson(path.join(distDir, 'app.json'));
  if (!Array.isArray(app.pages) || app.pages.length === 0) {
    throw new Error('app.json 缺少 pages 配置');
  }

  for (const page of app.pages) {
    for (const suf of REQUIRED_PAGE_SUFFIX) {
      const pageFile = path.join(distDir, `${page}${suf}`);
      if (!fs.existsSync(pageFile)) {
        throw new Error(`页面 ${page} 缺少 ${page}${suf}`);
      }
    }
  }
}

function dirSizeBytes(dir) {
  let total = 0;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) total += dirSizeBytes(p);
    else total += fs.statSync(p).size;
  }
  return total;
}

function runProjectSize() {
  try {
    const r = spawnSync('npx', ['tma', 'project-size', '--json', distDir], {
      cwd: root,
      encoding: 'utf8',
      shell: true,
    });
    if (r.status === 0 && r.stdout?.trim()) {
      return JSON.parse(r.stdout.trim());
    }
  } catch {
    /* ignore */
  }
  return null;
}

function zipDist(outZip) {
  fs.mkdirSync(releaseDir, { recursive: true });
  if (fs.existsSync(outZip)) fs.unlinkSync(outZip);

  // Win10+ / macOS / Linux 自带 tar，zip 根目录为 dist 内容（含 app.json）
  try {
    execSync(
      `tar -a -cf "${outZip}" -C "${distDir}" --exclude="*.map" --exclude="*.md" --exclude="*.LICENSE.txt" --exclude=".DS_Store" .`,
      { stdio: 'inherit' },
    );
    return;
  } catch {
    /* fallback */
  }

  if (process.platform === 'win32') {
    const src = distDir.replace(/'/g, "''");
    const dest = outZip.replace(/'/g, "''");
    const ps = `Compress-Archive -LiteralPath (Get-ChildItem -LiteralPath '${src}' | ForEach-Object FullName) -DestinationPath '${dest}' -CompressionLevel Optimal -Force`;
    execSync(`powershell -NoProfile -Command "${ps}"`, { stdio: 'inherit' });
    return;
  }

  execSync(`cd "${distDir}" && zip -qr "${outZip}" . -x "*.map" "*.md" "*/.DS_Store"`, {
    stdio: 'inherit',
  });
}

function main() {
  if (!skipBuild) runBuild();

  if (!fs.existsSync(distDir)) {
    throw new Error(`构建输出目录不存在: ${distDir}`);
  }

  writeUploadIndexHtml();
  const projectConfig = applyUploadProjectConfig();
  validateDist();

  const pkg = readJson(path.join(root, 'package.json'));
  const version = pkg.version || '0.0.0';
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
  const zipName = `mindscape-tt-${version}-${stamp}.zip`;
  const outZip = path.join(releaseDir, zipName);

  zipDist(outZip);

  const zipBytes = fs.statSync(outZip).size;
  const distBytes = dirSizeBytes(distDir);
  const sizeInfo = runProjectSize();

  const manifest = {
    name: 'MindScape',
    version,
    builtAt: new Date().toISOString(),
    appid: projectConfig.appid,
    zipFile: zipName,
    zipBytes,
    distBytes,
    mainPackageLimitBytes: MAIN_PKG_LIMIT_BYTES,
    projectSize: sizeInfo,
    importHint:
      '抖音开发者工具 → 导入项目 → 选择解压后的 zip 根目录（须含 index.html、app.json、project.config.json）',
    uploadHint: '或使用: npx tma login && npx tma upload -c "changelog" dist',
  };

  const manifestPath = path.join(releaseDir, `${zipName}.manifest.json`);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log('\n[pack:tt] 完成');
  console.log(`  zip: ${outZip}`);
  console.log(`  zip 体积: ${(zipBytes / 1024).toFixed(1)} KB`);
  console.log(`  dist 目录: ${(distBytes / 1024).toFixed(1)} KB`);
  if (sizeInfo) {
    console.log(`  IDE 主包估算: ${JSON.stringify(sizeInfo)}`);
  }

  if (projectConfig.appid === 'touristappid') {
    console.warn(
      '\n[pack:tt] 警告: appid 仍为 touristappid。上传前请在 project.tt.json 填写真实 AppID，或设置环境变量 TARO_APP_ID。',
    );
  }

  const mainBytes = sizeInfo?.mainPackageSize ?? distBytes;
  if (mainBytes > MAIN_PKG_LIMIT_BYTES) {
    console.error(
      `\n[pack:tt] 错误: 主包约 ${(mainBytes / 1024 / 1024).toFixed(2)} MB，超过抖音主包 4MB 上限。请分包或裁剪资源后重试。`,
    );
    process.exit(1);
  }

  if (distBytes > MAIN_PKG_LIMIT_BYTES) {
    console.warn(
      `[pack:tt] 提示: dist 总体积 ${(distBytes / 1024).toFixed(1)} KB，请用「tma project-size dist」确认上传后主包体积。`,
    );
  }
}

main();
