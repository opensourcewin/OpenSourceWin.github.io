/* OpenSource.Win ossheroes 轻量双语切换（zh / en）
 * 与官网约定一致：localStorage key = osw-language，值为 'zh' | 'en'。
 * 无存储时按 navigator.language 判断：zh 开头 → 中文，否则英文。
 * 文案通过元素上的 data-i18n-zh / data-i18n-en 属性批量替换（innerHTML，支持内嵌链接）。
 */
(function () {
  var STORAGE_KEY = 'osw-language';

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
