/**
 * 将 data-single 中某日粒子页（含未压缩 PNG）复制到 h5/static/imported 与 h5/static/
 * 用法：node scripts/copy-raw-particle-day.mjs 2026-05-31
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const repoRoot = path.join(root, '..');

const date = (process.argv[2] || '2026-05-31').trim();
const name = `particle-${date}.html`;

const sources = [
  path.join(repoRoot, '_data-single-extract', 'data-single', name),
  path.join(repoRoot, 'data-single', name),
];

const src = sources.find((p) => fs.existsSync(p));
if (!src) {
  console.error(`未找到 ${name}，请解压 data-single.zip`);
  process.exit(1);
}

function adaptHtmlForH5Serve(html) {
  return html
    .replace(/src="libs\//g, 'src="../libs/')
    .replace(/src='libs\//g, "src='../libs/");
}

const raw = fs.readFileSync(src, 'utf8');
const html = adaptHtmlForH5Serve(raw);
const imported = path.join(root, 'h5', 'static', 'imported', name);
const shipped = path.join(root, 'h5', 'static', name);

fs.mkdirSync(path.dirname(imported), { recursive: true });
fs.writeFileSync(imported, html, 'utf8');
fs.writeFileSync(shipped, html, 'utf8');

const mime = html.match(/imageUrl:\s*"(data:image[^;]+)/)?.[1] || 'unknown';
console.log(`已写入 ${imported}`);
console.log(`已写入 ${shipped}`);
console.log(`源: ${src} (${(fs.statSync(src).size / 1024).toFixed(0)} KB, ${mime})`);
