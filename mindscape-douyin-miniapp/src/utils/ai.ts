import Taro from '@tarojs/taro';

const OPENAI_NEXT_BASE_URL = 'https://api.openai-next.com/v1';
const DEFAULT_API_KEY = 'sk-9KefbdsjfSTLm0ijDbEd0622878b4f0a826bA3Db6a5bCa9d';

export type NormalizedAnalysis = {
  rawText: string;
  normalized: any;
  imagePrompt: string;
};

const collapseSingletonArray = (value: any): any => {
  let out = value;
  while (Array.isArray(out) && out.length === 1) out = out[0];
  return out;
};

const tryParseJsonLoose = (raw: string): any | null => {
  const s = raw.trim();
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    const firstObj = s.indexOf('{');
    const firstArr = s.indexOf('[');
    let start = -1;
    if (firstObj >= 0 && firstArr >= 0) start = Math.min(firstObj, firstArr);
    else start = firstObj >= 0 ? firstObj : firstArr;
    if (start < 0) return null;

    const lastObj = s.lastIndexOf('}');
    const lastArr = s.lastIndexOf(']');
    const end = Math.max(lastObj, lastArr);
    if (end < 0 || end <= start) return null;

    const clipped = s.slice(start, end + 1);
    try {
      return JSON.parse(clipped);
    } catch {
      return null;
    }
  }
};

const extractImagePrompt = (value: any): string => {
  const v = collapseSingletonArray(value);
  if (typeof v === 'string') return v.trim();
  if (!v || typeof v !== 'object') return '';

  if (typeof (v as any).imagePrompt === 'string') return (v as any).imagePrompt.trim();
  if (typeof (v as any)['生图提示词'] === 'string') return (v as any)['生图提示词'].trim();

  const maybeArr = Array.isArray(v) ? v : null;
  if (maybeArr && maybeArr.length) return extractImagePrompt(maybeArr[0]);

  const first = (v as any)[0];
  if (first != null) return extractImagePrompt(first);

  return '';
};

export const analyzeDiaryText = async (payload: { prompt: string }): Promise<NormalizedAnalysis> => {
  const res = await Taro.request({
    url: `${OPENAI_NEXT_BASE_URL}/chat/completions`,
    method: 'POST',
    timeout: 180000,
    header: {
      'content-type': 'application/json',
      Authorization: `Bearer ${DEFAULT_API_KEY}`,
    },
    data: {
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: payload.prompt }],
      temperature: 0.7,
    },
  });

  const content = (res.data as any)?.choices?.[0]?.message?.content;
  const rawText = typeof content === 'string' ? content : '';
  const parsed = tryParseJsonLoose(rawText);
  const normalized = collapseSingletonArray(parsed);
  const imagePrompt = extractImagePrompt(normalized);

  return { rawText, normalized, imagePrompt };
};

const writeBase64PngToUserPath = async (base64: string): Promise<string> => {
  const cleaned = base64.replace(/^data:image\/png;base64,/, '').trim();
  const fs = Taro.getFileSystemManager();
  const filePath = `${Taro.env.USER_DATA_PATH}/mindscape_cloud_${Date.now()}.png`;
  await new Promise<void>((resolve, reject) => {
    fs.writeFile({
      filePath,
      data: cleaned,
      encoding: 'base64',
      success: () => resolve(),
      fail: (e) => reject(e),
    });
  });
  return filePath;
};

export const generateImageFromPrompt = async (payload: { prompt: string }): Promise<{ filePath: string; raw: any }> => {
  const res = await Taro.request({
    url: `${OPENAI_NEXT_BASE_URL}/images/generations`,
    method: 'POST',
    timeout: 180000,
    header: {
      'content-type': 'application/json',
      Authorization: `Bearer ${DEFAULT_API_KEY}`,
    },
    data: {
      model: 'gpt-image-2',
      prompt: payload.prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    },
  });

  const b64 = (res.data as any)?.data?.[0]?.b64_json;
  if (typeof b64 === 'string' && b64.trim()) {
    const filePath = await writeBase64PngToUserPath(b64);
    return { filePath, raw: res.data };
  }

  const url = (res.data as any)?.data?.[0]?.url;
  if (typeof url === 'string' && url.trim()) {
    const dl = await Taro.downloadFile({ url });
    if (dl.statusCode === 200 && dl.tempFilePath) return { filePath: dl.tempFilePath, raw: res.data };
  }

  throw new Error('图片生成失败');
};

