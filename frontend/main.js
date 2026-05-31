// ═══════════════════════════════════════════
// MindScape 后端 API 地址
// 本地开发: http://localhost:8000
// 生产环境: 同域 /api （Nginx 反向代理）
// ═══════════════════════════════════════════
const MINDSCAPE_API_URL = typeof MINDSCAPE_API_OVERRIDE !== "undefined"
  ? MINDSCAPE_API_OVERRIDE
  : "/api";

// ═══════════════════════════════════════════════
// 左栏 时间轴 — 10+ 条诗意日记 + 状态记忆
// ═══════════════════════════════════════════════
const mockDiaries = [
  { date: "05.28", text: "雨后的街道有泥土的芬芳，慢慢走回家的路上心情特别好。", color: "#8C9E82", generatedImageUrl: null, themeColor: null },
  { date: "05.24", text: "喝到了一杯完美的焦糖玛奇朵，甜得像恋爱。", color: "#C49B7A", generatedImageUrl: null, themeColor: null },
  { date: "05.19", text: "参加了黑客松比赛，和团队一起熬夜写代码，累但充实。", color: "#E08F81", generatedImageUrl: null, themeColor: null },
  { date: "05.15", text: "工作有些疲惫，但朋友突然发来一张好笑的表情包。", color: "#A8B4A5", generatedImageUrl: null, themeColor: null },
  { date: "05.12", text: "看着窗外的落叶发呆，什么也不想做，就这样刚刚好。", color: "#B8A890", generatedImageUrl: null, themeColor: null },
  { date: "05.08", text: "安静地看了一下午的书，时间好像变慢了。", color: "#6C7A89", generatedImageUrl: null, themeColor: null },
  { date: "05.03", text: "和朋友一起去了新开的画廊，灵感像泉水一样涌出来。", color: "#C4A882", generatedImageUrl: null, themeColor: null },
  { date: "04.28", text: "下雪了，整个世界都安静下来，泡了一杯热可可。", color: "#8FA9BF", generatedImageUrl: null, themeColor: null },
  { date: "04.22", text: "早上被阳光叫醒，第一次没有按掉闹钟。", color: "#DFC98A", generatedImageUrl: null, themeColor: null },
  { date: "04.16", text: "新的一年开始了，在日记本上写下了今年的三个心愿。", color: "#D4C5C7", generatedImageUrl: null, themeColor: null },
  { date: "04.10", text: "今天什么也没发生，但就是觉得莫名开心。", color: "#C0B9D4", generatedImageUrl: null, themeColor: null },
  { date: "04.03", text: "在二手书店淘到了一本泛黄的诗集，扉页上有人写过字。", color: "#A8978C", generatedImageUrl: null, themeColor: null },
];

let currentActiveDiaryIndex = 0;
let currentMonth = "05";

function renderTimeline() {
  const listContainer = document.getElementById("diary-list");
  if (!listContainer) return;
  listContainer.innerHTML = "";

  mockDiaries.forEach((diary, idx) => {
    if (!diary.date.startsWith(currentMonth)) return;

    const item = document.createElement("div");
    item.className = "diary-item";
    if (idx === currentActiveDiaryIndex) item.classList.add("active");
    item.innerHTML = `
      <div class="diary-date">${diary.date}</div>
      <div class="diary-content">
        <div class="diary-preview-circle" style="background: ${diary.color}"></div>
        <div class="diary-text">${diary.text}</div>
      </div>
      <button class="btn-delete" title="删除">🗑</button>`;
    item.querySelector(".diary-item, .diary-item *"); // no-op to find

    item.addEventListener("click", (ev) => {
      if (ev.target.closest(".btn-delete")) return;
      selectDiary(idx);
    });
    item.querySelector(".btn-delete").addEventListener("click", (ev) => {
      ev.stopPropagation();
      deleteDiary(idx);
    });
    listContainer.appendChild(item);
  });
}

function deleteDiary(idx) {
  mockDiaries.splice(idx, 1);
  if (idx <= currentActiveDiaryIndex && currentActiveDiaryIndex >= mockDiaries.length) {
    currentActiveDiaryIndex = Math.max(0, mockDiaries.length - 1);
  }
  renderTimeline();
  if (mockDiaries.length === 0) {
    disperseAndClear();
    document.getElementById("diaryInput").value = "";
  } else {
    selectDiary(Math.min(currentActiveDiaryIndex, mockDiaries.length - 1));
  }
}

function selectDiary(idx) {
  if (idx < 0 || idx >= mockDiaries.length) return;
  currentActiveDiaryIndex = idx;
  const diary = mockDiaries[idx];
  document.querySelectorAll(".diary-item").forEach(el => el.classList.remove("active"));
  const items = document.querySelectorAll(".diary-item");
  let visibleIdx = 0;
  for (let i = 0; i <= idx; i++) {
    if (mockDiaries[i].date.startsWith(currentMonth)) visibleIdx++;
  }
  if (items.length > visibleIdx - 1 && items[visibleIdx - 1]) {
    items[visibleIdx - 1].classList.add("active");
  }

  if (diary.generatedImageUrl) {
    loadSavedParticle(diary.generatedImageUrl, diary.themeColor);
    document.getElementById("diaryInput").value = diary.text;
  } else {
    disperseAndClear();
    document.getElementById("diaryInput").value = diary.text || "";
    document.getElementById("diaryInput").focus();
  }
}

