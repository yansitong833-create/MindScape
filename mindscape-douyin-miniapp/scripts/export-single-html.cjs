const fs = require('fs');
const path = require('path');

const mimeByExt = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
};

const readText = (p) => fs.readFileSync(p, 'utf8');

const listFiles = (dir, exts) => {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => exts.some((e) => name.toLowerCase().endsWith(e)))
    .map((name) => path.join(dir, name));
};

const toDataUri = (absPath) => {
  const ext = path.extname(absPath).toLowerCase();
  const mime = mimeByExt[ext] || 'application/octet-stream';
  const buf = fs.readFileSync(absPath);
  return `data:${mime};base64,${buf.toString('base64')}`;
};

const inlineCssUrls = (cssText, cssFilePath) => {
  const baseDir = path.dirname(cssFilePath);
  return cssText.replace(/url\(([^)]+)\)/g, (m, raw) => {
    let u = String(raw).trim();
    if ((u.startsWith('"') && u.endsWith('"')) || (u.startsWith("'") && u.endsWith("'"))) {
      u = u.slice(1, -1).trim();
    }
    if (!u) return m;
    if (u.startsWith('data:') || u.startsWith('http:') || u.startsWith('https:') || u.startsWith('//')) return m;
    if (u.startsWith('#')) return m;
    const clean = u.split('?')[0].split('#')[0];
    const abs = path.resolve(baseDir, clean);
    if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) return m;
    const data = toDataUri(abs);
    return `url(${JSON.stringify(data)})`;
  });
};

const byName = (a, b) => path.basename(a).localeCompare(path.basename(b));

const main = () => {
  const distArg = process.argv[2] || 'dist-h5';
  const outArg = process.argv[3] || 'mindscape-miniapp-demo-single.html';

  const dist = path.resolve(process.cwd(), distArg);
  const out = path.resolve(process.cwd(), outArg);

  const indexPath = path.join(dist, 'index.html');
  if (!fs.existsSync(indexPath)) {
    process.stderr.write(`Missing index.html: ${indexPath}\n`);
    process.exit(1);
  }

  let html = readText(indexPath);
  html = html
    .replace(/<script\b[^>]*\bsrc=["'][^"']+["'][^>]*><\/script>/gi, '')
    .replace(/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi, '');

  const cssDir = path.join(dist, 'css');
  const cssFiles = listFiles(cssDir, ['.css']).sort(byName);
  let cssBundle = '';
  for (const file of cssFiles) {
    const t = inlineCssUrls(readText(file), file);
    cssBundle += `\n${t}`;
  }

  const jsDir = path.join(dist, 'js');
  const jsFilesAll = listFiles(jsDir, ['.js']).filter((p) => !p.toLowerCase().endsWith('.license.txt'));
  const runtimeFirst = jsFilesAll.filter((p) => path.basename(p).startsWith('532.'));
  const appLast = jsFilesAll.filter((p) => path.basename(p).startsWith('app.'));
  const others = jsFilesAll.filter((p) => !runtimeFirst.includes(p) && !appLast.includes(p)).sort(byName);
  const jsFiles = [...runtimeFirst, ...others, ...appLast];

  let jsBundle = '';
  for (const file of jsFiles) {
    let t = readText(file);
    t = t.replace(/\/\/#[^\n]*sourceMappingURL=[^\n]*\n?/g, '');
    jsBundle += `\n;${t}`;
  }

  const injectHead = `\n<style>${cssBundle}\n</style>\n`;
  const injectBody = `\n<script>${jsBundle}\n</script>\n`;

  if (/<\/head>/i.test(html)) html = html.replace(/<\/head>/i, injectHead + '</head>');
  else html = injectHead + html;

  if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, injectBody + '</body>');
  else html += injectBody;

  fs.writeFileSync(out, html, 'utf8');

  const kb = Math.round(fs.statSync(out).size / 1024);
  process.stdout.write(`Single-file HTML written: ${out}\n`);
  process.stdout.write(`Size: ${kb} KB\n`);
  process.stdout.write(`JS files: ${jsFiles.length} | CSS files: ${cssFiles.length}\n`);
};

main();
