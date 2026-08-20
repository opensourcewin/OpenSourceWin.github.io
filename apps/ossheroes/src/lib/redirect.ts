import { SITE_URL } from './site';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * GitHub Pages 无法配置 HTTP 3xx；所有兼容地址共享这个静态 HTML 跳转实现。
 * meta refresh 让禁用 JS 的客户端仍能前往新页面；JS 则显式保留查询参数和 hash。
 */
export function buildRedirectHtml(opts: {
  title: string;
  targetPath: string;
  kind: string;
}): string {
  const targetUrl = `${SITE_URL}${opts.targetPath}`;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(opts.title)} has moved — OpenSource.Win</title>
<meta name="robots" content="noindex,follow">
<link rel="canonical" href="${escapeHtml(targetUrl)}">
<meta http-equiv="refresh" content="0;url=${escapeHtml(opts.targetPath)}">
<script>location.replace(${JSON.stringify(opts.targetPath)} + location.search + location.hash);</script>
</head>
<body>
<p>This ${escapeHtml(opts.kind)} has moved to <a href="${escapeHtml(opts.targetPath)}">${escapeHtml(targetUrl)}</a>.</p>
<p>此页面已迁移至 <a href="${escapeHtml(opts.targetPath)}">${escapeHtml(targetUrl)}</a>。</p>
</body>
</html>
`;
}
