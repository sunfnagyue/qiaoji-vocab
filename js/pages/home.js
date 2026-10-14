/* 首页 / 今日学习。 */
/* global App, DB */
(function () {
  "use strict";

  App.register("home", async function (root) {
    root.innerHTML = `
      <div class="shell">
        <div class="page-title">今日学习</div>
        <div class="stats" id="stats">
          <div class="stat"><div class="num" id="st-due">…</div><div class="lbl">待复习</div></div>
          <div class="stat"><div class="num" id="st-new">…</div><div class="lbl">新词</div></div>
          <div class="stat"><div class="num" id="st-mastered">…</div><div class="lbl">已掌握</div></div>
          <div class="stat"><div class="num" id="st-total">…</div><div class="lbl">总词数</div></div>
        </div>
        <button class="block" id="btn-review">▶ 开始复习（待复习）</button>
        <div style="height:10px"></div>
        <button class="block secondary" id="btn-new">＋ 学习新词</button>
      </div>`;

    let c;
    try {
      c = await DB.counts();
    } catch (e) {
      document.getElementById("stats").innerHTML =
        `<p class="small">加载失败：${U.escapeHtml(e.message || e.rawMessage || "")}</p>`;
      return;
    }
    document.getElementById("st-due").textContent = c.due;
    document.getElementById("st-new").textContent = c.new;
    document.getElementById("st-mastered").textContent = c.mastered;
    document.getElementById("st-total").textContent = c.total;

    const dueBtn = document.getElementById("btn-review");
    const newBtn = document.getElementById("btn-new");
    dueBtn.disabled = c.due === 0;
    newBtn.disabled = c.new === 0;
    dueBtn.onclick = () => App.go("study", { mode: "review" });
    newBtn.onclick = () => App.go("study", { mode: "new" });
  });
})();
