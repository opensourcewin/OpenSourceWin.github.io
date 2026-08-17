/* OpenSource.Win ossheroes 详情页：GitHub Profile README 模块
 * 客户端拉取 raw.githubusercontent.com/<login>/<login>/{main,master}/README.md，
 * 用 vendored marked（js/vendor/marked.min.js，不走 CDN）渲染为 HTML 注入 #detailReadmeContent：
 * - 原始 HTML 一律转义（renderer.html 覆写），防 README 内 HTML 注入破坏页面；
 * - 相对图片路径 → raw.githubusercontent.com/<login>/<login>/<branch>/ 绝对地址；
 * - 相对链接路径 → github.com/<login>/<login>/blob/<branch>/ 绝对地址；
 * - 图片统一 loading="lazy"，外链 target="_blank" rel="noopener"。
 * 404 / 网络错误 / 超时 / marked 加载失败 / 内容为空时模块保持 hidden，页面不留痕。
 */
(function () {
  var TIMEOUT_MS = 8000;
  var MAX_LENGTH = 40000;
  var BRANCHES = ['main', 'master'];

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  /* 超时覆盖整个请求：响应头返回后 body 下载仍受同一 AbortController 约束 */
  function fetchTextWithTimeout(url, ms) {
    var controller = new AbortController();
    var timer = setTimeout(function () {
      controller.abort();
    }, ms);
    function done(err) {
      clearTimeout(timer);
      if (err) throw err;
    }
    return fetch(url, { signal: controller.signal })
      .then(function (res) {
        if (!res.ok) throw new Error('http ' + res.status);
        return res.text();
      })
      .then(
        function (text) {
          done();
          return text;
        },
        function (err) {
          done(err);
        }
      );
  }

  /* 由自身 script 标签推导站点根路径（兼容任意 base 路径），按需注入 vendored marked */
  function loadMarked(cb) {
    if (window.marked && typeof window.marked.parse === 'function') {
      cb(null);
      return;
    }
    var scripts = document.getElementsByTagName('script');
    var base = null;
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || '';
      var idx = src.indexOf('/js/detail-readme.js');
      if (idx !== -1) {
        base = src.slice(0, idx);
        break;
      }
    }
    if (!base) {
      cb(new Error('no base'));
      return;
    }
    var el = document.createElement('script');
    el.src = base + '/js/vendor/marked.min.js';
    el.onload = function () {
      if (window.marked && typeof window.marked.parse === 'function') {
        cb(null);
      } else {
        cb(new Error('marked broken'));
      }
    };
    el.onerror = function () {
      cb(new Error('marked load failed'));
    };
    document.head.appendChild(el);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* 相对路径判定：协议绝对 / 协议相对 / data / mailto / 纯锚点都不算相对 */
  function isRelativeUrl(href) {
    return !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href);
  }

  /* 协议白名单：javascript:/vbscript: 等可执行协议一律拒绝（marked 默认消毒被自定义 renderer 绕过，需自行把关） */
  function isSafeUrl(href, allowData) {
    if (isRelativeUrl(href)) return true; /* 相对路径会被改写为 github 绝对地址 */
    if (href.charAt(0) === '#' || href.indexOf('//') === 0) return true;
    return allowData
      ? /^(?:https?|data):/i.test(href)
      : /^(?:https?|mailto):/i.test(href);
  }

  function stripLeadingDots(href) {
    return href.replace(/^\/+/, '').replace(/^(\.\/)+/, '');
  }

  /* 配置 marked：转义原始 HTML，相对路径转绝对地址（raw / blob） */
  function configureMarked(login, branch) {
    var rawBase =
      'https://raw.githubusercontent.com/' +
      encodeURIComponent(login) +
      '/' +
      encodeURIComponent(login) +
      '/' +
      branch +
      '/';
    var blobBase =
      'https://github.com/' +
      encodeURIComponent(login) +
      '/' +
      encodeURIComponent(login) +
      '/blob/' +
      branch +
      '/';

    window.marked.use({
      gfm: true,
      breaks: true,
      renderer: {
        /* 原始 HTML（块级与行内）整体转义为文本，杜绝注入 */
        html: function (token) {
          return escapeHtml(token && token.text ? token.text : token);
        },
        link: function (token) {
          var href = token && token.href ? token.href : '';
          var text = this.parser.parseInline(token.tokens);
          if (!isSafeUrl(href, false)) {
            return text; /* 危险协议：只保留链接文字，不输出 href */
          }
          var title = token.title
            ? ' title="' + escapeHtml(token.title) + '"'
            : '';
          var external = '';
          if (isRelativeUrl(href)) {
            href = blobBase + stripLeadingDots(href);
          }
          if (href.charAt(0) !== '#') {
            external = ' target="_blank" rel="noopener"';
          }
          return (
            '<a href="' +
            escapeHtml(href) +
            '"' +
            title +
            external +
            '>' +
            text +
            '</a>'
          );
        },
        image: function (token) {
          var href = token && token.href ? token.href : '';
          var alt = token && token.text ? token.text : '';
          if (!isSafeUrl(href, true)) {
            return escapeHtml(alt); /* 危险协议：只保留 alt 文本 */
          }
          var title = token.title
            ? ' title="' + escapeHtml(token.title) + '"'
            : '';
          if (isRelativeUrl(href)) {
            href = rawBase + stripLeadingDots(href);
          }
          return (
            '<img src="' +
            escapeHtml(href) +
            '" alt="' +
            escapeHtml(alt) +
            '"' +
            title +
            ' loading="lazy">'
          );
        }
      }
    });
  }

  ready(function () {
    var box = document.getElementById('detailReadme');
    if (!box) return;
    var login = box.getAttribute('data-login');
    var container = document.getElementById('detailReadmeContent');
    if (!login || !container || typeof fetch !== 'function') return;

    /* 截断提示跟随站点双语（i18n.js 先于本脚本在 head 引入） */
    var lang =
      window.OSW_I18N && window.OSW_I18N.detect ? window.OSW_I18N.detect() : 'zh';
    var truncatedNote =
      lang === 'zh' ? '\n\n… [内容过长，已截断]' : '\n\n… [truncated]';

    function render(text, branch) {
      loadMarked(function (err) {
        if (err) return; /* marked 加载失败：模块保持隐藏 */
        try {
          configureMarked(login, branch);
          container.innerHTML = window.marked.parse(text);
          box.hidden = false;
        } catch (e) {
          /* 渲染异常同样保持隐藏 */
        }
      });
    }

    function tryBranch(index) {
      if (index >= BRANCHES.length) return; /* 全部失败：模块保持隐藏 */
      var url =
        'https://raw.githubusercontent.com/' +
        encodeURIComponent(login) +
        '/' +
        encodeURIComponent(login) +
        '/' +
        BRANCHES[index] +
        '/README.md';
      fetchTextWithTimeout(url, TIMEOUT_MS)
        .then(function (text) {
          if (!text || !text.trim()) throw new Error('empty');
          render(
            text.length > MAX_LENGTH
              ? text.slice(0, MAX_LENGTH) + truncatedNote
              : text,
            BRANCHES[index]
          );
        })
        .catch(function () {
          tryBranch(index + 1);
        });
    }

    tryBranch(0);
  });
})();
