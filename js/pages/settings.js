/* 设置：每日新词上限、艾宾浩斯间隔。 */
/* global App, DB, U */
(function () {
  "use strict";

  App.register("settings", async function (root) {
    root.innerHTML = `
      <div class="shell">
        <div class="page-title">设置</div>
        <div class="card">
          <div class="field">
            <label>每天学习新词数量</label>
            <input id="set-daily" type="number" min="1" max="200" value="20">
          </div>
          <div class="field">
            <label>复习间隔（天，用逗号分隔）</label>
            <input id="set-intervals" type="text" value="1,2,4,7,15,30,60">
            <div class="hint">答对一次进一档，超过最后一档即「已掌握」。答错回退两档。</div>
          </div>
          <div id="set-msg" class="small" style="margin:8px 0"></div>
          <button class="block" id="btn-save">保存设置</button>
        </div>
        <div class="card">
          <div class="sub-title">关于</div>
          <p class="small">巧记词汇 · 网页版。数据保存在云端（果创云 YesApi），手机和电脑登录同一账号即可自动同步。</p>
          <p class="small">发音使用手机 / 电脑自带的语音，无需联网也能读。</p>
        </div>
      </div>`;

    const dailyEl = document.getElementById("set-daily");
    const intervalsEl = document.getElementById("set-intervals");
    const msg = document.getElementById("set-msg");

    dailyEl.value = String(await DB.getSetting("daily_new", 20));
    intervalsEl.value = String(await DB.getSetting("intervals", "1,2,4,7,15,30,60"));

    document.getElementById("btn-save").onclick = async () => {
      const daily = parseInt(dailyEl.value, 10);
      const intervals = intervalsEl.value.trim();
      if (!daily || daily < 1) { msg.textContent = "每日新词数至少为 1"; return; }
      if (!/^\d+(,\d+)*$/.test(intervals)) {
        msg.textContent = "间隔格式不对，例如：1,2,4,7,15,30,60";
        return;
      }
      try {
        await DB.setSetting("daily_new", daily);
        await DB.setSetting("intervals", intervals);
        msg.textContent = "已保存 ✓（自动同步到云端）";
      } catch (e) {
        msg.textContent = "保存失败：" + (e.message || e.rawMessage || "");
      }
    };
  });
})();
