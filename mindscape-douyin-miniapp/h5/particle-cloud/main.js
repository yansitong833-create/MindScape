(function () {
  const errEl = document.getElementById('err');

  function showError(msg) {
    if (!errEl) return;
    errEl.classList.add('show');
    errEl.textContent = msg;
  }

  function readPayload() {
    const params = new URLSearchParams(window.location.search);
    const rawHash = params.get('textHash');
    return {
      cacheKey: params.get('cacheKey') || '',
      text: params.get('text') || '',
      presetKey: params.get('presetKey') || '',
      themeColor: params.get('themeColor') || '',
      textHash: rawHash ? Number(rawHash) : null,
    };
  }

  function notifyMiniProgram(payload) {
    try {
      if (typeof tt !== 'undefined' && tt.miniProgram && tt.miniProgram.postMessage) {
        tt.miniProgram.postMessage({ data: payload });
      } else if (typeof wx !== 'undefined' && wx.miniProgram && wx.miniProgram.postMessage) {
        wx.miniProgram.postMessage({ data: payload });
      }
    } catch (_) {
      /* ignore */
    }
  }

  function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6d2b79f5;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** data: URL 内 WebView 禁用 localStorage，回退到内存缓存 */
  function createStorage() {
    const mem = new Map();
    let ls = null;
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        const probe = '__ms_storage_probe__';
        localStorage.setItem(probe, '1');
        localStorage.removeItem(probe);
        ls = localStorage;
      }
    } catch (_) {
      ls = null;
    }
    return {
      getItem(key) {
        if (ls) {
          try {
            return ls.getItem(key);
          } catch (_) {
            /* fall through */
          }
        }
        return mem.has(key) ? mem.get(key) : null;
      },
      setItem(key, value) {
        if (ls) {
          try {
            ls.setItem(key, value);
            return;
          } catch (_) {
            /* fall through */
          }
        }
        mem.set(key, value);
      },
    };
  }

  const storage = createStorage();

  const PAYLOAD = readPayload();
  const CACHE_KEY = PAYLOAD.cacheKey;
  const INPUT_TEXT = PAYLOAD.text;

  if (typeof THREE === 'undefined' || typeof gsap === 'undefined') {
    showError('依赖库加载失败，请确认 libs/three.min.js 与 libs/gsap.min.js 已随页面一同部署。');
    return;
  }

  function hashString(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function pickPresetKey(text, seed) {
    if (/猫|冰淇淋/.test(text)) return 'cat';
    if (/塔|压抑|工作/.test(text)) return 'tower';
    if (/游乐场|开心/.test(text)) return 'ferris_wheel';
    const list = ['tower', 'cat', 'ferris_wheel'];
    return list[Math.abs(seed) % list.length];
  }

  function presetThemeColor(key) {
    if (key === 'cat') return '#FFFACD';
    if (key === 'tower') return '#8A2BE2';
    return '#FF7F50';
  }

  function drawPresetToCanvas(key, ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(w / 512, h / 512);
    ctx.translate(-256, -256);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = '#000000';

    if (key === 'tower') {
      ctx.fillRect(170, 120, 172, 320);
      ctx.fillRect(130, 400, 252, 60);
      ctx.beginPath();
      ctx.moveTo(256, 60);
      ctx.lineTo(190, 120);
      ctx.lineTo(322, 120);
      ctx.closePath();
      ctx.fill();
      ctx.clearRect(220, 180, 72, 72);
      ctx.clearRect(220, 280, 72, 72);
    } else if (key === 'ferris_wheel') {
      ctx.beginPath();
      ctx.arc(256, 230, 150, 0, Math.PI * 2);
      ctx.fill();
      ctx.clearRect(0, 0, 512, 512);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(256, 230, 150, 0, Math.PI * 2);
      ctx.lineWidth = 26;
      ctx.strokeStyle = '#000000';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(256, 230, 22, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 10; i++) {
        const a = i * ((Math.PI * 2) / 10);
        ctx.beginPath();
        ctx.moveTo(256, 230);
        ctx.lineTo(256 + Math.cos(a) * 150, 230 + Math.sin(a) * 150);
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#000000';
        ctx.stroke();
      }
      ctx.fillRect(140, 410, 232, 28);
      ctx.fillRect(170, 438, 172, 16);
    } else {
      ctx.beginPath();
      ctx.ellipse(256, 350, 85, 100, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(256, 210, 90, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(185, 150);
      ctx.lineTo(135, 50);
      ctx.lineTo(225, 120);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(327, 150);
      ctx.lineTo(377, 50);
      ctx.lineTo(287, 120);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(226, 200, 15, 18, 0, 0, Math.PI * 2);
      ctx.ellipse(286, 200, 15, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(256, 228);
      ctx.lineTo(248, 240);
      ctx.lineTo(264, 240);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function createParticleTexture() {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,1)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.5)');
    g.addColorStop(0.75, 'rgba(255,255,255,0.03)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  class ImageToParticles {
    constructor(targetPositions, options = {}) {
      this.targetPositions = targetPositions;
      this.pointCount = targetPositions.length / 3;
      this.nebulaRadius = options.nebulaRadius ?? 14;
      this.currentPositions = null;
      this.points = null;
      this.physicsActive = false;
      this._tween = null;
    }

    buildNebulaPositions() {
      const count = this.pointCount;
      const arr = new Float32Array(count * 3);
      const R = this.nebulaRadius;
      for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = R * (0.4 + Math.random() * 0.6);
        arr[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
        arr[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
        arr[i * 3 + 2] = Math.cos(phi) * r;
      }
      this.currentPositions = arr;
    }

    createPointCloud(themeColor) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(this.currentPositions, 3));
      geometry.setAttribute('aTarget', new THREE.BufferAttribute(this.targetPositions, 3));

      const colors = new Float32Array(this.pointCount * 3);
      for (let i = 0; i < this.pointCount; i++) {
        const roll = Math.random();
        const base = roll < 0.8 ? 0.35 : 1.05;
        colors[i * 3] = base;
        colors[i * 3 + 1] = base;
        colors[i * 3 + 2] = base;
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const tex = createParticleTexture();
      const matGlow = new THREE.PointsMaterial({
        size: 0.7,
        map: tex,
        color: 0xffffff,
        vertexColors: true,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        blending: THREE.NormalBlending,
        sizeAttenuation: true,
      });
      const matCore = new THREE.PointsMaterial({
        size: 0.28,
        map: tex,
        color: 0xffffff,
        vertexColors: true,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
        blending: THREE.NormalBlending,
        sizeAttenuation: true,
      });

      if (themeColor) {
        const tint = new THREE.Color(themeColor);
        matCore.color.copy(tint);
        const tintGlow = new THREE.Color(themeColor).lerp(new THREE.Color(0xffffff), 0.5);
        matGlow.color.copy(tintGlow);
      }

      const group = new THREE.Group();
      this._glowPoints = new THREE.Points(geometry, matGlow);
      this._corePoints = new THREE.Points(geometry, matCore);
      group.add(this._glowPoints);
      group.add(this._corePoints);
      this.points = group;
      return group;
    }

    assemble(duration = 2.5) {
      if (!this.points) return;
      if (this._tween) {
        this._tween.kill();
        this._tween = null;
      }
      const startPositions = new Float32Array(this.currentPositions);
      const target = this.targetPositions;
      const current = this.currentPositions;
      const count = this.pointCount;
      const positionAttr = this._corePoints.geometry.attributes.position;
      const proxy = { progress: 0 };
      this.physicsActive = false;
      this._tween = gsap.to(proxy, {
        progress: 1,
        duration,
        ease: 'expo.out',
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
          this._tween = null;
          this.physicsActive = true;
        },
      });
    }

    updatePhysics(raycaster, mouseNDC, camera) {
      if (!this.physicsActive || !this.points) return;
      const mousePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const mouseWorld = new THREE.Vector3(9999, 9999, 0);
      raycaster.setFromCamera(mouseNDC, camera);
      raycaster.ray.intersectPlane(mousePlane, mouseWorld);
      const positions = this._corePoints.geometry.attributes.position.array;
      const targets = this.targetPositions;
      const n = this.pointCount;
      const time = performance.now() * 0.001;
      const lerpSpeed = 0.04;
      const mouseR = 8.0;

      if (!this._lmx) {
        this._lmx = mouseWorld.x;
        this._lmy = mouseWorld.y;
      }
      this._lmx += (mouseWorld.x - this._lmx) * 0.5;
      this._lmy += (mouseWorld.y - this._lmy) * 0.5;

      for (let i = 0; i < n; i++) {
        const i3 = i * 3;
        const px = positions[i3];
        const py = positions[i3 + 1];
        const pz = positions[i3 + 2];
        const tx = targets[i3];
        const ty = targets[i3 + 1];
        const tz = targets[i3 + 2];

        const mx = px - this._lmx;
        const my = py - this._lmy;
        const dist = Math.sqrt(mx * mx + my * my);
        let pushX = 0;
        let pushY = 0;
        if (dist < mouseR && dist > 0.001) {
          const f = (1 - dist / mouseR) * 0.15;
          pushX = (mx / dist) * f;
          pushY = (my / dist) * f;
        }

        const swayX = Math.sin(time * 0.18 + ty * 0.2) * 0.035 + Math.cos(time * 0.25 + pz * 0.15) * 0.025;
        const swayY = Math.cos(time * 0.2 + tx * 0.2) * 0.035 + Math.sin(time * 0.22 + pz * 0.18) * 0.025;

        positions[i3] += (tx + swayX - px) * lerpSpeed + pushX;
        positions[i3 + 1] += (ty + swayY - py) * lerpSpeed + pushY;
        positions[i3 + 2] += (tz - pz) * lerpSpeed * 0.6;
      }
      this._corePoints.geometry.attributes.position.needsUpdate = true;
    }
  }

  function buildTargetPositionsFromPreset(presetKey, textHash, rnd) {
    const cacheId = 'mindscape_pc_' + CACHE_KEY;
    const stored = storage.getItem(cacheId);
    if (stored) {
      try {
        const obj = JSON.parse(stored);
        if (obj && obj.textHash === textHash && obj.presetKey === presetKey && Array.isArray(obj.targets)) {
          return new Float32Array(obj.targets);
        }
      } catch (_) {
        /* ignore */
      }
    }

    const off = document.createElement('canvas');
    off.width = 512;
    off.height = 512;
    const ctx = off.getContext('2d');
    drawPresetToCanvas(presetKey, ctx, 512, 512);
    const img = ctx.getImageData(0, 0, 512, 512);
    const data = img.data;
    const step = 8;
    const brightnessThreshold = 128;
    const arr = [];
    const halfW = 256;
    const halfH = 256;
    for (let y = 0; y < 512; y += step) {
      for (let x = 0; x < 512; x += step) {
        const idx = (y * 512 + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        const brightness = (r + g + b) / 3;
        if (brightness < brightnessThreshold && a > 128) {
          const vx = (x - halfW) * 0.05 + (rnd() - 0.5) * 0.2;
          const vy = -(y - halfH) * 0.05 + (rnd() - 0.5) * 0.2;
          const vz = (rnd() - 0.5) * 1.5;
          arr.push(vx, vy, vz);
        }
      }
    }
    const targets = new Float32Array(
      arr.length ? arr : new Array(3000).fill(0).map(() => (rnd() - 0.5) * 24),
    );
    try {
      storage.setItem(cacheId, JSON.stringify({ textHash, presetKey, targets: Array.from(targets) }));
    } catch (_) {
      /* ignore */
    }
    notifyMiniProgram({
      type: 'PARTICLE_CLOUD_SAVE',
      cacheKey: CACHE_KEY,
      textHash,
      presetKey,
      themeColor: presetThemeColor(presetKey),
      targets: Array.from(targets),
    });
    return targets;
  }

  function main() {
    const wrap = document.getElementById('wrap');
    const canvas = document.getElementById('c');
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    } catch (e) {
      showError('WebGL 不可用：' + (e && e.message ? e.message : String(e)));
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 2, 2));
    renderer.setClearColor(0xf9f6f0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.set(0, 0, 40);
    camera.lookAt(0, 0, 0);

    const raycaster = new THREE.Raycaster();
    const mouseNDC = new THREE.Vector2(9999, 9999);

    function getSize() {
      const rect = wrap && wrap.getBoundingClientRect ? wrap.getBoundingClientRect() : null;
      const w = rect && rect.width ? rect.width : canvas.clientWidth || window.innerWidth;
      const h = rect && rect.height ? rect.height : canvas.clientHeight || window.innerHeight;
      return { w: Math.max(1, w), h: Math.max(1, h) };
    }

    function fitCameraToTargets(targets) {
      let maxX = 0;
      let maxY = 0;
      for (let i = 0; i < targets.length; i += 3) {
        const x = Math.abs(targets[i]);
        const y = Math.abs(targets[i + 1]);
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
      const vFov = (camera.fov * Math.PI) / 180;
      const aspect = camera.aspect || 1;
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
      const padding = 0.62;
      const zByY = maxY / (Math.tan(vFov / 2) * padding);
      const zByX = maxX / (Math.tan(hFov / 2) * padding);
      const z = Math.max(zByX, zByY);
      camera.position.set(0, 0, Math.max(26, Math.min(95, z)));
      camera.lookAt(0, 0, 0);
    }

    function resize() {
      const s = getSize();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 2, 2));
      renderer.setSize(s.w, s.h, false);
      camera.aspect = s.w / s.h;
      camera.updateProjectionMatrix();
    }

    function ensureSized() {
      const s = getSize();
      if (s.w <= 2 || s.h <= 2) {
        requestAnimationFrame(ensureSized);
        return;
      }
      resize();
    }

    ensureSized();
    window.addEventListener('resize', resize, { passive: true });
    if (typeof ResizeObserver === 'function' && wrap) {
      new ResizeObserver(() => resize()).observe(wrap);
    }

    window.addEventListener(
      'mousemove',
      (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        mouseNDC.x = x * 2 - 1;
        mouseNDC.y = -(y * 2 - 1);
      },
      { passive: true },
    );
    window.addEventListener(
      'touchmove',
      (e) => {
        if (!e.touches || !e.touches.length) return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.touches[0].clientX - rect.left) / rect.width;
        const y = (e.touches[0].clientY - rect.top) / rect.height;
        mouseNDC.x = x * 2 - 1;
        mouseNDC.y = -(y * 2 - 1);
      },
      { passive: true },
    );

    const merged = (INPUT_TEXT || '').trim();
    const seed =
      PAYLOAD.textHash != null && !Number.isNaN(PAYLOAD.textHash) ? PAYLOAD.textHash : hashString(merged);
    const presetKey = PAYLOAD.presetKey || pickPresetKey(merged, seed);
    const themeColor = PAYLOAD.themeColor || presetThemeColor(presetKey);
    const rnd = mulberry32(seed);
    const targets = buildTargetPositionsFromPreset(presetKey, seed, rnd);
    resize();
    fitCameraToTargets(targets);

    const ps = new ImageToParticles(targets, { nebulaRadius: 14 });
    ps.buildNebulaPositions();
    const pts = ps.createPointCloud(themeColor);
    pts.scale.setScalar(0.82);
    scene.add(pts);
    ps.assemble(2.5);

    function animate() {
      requestAnimationFrame(animate);
      ps.updatePhysics(raycaster, mouseNDC, camera);
      renderer.render(scene, camera);
    }
    animate();
  }

  try {
    main();
  } catch (e) {
    showError('粒子云初始化失败：' + (e && e.message ? e.message : String(e)));
  }
})();
