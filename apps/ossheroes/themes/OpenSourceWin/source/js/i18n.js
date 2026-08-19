/* OpenSource.Win ossheroes 轻量双语切换（zh / en）
 * 与官网约定一致：localStorage key = osw-language，值为 'zh' | 'en'。
 * 无存储时按 navigator.language 判断：zh 开头 → 中文，否则英文。
 * 文案通过元素上的 data-i18n-zh / data-i18n-en 属性批量替换（innerHTML，支持内嵌链接）。
 * 切换语言时同步 document.title（保留页面名前缀）与 meta description / og:description。
 */
(function () {
  var STORAGE_KEY = 'osw-language';

  /* 双语站点级 meta：切换语言时同步 document.title 与 description */
  var META = {
    zh: {
      siteTitle: '中国开源码力榜',
      description:
        '中国开源码力榜：由 OpenSource.Win、开源社、X-lab 开放实验室联合发起的中国开源开发者年度榜单，基于 OpenRank 算法评选。'
    },
    en: {
      siteTitle: 'China Open Source HeroRank',
      description:
        'China Open Source HeroRank: an annual ranking of Chinese open source developers, co-founded by OpenSource.Win, KAIYUANSHE and X-lab, based on the OpenRank algorithm.'
    }
  };

  /* 首次 apply 时从服务端渲染的 title 提取页面名前缀（详情页为开发者 login，语言中性） */
  var titlePrefix = null;
  function captureTitlePrefix() {
    if (titlePrefix !== null) return;
    var parts = document.title.split(' - ');
    titlePrefix = parts.length > 1 ? parts.slice(0, -1).join(' - ') : '';
  }

  function applyMeta(lang) {
    var dict = META[lang];
    if (!dict) return;
    captureTitlePrefix();
    document.title = titlePrefix
      ? titlePrefix + ' - ' + dict.siteTitle
      : dict.siteTitle;
    var metas = document.querySelectorAll(
      'meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]'
    );
    for (var i = 0; i < metas.length; i++) {
      metas[i].setAttribute('content', dict.description);
    }
  }

  function detect() {
    try {
      var stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'zh' || stored === 'en') return stored;
    } catch (e) {
      /* localStorage 不可用（隐私模式等）时回退到浏览器语言 */
    }
    var nav = (window.navigator.language || 'en').toLowerCase();
    return nav.indexOf('zh') === 0 ? 'zh' : 'en';
  }

  function apply(lang) {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    applyMeta(lang);
    var attr = lang === 'zh' ? 'data-i18n-zh' : 'data-i18n-en';
    var nodes = document.querySelectorAll('[' + attr + ']');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].innerHTML = nodes[i].getAttribute(attr);
    }
    var btns = document.querySelectorAll('[data-lang-switch]');
    for (var j = 0; j < btns.length; j++) {
      var active = btns[j].getAttribute('data-lang-switch') === lang;
      btns[j].classList.toggle('active', active);
      btns[j].setAttribute('aria-pressed', active ? 'true' : 'false');
    }
  }

  function set(lang) {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      /* 写入失败不影响当次切换 */
    }
    apply(lang);
  }

  window.OSW_I18N = { detect: detect, apply: apply, set: set };

  /* 脚本在 head 引入：先尽早同步 <html lang>，正文等 DOM ready 后批量替换 */
  var lang = detect();
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      apply(lang);
    });
  } else {
    apply(lang);
  }
})();
