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
LLM_MODEL = os.getenv("MINDSCAPE_LLM_MODEL", "gpt-4o-mini")
IMAGE_MODEL = os.getenv("MINDSCAPE_IMAGE_MODEL", "gpt-image-2")

from openai import OpenAI, APIError, APITimeoutError, APIConnectionError
import time

client = OpenAI(api_key=API_KEY, base_url=API_BASE, timeout=180.0, max_retries=0)


def call_llm_with_retry(messages, max_retries=3):
    """调用 LLM，自动重试处理 524 超时"""
    for attempt in range(max_retries):
        try:
            return client.chat.completions.create(
                model=LLM_MODEL,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.7,
            )
        except (APITimeoutError, APIConnectionError) as e:
            logger.warning(f"[LLM] 超时/连接失败 (尝试 {attempt+1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep((attempt + 1) * 3)
            else:
                raise
        except APIError as e:
            if e.status_code >= 500 or e.status_code == 524:
                logger.warning(f"[LLM] 服务端错误 {e.status_code} (尝试 {attempt+1}/{max_retries})")
                if attempt < max_retries - 1:
                    time.sleep((attempt + 1) * 5)
                else:
                    raise
            else:
                raise


def call_image_with_retry(prompt, max_retries=3):
    """调用生图 API，长超时 + 重试"""
    for attempt in range(max_retries):
        try:
            return client.images.generate(
                model=IMAGE_MODEL,
                prompt=prompt,
                n=1,
                size="1024x1024",
            )
        except (APITimeoutError, APIConnectionError) as e:
            logger.warning(f"[生图] 超时 (尝试 {attempt+1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(5)
            else:
                raise
        except APIError as e:
            if e.status_code in (524, 502, 503, 504) or e.status_code >= 500:
                logger.warning(f"[生图] 服务端错误 {e.status_code} (尝试 {attempt+1}/{max_retries})")
                if attempt < max_retries - 1:
                    time.sleep((attempt + 1) * 8)
                else:
                    raise
            else:
                raise

# ═══════════════════════════════════════════════════
# System Prompt — 与 main.js 同步（prompts.ts 精华已融入）
# ═══════════════════════════════════════════════════
SYSTEM_PROMPT = """你是一个专业的文本情感分析与创意可视化专家，擅长将任意日记文本转化为精准的情绪 - 颜色 - 比例映射和极简黑白风格的意象插画提示词。请严格遵循以下所有规则进行处理：
核心分析规则（优先级最高）
抽象感受创作规则：如果用户没有描述具体实体意象，只表达了抽象感受 / 事件（例如："我感觉被掏空了"），你必须发挥 "艺术家的洞察力"，创作一个具有慰藉、理解或提供新视角意义的图片意象。
特殊场景多元表达规则：如果用户输入的是参加比赛、获奖、团队开发等内容，优先生成多元场景而非单一奖杯。例如：团队协作讨论、代码屏幕、庆祝击掌、证书、笔记本电脑等；奖杯仅作为可选元素之一，不得作为唯一输出。
黑白风格强制规则：所有生图提示词必须严格遵循纯黑白极简风格，禁止出现任何其他颜色。
动态比例分配规则（核心修改）
0.7:0.2:0.1 仅为参考比例，你必须根据文本中实际情绪的强度、出现频率和重要性动态分配比例
所有情绪的比例总和必须严格等于 1.0
主导情绪的比例通常在 0.5-0.9 之间，次要情绪比例在 0.1-0.4 之间
如果文本中只有 1 种明显情绪，比例为 1.0
如果文本中有 2 种情绪，按照实际强度分配（如 0.8:0.2、0.6:0.4 等）
如果文本中有 3 种及以上情绪，最多保留 3 种主导情绪，按照实际强度分配比例
输入分级处理规则
根据用户输入的复杂度和清晰度，采用不同的处理策略：
1. 极简 / 无明显情感意向输入
定义：单字、短句、无明确情绪和具体描述的内容（如："嗯"、"今天"、"不知道写什么"）
处理方式：诙谐幽默地匹配基础可爱意象和 1 种柔和颜色，比例为 1.0
示例：输入 "嗯" → 意象：点头的小圆圈；颜色：#94A3B8；比例：1.0
2. 中等复杂度输入
定义：包含 1-2 个明确事件和 1-3 种情绪的普通日记内容
处理方式：提取所有核心实体意象（通常 3-4 个），完整还原场景氛围；根据实际情绪强度动态分配 2-3 种情绪的比例
3. 高复杂度输入
定义：包含多个事件、多种情绪、大量细节的长文本
处理方式：最多提取 3 个最核心的意象 + 3 种主导情绪，忽略所有次要细节和边缘情绪；根据实际情绪强度动态分配比例
4. 异常 / 无意义输入
定义：乱码、随机字符、莫名其妙的词汇组合
处理方式：使用基础友好预设，匹配通用治愈系意象和 1 种柔和颜色，比例为 1.0
基础预设库：星星、云朵、小树苗、鹅卵石、纸飞机；对应颜色：#A78BFA、#60A5FA、#34D399、#FBBF24、#F472B6
        输出字段要求
        对每一个输入片段进行独立分析，返回一个 JSON 对象，包含以下两个字段：
        imagePrompt：
        必须以 solid black fill style, pure white background, minimalist, flat design 开头
        必须明确说明：no other colors allowed except black and white
        后面跟随根据上述规则提取的核心意象描述
        格式示例：solid black fill style, pure white background, minimalist, flat design, no other colors allowed except black and white, [核心意象描述]
        themeColor：
        基于主导情绪和场景氛围推导对应的主题颜色
        格式：严格的 RGB 十六进制字符串（如 "#3B82F6"）
        绝对禁止使用黑色 (#000000) 和白色 (#FFFFFF)
        Output Format
        仅输出合法的 JSON 对象，无额外解释：
        {
       "imagePrompt": "solid black fill style, pure white background, minimalist, flat design, no other colors allowed except black and white, [核心意象描述]",
  "themeColor": "#RRGGBB",
  "colors": [
    {"emotion": "主导情绪", "color": "#RRGGBB", "proportion": 0.8},
    {"emotion": "次要情绪", "color": "#RRGGBB", "proportion": 0.2}
  ]
        }
        如果遇到无法处理的极端情况，直接输出以下默认内容：{
  "imagePrompt": "solid black fill style, pure white background, minimalist, flat design, no other colors allowed except black and white, small star icon",
  "themeColor": "#A78BFA",
  "colors": [
    {"emotion": "平静", "color": "#A78BFA", "proportion": 1.0}
  ]
}

        themeColor 必须为十六进制颜色，不能使用黑色或白色。
        

        
      example 1：单一强烈情绪
输入："今天太开心了！我终于考上了理想的大学！"
输出：
json
{
  "imagePrompt": "solid black fill style, pure white background, minimalist, flat design, no other colors allowed except black and white, person jumping for joy, graduation cap, university building silhouette",
  "themeColor": "#10B981",
  "colors": [
    {"emotion": "极度开心", "color": "#10B981", "proportion": 1.0}
  ]
}
example 2：两种情绪（8:2 比例）
输入："下雪天我坐在屋子里喝热咖啡，外面很冷，但心里很暖"
输出：
json
{
  "imagePrompt": "solid black fill style, pure white background, minimalist, flat design, no other colors allowed except black and white, person sitting by the window, steaming coffee cup, falling snowflakes outside",
  "themeColor": "#F97316",
  "colors": [
    {"emotion": "温暖舒适", "color": "#F97316", "proportion": 0.8},
    {"emotion": "宁静寒冷", "color": "#0EA5E9", "proportion": 0.2}
  ]
}
example 3：三种情绪（6:3:1 比例）
输入："我今天去了乡村，那里有鸡鸭牛羊很多动物，在田野里我快乐的奔跑，无忧无虑，空气非常清新"
输出：
json
{
  "imagePrompt": "solid black fill style, pure white background, minimalist, flat design, no other colors allowed except black and white, person running joyfully in the field, rural animals (chickens, ducks, cows, sheep), vast farmland, swaying grass blades",
  "themeColor": "#22C55E",
  "colors": [
    {"emotion": "自由快乐", "color": "#22C55E", "proportion": 0.6},
    {"emotion": "清新宁静", "color": "#0EA5E9", "proportion": 0.3},
    {"emotion": "温暖治愈", "color": "#F59E0B", "proportion": 0.1}
  ]
}

        如果不知道如何回答，直接输出 类似Example 的处理方式的内容。
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
    llmColors: list = []
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

    # ── 1. LLM 分析 (带重试) ──────────────────
    try:
        llm_resp = call_llm_with_retry(messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": text},
        ])

        raw = llm_resp.choices[0].message.content
        if not raw or raw.strip() == "":
            raise RuntimeError("LLM 返回空内容，请重试")

        # 防御性解析：尝试多轮修复
        parsed = None
        raw_cleaned = raw.strip()
        # 去掉 markdown 代码块包裹
        if raw_cleaned.startswith("```"):
            raw_cleaned = raw_cleaned.split("\n", 1)[-1]
            if raw_cleaned.endswith("```"):
                raw_cleaned = raw_cleaned[:-3]
            raw_cleaned = raw_cleaned.strip()
            if raw_cleaned.lower().startswith("json"):
                raw_cleaned = raw_cleaned[4:].strip()

        try:
            parsed = json.loads(raw_cleaned)
        except json.JSONDecodeError:
            # 再试：用 raw_decode 提取第一个完整 JSON 对象
            lbrace = raw_cleaned.find("{")
            if lbrace >= 0:
                decoder = json.JSONDecoder()
                try:
                    parsed, _ = decoder.raw_decode(raw_cleaned[lbrace:])
                except json.JSONDecodeError:
                    parsed = None
            if not parsed:
                raise RuntimeError(f"LLM 返回非 JSON: {raw_cleaned[:200]}")

        image_prompt = parsed.get("imagePrompt", "") or parsed.get("生图提示词", "")
        theme_color = parsed.get("themeColor", "") or parsed.get("颜色", {})

        # 如果 themeColor 是对象，取第一个值
        if isinstance(theme_color, dict):
            theme_color = list(theme_color.keys())[0] if theme_color else "#803E4D"

        if not image_prompt:
            # 最终退路：用用户原话做提示词
            logger.warning("[LLM] 未返回 imagePrompt，使用退路")
            image_prompt = f"solid black fill style, pure white background, minimalist, flat design, {text}"

        if not theme_color or not isinstance(theme_color, str) or not theme_color.startswith("#"):
            theme_color = "#803E4D"

        # 提取 LLM 返回的颜色比例数组，传给前端做粒子着色
        llm_colors = parsed.get("colors", [])
        if not isinstance(llm_colors, list) or len(llm_colors) == 0:
            llm_colors = [{"emotion": "平静", "color": theme_color, "proportion": 1.0}]

        logger.info(f"[分析] 意象提示词: {image_prompt[:80]}...")
        logger.info(f"[分析] 主题色: {theme_color}, 颜色组: {len(llm_colors)}个")

    except Exception as e:
        logger.error(f"[LLM 失败] {e}")
        return JSONResponse(
            content={"success": False, "llmColors": [], "error": f"LLM 分析失败: {str(e)}"}
        )

    # ── 2. 生图 (重试机制) ──
    try:
        img_resp = call_image_with_retry(image_prompt)

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
                "llmColors": llm_colors,
                "error": f"生图失败: {str(e)}",
            }
        )

    # ── 3. 返回 ────────────────────────────────────
    return AnalysisResponse(
        success=True,
        imagePrompt=image_prompt,
        themeColor=theme_color,
        imageUrl=final_url,
        llmColors=llm_colors,
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