// 月份切换
document.addEventListener("DOMContentLoaded", () => {
  renderTimeline();

  document.querySelectorAll("#month-list li").forEach(li => {
    li.addEventListener("click", () => {
      document.querySelectorAll("#month-list li").forEach(l => l.classList.remove("active"));
      li.classList.add("active");
      currentMonth = li.dataset.month;
      renderTimeline();
      // 选当前月第一条
      const firstIdx = mockDiaries.findIndex(d => d.date.startsWith(currentMonth));
      if (firstIdx >= 0) selectDiary(firstIdx);
    });
  });

  document.getElementById("btn-add-diary").addEventListener("click", () => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    mockDiaries.unshift({
      date: mm + "." + dd, text: "", color: "#D4C5C7",
      generatedImageUrl: null, themeColor: null,
    });
    currentActiveDiaryIndex = 0;
    if (mm !== currentMonth) {
      currentMonth = mm;
      document.querySelectorAll("#month-list li").forEach(l => {
        l.classList.toggle("active", l.dataset.month === mm);
      });
    }
    renderTimeline();
    disperseAndClear();
    document.getElementById("diaryInput").value = "";
    document.getElementById("diaryInput").focus();
  });
});


// ── Three.js 场景初始化 (约束在 right-panel 内) ──
const canvas = document.getElementById("mindscape-canvas");
const rightPanel = document.getElementById("right-panel");

const scene = new THREE.Scene();

function getRightPanelSize() {
  const w = rightPanel ? rightPanel.clientWidth : window.innerWidth;
  const h = rightPanel ? rightPanel.clientHeight : window.innerHeight;
  return { w, h };
}

const rpSize = getRightPanelSize();
const camera = new THREE.PerspectiveCamera(
  60,
  rpSize.w / rpSize.h,
  0.1,
  1000
);
camera.position.set(0, 0, 40);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(rpSize.w, rpSize.h);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0xF9F6F0);

// ═══════════════════════════════════════════
// 全局鼠标 3D 空间追踪
// ═══════════════════════════════════════════
const raycaster = new THREE.Raycaster();
const mousePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const mouseWorld = new THREE.Vector3(9999, 9999, 0);
const mouseNDC = new THREE.Vector2();

function getRightPanelRect() {
  const rp = document.getElementById("right-panel");
  if (!rp) return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  const rect = rp.getBoundingClientRect();
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

window.addEventListener("mousemove", (event) => {
  const r = getRightPanelRect();
  const rx = event.clientX - r.left;
  const ry = event.clientY - r.top;
  mouseNDC.x = (rx / r.width) * 2 - 1;
  mouseNDC.y = -(ry / r.height) * 2 + 1;
});
window.addEventListener("touchmove", (e) => {
  if (e.touches.length) {
    const r = getRightPanelRect();
    const rx = e.touches[0].clientX - r.left;
    const ry = e.touches[0].clientY - r.top;
    mouseNDC.x = (rx / r.width) * 2 - 1;
    mouseNDC.y = -(ry / r.height) * 2 + 1;
  }
}, { passive: true });

// ═══════════════════════════════════════════
// 内嵌图片素材 (base64 → file:// 安全)
// ═══════════════════════════════════════════
const IMAGE_STORE = {
  "./assets/tower.png":
    "data:image/png;base64,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",

  "./assets/cat.png":
    "data:image/png;base64,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",

  "./assets/ferris_wheel.png":
    "data:image/png;base64,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",
};

// ═══════════════════════════════════════════
// 手搓高精度圆形发光贴图（告别方形马赛克）
// ═══════════════════════════════════════════
function createParticleTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");

  // 实心硬边：大核心 + 极窄过渡
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.75, "rgba(255,255,255,1)");
  gradient.addColorStop(0.82, "rgba(255,255,255,0.6)");
  gradient.addColorStop(0.92, "rgba(255,255,255,0.08)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  return new THREE.CanvasTexture(canvas);
}

// ═══════════════════════════════════════════
// ImageToParticles — 图片像素 → 3D 粒子系统
// ═══════════════════════════════════════════
class ImageToParticles {
  constructor(imagePath, options = {}) {
    this.imagePath = imagePath;
    this.step = options.step ?? 5;
    this.particleSize = options.size ?? 2;
    this.scale = options.scale ?? 8;
    this.nebulaRadius = options.nebulaRadius ?? 14;
    this.brightnessThreshold = options.brightnessThreshold ?? 128;
    this.llmColors = options.llmColors || null;  // LLM 返回的颜色比例数组

    this.targetPositions = null;
    this.currentPositions = null;
    this.pointCount = 0;
    this.points = null;

    this.physicsActive = false;
    this.isLoading = false;
    this._tween = null;
    this._loadingTween = null;
  }

