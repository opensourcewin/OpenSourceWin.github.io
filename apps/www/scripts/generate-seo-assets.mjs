/**
 * 构建期 SEO/GEO 资产生成：
 * 1. 旧开发者 URL 静态跳转页 —— 开发者详情页已从 /<login>/ 迁到 /ossheroes/<login>/，
 *    为每个开发者生成 dist/<login>/index.html（canonical + meta refresh + JS replace 三重跳转）。
 * 2. dist/sitemap.xml —— 覆盖首页、码力榜首页、年度榜单页与全部开发者页。
 *
 * 在根 `pnpm build`（vite build 之后）运行；CI 中 ossheroes/public 随后才拷入 dist/ossheroes，
 * 因此这里只写 dist 根级内容，不依赖 ossheroes 的构建产物。
 */

import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SOURCE_DIR = join(ROOT, 'ossheroes', 'source');
const RANKING_DIR = join(SOURCE_DIR, 'opensource-ranking');
const DIST_DIR = join(ROOT, 'www', 'dist');
const SITE = 'https://opensource.win';

/** 开发者目录判定：目录内含 index.md 且 front-matter 带 slug 字段。
 *  该条件天然排除 _data / _posts / ossheroes-ranking 等非开发者条目。 */
function listDeveloperLogins() {
    return readdirSync(SOURCE_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .filter((entry) => {
            const indexPath = join(SOURCE_DIR, entry.name, 'index.md');
            if (!existsSync(indexPath)) return false;
            const content = readFileSync(indexPath, 'utf-8');
            const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
            return !!fm && /^slug:\s*\S+/m.test(fm[1]);
        })
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b));
}

/** 年度榜单年份：从 ossheroes/source/opensource-ranking/<year>.md 读取。
 *  榜单页 front-matter 里 permalink 为 /ranking-<year>，实际产物是 ranking-<year>.html。 */
function listRankingYears() {
    if (!existsSync(RANKING_DIR)) return [];
    return readdirSync(RANKING_DIR)
        .map((file) => file.match(/^(\d{4})\.md$/)?.[1])
        .filter(Boolean)
        .sort();
}

const escapeHtml = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function redirectPage(login) {
    const newPath = `/ossheroes/${login}/`;
    const newUrl = `${SITE}${newPath}`;
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(login)} has moved — OpenSource.Win</title>
<meta name="robots" content="noindex,follow">
<link rel="canonical" href="${newUrl}">
<meta http-equiv="refresh" content="0;url=${newPath}">
<script>location.replace(${JSON.stringify(newPath)} + location.search + location.hash);</script>
</head>
<body>
<p>This developer profile has moved to <a href="${newPath}">${newUrl}</a>.</p>
<p>该开发者档案已迁移至 <a href="${newPath}">${newUrl}</a>。</p>
</body>
</html>
`;
}

function generateRedirects(logins) {
    for (const login of logins) {
        const dir = join(DIST_DIR, login);
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, 'index.html'), redirectPage(login));
    }
    console.log(`[seo-assets] generated ${logins.length} legacy redirect pages`);
}

function generateSitemap(logins, years) {
    const lastmod = new Date().toISOString().slice(0, 10);
    const urls = [
        { loc: `${SITE}/`, changefreq: 'monthly', priority: '1.0' },
        { loc: `${SITE}/ossheroes/`, changefreq: 'monthly', priority: '0.9' },
        ...years.map((year) => ({
            loc: `${SITE}/ossheroes/ranking-${year}.html`,
            changefreq: 'yearly',
            priority: '0.8',
        })),
        ...logins.map((login) => ({
            loc: `${SITE}/ossheroes/${login}/`,
            changefreq: 'monthly',
            priority: '0.6',
        })),
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
    .map(
        ({ loc, changefreq, priority }) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`,
    )
    .join('\n')}
</urlset>
`;
    writeFileSync(join(DIST_DIR, 'sitemap.xml'), xml);
    console.log(`[seo-assets] generated sitemap.xml with ${urls.length} urls`);
}

const logins = listDeveloperLogins();
const years = listRankingYears();
generateRedirects(logins);
generateSitemap(logins, years);
