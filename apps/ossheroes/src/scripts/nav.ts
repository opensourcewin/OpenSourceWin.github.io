/* 导航栏交互（Bootstrap collapse / dropdown 与 footer.ejs 内联脚本的自实现替代）：
 * - 移动端汉堡按钮开合菜单；
 * - 「往年榜单」下拉：点击开合，点击外部 / Escape 关闭；
 * - 页面滚动超过 100px 后导航背景透明（对齐原 window.onload 内联脚本）。
 */
(function () {
  function ready(fn: () => void) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(function () {
    const navWrap = document.getElementById('navWrap');
    if (!navWrap) return;

    // 滚动背景：使用主题变量，保持与暗黑导航一致
    const navBg =
      getComputedStyle(document.documentElement).getPropertyValue('--osw-card').trim() ||
      'var(--osw-card)';
    window.addEventListener('scroll', function () {
      navWrap.style.backgroundColor = window.scrollY > 100 ? navBg : 'transparent';
    });

    // 移动端菜单
    const toggler = navWrap.querySelector<HTMLButtonElement>('.navbar-toggler');
    const menu = document.getElementById('navbarMenu');
    if (toggler && menu) {
      toggler.addEventListener('click', function () {
        const open = menu.classList.toggle('open');
        toggler.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    // 往年榜单下拉
    const dropdown = navWrap.querySelector<HTMLElement>('.nav-dropdown');
    const dropdownToggle = dropdown?.querySelector<HTMLButtonElement>('.dropdown-toggle');
    if (dropdown && dropdownToggle) {
      dropdownToggle.addEventListener('click', function (event) {
        event.stopPropagation();
        const open = dropdown.classList.toggle('open');
        dropdownToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      document.addEventListener('click', function (event) {
        if (!dropdown.contains(event.target as Node)) {
          dropdown.classList.remove('open');
          dropdownToggle.setAttribute('aria-expanded', 'false');
        }
      });
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
          dropdown.classList.remove('open');
          dropdownToggle.setAttribute('aria-expanded', 'false');
        }
      });
    }
  });
})();
