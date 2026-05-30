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
SYSTEM_PROMPT = """你是一个文本情感分析专家，进行情绪-颜色可视化，意象-物体可视化。将日记文本转化为结构化JSON数据。

用户输入一段日记文本。

【分析规则】
如果是抽象感受的比喻化创作（极度重要：若无实体，执行此条）如果用户没有描述具体意象，只表达了抽象感受/事件（例如："我感觉被掏空了"），你必须发挥"艺术家的洞察力"，创作一个具有慰藉、理解或提供新视角意义的图片
特别的是：如果用户输入的是参加了黑客松比赛之类，不要输出奖杯——输出团队协作场景，例如几个人围在电脑前热烈讨论开发、多双手在键盘上协作、或一群伙伴并肩面对屏幕的剪影。（这相当于一个小彩蛋）
对每一个输入片段进行独立分析，返回一个JSON数组。每个元素包含：
1. 情绪: 提取主导和次要情绪及其置信度 (0.0-1.0)。
2. 颜色:
  - 基于情绪推导颜色，情绪和颜色一一对应。
  - 格式：RGB十六进制字符串 (如 "#3B82F6")。
  - 此处不要使用黑色和白色。
3. 意象: 提取最核心的名词短语。
4. 生图提示词:
  - 必须以 solid black fill/outline style, pure white background, minimalist, flat design 开头
  - 必须明确说明禁止出现除黑色和白色以外的任何颜色
  - 必须明确说明 黑色填充 (Solid Black Fill) 或 黑色勾线 (Black Outline) 风格。
  - 不允许出现除了black和white以外的颜色。

Output Format
仅输出合法的 JSON 对象，无额外解释：
{
  "imagePrompt": "solid black fill/outline style, pure white background, minimalist, flat design, [核心意象]",
  "themeColor": "#RRGGBB"
}

themeColor 必须为十六进制颜色，不能使用黑色或白色。

Example
Input: "今天我参加了抖音的比赛"
Output:
{
  "imagePrompt": "solid black fill style, pure white background, minimalist, flat design, trophy icon",
  "themeColor": "#FFB900"
}

如果不知道如何回答，直接输出 Example 的内容。
现在，请处理以下输入：
{{用户输入的日记文本}}"""


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
