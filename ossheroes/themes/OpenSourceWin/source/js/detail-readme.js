/* OpenSource.Win ossheroes 详情页：GitHub Profile README 模块
 * 客户端拉取 raw.githubusercontent.com/<login>/<login>/{main,master}/README.md，
 * 用 vendored marked + DOMPurify（js/vendor/，不走 CDN）渲染进 #detailReadmeContent：
 * - marked 与 DOMPurify 由 head.ejs 在开发者详情页先于本脚本引入（顺序即依赖顺序）；
 * - marked 解析 markdown，原始 HTML（GitHub Profile README 大量使用的徽章、
 *   <picture> 暗色适配等安全子集）原样通过；
 * - DOMPurify 白名单消毒：仅放行 GitHub 常见安全标签/属性与 http/https/mailto/
 *   data:image 协议，script/iframe/javascript: 等一律剔除；
 * - 相对图片路径 → raw.githubusercontent.com/<login>/<login>/<branch>/ 绝对地址；
 * - 相对链接路径 → github.com/<login>/<login>/blob/<branch>/ 绝对地址；
 * - 图片统一 loading="lazy"，外链 target="_blank" rel="noopener noreferrer"。
 * 404 / 网络错误 / 超时 / vendor 缺失 / 内容为空时模块保持 hidden，页面不留痕。
 */
(function () {
  var TIMEOUT_MS = 8000;
  var MAX_LENGTH = 40000;
  var BRANCHES = ['main', 'master'];

  /* DOMPurify 白名单：对齐 GitHub Profile README 实际允许的标签子集 */
  var SANITIZE_CONFIG = {
    ALLOWED_TAGS: [
      'a', 'img', 'picture', 'source',
      'p', 'div', 'span', 'sub', 'sup', 'details', 'summary', 'br',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'pre', 'code', 'blockquote',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'strong', 'em', 'del', 'hr'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'srcset', 'alt', 'title',
      'width', 'height', 'align', 'target', 'loading',
      'media', 'open'
    ],
    /* 协议白名单：http/https/mailto + 图片 data:image；相对路径与锚点放行（随后改写） */
    ALLOWED_URI_REGEXP:
      /^(?:(?:https?|mailto):|data:image\/|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i
  };

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

  /* vendor 就绪检查：marked 与 DOMPurify 由 head.ejs 先于本脚本引入 */
  function vendorsReady() {
    return (
      window.marked &&
      typeof window.marked.parse === 'function' &&
      window.DOMPurify &&
      typeof window.DOMPurify.sanitize === 'function'
    );
  }

  /* 相对路径判定：协议绝对 / 协议相对 / data / mailto / 纯锚点都不算相对 */
  function isRelativeUrl(href) {
    return !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href);
  }

  /* 协议白名单（消毒后的二次把关）：javascript:/vbscript: 等可执行协议一律拒绝 */
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

  /* srcset 可能含多个候选（"url 1x, url2 2x"），逐个改写相对 URL。
   * 注意：data: URI 内含逗号时朴素切分会拆坏候选——浏览器会丢弃非法候选并回退 src，可接受。 */
  function rewriteSrcset(srcset, rawBase) {
    return srcset
      .split(',')
      .map(function (candidate) {
        var parts = candidate.trim().split(/\s+/);
        if (parts[0] && isRelativeUrl(parts[0])) {
          parts[0] = rawBase + stripLeadingDots(parts[0]);
        }
        return parts.join(' ');
      })
      .join(', ');
  }

  /* 渲染后 DOM 处理：相对路径转绝对、协议二次把关、外链新开标签、图片懒加载 */
  function postProcess(container, rawBase, blobBase) {
    var i, el, url;

    var anchors = container.querySelectorAll('a[href]');
    for (i = 0; i < anchors.length; i++) {
      el = anchors[i];
      url = el.getAttribute('href');
      if (!isSafeUrl(url, false)) {
        el.removeAttribute('href');
        continue;
      }
      if (isRelativeUrl(url)) {
        el.setAttribute('href', blobBase + stripLeadingDots(url));
        url = el.getAttribute('href');
      }
      if (url.charAt(0) !== '#') {
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
      }
    }

    var images = container.querySelectorAll('img');
    for (i = 0; i < images.length; i++) {
      el = images[i];
      url = el.getAttribute('src');
      if (url) {
        if (!isSafeUrl(url, true)) {
          el.removeAttribute('src');
        } else if (isRelativeUrl(url)) {
          el.setAttribute('src', rawBase + stripLeadingDots(url));
        }
      }
      var srcset = el.getAttribute('srcset');
      if (srcset) el.setAttribute('srcset', rewriteSrcset(srcset, rawBase));
      if (!el.getAttribute('loading')) el.setAttribute('loading', 'lazy');
    }

    /* <picture><source media="(prefers-color-scheme: dark)">：保留 media，暗色主题自然命中 */
    var sources = container.querySelectorAll('source');
    for (i = 0; i < sources.length; i++) {
      el = sources[i];
      url = el.getAttribute('src');
      if (url && isRelativeUrl(url)) {
        el.setAttribute('src', rawBase + stripLeadingDots(url));
      }
      var ss = el.getAttribute('srcset');
      if (ss) el.setAttribute('srcset', rewriteSrcset(ss, rawBase));
    }
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
      if (!vendorsReady()) return; /* vendor 缺失：模块保持隐藏 */
      try {
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

        window.marked.setOptions({ gfm: true, breaks: true });
        /* markdown → HTML（原始 HTML 放行）→ DOMPurify 白名单消毒 → DOM 后处理 */
        var html = window.DOMPurify.sanitize(
          window.marked.parse(text),
          SANITIZE_CONFIG
        );
        container.innerHTML = html;
        postProcess(container, rawBase, blobBase);
        box.hidden = false;
      } catch (e) {
        /* 渲染异常同样保持隐藏 */
      }
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
