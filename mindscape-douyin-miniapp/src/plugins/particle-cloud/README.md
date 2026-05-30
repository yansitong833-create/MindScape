# 粒子云插件（静态 HTML）

手账页点击「查看粒子云」→ 跳转 `pages/webview` → `WebView` 加载预部署的 **静态 HTML**。

## 配置

1. 将 `h5/static/*.html` 部署到 HTTPS 业务域名  
2. 在 `src/data/staticParticleManifest.ts` 映射 `cacheKey` → 文件路径  
3. 「我的」填写 H5 根地址（`https://...`）

## 开发 Demo

```bash
npm run h5:serve
npm run dev:tt
```

开发者工具勾选不校验域名；H5 地址可留空。
