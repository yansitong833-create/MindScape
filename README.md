# MindScape · 心灵粒子日记

> 用一句话记录心境，用 AI 生成剪影粒子，用 3D 星云安放情绪。

---

## 项目结构

```
MindScape/
├── index.html              # 网页入口（粒子引擎主页）
├── style.css               # 浅米色优雅 UI
├── main.js                 # ★ 核心引擎（Three.js 粒子 + LLM 分析 + 生图 API）
├── config.js               # API Key 配置（gitignored）
├── config.example.js       # API Key 模板
├── PROMPTS.md              # 提示词与工作流文档
├── libs/
│   ├── three.min.js        # Three.js 3D 库
│   └── gsap.min.js         # 动画库
├── scripts/                # Node.js 图片生成脚本
└── mindscape-douyin-miniapp/   # 抖音小程序前端（Taro + React）
    └── src/
        ├── pages/          # 首页/日记/主题/剪贴簿/云端/WebView
        ├── components/     # Card/Button/Tag/Scrapbook 组件
        ├── store/          # Zustand 状态管理
        ├── utils/          # 提示词/主题/持久化工具
        └── types/          # TypeScript 类型定义
```

## 快速启动

### 1. 配置 API Key

```bash
cp config.example.js config.js
# 编辑 config.js，填入你的 API Key
```

### 2. 启动本地服务器

```bash
python -m http.server 8080
# 打开 http://localhost:8080
```

### 3. 使用方式

- 页面加载 → 彩色星云球体（可鼠标互动推开粒子）
- 输入心情文字 → 按 Enter
- LLM 分析文本 → 提取意象与颜色
- AI 生成黑白剪影图
- 粒子从星云汇聚成形

## 工作流

```
输入文字 → LLM(DeepSeek) → {imagePrompt, themeColor}
                              │
                              ▼
                     生图 API(gpt-image-2) → 黑白剪影
                              │
                              ▼
                     像素提取 → 粒子系统 → 粒子汇聚
```

## API 端点

| 服务 | 端点 | 模型 |
|------|------|------|
| LLM 分析 | `api.openai-next.com/v1/chat/completions` | deepseek-chat |
| 图像生成 | `api.openai-next.com/v1/images/generations` | gpt-image-2 |

## 部署

服务器运行在 `https://8.216.5.177`：

| 路径 | 内容 |
|------|------|
| `/` | 粒子 3D 引擎 |
| `/app` | H5 前端（抖音小程序页面） |

## 技术栈

- **3D 渲染**：Three.js Points 粒子系统
- **物理**：2D 网格位移扩散 + 纯 lerp 回归
- **混合**：NormalBlending（浅色优雅背景）
- **前端**：Taro 4.x + React 18 + Zustand
