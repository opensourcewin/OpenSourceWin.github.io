/**
 * URL 级三语言基础设施 —— apps/www 与 apps/ossheroes 共用。
 *
 * 语言规范（全站锁定）：
 * - en 为默认语言，URL 无前缀（/、/heroes/、/hero/<login>/）；
 * - zh-CN / zh-TW 分别在 /zh-CN/、/zh-TW/ 前缀下产出同构页面；
 * - zh-TW 文案由简体中文经 OpenCC（s2tw）在构建期转换，品牌名与英文术语不受影响。
 */

import * as OpenCC from 'opencc-js';

export const LOCALES = ['en', 'zh-CN', 'zh-TW'] as const;
export type Locale = (typeof LOCALES)[number];

/** 默认语言：无前缀 */
export const DEFAULT_LOCALE: Locale = 'en';

/** <html lang> 与 og:locale 的映射 */
export const OG_LOCALE: Record<Locale, string> = {
  en: 'en_US',
  'zh-CN': 'zh_CN',
  'zh-TW': 'zh_TW',
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** 语言前缀拼路径：en 保持原样，其余 `/<locale><path>`。path 需以 / 开头。 */
export function localePath(locale: Locale, path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return locale === DEFAULT_LOCALE ? normalized : `/${locale}${normalized}`;
}

/** 站内路径 → 某语言的绝对 URL。 */
export function localeUrl(siteUrl: string, locale: Locale, path: string): string {
  return `${siteUrl.replace(/\/$/, '')}${localePath(locale, path)}`;
}

export interface HreflangAlternate {
  hreflang: string;
  href: string;
}

/** 一页三语言的 4 条 hreflang alternate（en / zh-CN / zh-TW / x-default→en）。 */
export function hreflangAlternates(siteUrl: string, path: string): HreflangAlternate[] {
  return [
    ...LOCALES.map((locale) => ({ hreflang: locale, href: localeUrl(siteUrl, locale, path) })),
    { hreflang: 'x-default', href: localeUrl(siteUrl, DEFAULT_LOCALE, path) },
  ];
}

/** OpenCC s2tw（简体 → 台湾正体）转换器，首次调用 toZhTw 时惰性初始化（en / zh-CN 构建零开销）。 */
let s2tw: ((text: string) => string) | null = null;
function getS2tw(): (text: string) => string {
  if (s2tw === null) s2tw = OpenCC.Converter({ from: 'cn', to: 'tw' });
  return s2tw;
}

/** 简体中文 → 繁体中文（台湾标准）；ASCII（品牌名 / URL / 代码）不受影响。 */
export function toZhTw(text: string): string {
  return getS2tw()(text);
}

/** 递归转换内容树中的所有字符串（用于整页文案数据对象）。 */
export function toZhTwDeep<T>(value: T): T {
  if (typeof value === 'string') return toZhTw(value) as T;
  if (Array.isArray(value)) return value.map((item) => toZhTwDeep(item)) as T;
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) out[key] = toZhTwDeep(item);
    return out as T;
  }
  return value;
}

/** 按语言取文案：en 用英文，zh-CN 用简体，zh-TW 由简体经 OpenCC 转换。 */
export function t(locale: Locale, zh: string, en: string): string {
  if (locale === 'en') return en;
  if (locale === 'zh-TW') return toZhTw(zh);
  return zh;
}
