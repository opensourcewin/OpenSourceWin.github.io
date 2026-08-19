/**
 * 旧版年度榜单 URL 静态跳转页：Hexo 时代榜单页产物为 /ossheroes/ranking-<year>.html，
 * 迁移后目录化为 /ossheroes/ranking-<year>/。为每个年份生成 ranking-<year>.html
 * （canonical + meta refresh + JS replace 三重跳转），保证旧链接（含根 sitemap 中
 * 已收录的 .html URL）不失效。
 */
import type { APIRoute } from 'astro';
import { getYearsDesc } from '../lib/ranking';
import { BASE, SITE_URL } from '../lib/site';

export function getStaticPaths() {
  return getYearsDesc().map((item) => ({
    params: { year: String(item.year) },
  }));
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: APIRoute = ({ params }) => {
  const year = params.year!;
  const newPath = `${BASE}/ranking-${year}/`;
  const newUrl = `${SITE_URL}${newPath}`;
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(`ranking-${year}`)} has moved — OpenSource.Win</title>
<meta name="robots" content="noindex,follow">
<link rel="canonical" href="${newUrl}">
<meta http-equiv="refresh" content="0;url=${newPath}">
<script>location.replace(${JSON.stringify(newPath)} + location.search + location.hash);</script>
</head>
<body>
<p>This ranking page has moved to <a href="${newPath}">${newUrl}</a>.</p>
<p>该年度榜单已迁移至 <a href="${newPath}">${newUrl}</a>。</p>
</body>
</html>
`;
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
};
