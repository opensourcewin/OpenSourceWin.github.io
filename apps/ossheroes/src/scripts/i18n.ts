/* OpenSource.Win ossheroes 轻量双语切换（zh / en）
 * 与官网约定一致：localStorage key = osw-language，值为 'zh' | 'en'。
 * 无存储时按 navigator.language 判断：zh 开头 → 中文，否则英文。
 * 文案通过元素上的 data-i18n-zh / data-i18n-en 属性批量替换（innerHTML，支持内嵌链接）。
 * 切换语言时同步 document.title（保留页面名前缀）与 meta description / og:description。
 * （自 Hexo 主题 js/i18n.js 原样移植为打包模块）
 */

type Lang = 'zh' | 'en';

const STORAGE_KEY = 'osw-language';

/* 双语站点级 meta：切换语言时同步 document.title 与 description */
const META: Record<Lang, { siteTitle: string; description: string }> = {
  zh: {
    siteTitle: '中国开源码力榜',
    description:
      '中国开源码力榜：由 OpenSource.Win、开源社、X-lab 开放实验室联合发起的中国开源开发者年度榜单，基于 OpenRank 算法评选。',
  },
  en: {
    siteTitle: 'China Open Source HeroRank',
    description:
      'China Open Source HeroRank: an annual ranking of Chinese open source developers, co-founded by OpenSource.Win, KAIYUANSHE and X-lab, based on the OpenRank algorithm.',
  },
};

/* 首次 apply 时从服务端渲染的 title 提取页面名前缀（详情页为开发者 login，语言中性） */
let titlePrefix: string | null = null;
function captureTitlePrefix() {
  if (titlePrefix !== null) return;
  const parts = document.title.split(' - ');
  titlePrefix = parts.length > 1 ? parts.slice(0, -1).join(' - ') : '';
}

function applyMeta(lang: Lang) {
  const dict = META[lang];
  if (!dict) return;
  captureTitlePrefix();
  document.title = titlePrefix ? `${titlePrefix} - ${dict.siteTitle}` : dict.siteTitle;
  const metas = document.querySelectorAll(
    'meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]',
  );
  for (let i = 0; i < metas.length; i++) {
    metas[i].setAttribute('content', dict.description);
  }
}

function detect(): Lang {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'zh' || stored === 'en') return stored;
  } catch {
    /* localStorage 不可用（隐私模式等）时回退到浏览器语言 */
  }
  const nav = (window.navigator.language || 'en').toLowerCase();
  return nav.indexOf('zh') === 0 ? 'zh' : 'en';
}

function apply(lang: Lang) {
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  applyMeta(lang);
  const attr = lang === 'zh' ? 'data-i18n-zh' : 'data-i18n-en';
  const nodes = document.querySelectorAll(`[${attr}]`);
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].innerHTML = nodes[i].getAttribute(attr) ?? '';
  }
  const btns = document.querySelectorAll('[data-lang-switch]');
  for (let j = 0; j < btns.length; j++) {
    const active = btns[j].getAttribute('data-lang-switch') === lang;
    btns[j].classList.toggle('active', active);
    btns[j].setAttribute('aria-pressed', active ? 'true' : 'false');
  }
}

function set(lang: Lang) {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* 写入失败不影响当次切换 */
  }
  apply(lang);
}

declare global {
  interface Window {
    OSW_I18N: { detect: typeof detect; apply: typeof apply; set: typeof set };
  }
}

window.OSW_I18N = { detect, apply, set };

/* 打包后的 module 脚本在 DOM 解析完成后执行：直接同步 <html lang> 并批量替换 */
const lang = detect();
document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => apply(lang));
} else {
  apply(lang);
}

/* 使本文件成为外部模块，上方的 declare global 方能生效 */
export {};
