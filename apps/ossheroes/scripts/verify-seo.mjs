#!/usr/bin/env node
/**
 * verify-seo.mjs — 校验 ossheroes 开发者详情页的 SEO 结构化数据。
 *
 * 随机抽取 3 个开发者详情页 HTML，验证：
 *   1. 含 <script type="application/ld+json"> 且解析为 ProfilePage / Person
 *   2. 含 og:title、og:description、og:image、twitter:image 等标签
 *
 * 用法：node scripts/verify-seo.mjs [dist-dir]
 * 默认 dist-dir 为脚本上级目录的 dist/ossheroes。成功 exit 0，失败 exit 1。
 */
import { readdirSync, existsSync, readFileSync, statSync } from 'node:fs';
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
function sample(arr, n, seed = 99007711) {
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

/** 在所有 <meta> 标签中查找含 `attr="value"` 者，返回其 content（属性顺序无关）。 */
function getMeta(html, attr, value) {
  const valueEsc = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const attrRe = new RegExp(`${attr}=["']${valueEsc}["']`);
  const tag = (html.match(/<meta\b[^>]*>/gi) || []).find((t) => attrRe.test(t));
  if (!tag) return null;
  const cm = tag.match(/content=["']([^"']*)["']/i);
  return cm ? cm[1] : null;
}

/** 递归收集 JSON-LD 对象中的所有 @type 值（含 mainEntity 等）。 */
function collectTypes(obj, into) {
  if (!obj || typeof obj !== 'object') return;
  const t = obj['@type'];
  if (t) (Array.isArray(t) ? t : [t]).forEach((x) => into.add(x));
  for (const k of Object.keys(obj)) {
    if (k === '@type') continue;
    const v = obj[k];
    if (v && typeof v === 'object') collectTypes(v, into);
  }
}

if (!isDir(DIST)) {
  console.error(`✗ 产物目录不存在: ${DIST}（请先运行 pnpm --filter ossheroes build）`);
  process.exit(1);
}

const entries = readdirSync(DIST);
const candidateDirs = entries
  .filter((e) => !e.startsWith('.') && e !== 'assets' && !/^ranking-/.test(e))
  .filter((e) => isDir(join(DIST, e)))
  .sort();
check(candidateDirs.length >= 3, `开发者目录数 >= 3（实际 ${candidateDirs.length}）`);

const picks = sample(candidateDirs, 3);
for (const d of picks) {
  const file = join(DIST, d, 'index.html');
  if (!existsSync(file)) {
    check(false, `${d}: index.html 不存在`);
    continue;
  }
  const html = readFileSync(file, 'utf8');

  // 1. JSON-LD
  const ldRe = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const blocks = [...html.matchAll(ldRe)].map((m) => m[1]);
  check(blocks.length > 0, `${d}: 含 <script type="application/ld+json">`);
  const types = new Set();
  let parsed = 0;
  for (const b of blocks) {
    try {
      collectTypes(JSON.parse(b), types);
      parsed++;
    } catch {
      /* 忽略畸形块 */
    }
  }
  check(parsed > 0, `${d}: JSON-LD 可解析（${parsed}/${blocks.length}）`);
  const seo = [...types];
  check(
    seo.includes('ProfilePage') || seo.includes('Person'),
    `${d}: JSON-LD 类型为 ProfilePage/Person（${seo.join('/') || '无'}）`,
  );

  // 2. OG + twitter 标签
  check(!!getMeta(html, 'property', 'og:title'), `${d}: og:title`);
  check(!!getMeta(html, 'property', 'og:description'), `${d}: og:description`);
  check(!!getMeta(html, 'property', 'og:image'), `${d}: og:image`);
  check(!!getMeta(html, 'name', 'twitter:image'), `${d}: twitter:image`);
}

if (errors.length) {
  console.error(`\n❌ verify-seo 失败：${errors.length} 项未通过`);
  process.exit(1);
}
console.log('\n✅ verify-seo 通过');
process.exit(0);