  async init() {
    const img = await this._loadImage(this.imagePath);
    const { data, width, height } = this._readPixels(img);
    this._buildTargetPositions(data, width, height);
    this._buildNebulaPositions();
    return this._createPointCloud();
  }

  async _loadImage(src) {
    let resolvedSrc = IMAGE_STORE[src] || src;

    if (/^https?:\/\//.test(resolvedSrc)) {
      try {
        const response = await fetch(resolvedSrc);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        resolvedSrc = URL.createObjectURL(blob);
      } catch (err) {
        console.warn("[ImageToParticles] Blob 转换失败，尝试直连:", err.message);
      }
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`无法加载图片: ${src}`));
      img.src = resolvedSrc;
    });
  }

  _readPixels(img) {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return { data: imageData.data, width: canvas.width, height: canvas.height };
  }

  _buildTargetPositions(data, width, height) {
    const { step, brightnessThreshold } = this;
    const halfW = width / 2;
    const halfH = height / 2;
    const scale = 0.05;
    const arr = [];

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const alpha = data[idx + 3];
        const brightness = (r + g + b) / 3;

        if (brightness < brightnessThreshold && alpha > 128) {
          const vx = (x - halfW) * scale + (Math.random() - 0.5) * 0.2;
          const vy = -(y - halfH) * scale + (Math.random() - 0.5) * 0.2;
          const vz = (Math.random() - 0.5) * 1.5;
          arr.push(vx, vy, vz);
        }
      }
    }

    this.pointCount = arr.length / 3;
    this.targetPositions = new Float32Array(arr);
    console.log(
      `[ImageToParticles] 亮度阈值<${brightnessThreshold}，步长=${step}，有效粒子数=${this.pointCount.toLocaleString()}`
    );
  }

  _buildNebulaPositions() {
    const count = this.pointCount;
    const arr = new Float32Array(count * 3);
    const { nebulaRadius } = this;

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = nebulaRadius * (0.4 + Math.random() * 0.6);
      arr[i * 3]     = Math.sin(phi) * Math.cos(theta) * r;
      arr[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
      arr[i * 3 + 2] = Math.cos(phi) * r;
    }

    this.currentPositions = arr;
  }

  // ── 纯星云初始化 ──
  async initNebulaOnly(count = 2500) {
    this.pointCount = count;
    const arr = new Float32Array(count * 3);
    const { nebulaRadius } = this;

    for (let i = 0; i < count; i++) {
      const roll = Math.random();
      let r, theta, phi;
      if (roll < 0.55) {
        theta = Math.random() * Math.PI * 2;
        phi = Math.acos(2 * Math.random() - 1);
        r = nebulaRadius * (0.55 + Math.random() * 0.45);
      } else if (roll < 0.85) {
        theta = Math.random() * Math.PI * 2;
        phi = Math.acos(2 * Math.random() - 1);
        r = nebulaRadius * (0.1 + Math.random() * 0.4);
      } else {
        theta = Math.random() * Math.PI * 2;
        phi = Math.PI / 2 + (Math.random() - 0.5) * 0.6;
        r = nebulaRadius * (0.35 + Math.random() * 0.65);
      }
      arr[i * 3]     = Math.sin(phi) * Math.cos(theta) * r;
      arr[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
      arr[i * 3 + 2] = Math.cos(phi) * r;
    }

    this.currentPositions = arr;
    this.targetPositions = new Float32Array(arr);
    return this._createPointCloud();
  }

  _createPointCloud() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(this.currentPositions, 3));
    geometry.setAttribute("aTarget", new THREE.BufferAttribute(this.targetPositions, 3));

    const colors = new Float32Array(this.pointCount * 3);

    // 使用 LLM 返回的颜色（如果有），否则用默认 PALETTE
    if (this.llmColors && this.llmColors.length > 0) {
      // 按 LLM 比例分配粒子颜色
      let cumulative = 0;
      const colorStops = this.llmColors.map(c => {
        cumulative += c.proportion;
        const hex = c.color.startsWith("#") ? c.color : "#803E4D";
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return { r, g, b, threshold: cumulative };
      });

      for (let i = 0; i < this.pointCount; i++) {
        const roll = Math.random();
        let picked = colorStops[0];
        for (const cs of colorStops) {
          if (roll < cs.threshold) { picked = cs; break; }
        }
        // 亮度随机变异，保留层次感
        const v = 0.55 + Math.random() * 0.55;
        colors[i * 3]     = Math.min(picked.r * v, 1.2);
        colors[i * 3 + 1] = Math.min(picked.g * v, 1.2);
        colors[i * 3 + 2] = Math.min(picked.b * v, 1.2);
      }
    } else {
      // 默认 PALETTE（仅纯星云模式使用）
      const PALETTE = [
        { rgb: [0.50, 0.24, 0.30], weight: 16 },
        { rgb: [0.17, 0.24, 0.31], weight: 14 },
        { rgb: [0.20, 0.34, 0.26], weight: 12 },
        { rgb: [0.35, 0.30, 0.39], weight: 12 },
        { rgb: [0.55, 0.36, 0.36], weight: 10 },
        { rgb: [0.38, 0.26, 0.18], weight: 8  },
        { rgb: [0.95, 0.35, 0.40], weight: 4  },
        { rgb: [0.20, 0.60, 0.55], weight: 3  },
        { rgb: [0.80, 0.45, 0.15], weight: 2  },
        { rgb: [0.30, 0.45, 0.75], weight: 2  },
        { rgb: [0.85, 0.30, 0.55], weight: 1  },
      ];
      const totalWeight = PALETTE.reduce((s, c) => s + c.weight, 0);
      const thresholds = [];
      let acc = 0;
      for (const c of PALETTE) { acc += c.weight / totalWeight; thresholds.push(acc); }

      for (let i = 0; i < this.pointCount; i++) {
        const roll = Math.random();
        let picked = PALETTE[0].rgb;
        for (let j = 0; j < thresholds.length; j++) {
          if (roll < thresholds[j]) { picked = PALETTE[j].rgb; break; }
        }
        const isAccent = picked[0] > 0.6 || picked[1] > 0.4;
        let v;
        if (isAccent) {
          v = Math.random() < 0.3 ? 1.1 + Math.random() * 0.3 : 0.7 + Math.random() * 0.35;
        } else {
          v = Math.random() < 0.12 ? 1.0 + Math.random() * 0.15
            : Math.random() < 0.45 ? 0.55 + Math.random() * 0.35 : 0.25 + Math.random() * 0.25;
        }
        colors[i * 3]     = Math.min(picked[0] * v, 1.3);
        colors[i * 3 + 1] = Math.min(picked[1] * v, 1.3);
        colors[i * 3 + 2] = Math.min(picked[2] * v, 1.3);
      }
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const tex = createParticleTexture();

    // 微光晕层：极小粒子
    const matGlow = new THREE.PointsMaterial({
      size: 0.10,
      map: tex,
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
      blending: THREE.NormalBlending,
      sizeAttenuation: true,
    });

    // 实心核心层：大粒子高透明度
    const matCore = new THREE.PointsMaterial({
      size: 0.50,
      map: tex,
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.NormalBlending,
      sizeAttenuation: true,
    });

    const group = new THREE.Group();
    this._glowPoints = new THREE.Points(geometry, matGlow);
    this._corePoints = new THREE.Points(geometry, matCore);
    group.add(this._glowPoints);
    group.add(this._corePoints);

    // ── 浮光粒子：从画面底部往上飘 ──
    const floatCount = 200;
    this._floatCount = floatCount;
    const floatPositions = new Float32Array(floatCount * 3);
    const floatVelocities = new Float32Array(floatCount * 3);

    // 获取底部Y范围（基于目标形状的下边界）
    let minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < this.pointCount; i++) {
      const y = this.targetPositions[i * 3 + 1];
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const rangeY = maxY - minY || 6;
    const rangeX = 10;

    for (let i = 0; i < floatCount; i++) {
      // 从底部区域随机散布，覆盖更宽范围
      floatPositions[i * 3]     = (Math.random() - 0.5) * rangeX * 1.4;
      floatPositions[i * 3 + 1] = minY - rangeY * 0.3 + Math.random() * rangeY * 1.5;
      floatPositions[i * 3 + 2] = (Math.random() - 0.5) * 5;
      // 飘散方向多样化：有的偏左，有的偏右，有的斜着飘
      const angle = Math.random() * Math.PI * 2;
      floatVelocities[i * 3]     = Math.cos(angle) * (0.002 + Math.random() * 0.006);  // 水平飘散
      floatVelocities[i * 3 + 1] = 0.004 + Math.random() * 0.016; // 慢速上升
      floatVelocities[i * 3 + 2] = Math.sin(angle) * (0.001 + Math.random() * 0.004);  // Z轴飘散
    }

    this._floatPositions = floatPositions;
    this._floatVelocities = floatVelocities;
    this._floatRangeY = rangeY;
    this._floatMinY = minY;
    this._floatMaxY = maxY;
    this._floatRangeX = rangeX;

    const floatGeo = new THREE.BufferGeometry();
    floatGeo.setAttribute("position", new THREE.BufferAttribute(floatPositions, 3));

    const matFloat = new THREE.PointsMaterial({
      size: 0.40,
      map: tex,
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    this._floatPoints = new THREE.Points(floatGeo, matFloat);
    group.add(this._floatPoints);

    this.points = group;
    return group;
  }

  assembleParticles(colorHex, duration = 2.5) {
    if (!this.points) return;
    if (this._tween) { this._tween.kill(); this._tween = null; }

    const startPositions = new Float32Array(this.currentPositions);
    const target = this.targetPositions;
    const current = this.currentPositions;
    const count = this.pointCount;
    const geo = this._corePoints.geometry;
    const positionAttr = geo.attributes.position;

    // 应用 LLM 主题色到双层材质（微弱混合，让顶点色主导）
    if (colorHex) {
      const tint = new THREE.Color(colorHex);
      tint.lerp(new THREE.Color(0xffffff), 0.15);
      this._corePoints.material.color.copy(tint);
      const tintGlow = new THREE.Color(colorHex);
      tintGlow.lerp(new THREE.Color(0xffffff), 0.5);
      this._glowPoints.material.color.copy(tintGlow);
    }

    const proxy = { progress: 0 };
    const self = this;
    this.physicsActive = false;

    this._tween = gsap.to(proxy, {
      progress: 1, duration, ease: "expo.out",
      onUpdate: () => {
        const p = proxy.progress;
        for (let i = 0; i < count * 3; i++) {
          current[i] = startPositions[i] + (target[i] - startPositions[i]) * p;
        }
        positionAttr.needsUpdate = true;
      },
      onComplete: () => {
        current.set(target);
        positionAttr.needsUpdate = true;
        self._tween = null;
        self.enablePhysics();
      },
    });
  }

  disperseParticles(duration = 0.9) {
    return new Promise((resolve) => {
      if (!this.points) return resolve();
      this.physicsActive = false;
      if (this._tween) { this._tween.kill(); this._tween = null; }

      const count = this.pointCount;
      const current = this.currentPositions;
      const positionAttr = this._corePoints.geometry.attributes.position;

      const scatterTargets = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 22 + Math.random() * 28;
        scatterTargets[i * 3]     = Math.sin(phi) * Math.cos(theta) * r;
        scatterTargets[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
        scatterTargets[i * 3 + 2] = Math.cos(phi) * r;
      }

      const startPositions = new Float32Array(current);
      const proxy = { progress: 0 };
      const self = this;

      gsap.to(proxy, {
        progress: 1, duration, ease: "power3.in",
        onUpdate: () => {
          const p = proxy.progress;
          for (let i = 0; i < count * 3; i++) {
            current[i] = startPositions[i] + (scatterTargets[i] - startPositions[i]) * p;
          }
          positionAttr.needsUpdate = true;
        },
        onComplete: () => {
          if (self.points) {
            self.points.removeFromParent();
            self._corePoints.geometry.dispose();
            self._corePoints.material.dispose();
            self._glowPoints.material.dispose();
            if (self._floatPoints) {
              self._floatPoints.geometry.dispose();
              self._floatPoints.material.dispose();
              self._floatPoints = null;
            }
            self._corePoints = null;
            self._glowPoints = null;
            self.points = null;
          }
          resolve();
        },
      });
    });
  }

  // ── 打散回混沌球体（不飞远，仅回到星云态）──
  disperseToSphere(duration = 1.5) {
    return new Promise((resolve) => {
      if (!this.points) return resolve();
      this.physicsActive = false;
      if (this._tween) { this._tween.kill(); this._tween = null; }

      const count = this.pointCount;
      const current = this.currentPositions;
      // 生成和 initNebulaOnly 一样的随机球体目标
      const sphereTargets = new Float32Array(count * 3);
      const R = this.nebulaRadius;
      for (let i = 0; i < count; i++) {
        const roll = Math.random();
        let r, theta, phi;
        if (roll < 0.55) {
          theta = Math.random() * Math.PI * 2;
          phi = Math.acos(2 * Math.random() - 1);
          r = R * (0.55 + Math.random() * 0.45);
        } else if (roll < 0.85) {
          theta = Math.random() * Math.PI * 2;
          phi = Math.acos(2 * Math.random() - 1);
          r = R * (0.1 + Math.random() * 0.4);
        } else {
          theta = Math.random() * Math.PI * 2;
          phi = Math.PI / 2 + (Math.random() - 0.5) * 0.6;
          r = R * (0.35 + Math.random() * 0.65);
        }
        sphereTargets[i * 3]     = Math.sin(phi) * Math.cos(theta) * r;
        sphereTargets[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
        sphereTargets[i * 3 + 2] = Math.cos(phi) * r;
      }

      const startPositions = new Float32Array(current);
      const positionAttr = this._corePoints.geometry.attributes.position;
      const proxy = { progress: 0 };
      const self = this;

      gsap.to(proxy, {
        progress: 1, duration, ease: "power2.inOut",
        onUpdate: () => {
          const p = proxy.progress;
          for (let i = 0; i < count * 3; i++) {
            current[i] = startPositions[i] + (sphereTargets[i] - startPositions[i]) * p;
          }
          positionAttr.needsUpdate = true;
        },
        onComplete: () => {
          positionAttr.needsUpdate = true;
          self._tween = null;
          resolve();
        },
      });
    });
  }

  enablePhysics() {
    if (!this.points) return;
    this.physicsActive = true;
  }

  startLoadingAnimation() {
    if (!this.points) return;
    this.isLoading = true;
    if (this._loadingTween) this._loadingTween.kill();
    this._loadingTween = gsap.to(this.points.rotation, {
      y: this.points.rotation.y + Math.PI * 6,
      x: this.points.rotation.x + Math.PI * 3,
      duration: 6, ease: "linear", repeat: -1,
    });
  }

  stopLoadingAnimation() {
    this.isLoading = false;
    if (this._loadingTween) { this._loadingTween.kill(); this._loadingTween = null; }
  }

  // ── 水波扩散：网格位移平均 + 纯 lerp（无速度无振荡）──

  updatePhysics() {
    if (!this.physicsActive || !this.points) return;

    raycaster.setFromCamera(mouseNDC, camera);
    raycaster.ray.intersectPlane(mousePlane, mouseWorld);

    const positions = this._corePoints.geometry.attributes.position.array;
    const targets = this.targetPositions;
    const n = this.pointCount;
    const time = performance.now() * 0.001;

    // ── Step 1: 构建空间网格 + 每格每位移平均 ──
    const cellSize = 3.0;
    const grid = new Map();

    for (let i = 0; i < n; i++) {
      const i3 = i * 3;
      const cx = Math.floor(positions[i3] / cellSize);
      const cy = Math.floor(positions[i3 + 1] / cellSize);
      const key = cx + "," + cy;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(i);
    }

    const cellDX = new Map(), cellDY = new Map(), cellCount = new Map();
    for (const [key, indices] of grid) {
      let sx = 0, sy = 0;
      for (const idx of indices) {
        const i3 = idx * 3;
        sx += positions[i3]     - targets[i3];
        sy += positions[i3 + 1] - targets[i3 + 1];
      }
      const cnt = indices.length;
      cellDX.set(key, sx / cnt);
      cellDY.set(key, sy / cnt);
      cellCount.set(key, cnt);
    }

    // ── Step 2: 鼠标推动（直接位移，不注能量）──
    if (!this._lmx) { this._lmx = mouseWorld.x; this._lmy = mouseWorld.y; }
    this._lmx += (mouseWorld.x - this._lmx) * 0.5;
    this._lmy += (mouseWorld.y - this._lmy) * 0.5;

    const mouseR = 8.0;
    for (let i = 0; i < n; i++) {
      const i3 = i * 3;
      const mx = positions[i3] - this._lmx;
      const my = positions[i3 + 1] - this._lmy;
      const dist = Math.sqrt(mx * mx + my * my);

      if (dist < mouseR && dist > 0.001) {
        const f = (1 - dist / mouseR) * 0.15;
        positions[i3]     += (mx / dist) * f;
        positions[i3 + 1] += (my / dist) * f;
      }
    }

    // ── Step 3: 水波扩散（每格位移与邻居平均，模拟扩散）──
    const newCellDX = new Map(), newCellDY = new Map();
    for (const [key, dx] of cellDX) {
      const [cx, cy] = key.split(",").map(Number);
      let sumX = dx, sumY = cellDY.get(key), totalW = 1;
      // 4邻居扩散
      for (const [nx, ny] of [[2,0],[-2,0],[0,2],[0,-2],[1,1],[1,-1],[-1,1],[-1,-1]]) {
        const nk = (cx + nx) + "," + (cy + ny);
        if (cellDX.has(nk)) {
          sumX += cellDX.get(nk); sumY += cellDY.get(nk);
          totalW++;
        }
      }
      newCellDX.set(key, sumX / totalW * 0.92);
      newCellDY.set(key, sumY / totalW * 0.92);
    }

    // ── Step 4: 粒子 pure lerp 回目标（含呼吸 + 扩散位移）──
    const lerpSpeed = 0.04;

    for (let i = 0; i < n; i++) {
      const i3 = i * 3;
      const px = positions[i3], py = positions[i3 + 1], pz = positions[i3 + 2];
      const tx = targets[i3], ty = targets[i3 + 1], tz = targets[i3 + 2];

      // 极微呼吸
      const swayX = Math.sin(time * 0.18 + ty * 0.2) * 0.035
                  + Math.cos(time * 0.25 + pz * 0.15) * 0.025;
      const swayY = Math.cos(time * 0.20 + tx * 0.2) * 0.035
                  + Math.sin(time * 0.22 + pz * 0.18) * 0.025;

      // 水波扩散影响
      const cx = Math.floor(px / cellSize);
      const cy = Math.floor(py / cellSize);
      const key = cx + "," + cy;
      const waveX = newCellDX.get(key) || 0;
      const waveY = newCellDY.get(key) || 0;

      positions[i3]     += (tx + swayX + waveX * 0.3 - px) * lerpSpeed;
      positions[i3 + 1] += (ty + swayY + waveY * 0.3 - py) * lerpSpeed;
      positions[i3 + 2] += (tz - pz) * lerpSpeed * 0.6;
    }

    this._corePoints.geometry.attributes.position.needsUpdate = true;

    // ── 浮光粒子：从底部上升，到顶部后回到底部 ──
    if (this._floatPoints && this._floatPositions) {
      const fp = this._floatPositions;
      const fv = this._floatVelocities;
      const fn = this._floatCount;
      const rangeY = this._floatRangeY;
      const minY = this._floatMinY;
      const maxY = this._floatMaxY;
      const rangeX = this._floatRangeX;

      const bottomY = minY - rangeY * 0.2;
      const topY = maxY + rangeY * 0.3;

      for (let i = 0; i < fn; i++) {
        const i3 = i * 3;

        // 缓慢正弦漂移：每条粒子的频率/相位不同，飘散方向各异
        const driftX = Math.sin(time * 0.4 + i * 0.7) * 0.005 + Math.cos(time * 0.35 + i) * 0.003;
        const driftZ = Math.cos(time * 0.45 + i * 0.6) * 0.004 + Math.sin(time * 0.38 + i) * 0.003;

        fp[i3]     += fv[i3] + driftX;
        fp[i3 + 1] += fv[i3 + 1];
        fp[i3 + 2] += fv[i3 + 2] + driftZ;

        // 到达顶部或出界 → 回到底部随机位置重生
        if (fp[i3 + 1] > topY) {
          fp[i3 + 1] = bottomY - Math.random() * rangeY * 0.3;
          fp[i3]     = (Math.random() - 0.5) * rangeX * 1.4;
          fp[i3 + 2] = (Math.random() - 0.5) * 5;
          fv[i3 + 1] = 0.004 + Math.random() * 0.016;
          // 重生时随机换一个飘散方向
          const newAngle = Math.random() * Math.PI * 2;
          fv[i3]     = Math.cos(newAngle) * (0.002 + Math.random() * 0.006);
          fv[i3 + 2] = Math.sin(newAngle) * (0.001 + Math.random() * 0.004);
        }
      }
      this._floatPoints.geometry.attributes.position.needsUpdate = true;
    }
  }
}

// ═══════════════════════════════════════════
// 关键词 → 图像匹配
// ═══════════════════════════════════════════
function analyzeText(text) {
  if (/猫|冰淇淋/.test(text)) {
    return { image: "./assets/cat.png", color: "#FFFACD" };
  }
  if (/塔|压抑|工作/.test(text)) {
    return { image: "./assets/tower.png", color: "#8A2BE2" };
  }
  if (/游乐场|开心/.test(text)) {
    return { image: "./assets/ferris_wheel.png", color: "#FF7F50" };
  }
  const defaults = [
    { image: "./assets/tower.png", color: "#8A2BE2" },
    { image: "./assets/cat.png",   color: "#FFFACD" },
    { image: "./assets/ferris_wheel.png", color: "#FF7F50" },
  ];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

// ═══════════════════════════════════════════
// 后端 API 调用 — 分析日记 + 生图（无前端 API Key）
// ═══════════════════════════════════════════
async function analyzeAndGenerate(text) {
  console.log("[MindScape] 正在呼叫后端 API 分析日记...");

  try {
    const response = await fetch(MINDSCAPE_API_URL + "/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error("【API 错误】", data.error || "未知错误");
      alert("生成失败：" + (data.error || "请检查后端服务是否正常"));
      return null;
    }

    console.log("[MindScape] API 返回成功:", data.themeColor, "颜色组:", data.llmColors);
    return { imageUrl: data.imageUrl, themeColor: data.themeColor, llmColors: data.llmColors || [] };

  } catch (error) {
    console.error("【API 不可达】", error);
    alert("无法连接到后端服务，请检查网络或服务器状态。");
    return null;
  }
}

// ═══════════════════════════════════════════
// 粒子状态辅助函数
// ═══════════════════════════════════════════
function disposeCurrentParticleSystem() {
  if (!particleSystem) return;
  particleSystem.physicsActive = false;
  if (particleSystem._tween) particleSystem._tween.kill();
  if (particleSystem._loadingTween) particleSystem._loadingTween.kill();
  if (particleSystem.points) {
    scene.remove(particleSystem.points);
    // dispose each child in Group
    particleSystem.points.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
    });
  }
  // 清理漂浮粒子引用
  if (particleSystem._floatPoints) {
    particleSystem._floatPoints.geometry.dispose();
    particleSystem._floatPoints.material.dispose();
    particleSystem._floatPoints = null;
  }
  if (particleSystem._floatPositions) particleSystem._floatPositions = null;
  if (particleSystem._floatVelocities) particleSystem._floatVelocities = null;
  particleSystem = null;
}

async function loadSavedParticle(imageUrl, themeColor) {
  disposeCurrentParticleSystem();
  const color = themeColor || "#803E4D";
  particleSystem = new ImageToParticles(imageUrl, { step: 8, nebulaRadius: 14 });
  try {
    const pts = await particleSystem.init();
    scene.add(pts);
    particleSystem.assembleParticles(color, 2.5);
  } catch (err) {
    console.error("[MindScape] 恢复粒子失败:", err.message);
  }
}

async function disperseAndClear() {
  if (!particleSystem) { initNebula(); return; }
  if (particleSystem.points && particleSystem._corePoints) {
    await particleSystem.disperseToSphere(1.2);
  }
  // 分散后再重建干净的星云
  disposeCurrentParticleSystem();
  initNebula();
}

function initNebula() {
  particleSystem = new ImageToParticles(null, { nebulaRadius: 13 });
  particleSystem.initNebulaOnly(3000).then(pts => {
    scene.add(pts);
    particleSystem.enablePhysics();
  }).catch(err => console.error("[MindScape] 初始化星云失败:", err));
}

// ═══════════════════════════════════════════
// 暖色库
// ═══════════════════════════════════════════
const WARM_COLORS = [
  "#FFD700", "#FF7F50", "#FF6B6B", "#FFB347",
  "#FF8C42", "#FF6B9D", "#FFA07A", "#FFC154",
];
function randomWarmColor() {
  return WARM_COLORS[Math.floor(Math.random() * WARM_COLORS.length)];
}

// ═══════════════════════════════════════════

// ═══════════════════════════════════════════
// 启动 — 星云球体
// ═══════════════════════════════════════════
let particleSystem = null;
initNebula();

// ═══════════════════════════════════════════
// 输入框逻辑（新版：打散→球体旋转→生成→销毁→重建）
// ═══════════════════════════════════════════
const diaryInput = document.getElementById("diaryInput");

diaryInput.addEventListener("keydown", async (e) => {
  if (e.key !== "Enter") return;
  const text = e.target.value.trim();
  if (!text) return;

  console.log("[MindScape] 输入:", text);
  e.target.value = "";
  e.target.placeholder = "正在重构思绪...";
  diaryInput.disabled = true;

  const ps = particleSystem;

  // ① 如果有粒子形状 → 打散回球体，然后旋转
  if (ps && ps._corePoints) {
    const isNebula = !ps.imagePath; // imagePath=null 说明是纯星云
    if (!isNebula) {
      await ps.disperseToSphere(1.5);
    }
    ps.startLoadingAnimation();
  }

  // ② 调用后端 API
  const result = await analyzeAndGenerate(text);
  if (ps) ps.stopLoadingAnimation();

  if (!result || !result.imageUrl) {
    console.error("[MindScape] 后端 API 返回失败");
    e.target.placeholder = "这一刻，你在想什么？";
    diaryInput.disabled = false;
    return;
  }

  // ③ 彻底销毁旧粒子球（不留幽灵）
  disposeCurrentParticleSystem();

  // ④ 用新图创建新粒子系统
  const color = result.themeColor || "#803E4D";
  particleSystem = new ImageToParticles(result.imageUrl, { step: 8, nebulaRadius: 14, llmColors: result.llmColors || [] });
  try {
    const pts = await particleSystem.init();
    scene.add(pts);
  } catch (err) {
    console.error("[MindScape] 图片加载失败:", err.message);
    e.target.placeholder = "这一刻，你在想什么？";
    diaryInput.disabled = false;
    initNebula();
    return;
  }

  particleSystem.assembleParticles(color, 2.5);
  e.target.placeholder = "这一刻，你在想什么？";
  diaryInput.disabled = false;

  // ⑤ 状态记忆：保存文字 + 更新颜色 + 重绘时间轴
  const currentDiary = mockDiaries[currentActiveDiaryIndex];
  if (currentDiary) {
    currentDiary.text = text;                          // 保存用户输入的文字
    currentDiary.color = color;                        // 更新左侧圆点颜色
    currentDiary.generatedImageUrl = result.imageUrl;
    currentDiary.themeColor = color;
    renderTimeline();                                   // 刷新左栏显示
    console.log("[MindScape] 日记已保存:", currentDiary.date, currentDiary.text);
  }
});

// ═══════════════════════════════════════════
// URL 参数模式：?img=URL&color=HEX → 直接加载指定图片
// ═══════════════════════════════════════════
(function initURLMode() {
  const params = new URLSearchParams(window.location.search);
  const imgUrl = params.get("img");
  const color = params.get("color") || "#803E4D";

  if (!imgUrl) return; // 无参数，走正常星云模式

  console.log("[MindScape] URL 参数模式 — 直接加载:", decodeURIComponent(imgUrl).substring(0, 60));

  // 隐藏输入框
  const inputEl = document.getElementById("input-container");
  const hintEl = document.getElementById("hint");
  if (inputEl) inputEl.style.display = "none";
  if (hintEl) hintEl.style.display = "none";

  // 先加载星云，再替换为参数图片
  particleSystem.initNebulaOnly(3000).then((points) => {
    scene.add(points);
    particleSystem.enablePhysics();
    console.log("[MindScape] 星云就绪，1秒后加载参数图片...");

    setTimeout(async () => {
      const decodedUrl = decodeURIComponent(imgUrl);

      // 打散星云
      if (particleSystem && particleSystem.points) {
        await particleSystem.disperseParticles(0.6);
      }

      // 创建新粒子系统
      particleSystem = new ImageToParticles(decodedUrl, { step: 8, nebulaRadius: 14 });
      try {
        const pts = await particleSystem.init();
        scene.add(pts);
      } catch (err) {
        console.error("[MindScape] URL 图片加载失败:", err.message);
        return;
      }
      particleSystem.assembleParticles(color, 2.5);
    }, 1200);
  }).catch((err) => {
    console.error("[MindScape] URL 模式初始化失败:", err);
  });
})();

// ── 渲染循环 ──
function animate() {
  requestAnimationFrame(animate);
  if (particleSystem) particleSystem.updatePhysics();
  renderer.render(scene, camera);
}
animate();


// ── 渲染循环 ──
function animate() {
  requestAnimationFrame(animate);
  if (particleSystem) particleSystem.updatePhysics();
  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  const s = getRightPanelSize();
  camera.aspect = s.w / s.h;
  camera.updateProjectionMatrix();
  renderer.setSize(s.w, s.h);
});
