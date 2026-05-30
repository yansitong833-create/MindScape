# MindScape 提示词文档

## 工作流总览

```
用户输入日记文本 → LLM 分析 → 生图 API → 粒子渲染
```

---

## 1. LLM 情感分析中枢

**模型**: `deepseek-chat` (via `api.openai-next.com/v1`)  
**端点**: `/chat/completions`  
**System Prompt**: 内置在 `main.js:analyzeDiaryWithLLM()`

### 推理链（4步）

| Step | 名称 | 描述 |
|------|------|------|
| 1 | 情感分析 | 提取主导/次要情绪，推导心理颜色 |
| 2 | 意象创作 | 提取或为抽象感受赋予视觉隐喻物体 |
| 3 | 生图提示词 | 英文，纯黑白剪影，禁止其他颜色 |
| 4 | 主题颜色 | 深色低饱和度十六进制色（适配浅米底） |

### 输出格式

```json
{
  "imagePrompt": "A highly detailed, pure black silhouette of [意象], ...",
  "themeColor": "#803E4D"
}
```

### 颜色调色板

| 颜色名 | 色值 | 情绪关联 |
|--------|------|----------|
| 复古玫瑰红 | `#803E4D` | 温柔、浪漫 |
| 深海蓝 | `#2C3E50` | 宁静、深沉 |
| 松石绿 | `#345642` | 平静、治愈 |
| 莫兰迪紫 | `#5A4C64` | 神秘、优雅 |
| 干枯玫瑰 | `#8C5B5B` | 怀旧、感伤 |
| 雾蓝 | `#384D59` | 忧郁、空灵 |
| 暖灰褐 | `#735947` | 温暖、沉稳 |

---

## 2. 生图 API

**模型**: `gpt-image-2` (via `api.openai-next.com/v1`)  
**端点**: `/images/generations`  
**函数**: `main.js:generateSilhouette(imagePrompt)`

### 请求参数

```json
{
  "model": "gpt-image-2",
  "prompt": "<LLM 生成的 imagePrompt>",
  "n": 1,
  "size": "1024x1024"
}
```

### 返回格式兼容

- `data[0].b64_json` → Base64 Data URI（优先）
- `data[0].url` → 标准 URL
- `data.url` → 直返格式

---

## 3. 粒子渲染引擎

**技术栈**: Three.js + Canvas 纹理 + 2D 波动场  
**混合模式**: `NormalBlending`（浅色背景）  
**粒子色库**: 莫兰迪/松石/玫瑰/雾蓝 9 色调

### 物理模型

```
Step 1: 空间网格分配（cellSize=3.0）
Step 2: 鼠标直接推离（radius=8.0, force=0.15）
Step 3: 位移扩散（8方向邻居平均 × 0.92）
Step 4: pure lerp 归位（speed=0.04）+ 微呼吸（✕ 0.02）
```

---

## 4. 配置文件

`config.js`（gitignored）:

```js
const OPENAI_API_KEY = "sk-xxx";        // 生图 API
const OPENAI_BASE_URL = "https://xxx";   // 生图端点
const DEEPSEEK_API_KEY = "sk-xxx";      // LLM API
```

`config.example.js`（提交到 GitHub）:

```js
const OPENAI_API_KEY = "sk-your-api-key-here";
const OPENAI_BASE_URL = "https://api.openai-next.com/v1";
const DEEPSEEK_API_KEY = "sk-your-deepseek-key-here";
```
