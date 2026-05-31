/**
 * MindScape 粒子云独立引擎 — 完整流程：星云 → 打散 → 汇聚 → 物理交互
 * 用法: MindScapeParticle.init({ canvas, imageUrl, themeColor, llmColors })
 */
(function (global) {
  "use strict";

  function createParticleTexture() {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext("2d");
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.75, "rgba(255,255,255,1)");
    gradient.addColorStop(0.82, "rgba(255,255,255,0.6)");
    gradient.addColorStop(0.92, "rgba(255,255,255,0.08)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  class ImageToParticles {
    constructor(imagePath, options, ctx) {
      this.ctx = ctx;
      this.imagePath = imagePath;
      this.step = options.step ?? 5;
      this.nebulaRadius = options.nebulaRadius ?? 14;
      this.brightnessThreshold = options.brightnessThreshold ?? 128;
      this.llmColors = options.llmColors || null;
      this.targetPositions = null;
      this.currentPositions = null;
      this.pointCount = 0;
      this.points = null;
      this.physicsActive = false;
      this._tween = null;
      this._loadingTween = null;
    }

    async init() {
      const img = await this._loadImage(this.imagePath);
      const { data, width, height } = this._readPixels(img);
      this._buildTargetPositions(data, width, height);
      if (this.pointCount === 0) {
        throw new Error("未能从剪影中提取粒子，请检查图片格式");
      }
      this._buildNebulaPositions();
      return this._createPointCloud();
    }

    async initNebulaOnly(count) {
      this.pointCount = count ?? 2500;
      const arr = new Float32Array(this.pointCount * 3);
      const R = this.nebulaRadius;
      for (let i = 0; i < this.pointCount; i++) {
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
        arr[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
        arr[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
        arr[i * 3 + 2] = Math.cos(phi) * r;
      }
      this.currentPositions = arr;
      this.targetPositions = new Float32Array(arr);
      return this._createPointCloud();
    }

    async _loadImage(src) {
      let resolvedSrc = src;
      if (/^https?:\/\//.test(resolvedSrc)) {
        const response = await fetch(resolvedSrc);
        if (!response.ok) throw new Error("HTTP " + response.status);
        const blob = await response.blob();
        resolvedSrc = URL.createObjectURL(blob);
      }
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("无法加载图片"));
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
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          const alpha = data[idx + 3];
          if (brightness < brightnessThreshold && alpha > 128) {
            arr.push(
              (x - halfW) * scale + (Math.random() - 0.5) * 0.2,
              -(y - halfH) * scale + (Math.random() - 0.5) * 0.2,
              (Math.random() - 0.5) * 1.5
            );
          }
        }
      }
      this.pointCount = arr.length / 3;
      this.targetPositions = new Float32Array(arr);
    }

    _buildNebulaPositions() {
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

    _createPointCloud() {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(this.currentPositions, 3));
      geometry.setAttribute("aTarget", new THREE.BufferAttribute(this.targetPositions, 3));

      const colors = new Float32Array(this.pointCount * 3);
      if (this.llmColors && this.llmColors.length > 0) {
        let cumulative = 0;
        const colorStops = this.llmColors.map((c) => {
          cumulative += c.proportion;
          const hex = c.color.startsWith("#") ? c.color : "#803E4D";
          return {
            r: parseInt(hex.slice(1, 3), 16) / 255,
            g: parseInt(hex.slice(3, 5), 16) / 255,
            b: parseInt(hex.slice(5, 7), 16) / 255,
            threshold: cumulative,
          };
        });
        for (let i = 0; i < this.pointCount; i++) {
          const roll = Math.random();
          let picked = colorStops[0];
          for (const cs of colorStops) {
            if (roll < cs.threshold) { picked = cs; break; }
          }
          const v = 0.55 + Math.random() * 0.55;
          colors[i * 3] = Math.min(picked.r * v, 1.2);
          colors[i * 3 + 1] = Math.min(picked.g * v, 1.2);
          colors[i * 3 + 2] = Math.min(picked.b * v, 1.2);
        }
      } else {
        const hex = "#803E4D";
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        for (let i = 0; i < this.pointCount; i++) {
          const v = 0.55 + Math.random() * 0.55;
          colors[i * 3] = r * v;
          colors[i * 3 + 1] = g * v;
          colors[i * 3 + 2] = b * v;
        }
      }
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const tex = createParticleTexture();
      const matGlow = new THREE.PointsMaterial({
        size: 0.10, map: tex, color: 0xffffff, vertexColors: true,
        transparent: true, opacity: 0.15, depthWrite: false,
        blending: THREE.NormalBlending, sizeAttenuation: true,
      });
      const matCore = new THREE.PointsMaterial({
        size: 0.50, map: tex, color: 0xffffff, vertexColors: true,
        transparent: true, opacity: 0.92, depthWrite: false,
        blending: THREE.NormalBlending, sizeAttenuation: true,
      });

      const group = new THREE.Group();
      this._glowPoints = new THREE.Points(geometry, matGlow);
      this._corePoints = new THREE.Points(geometry, matCore);
      group.add(this._glowPoints);
      group.add(this._corePoints);

      const floatCount = 200;
      this._floatCount = floatCount;
      const floatPositions = new Float32Array(floatCount * 3);
      const floatVelocities = new Float32Array(floatCount * 3);
      let minY = Infinity, maxY = -Infinity;
      for (let i = 0; i < this.pointCount; i++) {
        const y = this.targetPositions[i * 3 + 1];
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      const rangeY = maxY - minY || 6;
      const rangeX = 10;
      for (let i = 0; i < floatCount; i++) {
        floatPositions[i * 3] = (Math.random() - 0.5) * rangeX * 1.4;
        floatPositions[i * 3 + 1] = minY - rangeY * 0.3 + Math.random() * rangeY * 1.5;
        floatPositions[i * 3 + 2] = (Math.random() - 0.5) * 5;
        const angle = Math.random() * Math.PI * 2;
        floatVelocities[i * 3] = Math.cos(angle) * (0.002 + Math.random() * 0.006);
        floatVelocities[i * 3 + 1] = 0.004 + Math.random() * 0.016;
        floatVelocities[i * 3 + 2] = Math.sin(angle) * (0.001 + Math.random() * 0.004);
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
        size: 0.40, map: tex, color: 0xffffff, transparent: true, opacity: 0.85,
        depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
      });
      this._floatPoints = new THREE.Points(floatGeo, matFloat);
      group.add(this._floatPoints);
      this.points = group;
      return group;
    }

    assembleParticles(colorHex, duration) {
      if (!this.points) return;
      if (this._tween) { this._tween.kill(); this._tween = null; }
      const startPositions = new Float32Array(this.currentPositions);
      const target = this.targetPositions;
      const current = this.currentPositions;
      const count = this.pointCount;
      const positionAttr = this._corePoints.geometry.attributes.position;
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
        progress: 1, duration: duration ?? 2.5, ease: "expo.out",
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

    disperseParticles(duration) {
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
          scatterTargets[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
          scatterTargets[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
          scatterTargets[i * 3 + 2] = Math.cos(phi) * r;
        }
        const startPositions = new Float32Array(current);
        const proxy = { progress: 0 };
        const self = this;
        gsap.to(proxy, {
          progress: 1, duration: duration ?? 0.9, ease: "power3.in",
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
              }
              self.points = null;
            }
            resolve();
          },
        });
      });
    }

    startLoadingAnimation() {
      if (!this.points) return;
      if (this._loadingTween) this._loadingTween.kill();
      this._loadingTween = gsap.to(this.points.rotation, {
        y: this.points.rotation.y + Math.PI * 6,
        x: this.points.rotation.x + Math.PI * 3,
        duration: 6, ease: "linear", repeat: -1,
      });
    }

    stopLoadingAnimation() {
      if (this._loadingTween) { this._loadingTween.kill(); this._loadingTween = null; }
    }

    enablePhysics() {
      if (this.points) this.physicsActive = true;
    }

    updatePhysics() {
      if (!this.physicsActive || !this.points) return;
      const ctx = this.ctx;
      ctx.raycaster.setFromCamera(ctx.mouseNDC, ctx.camera);
      ctx.raycaster.ray.intersectPlane(ctx.mousePlane, ctx.mouseWorld);

      const positions = this._corePoints.geometry.attributes.position.array;
      const targets = this.targetPositions;
      const n = this.pointCount;
      const time = performance.now() * 0.001;
      const cellSize = 3.0;
      const grid = new Map();

      for (let i = 0; i < n; i++) {
        const i3 = i * 3;
        const key = Math.floor(positions[i3] / cellSize) + "," + Math.floor(positions[i3 + 1] / cellSize);
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(i);
      }

      const cellDX = new Map(), cellDY = new Map();
      for (const [key, indices] of grid) {
        let sx = 0, sy = 0;
        for (const idx of indices) {
          const i3 = idx * 3;
          sx += positions[i3] - targets[i3];
          sy += positions[i3 + 1] - targets[i3 + 1];
        }
        cellDX.set(key, sx / indices.length);
        cellDY.set(key, sy / indices.length);
      }

      if (!this._lmx) { this._lmx = ctx.mouseWorld.x; this._lmy = ctx.mouseWorld.y; }
      this._lmx += (ctx.mouseWorld.x - this._lmx) * 0.5;
      this._lmy += (ctx.mouseWorld.y - this._lmy) * 0.5;

      const mouseR = 8.0;
      for (let i = 0; i < n; i++) {
        const i3 = i * 3;
        const mx = positions[i3] - this._lmx;
        const my = positions[i3 + 1] - this._lmy;
        const dist = Math.sqrt(mx * mx + my * my);
        if (dist < mouseR && dist > 0.001) {
          const f = (1 - dist / mouseR) * 0.15;
          positions[i3] += (mx / dist) * f;
          positions[i3 + 1] += (my / dist) * f;
        }
      }

      const newCellDX = new Map(), newCellDY = new Map();
      for (const [key, dx] of cellDX) {
        const [cx, cy] = key.split(",").map(Number);
        let sumX = dx, sumY = cellDY.get(key), totalW = 1;
        for (const [nx, ny] of [[2,0],[-2,0],[0,2],[0,-2],[1,1],[1,-1],[-1,1],[-1,-1]]) {
          const nk = (cx + nx) + "," + (cy + ny);
          if (cellDX.has(nk)) { sumX += cellDX.get(nk); sumY += cellDY.get(nk); totalW++; }
        }
        newCellDX.set(key, sumX / totalW * 0.92);
        newCellDY.set(key, sumY / totalW * 0.92);
      }

      const lerpSpeed = 0.04;
      for (let i = 0; i < n; i++) {
        const i3 = i * 3;
        const px = positions[i3], py = positions[i3 + 1], pz = positions[i3 + 2];
        const tx = targets[i3], ty = targets[i3 + 1], tz = targets[i3 + 2];
        const swayX = Math.sin(time * 0.18 + ty * 0.2) * 0.035 + Math.cos(time * 0.25 + pz * 0.15) * 0.025;
        const swayY = Math.cos(time * 0.20 + tx * 0.2) * 0.035 + Math.sin(time * 0.22 + pz * 0.18) * 0.025;
        const waveKey = Math.floor(px / cellSize) + "," + Math.floor(py / cellSize);
        positions[i3] += (tx + swayX + (newCellDX.get(waveKey) || 0) * 0.3 - px) * lerpSpeed;
        positions[i3 + 1] += (ty + swayY + (newCellDY.get(waveKey) || 0) * 0.3 - py) * lerpSpeed;
        positions[i3 + 2] += (tz - pz) * lerpSpeed * 0.6;
      }
      this._corePoints.geometry.attributes.position.needsUpdate = true;

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
          fp[i3] += fv[i3] + Math.sin(time * 0.4 + i * 0.7) * 0.005;
          fp[i3 + 1] += fv[i3 + 1];
          fp[i3 + 2] += fv[i3 + 2] + Math.cos(time * 0.45 + i * 0.6) * 0.004;
          if (fp[i3 + 1] > topY) {
            fp[i3 + 1] = bottomY - Math.random() * rangeY * 0.3;
            fp[i3] = (Math.random() - 0.5) * rangeX * 1.4;
            fp[i3 + 2] = (Math.random() - 0.5) * 5;
            fv[i3 + 1] = 0.004 + Math.random() * 0.016;
            const a = Math.random() * Math.PI * 2;
            fv[i3] = Math.cos(a) * (0.002 + Math.random() * 0.006);
            fv[i3 + 2] = Math.sin(a) * (0.001 + Math.random() * 0.004);
          }
        }
        this._floatPoints.geometry.attributes.position.needsUpdate = true;
      }
    }
  }

  function getCanvasSize(canvas) {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width || window.innerWidth));
    const h = Math.max(1, Math.round(rect.height || window.innerHeight));
    return { w, h };
  }

  async function init(options) {
    const canvas = options.canvas;
    const scene = new THREE.Scene();
    const size = getCanvasSize(canvas);
    const camera = new THREE.PerspectiveCamera(60, size.w / size.h, 0.1, 1000);
    camera.position.set(0, 0, 40);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(size.w, size.h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xF9F6F0);

    const ctx = {
      camera,
      raycaster: new THREE.Raycaster(),
      mousePlane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
      mouseWorld: new THREE.Vector3(9999, 9999, 0),
      mouseNDC: new THREE.Vector2(),
    };

    function onPointerMove(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width || size.w;
      const h = rect.height || size.h;
      ctx.mouseNDC.x = ((clientX - rect.left) / w) * 2 - 1;
      ctx.mouseNDC.y = -((clientY - rect.top) / h) * 2 + 1;
    }
    window.addEventListener("mousemove", (e) => onPointerMove(e.clientX, e.clientY));
    window.addEventListener("touchmove", (e) => {
      if (e.touches.length) onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    let particleSystem = new ImageToParticles(null, { nebulaRadius: 13 }, ctx);
    const nebulaPts = await particleSystem.initNebulaOnly(3000);
    scene.add(nebulaPts);
    particleSystem.enablePhysics();

    function onResize() {
      const s = getCanvasSize(canvas);
      camera.aspect = s.w / s.h;
      camera.updateProjectionMatrix();
      renderer.setSize(s.w, s.h, false);
    }
    window.addEventListener("resize", onResize);

    function animate() {
      requestAnimationFrame(animate);
      if (particleSystem) particleSystem.updatePhysics();
      renderer.render(scene, camera);
    }
    animate();

    // 与 main.js URL 模式一致：星云 → 旋转 → 打散 → 加载剪影 → 汇聚
    setTimeout(async () => {
      try {
        particleSystem.startLoadingAnimation();
        if (particleSystem.points) {
          await particleSystem.disperseParticles(0.6);
        }
        particleSystem.stopLoadingAnimation();

        particleSystem = new ImageToParticles(options.imageUrl, {
          step: 8,
          nebulaRadius: 14,
          llmColors: options.llmColors || [],
        }, ctx);
        const pts = await particleSystem.init();
        scene.add(pts);
        particleSystem.assembleParticles(options.themeColor || "#803E4D", 2.5);
      } catch (err) {
        console.error("[MindScapeParticle]", err);
        const meta = document.querySelector(".particle-meta");
        if (meta) {
          meta.innerHTML += `<p style="color:#c0392b;margin-top:8px;">粒子加载失败: ${err.message}</p>`;
        }
      }
    }, 1200);
  }

  global.MindScapeParticle = { init };
})(window);
