/* 主控：初始化、登录、路由、导航。 */
/* global DB, U, Scheduler, BUILTIN_TERMS */
(function () {
  "use strict";

  const App = {
    screen: "home",
    params: {},
    // 学习会话（跨详情页保持）
    study: {
      mode: "new",
      queue: [],
      idx: 0,
    },
  };

  // 页面模块注册（由各 pages/*.js 填充）
  const pages = {};

  App.register = function (name, render) {
    pages[name] = render;
  };

  const $screen = () => document.getElementById("screen");

  // 当前是否已登录
  App.isAuthed = function () {
    return !!DB.currentUser();
  };

  App.boot = function () {
    DB.init();
    if (App.isAuthed()) {
      App.afterAuth();
    } else {
      App.showAuth();
    }
  };

  // 登录/已有账号进入后：显示主界面 → 首次自动播种内置词库 → 首页
  App.afterAuth = async function () {
    App.showMain();
    try { await DB.seedIfEmpty(); } catch (e) { /* 播种失败不阻塞，可重试 */ }
    try { await DB.enrichExamples(); } catch (e) { /* 例句更新失败不阻塞 */ }
    try { await DB.syncBuiltin(); } catch (e) { /* 补词失败不阻塞，可重试 */ }
    App.go("home");
  };

  App.showAuth = function () {
    document.getElementById("topbar").classList.add("hidden");
    document.getElementById("bottomnav").classList.add("hidden");
    pages.auth($screen());
  };

  App.showMain = function () {
    document.getElementById("topbar").classList.remove("hidden");
    document.getElementById("bottomnav").classList.remove("hidden");
    const u = DB.currentUser();
    document.getElementById("username").textContent = u ? u.username : "";
  };

  // 导航
  App.go = function (screen, params) {
    App.screen = screen;
    App.params = params || {};
    const render = pages[screen];
    if (!render) return;
    render($screen(), App.params);
    // 高亮底部导航
    const tabs = document.querySelectorAll(".bottomnav .tab");
    tabs.forEach((t) => {
      t.classList.toggle("active", t.dataset.screen === screen);
    });
    window.scrollTo(0, 0);
  };

  App.logout = async function () {
    await DB.logout();
    location.reload();
  };

  // 暴露给 HTML 内联事件
  window.App = App;
  window.DB = DB;
  window.U = U;
  window.Scheduler = Scheduler;

  document.addEventListener("DOMContentLoaded", App.boot);
})();
