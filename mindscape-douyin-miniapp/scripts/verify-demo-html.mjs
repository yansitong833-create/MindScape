import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { findBlockedInSource, extractInlineScripts } from './platform-script-sanitize.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = path.join(root, 'release/mindscape-demo-vcreate.html');
const zipPath = path.join(root, 'release/mindscape-demo-vcreate-inline.zip');

const html = fs.readFileSync(htmlPath, 'utf8');
const scripts = extractInlineScripts(html).join('\n');
const hits = findBlockedInSource(scripts);

console.log('zip listing:');
console.log(execSync(`tar -tf "${zipPath}"`, { encoding: 'utf8' }).trim());
console.log('blocked patterns:', hits.length ? hits : 'none');
console.log('has work appid:', html.includes('mindscape-work-appid'));
console.log('external script src:', /<script[^>]+src=/i.test(html));
console.log('setAttribute("on:', /setAttribute\s*\(\s*["']on/i.test(scripts));
console.log('fetch( literal:', scripts.includes('fetch('));
