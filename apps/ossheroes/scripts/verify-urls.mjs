#!/usr/bin/env node
/**
 * 校验码力榜新规范 URL 与 GitHub Pages 静态兼容跳转页。
 *
 * 用法：node scripts/verify-urls.mjs [dist-dir]
 * 默认读取 apps/ossheroes/dist。
 */
import { readdirSync, existsSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DIST = join(__dirname, '..', 'dist');
const DIST = process.argv[2] ? resolve(process.argv[2]) : DEFAULT_DIST;
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

function checkRedirect(path, targetPath, label) {
  if (!existsSync(path)) {
    check(false, `${label}: 跳转页存在`);
    return;
  }
  const html = read(path);
  check(html.includes('<meta name="robots" content="noindex,follow">'), `${label}: noindex,follow`);
  check(html.includes(`<link rel="canonical" href="${SITE}${targetPath}">`), `${label}: canonical 指向新 URL`);
  check(html.includes(`<meta http-equiv="refresh" content="0;url=${targetPath}">`), `${label}: meta refresh 指向新 URL`);
  check(
    html.includes(`location.replace(${JSON.stringify(targetPath)} + location.search + location.hash);`),
    `${label}: JS 保留 query string 与 hash`,
  );
}

/** 可复现采样，避免 CI 每次挑到不同页面。 */
function sample(items, count) {
  return items.filter((_, index) => index % Math.max(1, Math.floor(items.length / count)) === 0).slice(0, count);
}

if (!isDir(DIST)) {
  console.error(`✗ 产物目录不存在: ${DIST}（请先运行 pnpm --filter ossheroes build）`);
  process.exit(1);
}

const heroesDir = join(DIST, 'heroes');
const heroDir = join(DIST, 'hero');
const legacyDir = join(DIST, 'ossheroes');

check(existsSync(join(heroesDir, 'index.html')), '/heroes/ 规范首页存在');
check(existsSync(join(legacyDir, 'index.html')), '/ossheroes/ 旧首页跳转页存在');
checkRedirect(join(legacyDir, 'index.html'), '/heroes/', '/ossheroes/');

const rankingYears = isDir(heroesDir)
  ? readdirSync(heroesDir)
      .map((entry) => entry.match(/^ranking-(\d{4})$/)?.[1])
      .filter(Boolean)
      .sort()
  : [];
check(rankingYears.length > 0, '/heroes/ 下至少有一个年度榜单');
check(rankingYears.includes('2021'), '年度榜单覆盖 2021');
check(rankingYears.at(-1) >= '2025', `年度榜单覆盖最新年份（${rankingYears.at(-1) ?? '无'}）`);
const rankingYearsAreContiguous = rankingYears.every(
  (year, index) => index === 0 || Number(year) === Number(rankingYears[index - 1]) + 1,
);
check(rankingYearsAreContiguous, `年度榜单年份连续无缺（${rankingYears.join(', ') || '无'}）`);

for (const year of rankingYears) {
  const canonicalPath = `/heroes/ranking-${year}/`;
  check(existsSync(join(heroesDir, `ranking-${year}`, 'index.html')), `${canonicalPath} 规范榜单页存在`);
  checkRedirect(join(heroesDir, `ranking-${year}.html`), canonicalPath, `/heroes/ranking-${year}.html`);
  checkRedirect(join(legacyDir, `ranking-${year}`, 'index.html'), canonicalPath, `/ossheroes/ranking-${year}/`);
  checkRedirect(join(legacyDir, `ranking-${year}.html`), canonicalPath, `/ossheroes/ranking-${year}.html`);
}

const heroLogins = isDir(heroDir)
  ? readdirSync(heroDir).filter((login) => existsSync(join(heroDir, login, 'index.html'))).sort()
  : [];
const legacyLogins = isDir(legacyDir)
  ? readdirSync(legacyDir)
      .filter((login) => isDir(join(legacyDir, login)))
      .filter((login) => !/^ranking-\d{4}$/.test(login))
      .filter((login) => existsSync(join(legacyDir, login, 'index.html')))
      .sort()
  : [];
check(heroLogins.length >= 10, `规范开发者详情页数 >= 10（实际 ${heroLogins.length}）`);
const missingLegacyLogins = heroLogins.filter((login) => !legacyLogins.includes(login));
const unexpectedLegacyLogins = legacyLogins.filter((login) => !heroLogins.includes(login));
check(
  missingLegacyLogins.length === 0,
  `每个开发者都有旧跳转页（缺失 ${missingLegacyLogins.length} 个）`,
);
check(
  unexpectedLegacyLogins.length === 0,
  `旧跳转页不含意外目录（额外 ${unexpectedLegacyLogins.length} 个）`,
);

for (const login of sample(heroLogins, 10)) {
  check(existsSync(join(heroDir, login, 'index.html')), `/hero/${login}/ 规范详情页存在`);
  checkRedirect(join(legacyDir, login, 'index.html'), `/hero/${login}/`, `/ossheroes/${login}/`);
}

if (errors.length) {
  console.error(`\n❌ verify-urls 失败：${errors.length} 项未通过`);
  process.exit(1);
}
console.log('\n✅ verify-urls 通过');
