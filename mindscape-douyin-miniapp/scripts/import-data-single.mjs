/**
 * 从仓库根目录 data-single.zip（或已解压的 data-single/）导入：
 * - preset-diaries.md → src/data/sampleDiary.ts
 * - particle-*.html、引擎、libs → h5/static 与 h5/libs
 * - 登记 staticParticleManifest.ts
 *
 * 用法：npm run import:data-single
 * 可选：node scripts/import-data-single.mjs [zip或目录路径]
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const miniappRoot = path.join(__dirname, '..');
const repoRoot = path.join(miniappRoot, '..');
const defaultZip = path.join(repoRoot, 'data-single.zip');

const staticDir = path.join(miniappRoot, 'h5', 'static');
const importedDir = path.join(staticDir, 'imported');
const libsDir = path.join(miniappRoot, 'h5', 'libs');
const sampleDiaryPath = path.join(miniappRoot, 'src', 'data', 'sampleDiary.ts');
const manifestPath = path.join(miniappRoot, 'src', 'data', 'staticParticleManifest.ts');

function extractZip(zipPath, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  if (process.platform === 'win32') {
    const cmd = `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force`;
    execSync(`powershell -NoProfile -Command "${cmd}"`, { stdio: 'inherit' });
  } else {
    execSync(`unzip -o "${zipPath}" -d "${destDir}"`, { stdio: 'inherit' });
  }
}

function resolveDataSingleDir(input) {
  if (input) {
    const abs = path.resolve(input);
    if (fs.statSync(abs).isDirectory()) {
      return fs.existsSync(path.join(abs, 'preset-diaries.md'))
        ? abs
        : path.join(abs, 'data-single');
    }
    const tmp = path.join(miniappRoot, '.tmp-import-data-single');
    fs.rmSync(tmp, { recursive: true, force: true });
    extractZip(abs, tmp);
    const nested = path.join(tmp, 'data-single');
    return fs.existsSync(path.join(nested, 'preset-diaries.md')) ? nested : tmp;
  }

  const nested = path.join(repoRoot, 'data-single');
  if (fs.existsSync(path.join(nested, 'preset-diaries.md'))) return nested;

  const extracted = path.join(repoRoot, '_data-single-extract', 'data-single');
  if (fs.existsSync(path.join(extracted, 'preset-diaries.md'))) return extracted;

  if (!fs.existsSync(defaultZip)) {
    throw new Error(`未找到 data-single 包。请放置 ${defaultZip} 或传入 zip/目录路径`);
  }
  const tmp = path.join(miniappRoot, '.tmp-import-data-single');
  fs.rmSync(tmp, { recursive: true, force: true });
  extractZip(defaultZip, tmp);
  const fromZip = path.join(tmp, 'data-single');
  return fs.existsSync(path.join(fromZip, 'preset-diaries.md')) ? fromZip : tmp;
}

function adaptHtmlForH5Serve(html) {
  return html
    .replace(/src="libs\//g, 'src="../libs/')
    .replace(/src='libs\//g, "src='../libs/");
}

function parsePresetDiaries(md) {
  const entries = [];
  const blockRe = /###\s+(\d{2})\.(\d{2})\s*\n- \*\*主题色\*\*:\s*`(#[0-9A-Fa-f]{3,8})`\s*\n- \*\*内容\*\*:\s*(.+)/g;
  let m;
  while ((m = blockRe.exec(md)) !== null) {
    entries.push({
      day: `${m[1]}-${m[2]}`,
      color: m[3],
      content: m[4].trim(),
    });
  }
  if (!entries.length) throw new Error('preset-diaries.md 未解析到任何条目');
  return entries;
}

function updateSampleDiary(entries) {
  const src = fs.readFileSync(sampleDiaryPath, 'utf8');
  const lines = entries
    .map(
      (e) =>
        `  { day: '${e.day}', color: '${e.color}', content: ${JSON.stringify(e.content)} },`,
    )
    .join('\n');
  const block = `const PRESET_DIARIES_2026_05: Array<{ day: string; color: string; content: string }> = [\n${lines}\n];`;
  const re = /const PRESET_DIARIES_2026_05:[\s\S]*?\];/;
  if (!re.test(src)) throw new Error('sampleDiary.ts 中未找到 PRESET_DIARIES_2026_05');
  fs.writeFileSync(sampleDiaryPath, src.replace(re, block), 'utf8');
}

function updateManifest(monthKey, dayFiles) {
  const lines = [
    `/**`,
    ` * 静态粒子云 HTML 清单（相对 H5 站点根路径）。`,
    ` * 由 scripts/import-data-single.mjs 根据 data-single 包更新，亦可手改。`,
    ` */`,
    `export const STATIC_PARTICLE_DEFAULT = 'static/particle-default.html';`,
    ``,
    `/** 精确匹配手账 cacheKey（如 day:2026-05-31、month:2026-05） */`,
    `export const STATIC_PARTICLE_HTML: Record<string, string> = {`,
    `  default: STATIC_PARTICLE_DEFAULT,`,
    `  'month:${monthKey}': 'static/particle-index-${monthKey}.html',`,
  ];
  for (const date of dayFiles.sort()) {
    lines.push(`  'day:${date}': 'static/particle-${date}.html',`);
  }
  lines.push(`};`, ``, `export const getStaticParticleHtmlPath = (cacheKey: string): string => {`);
  lines.push(`  const key = (cacheKey || '').trim();`);
  lines.push(`  if (key && STATIC_PARTICLE_HTML[key]) return STATIC_PARTICLE_HTML[key];`);
  lines.push(`  return STATIC_PARTICLE_DEFAULT;`);
  lines.push(`};`, ``);
  fs.writeFileSync(manifestPath, lines.join('\n'), 'utf8');
}

function copyFile(src, dest, transform) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const raw = fs.readFileSync(src);
  const out = transform ? transform(raw.toString('utf8')) : raw;
  fs.writeFileSync(dest, out);
}

function main() {
  const input = process.argv[2];
  const sourceDir = resolveDataSingleDir(input);
  console.log(`数据源: ${sourceDir}`);

  const presetMd = fs.readFileSync(path.join(sourceDir, 'preset-diaries.md'), 'utf8');
  const presets = parsePresetDiaries(presetMd);
  updateSampleDiary(presets);
  fs.mkdirSync(importedDir, { recursive: true });
  fs.copyFileSync(path.join(sourceDir, 'preset-diaries.md'), path.join(importedDir, 'preset-diaries.md'));
  console.log(`已更新 sampleDiary.ts（${presets.length} 条日记）`);

  const srcLibs = path.join(sourceDir, 'libs');
  if (fs.existsSync(srcLibs)) {
    fs.mkdirSync(libsDir, { recursive: true });
    for (const name of fs.readdirSync(srcLibs)) {
      fs.copyFileSync(path.join(srcLibs, name), path.join(libsDir, name));
    }
    console.log(`已复制 libs → h5/libs/`);
  }

  const engine = path.join(sourceDir, 'particle-engine-standalone.js');
  if (fs.existsSync(engine)) {
    fs.copyFileSync(engine, path.join(importedDir, 'particle-engine-standalone.js'));
  }

  const dayFiles = [];
  let monthKey = '2026-05';
  let copiedHtml = 0;
  let totalBytes = 0;

  for (const name of fs.readdirSync(sourceDir)) {
    const dayMatch = name.match(/^particle-(\d{4}-\d{2}-\d{2})\.html$/);
    if (!dayMatch) continue;
    const date = dayMatch[1];
    dayFiles.push(date);
    monthKey = date.slice(0, 7);
    const src = path.join(sourceDir, name);
      const dest = path.join(importedDir, name);
      copyFile(src, dest, adaptHtmlForH5Serve);
    totalBytes += fs.statSync(dest).size;
    copiedHtml += 1;
  }

  const indexName = `particle-index-${monthKey}.html`;
  if (fs.existsSync(path.join(sourceDir, indexName))) {
    fs.copyFileSync(path.join(sourceDir, indexName), path.join(importedDir, indexName));
  }

  pruneShippedStaticArtifacts();

  updateManifest(monthKey, dayFiles);
  console.log(
    `已复制 ${copiedHtml} 个粒子页（合计 ${(totalBytes / 1024 / 1024).toFixed(1)} MB）→ h5/static/imported/`,
  );
  console.log(`已更新 staticParticleManifest.ts（month:${monthKey} + ${dayFiles.length} day）`);
  console.log('正在压缩并内联进小程序包…');
  execSync('node scripts/pack-static-particle-inline.mjs', { cwd: miniappRoot, stdio: 'inherit' });
}

function pruneShippedStaticArtifacts() {
  if (!fs.existsSync(staticDir)) return;
  for (const name of fs.readdirSync(staticDir)) {
    if (
      /^particle-\d{4}-\d{2}-\d{2}\.html$/.test(name) ||
      /^particle-index-/.test(name) ||
      name === 'particle-default.html' ||
      name === 'particle-engine-standalone.js' ||
      name === 'preset-diaries.md'
    ) {
      fs.rmSync(path.join(staticDir, name), { force: true });
    }
  }
}

main();
