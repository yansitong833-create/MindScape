/** 从 H5 根地址推导 Samples 后端 /api 前缀（同域 Nginx 反代） */
export const resolveMindscapeApiBase = (webUrl: string): string => {
  const raw = (webUrl || '').trim();
  if (!raw) return '';
  try {
    const href = raw.startsWith('http') ? raw : `https://${raw}`;
    const u = new URL(href);
    if (u.pathname.endsWith('/api')) return u.origin + u.pathname.replace(/\/$/, '');
    return `${u.origin}/api`;
  } catch {
    return '';
  }
};
