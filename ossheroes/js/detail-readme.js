/* OpenSource.Win ossheroes 详情页：GitHub Profile README 模块
 * 客户端拉取 raw.githubusercontent.com/<login>/<login>/{main,master}/README.md，
 * 成功则以纯文本渲染进 #detailReadme（pre + textContent，无 XSS 面）；
 * 404 / 网络错误 / 超时 / 内容为空时模块保持 hidden，页面不留痕。
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

  ready(function () {
    var box = document.getElementById('detailReadme');
    if (!box) return;
    var login = box.getAttribute('data-login');
    var pre = document.getElementById('detailReadmeContent');
    if (!login || !pre || typeof fetch !== 'function') return;

    /* 截断提示跟随站点双语（i18n.js 先于本脚本在 head 引入） */
    var lang =
      window.OSW_I18N && window.OSW_I18N.detect ? window.OSW_I18N.detect() : 'zh';
    var truncatedNote =
      lang === 'zh' ? '\n\n… [内容过长，已截断]' : '\n\n… [truncated]';

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
          pre.textContent =
            text.length > MAX_LENGTH
              ? text.slice(0, MAX_LENGTH) + truncatedNote
              : text;
          box.hidden = false;
        })
        .catch(function () {
          tryBranch(index + 1);
        });
    }

    tryBranch(0);
  });
})();
