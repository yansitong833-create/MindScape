/**
 * 将 h5/static/*.html 打进小程序包，供 WebView data: 本地展示（无需 HTTPS / 本地 serve）。
 * 运行：npm run particle:pack-static
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const staticDir = path.join(root, 'h5', 'static');
const outFile = path.join(root, 'src', 'plugins', 'particle-cloud', 'staticParticleInline.generated.ts');

const DEFAULT_FILE = 'particle-default.html';

function escapeForTs(s) {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

if (!fs.existsSync(staticDir)) {
  console.error(`缺少目录: ${staticDir}`);
  process.exit(1);
}

const files = fs.readdirSync(staticDir).filter((f) => f.endsWith('.html'));
if (!files.length) {
  console.error('h5/static/ 下没有 .html 文件');
  process.exit(1);
}

/** cacheKey → html 内容（至少包含 default） */
const inlineMap = {};

for (const file of files) {
  const full = path.join(staticDir, file);
  const html = fs.readFileSync(full, 'utf8');
  const rel = `static/${file}`;
  inlineMap[rel] = html;
  if (file === DEFAULT_FILE) {
    inlineMap.default = html;
  }
  const slug = file.replace(/^particle-/, '').replace(/\.html$/, '');
  if (slug && slug !== 'default') {
    inlineMap[slug] = html;
  }
}

if (!inlineMap.default) {
  const first = files[0];
  inlineMap.default = fs.readFileSync(path.join(staticDir, first), 'utf8');
}

const manifestPath = path.join(root, 'src', 'data', 'staticParticleManifest.ts');
if (fs.existsSync(manifestPath)) {
  const src = fs.readFileSync(manifestPath, 'utf8');
  const re = /STATIC_PARTICLE_HTML:\s*Record<string,\s*string>\s*=\s*\{([^}]*)\}/s;
  const m = src.match(re);
  if (m) {
    const entryRe = /['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]/g;
    let em;
    while ((em = entryRe.exec(m[1])) !== null) {
      const cacheKey = em[1];
      const rel = em[2];
      const p = path.join(root, 'h5', rel);
      if (fs.existsSync(p)) {
        inlineMap[cacheKey] = fs.readFileSync(p, 'utf8');
      }
    }
  }
}

const entries = Object.entries(inlineMap)
  .map(([k, v]) => `  ${JSON.stringify(k)}: \`${escapeForTs(v)}\`,`)
  .join('\n');

const ts = `/* eslint-disable */
/** 由 scripts/pack-static-particle-inline.mjs 生成，勿手改 */
export const STATIC_PARTICLE_INLINE_HTML: Record<string, string> = {
${entries}
};
`;

fs.writeFileSync(outFile, ts, 'utf8');
const kb = (Buffer.byteLength(ts, 'utf8') / 1024).toFixed(0);
console.log(`已写入 ${outFile} (${kb} KB)，共 ${Object.keys(inlineMap).length} 页`);
