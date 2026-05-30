# MindScape · 心灵粒子日记

> 用一句话记录心境，用 AI 生成剪影粒子，用 3D 星云安放情绪。

---

## 项目架构

```
MindScape/
├── README.md
├── PROMPTS.md                    # 提示词与工作流文档
├── .gitignore
│
├── frontend/                     # 🌐 粒子 3D 引擎 (纯静态 H5)
│   ├── index.html                # 入口页面
│   ├── style.css                 # 浅米色优雅 UI
│   ├── main.js                   # ★ 核心引擎 (Three.js + LLM + 粒子)
│   ├── config.example.js         # API Key 模板
│   ├── config.js                 # API Key (gitignored)
│   ├── libs/
│   │   ├── three.min.js
│   │   └── gsap.min.js
│   └── scripts/
│       ├── generate-cat.js
│       ├── generate-ferris-wheel.js
│       └── generate-tower.js
│
├── backend/                      # 🖥️ FastAPI 后端服务
│   ├── api_server.py             # LLM 分析 + 生图 API
│   ├── requirements.txt          # Python 依赖
│   └── .env.example              # 环境变量模板
│
└── miniapp/                      # 📱 抖音小程序 (Taro + React)
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── pages/                # 首页/日记/云端/WebView/主题...
        ├── components/           # Card/Button/Tag/Scrapbook
        ├── store/                # Zustand 状态管理
        ├── utils/                # 提示词/主题/持久化工具
        └── types/                # TypeScript 类型
```

---

## 快速启动

### 1. 前端 (粒子引擎)

```bash
cd frontend
cp config.example.js config.js
# 编辑 config.js 填入 API Key
python -m http.server 8080
# 打开 http://localhost:8080
```

### 2. 后端 (API 服务)

```bash
cd backend
cp .env.example .env
pip install -r requirements.txt
python api_server.py
# API: http://localhost:8000
```

### 3. 小程序

```bash
cd miniapp
npm install --legacy-peer-deps
npx taro build --type h5
# 输出在 miniapp/dist/
```

---

## 工作流

```
用户输入文字 → LLM (DeepSeek) → {imagePrompt, themeColor}
                                      │
                                      ▼
                             生图 API (gpt-image-2) → 黑白剪影
                                      │
                                      ▼
                             像素提取 → 粒子系统 → 粒子汇聚
```

---

## API 端点

| 服务 | 端点 | 模型 |
|------|------|------|
| LLM 分析 | `POST /api/analyze` | deepseek-chat |
| 图像生成 | `POST /api/analyze` (内部) | gpt-image-2 |
| 健康检查 | `GET /api/health` | - |

---

## 部署

| 地址 | 内容 |
|------|------|
| `https://8.216.5.177` | 粒子 3D 引擎 |
| `https://8.216.5.177/api/health` | API 健康检查 |
| `https://8.216.5.177/app` | H5 前端 |

---

## 技术栈

- **3D 渲染**: Three.js Points 粒子系统
- **物理**: 2D 网格位移扩散 + 纯 lerp 回归
- **混合**: NormalBlending (浅色背景)
- **后端**: FastAPI + OpenAI SDK
- **前端**: Taro 4.x + React 18 + Zustand
