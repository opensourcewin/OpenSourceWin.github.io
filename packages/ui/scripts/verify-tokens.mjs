#!/usr/bin/env node
/**
 * verify-tokens.mjs — 验证 apps/www 与 apps/ossheroes 构建产物中的共享设计 token 一致。
 *
 * 检查：
 *   - --osw-background、--osw-primary、--osw-foreground、--osw-muted、--osw-border
 *   - --osw-font（或 font-family 中对 JetBrains Mono / var(--osw-font) 的引用）
 *
 * 默认行为：若产物 CSS 不存在，先构建两个 app；已存在则直接使用。
 * 选项：
 *   --build      强制重新构建
 *   --skip-build 强制跳过构建（产物必须已存在）
 *
 * 成功 exit 0，不一致 exit 1。
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

function findRepoRoot() {
  let dir = __dirname;
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml')) || existsSync(join(dir, 'pnpm-workspace.yml'))) {
      return dir;
    }
    dir = dirname(dir);
  }
  throw new Error('无法定位仓库根目录（未找到 pnpm-workspace.yaml）');
}

const REPO_ROOT = findRepoRoot();

const WWW_CSS_DIRS = [
  join(REPO_ROOT, 'apps/www/dist/assets'),
  join(REPO_ROOT, 'apps/www/dist/_astro'),
];
const OSS_CSS_DIR = join(REPO_ROOT, 'apps/ossheroes/dist/ossheroes/assets');

const TOKEN_NAMES = ['osw-background', 'osw-primary', 'osw-foreground', 'osw-muted', 'osw-border'];
const FONT_TOKEN = 'osw-font';

const args = process.argv.slice(2);
const forceBuild = args.includes('--build');
const skipBuild = args.includes('--skip-build');

function check(cond, msg) {
  console.log(`${cond ? '✓' : '✗'} ${msg}`);
  return cond;
}

function runBuilds() {
  console.log('🔨 构建 apps/www...');
  execSync('pnpm --filter www build', { cwd: REPO_ROOT, stdio: 'inherit' });
  console.log('🔨 构建 apps/ossheroes...');
  execSync('pnpm --filter ossheroes build', { cwd: REPO_ROOT, stdio: 'inherit' });
}

function collectCssFiles(dirs) {
  const files = [];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    files.push(...walkCss(dir));
  }
  return files;
}

function walkCss(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) files.push(...walkCss(full));
    else if (s.isFile() && entry.endsWith('.css')) files.push(full);
  }
  return files;
}

function extractVarValues(css, name) {
  const re = new RegExp(`--${name}\\s*:\\s*([^;}{]+)`, 'g');
  const values = [];
  let m;
  while ((m = re.exec(css)) !== null) {
    values.push(m[1].trim());
  }
  return [...new Set(values)];
}

function parseOklch(value) {
  const m = value.match(
    /oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+|none)(?:\s*\/\s*([\d.]+%?))?\s*\)/i,
  );
  if (!m) return null;

  let L = m[1];
  const C = parseFloat(m[2]);
  const H = m[3] === 'none' ? null : parseFloat(m[3]);
  const A = m[4] !== undefined ? parseAlpha(m[4]) : 1;

  if (L.endsWith('%')) L = parseFloat(L) / 100;
  else L = parseFloat(L);

  return { L, C, H, A };
}

function parseAlpha(v) {
  if (v.endsWith('%')) return parseFloat(v) / 100;
  return parseFloat(v);
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

function normalizeColor(value) {
  value = value.trim();
  const parsed = parseOklch(value);
  if (parsed) {
    const { L, C, H, A } = parsed;
    const hue = H === null ? 'none' : round4(H);
    return `oklch(${round4(L)} ${round4(C)} ${hue}${A !== 1 ? ` / ${round4(A)}` : ''})`;
  }
  return value.toLowerCase().replace(/\s+/g, ' ');
}

function normalizeFont(value) {
  return value
    .toLowerCase()
    .replace(/["']/g, '')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasFontReference(css) {
  return /font-family\s*:\s*([^;]*\bjetbrains\s+mono\b|var\(\s*--osw-font\s*\))[^;]*/i.test(css);
}

function extractTokenMap(cssFiles) {
  const combined = cssFiles.map((f) => readFileSync(f, 'utf8')).join('\n');
  const map = new Map();

  for (const name of TOKEN_NAMES) {
    const raw = extractVarValues(combined, name);
    map.set(name, raw.map(normalizeColor));
  }

  const fontRaw = extractVarValues(combined, FONT_TOKEN);
  map.set(FONT_TOKEN, fontRaw.map(normalizeFont));
  map.set('_hasFontRef', hasFontReference(combined));
  return map;
}

