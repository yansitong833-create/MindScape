# MindScape 粒子云独立包

本目录可离线独立运行，无需 MindScape 主项目路径。

## 预览

```bash
python -m http.server 8090
```

浏览器打开 http://localhost:8090/particle-index-2026-05.html

## 内容

- `particle-2026-05-*.html` — 31 条日记粒子云页面
- `particle-engine-standalone.js` — 粒子渲染引擎
- `libs/` — Three.js / GSAP 依赖
- `generate-log.txt` — 批量生成日志
- `particle-cache.json` — API 分析与生图缓存
- `preset-diaries.md` — 预设日记源文本
