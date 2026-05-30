# MindScape 抖音小程序 — H5 静态资源

## 完全本地演示（推荐）

无需 HTTPS、无需电脑开静态服务，静态 HTML **打进小程序包**：

```bash
cd mindscape-douyin-miniapp
npm run build:tt:local-demo   # 或 dev:tt:local-demo
```

用抖音开发者工具打开 `dist`，勾选 **不校验合法域名**。「我的」里 H5 地址可留空，手账 → 查看粒子云 即可。

原理：`npm run particle:pack-static` 把 `h5/static/*.html` 写入 `staticParticleInline.generated.ts`，WebView 用包内 `data:` 页面打开。

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
