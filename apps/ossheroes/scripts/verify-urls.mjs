#!/usr/bin/env node
/**
 * verify-urls.mjs — 校验 ossheroes 构建产物的 URL 结构完整性。
 *
 * 读取 apps/ossheroes/dist/ossheroes 产物目录，验证：
 *   1. /ossheroes/ 首页（index.html）存在
 *   2. ranking-2021.html 至最新年的跳转页存在（亦接受 ranking-<year>/index.html）
 *   3. 随机抽取 10 个开发者目录，验证对应 index.html 存在
 *
 * 用法：node scripts/verify-urls.mjs [dist-dir]
 * 默认 dist-dir 为脚本上级目录的 dist/ossheroes。成功 exit 0，失败 exit 1。
 */
import { readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DIST = join(__dirname, '..', 'dist', 'ossheroes');
const DIST = process.argv[2] ? resolve(process.argv[2]) : DEFAULT_DIST;

const errors = [];
function check(cond, msg) {
  console.log(`${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) errors.push(msg);
}

/** 可复现的伪随机采样：固定种子的 mulberry32，CI 稳定但仍具随机性。 */
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function sample(arr, n, seed = 20260819) {
  const rng = mulberry32(seed);
  const pool = [...arr];
  const out = [];
  while (out.length < n && pool.length) {
    out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return out;
}

function isDir(p) {
  return existsSync(p) && statSync(p).isDirectory();
}

if (!isDir(DIST)) {
  console.error(`✗ 产物目录不存在: ${DIST}（请先运行 pnpm --filter ossheroes build）`);
  process.exit(1);
}

const entries = readdirSync(DIST);

// 1. 首页 /ossheroes/
check(existsSync(join(DIST, 'index.html')), `/ossheroes/ 首页 index.html 存在`);

// 2. 年度榜单跳转页 ranking-2021.html .. 最新年
const rankingYears = entries
  .filter((e) => /^ranking-\d{4}\.html$/.test(e))
  .map((e) => Number(e.match(/(\d{4})/)[1]))
  .sort((a, b) => a - b);
check(rankingYears.includes(2021), '存在 ranking-2021.html 跳转页');
const maxYear = rankingYears.length ? rankingYears[rankingYears.length - 1] : null;
check(maxYear !== null && maxYear >= 2025, `榜单跳转页覆盖至最新年（最新: ${maxYear ?? '无'}）`);
let contiguous = rankingYears.length > 0;
for (let i = 1; i < rankingYears.length; i++) {
  if (rankingYears[i] !== rankingYears[i - 1] + 1) contiguous = false;
}
check(contiguous, `榜单年份连续无缺（${rankingYears.join(', ') || '无'}）`);
// 亦接受 ranking-<year>/index.html 形式
const rankingDirPages = rankingYears.filter((y) =>
  existsSync(join(DIST, `ranking-${y}`, 'index.html')),
);
check(
  rankingDirPages.length === rankingYears.length,
  `ranking-<year>/index.html 榜单页齐全（${rankingDirPages.length}/${rankingYears.length}）`,
);

// 3. 随机 10 个开发者目录（候选目录不预先按 index.html 过滤，确保随机校验真实）
const candidateDirs = entries
  .filter((e) => !e.startsWith('.') && e !== 'assets' && !/^ranking-/.test(e))
  .filter((e) => isDir(join(DIST, e)))
  .sort();
check(candidateDirs.length >= 10, `开发者目录数 >= 10（实际 ${candidateDirs.length}）`);
const picks = sample(candidateDirs, 10);
for (const d of picks) {
  check(
    existsSync(join(DIST, d, 'index.html')),
    `随机开发者 /ossheroes/${d}/index.html 存在`,
  );
}

console.log(`\n开发者目录总数: ${candidateDirs.length}`);
console.log(`榜单年份: ${rankingYears.join(', ') || '无'}`);

if (errors.length) {
  console.error(`\n❌ verify-urls 失败：${errors.length} 项未通过`);
  process.exit(1);
}
console.log('\n✅ verify-urls 通过');
process.exit(0);
