#!/usr/bin/env node
/**
 * 校验规范页面只暴露 /heroes/ 与 /hero/ URL，并校验 sitemap / llms.txt。
 *
 * 用法：node scripts/verify-seo.mjs [ossheroes-dist] [www-dist]
 */
import { readdirSync, existsSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DIST = join(__dirname, '..', 'dist');
const DEFAULT_WWW_DIST = join(__dirname, '..', '..', 'www', 'dist');
const DIST = process.argv[2] ? resolve(process.argv[2]) : DEFAULT_DIST;
const WWW_DIST = process.argv[3] ? resolve(process.argv[3]) : DEFAULT_WWW_DIST;
const SITE = 'https://opensource.win';
const errors = [];

function check(condition, message) {
  console.log(`${condition ? '✓' : '✗'} ${message}`);
  if (!condition) errors.push(message);
}

function isDir(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

function read(path) {
  return readFileSync(path, 'utf8');
}

function getMeta(html, attr, value) {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const attrRe = new RegExp(`${attr}=["']${escaped}["']`);
  const tag = (html.match(/<meta\b[^>]*>/gi) || []).find((item) => attrRe.test(item));
  return tag?.match(/content=["']([^"']*)["']/i)?.[1] ?? null;
}

function getCanonical(html) {
  return html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1] ?? null;
}

function getJsonLd(html) {
  const matches = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  return matches.flatMap((match) => {
    try {
      return [JSON.parse(match[1])];
    } catch {
      return [];
    }
  });
}

function assertCanonicalPage(path, canonicalPath, label) {
  if (!existsSync(path)) {
    check(false, `${label}: 页面存在`);
    return '';
  }
  const html = read(path);
  const canonical = `${SITE}${canonicalPath}`;
  check(getCanonical(html) === canonical, `${label}: canonical 为 ${canonicalPath}`);
  check(getMeta(html, 'property', 'og:url') === canonical, `${label}: og:url 为 ${canonicalPath}`);
  check(!html.includes(`${SITE}/ossheroes/`), `${label}: 不暴露旧规范 URL`);
  return html;
}

if (!isDir(DIST)) {
  console.error(`✗ 产物目录不存在: ${DIST}（请先运行 pnpm --filter ossheroes build）`);
  process.exit(1);
}

const heroesDir = join(DIST, 'heroes');
const heroDir = join(DIST, 'hero');
assertCanonicalPage(join(heroesDir, 'index.html'), '/heroes/', '/heroes/ 首页');

const rankingYears = isDir(heroesDir)
  ? readdirSync(heroesDir).map((entry) => entry.match(/^ranking-(\d{4})$/)?.[1]).filter(Boolean).sort()
  : [];
check(rankingYears.length > 0, '检测到年度榜单页面');
for (const year of rankingYears) {
  assertCanonicalPage(join(heroesDir, `ranking-${year}`, 'index.html'), `/heroes/ranking-${year}/`, `/heroes/ranking-${year}/`);
}

const logins = isDir(heroDir)
  ? readdirSync(heroDir).filter((login) => existsSync(join(heroDir, login, 'index.html'))).sort()
  : [];
check(logins.length >= 3, `开发者详情页数 >= 3（实际 ${logins.length}）`);
for (const login of logins.slice(0, 3)) {
  const canonicalPath = `/hero/${login}/`;
  const html = assertCanonicalPage(join(heroDir, login, 'index.html'), canonicalPath, `/hero/${login}/`);
  const jsonLd = getJsonLd(html);
  check(jsonLd.length > 0, `/hero/${login}/: JSON-LD 可解析`);
  const profile = jsonLd.find((item) => item['@type'] === 'ProfilePage');
  check(!!profile, `/hero/${login}/: JSON-LD 包含 ProfilePage`);
  check(!!getMeta(html, 'property', 'og:title'), `/hero/${login}/: og:title`);
  check(!!getMeta(html, 'property', 'og:description'), `/hero/${login}/: og:description`);
  check(!!getMeta(html, 'property', 'og:image'), `/hero/${login}/: og:image`);
  check(!!getMeta(html, 'name', 'twitter:image'), `/hero/${login}/: twitter:image`);
  check(profile?.url === `${SITE}${canonicalPath}`, `/hero/${login}/: JSON-LD url 为规范 URL`);
  check(profile?.['@id'] === `${SITE}${canonicalPath}`, `/hero/${login}/: JSON-LD @id 为规范 URL`);
  check(profile?.mainEntity?.url === `${SITE}${canonicalPath}`, `/hero/${login}/: Person url 为规范 URL`);
  check(profile?.mainEntity?.['@id'] === `${SITE}${canonicalPath}#person`, `/hero/${login}/: Person @id 为规范 URL`);
}

const sitemap = join(WWW_DIST, 'sitemap.xml');
const llms = join(WWW_DIST, 'llms.txt');
const hasWwwBuild = isDir(WWW_DIST);
check(
  hasWwwBuild,
  `官网产物目录存在: ${WWW_DIST}（请先运行 pnpm --filter www build）`,
);
check(existsSync(sitemap), '根 sitemap.xml 已生成');
if (existsSync(sitemap)) {
  const xml = read(sitemap);
  check(xml.includes(`${SITE}/heroes/`), 'sitemap 包含 /heroes/');
  check(xml.includes(`${SITE}/heroes/ranking-`), 'sitemap 包含 /heroes/ 年度榜单');
  check(xml.includes(`${SITE}/hero/`), 'sitemap 包含 /hero/ 开发者详情');
  check(!xml.includes('/ossheroes/'), 'sitemap 不含旧 /ossheroes/ URL');
}
check(existsSync(llms), 'llms.txt 已生成');
if (existsSync(llms)) {
  const text = read(llms);
  check(text.includes(`${SITE}/heroes/`) && text.includes(`${SITE}/hero/`), 'llms.txt 使用新 URL');
  check(!text.includes('/ossheroes/'), 'llms.txt 不含旧 /ossheroes/ URL');
}

if (errors.length) {
  console.error(`\n❌ verify-seo 失败：${errors.length} 项未通过`);
  process.exit(1);
}
console.log('\n✅ verify-seo 通过');
