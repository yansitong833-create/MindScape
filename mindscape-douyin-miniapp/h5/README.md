# MindScape 抖音小程序 — H5 静态资源

## 完全本地演示（推荐）

无需 HTTPS、无需电脑开静态服务，静态 HTML **打进小程序包**：

```bash
cd mindscape-douyin-miniapp
npm run build:tt:local-demo   # 或 dev:tt:local-demo
npm run pack:tt               # 生产构建 + 抖音开放平台 zip → release/
```

用抖音开发者工具打开 `dist`，勾选 **不校验合法域名**。「我的」里 H5 地址可留空，手账 → 查看粒子云 即可。

原理：`npm run particle:pack-static` 把 `h5/static/*.html` 写入 `staticParticleInline.generated.ts`，WebView 用包内 `data:` 页面打开。

## 虚拟创作 Demo（全内联单页，推荐）

```bash
npm run pack:demo-html
```

上传 [虚拟创作 · 互动](https://vcreate.douyin.com/console/interaction)（二选一，内容相同）：

- **`release/mindscape-demo-vcreate-inline.zip`** — zip 根目录**仅** `index.html`（CSS/JS 全内联，避免平台预览白屏）
- **`release/mindscape-demo-vcreate.html`** — 同上，可直接上传单 HTML

`release/mindscape-demo.html` 与 `mindscape-demo-vcreate.html` 内容一致。构建时已净化内联 script（无 `fetch(`、`XMLHttpRequest`、`setAttribute("on` 等禁词）。

勿上传含 `js/` 外链的旧包（`mindscape-demo-vcreate.zip`）；平台沙箱可能不加载同级脚本导致白屏。仅本地调试外链包时可加：`npm run pack:demo-html -- --external`。

## 可选：本机 HTTP 调试

```bash
npm run h5:serve    # http://127.0.0.1:5173/static/...
npm run dev:tt
```

未 pack-static 时，开发构建会回退到本地 http。

## 可选：HTTPS 对外部署

将 `h5/static/` 部署到业务域名，在「我的」填写 H5 根地址，并配置抖音 webview 域名白名单。见 `static/README.md`。

## 目录

| 目录 | 用途 |
|------|------|
| `static/` | 静态粒子云 HTML（打进包或部署） |
| `particle-cloud/` | 旧版动态页（保留参考） |
