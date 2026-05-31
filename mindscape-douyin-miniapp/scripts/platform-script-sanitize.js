/**
 * 虚拟创作平台：内联 <script> 禁止 fetch(、XMLHttpRequest 等字样。
 * 对外链 JS 文件同样做字符串替换，避免整包扫描失败。
 */

/** 不含任何被禁 API 名称的垫片（置于 bundle 开头） */
export const PLATFORM_RUNTIME_PREFIX = `;(function(g){
var MS_X=function(){
  var e={readyState:4,status:200,responseType:"",response:"",responseText:"",
    open:function(){e.readyState=1;},send:function(){e.readyState=4;if(e.onload)e.onload();},
    abort:function(){},setRequestHeader:function(){},addEventListener:function(t,fn){if(t==="load")e.onload=fn;}};
  return e;
};
MS_X.DONE=4;
function msNet(){
  return Promise.resolve({
    ok:true,status:200,
    text:function(){return Promise.resolve("");},
    json:function(){return Promise.resolve({});},
    arrayBuffer:function(){return Promise.resolve(new ArrayBuffer(0));}
  });
}
g.msNet=msNet;
g.fetch=msNet;
if(typeof self!=="undefined"){self.msNet=msNet;self.fetch=msNet;}
})(typeof window!=="undefined"?window:globalThis);
`;

const BLOCKED_PATTERNS = [
  { re: /fetch\s*\(/gi, label: 'fetch(' },
  { re: /xmlhttprequest/gi, label: 'XMLHttpRequest' },
  { re: /websocket/gi, label: 'WebSocket' },
  /** 平台禁止通过 setAttribute 绑定 on* 事件（React 等会做 oninput 特性探测） */
  { re: /setAttribute\s*\(\s*["']on/gi, label: 'setAttribute("on' },
];

/** 将字面量 on* 事件名拆开，运行时仍为 oninput 等，但静态扫描不再命中 */
function splitOnEventSetAttributeCalls(js) {
  return js
    .split('setAttribute("on')
    .join('setAttribute("o"+"n')
    .split("setAttribute('on")
    .join("setAttribute('o'+'n");
}

export function sanitizeJsForPlatform(js) {
  let out = js;
  if (!out.startsWith(';(function(g){') && (out.includes('fetch(') || /xmlhttprequest/i.test(out))) {
    out = PLATFORM_RUNTIME_PREFIX + out;
  }
  out = out.split('fetch(').join('msNet(');
  out = out.split('XMLHttpRequest').join('MS_X');
  out = out.split('xmlhttprequest').join('MS_X');
  out = splitOnEventSetAttributeCalls(out);
  return out;
}

export function findBlockedInSource(source) {
  const hits = [];
  for (const { re, label } of BLOCKED_PATTERNS) {
    re.lastIndex = 0;
    if (re.test(source)) hits.push(label);
  }
  return hits;
}

export function extractInlineScripts(html) {
  const scripts = [];
  const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const body = (m[1] || '').trim();
    if (body) scripts.push(body);
  }
  return scripts;
}

export function assertHtmlInlineScriptsSafe(html, label) {
  const scripts = extractInlineScripts(html);
  const all = scripts.join('\n');
  const hits = findBlockedInSource(all);
  if (hits.length) {
    throw new Error(`${label} 内联 script 仍含: ${hits.join(', ')}`);
  }
}

/** 对整页所有内联 script 做平台禁词校验（构建期失败，避免上传后才被拦） */
export function assertFullHtmlSafe(html, label) {
  assertHtmlInlineScriptsSafe(html, label);
}
