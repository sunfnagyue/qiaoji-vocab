/* 登录 / 注册页。 */
/* global App, DB */
(function () {
  "use strict";

  App.register("auth", function (root) {
    root.innerHTML = `
      <div class="auth-wrap">
        <div class="auth-title">📖 巧记词汇</div>
        <div class="auth-sub">手机和电脑登录同一个账号，进度自动同步</div>
        <div class="card">
          <div class="field">
            <label>用户名</label>
            <input id="auth-user" type="text" autocomplete="username" placeholder="如：xiaoming">
          </div>
          <div class="field">
            <label>密码</label>
            <input id="auth-pass" type="password" autocomplete="current-password" placeholder="至少 6 位">
          </div>
          <div id="auth-msg" class="small" style="color:#B96A6A;margin:8px 0"></div>
          <button id="auth-login" class="block">登录</button>
          <div class="center" style="margin-top:12px">
            <span class="small">还没有账号？</span>
            <button class="ghost" id="auth-toggle">注册</button>
          </div>
        </div>
        <p class="small center" style="margin-top:14px">
          首次使用请先「注册」，之后在另一台设备「登录」同一账号即可同步。
        </p>
      </div>`;

    const user = document.getElementById("auth-user");
    const pass = document.getElementById("auth-pass");
    const msg = document.getElementById("auth-msg");
    const loginBtn = document.getElementById("auth-login");
    const toggleBtn = document.getElementById("auth-toggle");
    let mode = "login";

    function setMsg(s) { msg.textContent = s || ""; }

    function doSubmit() {
      const u = user.value.trim();
      const p = pass.value;
      if (!u) { setMsg("请输入用户名"); return; }
      if (!p || p.length < 6) { setMsg("密码至少 6 位"); return; }
      loginBtn.disabled = true;
      setMsg(mode === "login" ? "登录中…" : "注册中…");
      const promise = mode === "login" ? DB.login(u, p) : DB.signup(u, p);
      promise.then(() => {
        App.afterAuth();
      }).catch((e) => {
        loginBtn.disabled = false;
        setMsg(e.message || e.rawMessage || "操作失败，请重试");
      });
    }

    loginBtn.onclick = doSubmit;
    toggleBtn.onclick = function () {
      mode = mode === "login" ? "signup" : "login";
      loginBtn.textContent = mode === "login" ? "登录" : "注册";
      toggleBtn.textContent = mode === "login" ? "注册" : "登录";
      setMsg("");
    };
    pass.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSubmit();
    });
  });
})();
