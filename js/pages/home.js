/* 首页 / 今日学习。 */
/* global App, DB, U */
(function () {
  "use strict";

  App.register("home", async function (root) {
    // 未完成的学习进度：顶部显示「继续学习」
    let saved = null;
    try {
      const d = JSON.parse(localStorage.getItem("qiaoji.study") || "null");
      if (d && Array.isArray(d.queue) && d.queue.length && d.idx < d.queue.length) saved = d;
    } catch (e) { /* 忽略 */ }
    const continueBtn = saved ? `
        <button class="block" id="btn-continue">▶ 继续学习（还剩 ${saved.queue.length - saved.idx} 词）</button>
        <div style="height:10px"></div>` : "";

    root.innerHTML = `
      <div class="shell">
        <div class="page-title">今日学习</div>
        <div class="card row" style="margin:8px 0">
          <div style="flex:1">
            <div class="small">连续打卡</div>
            <div style="font-size:26px;font-weight:bold">🔥 <span id="streak-num">…</span> 天</div>
          </div>
          <div style="flex:1;text-align:right">
            <div class="small">今日答题</div>
            <div style="font-size:26px;font-weight:bold">✍️ <span id="today-num">…</span> 次</div>
          </div>
        </div>
        <div class="stats" id="stats">
          <div class="stat"><div class="num" id="st-due">…</div><div class="lbl">待复习</div></div>
          <div class="stat"><div class="num" id="st-new">…</div><div class="lbl">新词</div></div>
          <div class="stat"><div class="num" id="st-mastered">…</div><div class="lbl">已掌握</div></div>
          <div class="stat"><div class="num" id="st-total">…</div><div class="lbl">总词数</div></div>
        </div>
        ${continueBtn}
        <button class="block" id="btn-review">▶ 开始复习（待复习）</button>
        <div style="height:10px"></div>
        <button class="block secondary" id="btn-new">＋ 学习新词</button>
        <div style="height:10px"></div>
        <button class="block secondary" id="btn-wrong">❌ 复习错题</button>
      </div>`;

    let c, s;
    try {
      [c, s] = await Promise.all([DB.counts(), DB.studyStats()]);
    } catch (e) {
      document.getElementById("stats").innerHTML =
        `<p class="small">加载失败：${U.escapeHtml(e.message || e.rawMessage || "")}</p>`;
      return;
    }

    document.getElementById("streak-num").textContent = s.streak;
    document.getElementById("today-num").textContent = s.today.answers;
    document.getElementById("st-due").textContent = c.due;
    document.getElementById("st-new").textContent = c.new;
    document.getElementById("st-mastered").textContent = c.mastered;
    document.getElementById("st-total").textContent = c.total;

    const dueBtn = document.getElementById("btn-review");
    const newBtn = document.getElementById("btn-new");
    const wrongBtn = document.getElementById("btn-wrong");
    dueBtn.disabled = c.due === 0;
    newBtn.disabled = c.new === 0;
    wrongBtn.disabled = c.wrong === 0;
    dueBtn.onclick = () => App.go("study", { mode: "review" });
    newBtn.onclick = () => App.go("study", { mode: "new" });
    wrongBtn.onclick = () => App.go("study", { mode: "wrong" });

    if (saved) {
      document.getElementById("btn-continue").onclick = () => App.go("study", { mode: saved.mode });
    }
  });
})();