function printValues(name, rawValues) {
  if (rawValues.length === 0) return '（未定义）';
  if (rawValues.length === 1) return rawValues[0];
  return rawValues.join(' | ');
}

// --- Main ------------------------------------------------------------------

if (forceBuild && skipBuild) {
  console.error('错误：不能同时使用 --build 和 --skip-build');
  process.exit(1);
}

const wwwCss = collectCssFiles(WWW_CSS_DIRS);
const ossCss = collectCssFiles([OSS_CSS_DIR]);

if (!skipBuild && (forceBuild || wwwCss.length === 0 || ossCss.length === 0)) {
  if (forceBuild) console.log('--build：强制重新构建');
  else if (wwwCss.length === 0) console.log('未找到 apps/www 的 CSS 产物，先构建...');
  else if (ossCss.length === 0) console.log('未找到 apps/ossheroes 的 CSS 产物，先构建...');
  runBuilds();
} else if (skipBuild && (wwwCss.length === 0 || ossCss.length === 0)) {
  console.error('错误：--skip-build 模式下产物 CSS 必须已存在');
  process.exit(1);
}

const finalWwwCss = collectCssFiles(WWW_CSS_DIRS);
const finalOssCss = collectCssFiles([OSS_CSS_DIR]);

console.log(`\n找到 CSS 文件：`);
console.log(`  www:      ${finalWwwCss.length} 个`);
console.log(`  ossheroes: ${finalOssCss.length} 个`);

if (finalWwwCss.length === 0 || finalOssCss.length === 0) {
  console.error('\n❌ 无法找到任一 app 的构建 CSS 文件');
  process.exit(1);
}

const wwwMap = extractTokenMap(finalWwwCss);
const ossMap = extractTokenMap(finalOssCss);

const errors = [];

console.log('\n--- Token 校验 ---');
for (const name of TOKEN_NAMES) {
  const wwwVals = wwwMap.get(name);
  const ossVals = ossMap.get(name);

  const wwwDefined = wwwVals.length > 0;
  const ossDefined = ossVals.length > 0;

  if (!check(wwwDefined, `www: --${name} 已定义`)) errors.push(`www 缺少 --${name}`);
  if (!check(ossDefined, `ossheroes: --${name} 已定义`)) errors.push(`ossheroes 缺少 --${name}`);

  if (wwwDefined && ossDefined) {
    const wwwUnique = [...new Set(wwwVals)];
    const ossUnique = [...new Set(ossVals)];
    const consistent =
      wwwUnique.length === 1 && ossUnique.length === 1 && wwwUnique[0] === ossUnique[0];

    if (!check(consistent, `--${name} 一致：${wwwUnique[0]}`)) {
      errors.push(
        `--${name} 不一致：www=[${wwwUnique.join(', ')}] ossheroes=[${ossUnique.join(', ')}]`,
      );
    }
  }
}

console.log('\n--- 字体校验 ---');
const wwwFontVals = wwwMap.get(FONT_TOKEN);
const ossFontVals = ossMap.get(FONT_TOKEN);

if (wwwFontVals.length > 0 && ossFontVals.length > 0) {
  const wwwUnique = [...new Set(wwwFontVals)];
  const ossUnique = [...new Set(ossFontVals)];
  const consistent =
    wwwUnique.length === 1 && ossUnique.length === 1 && wwwUnique[0] === ossUnique[0];

  if (!check(consistent, `--osw-font 一致`)) {
    errors.push(
      `--osw-font 不一致：www=[${wwwUnique.join(', ')}] ossheroes=[${ossUnique.join(', ')}]`,
    );
  } else {
    console.log(`   值：${wwwUnique[0]}`);
  }
} else {
  // Fallback: 至少两边都有 font-family 引用 JetBrains Mono 或 var(--osw-font)
  const wwwHas = wwwMap.get('_hasFontRef');
  const ossHas = ossMap.get('_hasFontRef');
  if (!check(wwwHas, 'www: CSS 中存在 font-family 引用 JetBrains Mono / var(--osw-font)')) {
    errors.push('www 未找到 font-family 引用');
  }
  if (!check(ossHas, 'ossheroes: CSS 中存在 font-family 引用 JetBrains Mono / var(--osw-font)')) {
    errors.push('ossheroes 未找到 font-family 引用');
  }
}

if (errors.length) {
  console.error(`\n❌ 校验失败（${errors.length} 项）：`);
  for (const e of errors) console.error(`   - ${e}`);
  process.exit(1);
}

console.log('\n✅ 共享设计 token 校验通过');
process.exit(0);
