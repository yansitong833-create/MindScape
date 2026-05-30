const https = require('https');
const fs = require('fs');
const path = require('path');

const LIBS_DIR = path.join(__dirname, 'libs');

const LIBS = [
  {
    name: 'three.min.js',
    url: 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js',
  },
  {
    name: 'gsap.min.js',
    url: 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js',
  },
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          file.close();
          fs.unlinkSync(dest);
          download(res.headers.location, dest).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlinkSync(dest);
          reject(new Error(`HTTP ${res.statusCode}: ${url}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      })
      .on('error', (err) => {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        reject(err);
      });
  });
}

(async () => {
  if (!fs.existsSync(LIBS_DIR)) {
    fs.mkdirSync(LIBS_DIR, { recursive: true });
  }

  for (const lib of LIBS) {
    const dest = path.join(LIBS_DIR, lib.name);
    console.log(`下载 ${lib.name} ...`);
    await download(lib.url, dest);
    const sizeKB = (fs.statSync(dest).size / 1024).toFixed(1);
    console.log(`完成 ${lib.name} (${sizeKB} KB)`);
  }
})();
