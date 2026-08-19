/**
 * 共享 SEO 契约 —— apps/www 与 apps/ossheroes 共用的页面元数据结构。
 * 各 app 自行构造 PageSeo（如 ossheroes 的 buildDevSeo / buildPageSeo），
 * 再交给 packages/ui 的 <SeoHead> 渲染标准 title / OG / Twitter / canonical / JSON-LD。
 */

/** 页面 SEO 元数据契约：title / description / keywords / OG / canonical / JSON-LD */
export interface PageSeo {
  title: string;
  description: string;
  keywords?: string;
  ogType: 'website' | 'article';
  ogImage: string;
  canonical: string;
  jsonLd?: Record<string, unknown>;
}

/** 可选的双语变体：提供时 <SeoHead> 在 title / description 等标签上额外输出
 *  data-i18n-en / data-i18n-zh 属性，供两个 app 共用的客户端语言切换脚本互换。 */
export interface SeoI18n {
  en?: { title?: string; description?: string };
  zh?: { title?: string; description?: string };
}

/**
 * 将 JSON-LD 对象序列化为可安全内联进 <script> 的字符串：
 * 把 `<` 转义为 `<`，避免 `</script>` 提前闭合标签。
 * 与两个 app 原先内联的 `.replace(/</g, '\\u003c')` 逻辑一致。
 */
export function stringifyJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
