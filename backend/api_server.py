"""
MindScape API Server — LLM 分析 + 生图 + 粒子渲染数据
FastAPI 后端，部署在 8.216.5.177:8000，Nginx 反向代理到 /api/
"""
import os
import json
import logging
from io import BytesIO

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from openai import OpenAI

# ── 环境 ─────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, "..", ".env"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mindscape-api")

app = FastAPI(title="MindScape API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 配置 ─────────────────────────────────────────
API_KEY = os.getenv("MINDSCAPE_API_KEY", "sk-9KefbdsjfSTLm0ijDbEd0622878b4f0a826bA3Db6a5bCa9d")
API_BASE = os.getenv("MINDSCAPE_API_BASE", "https://api.openai-next.com/v1")
LLM_MODEL = os.getenv("MINDSCAPE_LLM_MODEL", "deepseek-chat")
IMAGE_MODEL = os.getenv("MINDSCAPE_IMAGE_MODEL", "gpt-image-2")

client = OpenAI(api_key=API_KEY, base_url=API_BASE, timeout=180.0)

# ═══════════════════════════════════════════════════
# System Prompt — 与 main.js 同步（prompts.ts 精华已融入）
# ═══════════════════════════════════════════════════
SYSTEM_PROMPT = """你是一个拥有极高艺术审美的心理分析师，目标受众是年轻女性。

用户会输入一段日记文本。请执行以下推理链：

【Step 1 — 情感分析】
提取主导情绪与次要情绪，并推导对应的心理颜色（不含黑色和白色，基于色彩心理学）。

【Step 2 — 意象创作】
提取或创作一个最具画面感的核心意象。如果用户只表达了抽象感受（如"被掏空""像漂浮的云"），你必须发挥艺术家洞察力，为这种感受赋予一个具体的视觉隐喻物体。特别彩蛋：如果用户参加了比赛/竞技，可以输出金色奖杯意象。

【Step 3 — 生图提示词 (imagePrompt)】
必须生成一段英文提示词，严格遵循：
- "A highly detailed, pure black silhouette of [意象], intricate details, fairy-tale style, elegant, on a pure white background, extremely high contrast, black and white only, no other colors, solid fill or clean outline."
- 禁止出现除 black/white 以外的任何颜色词。

【Step 4 — 主题颜色 (themeColor)】
因为最终渲染背景是浅米色(#F9F6F0)，你必须输出深色调、低饱和度的优雅十六进制颜色：
- 复古玫瑰红 #803E4D / 深海蓝 #2C3E50 / 松石绿 #345642 / 莫兰迪紫 #5A4C64 / 干枯玫瑰 #8C5B5B / 雾蓝 #384D59 / 暖灰褐 #735947
- 绝对不要输出刺眼的亮色或荧光色。

必须严格返回合法JSON格式：{"imagePrompt": "...", "themeColor": "..."}"""


# ═══════════════════════════════════════════════════
# Request / Response Models
# ═══════════════════════════════════════════════════
class DiaryRequest(BaseModel):
    text: str
    style: str = "silhouette"   # silhouette | detailed


class AnalysisResponse(BaseModel):
    success: bool
    imagePrompt: str = ""
    themeColor: str = ""
    imageUrl: str = ""
    error: str = ""


# ═══════════════════════════════════════════════════
# 核心 API：分析 + 生图
# ═══════════════════════════════════════════════════
@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_diary(req: DiaryRequest):
    """接收日记文本 → LLM 分析 → 生图 → 返回结果"""
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="文本不能为空")

    logger.info(f"[分析] 收到文本: {text[:80]}...")

    # ── 1. LLM 分析 ────────────────────────────────
    try:
        llm_resp = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
        )

        raw = llm_resp.choices[0].message.content
        if not raw:
            raise RuntimeError("LLM 返回空内容")

        parsed = json.loads(raw)
        image_prompt = parsed.get("imagePrompt", "")
        theme_color = parsed.get("themeColor", "#803E4D")

        if not image_prompt:
            raise RuntimeError("LLM 未返回 imagePrompt")

        logger.info(f"[分析] 意象提示词: {image_prompt[:60]}...")
        logger.info(f"[分析] 主题色: {theme_color}")

    except Exception as e:
        logger.error(f"[LLM 失败] {e}")
        return JSONResponse(
            content={"success": False, "error": f"LLM 分析失败: {str(e)}"}
        )

    # ── 2. 生图 ────────────────────────────────────
    try:
        img_resp = client.images.generate(
            model=IMAGE_MODEL,
            prompt=image_prompt,
            n=1,
            size="1024x1024",
        )

        img_data = img_resp.data[0]
        image_url = getattr(img_data, "url", None)
        b64_json = getattr(img_data, "b64_json", None)

        if b64_json:
            final_url = f"data:image/png;base64,{b64_json}"
        elif image_url:
            final_url = image_url
        else:
            raise RuntimeError("生图 API 未返回 URL 或 Base64")

        logger.info(f"[生图] 成功: {final_url[:80]}...")

    except Exception as e:
        logger.error(f"[生图失败] {e}")
        return JSONResponse(
            content={
                "success": False,
                "imagePrompt": image_prompt,
                "themeColor": theme_color,
                "error": f"生图失败: {str(e)}",
            }
        )

    # ── 3. 返回 ────────────────────────────────────
    return AnalysisResponse(
        success=True,
        imagePrompt=image_prompt,
        themeColor=theme_color,
        imageUrl=final_url,
    )


# ═══════════════════════════════════════════════════
# 健康检查
# ═══════════════════════════════════════════════════
@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "2.0"}


# ═══════════════════════════════════════════════════
# 全局异常护盾
# ═══════════════════════════════════════════════════
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.exception(f"未处理异常: {exc}")
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": str(exc)},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api_server:app", host="0.0.0.0", port=8000, reload=False)
