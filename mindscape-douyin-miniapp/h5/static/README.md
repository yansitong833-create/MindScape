# 静态粒子云 HTML（Demo / 正式展示）

抖音 `web-view` **仅支持 HTTPS 业务域名**，不支持运行时生成。请将本目录下 HTML 部署到 H5 站点，并在小程序 `src/data/staticParticleManifest.ts` 登记 `cacheKey → 文件路径`。

## 部署示例

H5 根地址设为 `https://your-domain.com/mindscape`，则需可访问：

```
https://your-domain.com/mindscape/static/particle-default.html
```

抖音后台 → 开发设置 → **webview 域名** 添加 `your-domain.com`。

## 新增一页手账对应图

1. 用 Samples 或设计工具导出**单文件 HTML**（建议无外链脚本，全部内联）
2. 放入本目录，如 `particle-day-2026-05-31.html`
3. 在 `staticParticleManifest.ts` 增加：

```ts
STATIC_PARTICLE_HTML['day:2026-05-31'] = 'static/particle-day-2026-05-31.html';
```

未登记的 `cacheKey` 会回退到 `static/particle-default.html`。

## 本地调试

```bash
npm run h5:serve
npm run dev:tt
```

开发者工具勾选 **不校验合法域名、web-view**。浏览器验证：

```
http://127.0.0.1:5173/static/particle-default.html
```
