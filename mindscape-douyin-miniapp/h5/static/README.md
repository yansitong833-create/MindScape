# 静态粒子云（包内内联）

完整粒子资源经 `npm run particle:pack-static` 压缩后写入  
`src/plugins/particle-cloud/staticParticleInline.generated.ts`（打进小程序 JS 包），并导出  
`particle-bundle.html` 供 WebView 通过 **http(s)** 加载。

**抖音 web-view 不支持 `data:` 本地 URI**，预览须：

1. `npm run dev:tt`（自动启动 `h5:serve` + 编译）
2. 开发者工具勾选 **不校验 web-view 业务域名**
3. WebView 地址为 `http://127.0.0.1:5173/static/particle-bundle.html#2026-05-xx`

## 从 data-single.zip 导入

```bash
# 仓库根目录放置 data-single.zip 后：
npm run import:data-single
```

流程：解压 → `h5/static/imported/`（源文件，已 gitignore）→ 图像压缩 + 单 bundle gzip → 生成内联 TS → 删除 `h5/static/` 下旧 HTML。

## 日常构建

```bash
npm run dev:tt    # 或 build:tt，会自动 particle:pack-static
```

`cacheKey`：`day:2026-05-31`（单日粒子）、`month:2026-05`（月度粒子云，使用当月 1 日图，如 `#2026-05-01`）。
