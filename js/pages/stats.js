/* 学习统计：打卡日历 + 学习量 + 正确率。 */
/* global App, DB, U */
(function () {
  "use strict";

  App.register("stats", async function (root) {
    root.innerHTML = `
      <div class="shell">
        <div class="page-title">学习统计</div>
        <div class="stats" id="stat-cards">
          <div class="stat"><div class="num" id="st-streak">…</div><div class="lbl">连续打卡</div></div>
          <div class="stat"><div class="num" id="st-days">…</div><div class="lbl">学习天数</div></div>
          <div class="stat"><div class="num" id="st-answers">…</div><div class="lbl">累计答题</div></div>
          <div class="stat"><div class="num" id="st-acc">…</div><div class="lbl">正确率</div></div>
        </div>
        <div class="card">
          <div class="row" style="margin-bottom:6px">
            <button class="ghost" id="cal-prev">‹ 上月</button>
            <span class="spacer"></span>
            <span style="font-weight:bold" id="cal-title"></span>
            <span class="spacer"></span>
            <button class="ghost" id="cal-next">下月 ›</button>
          </div>
          <div class="cal" id="cal-grid"></div>
        </div>
        <div class="card">
          <div class="section-title">📊 学习数据</div>
          <div class="row" style="margin:6px 0"><span class="small">累计答题</span><span class="spacer"></span><b id="d-answers"></b></div>
          <div class="row" style="margin:6px 0"><span class="small">答对 / 答错</span><span class="spacer"></span><b id="d-cw"></b></div>
          <div class="row" style="margin:6px 0"><span class="small">累计新学</span><span class="spacer"></span><b id="d-news"></b></div>
          <div class="row" style="margin:6px 0"><span class="small">今日答题</span><span class="spacer"></span><b id="d-today"></b></div>
        </div>
      </div>`;

    let s;
    try {
      s = await DB.studyStats();
    } catch (e) {
      document.getElementById("stat-cards").innerHTML =
        `<p class="small">加载失败：${U.escapeHtml(e.message || e.rawMessage || "")}</p>`;
      return;
    }

    const acc = s.totalAnswers ? Math.round((s.totalCorrect / s.totalAnswers) * 100) : 0;
    document.getElementById("st-streak").textContent = s.streak + "天";
    document.getElementById("st-days").textContent = s.totalDays;
    document.getElementById("st-answers").textContent = s.totalAnswers;
    document.getElementById("st-acc").textContent = acc + "%";
    document.getElementById("d-answers").textContent = s.totalAnswers + " 次";
    document.getElementById("d-cw").textContent = `${s.totalCorrect} 对 / ${s.totalWrong} 错`;
    document.getElementById("d-news").textContent = s.totalNews + " 个";
    document.getElementById("d-today").textContent = s.today.answers + " 次";

    // 打卡日历（默认当前月）
    const daySet = s.daySet;
    const today = new Date();
    let calYear = today.getFullYear();
    let calMonth = today.getMonth(); // 0-based

    function renderCal() {
      document.getElementById("cal-title").textContent = `${calYear} 年 ${calMonth + 1} 月`;
      const grid = document.getElementById("cal-grid");
      const dows = ["日", "一", "二", "三", "四", "五", "六"];
      let html = dows.map((d) => `<div class="dow">${d}</div>`).join("");
      const startDow = new Date(calYear, calMonth, 1).getDay();
      const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
      for (let i = 0; i < startDow; i++) html += `<div class="day blank"></div>`;
      for (let d = 1; d <= daysInMonth; d++) {
        const ds = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const has = !!daySet[ds];
        const isToday = calYear === today.getFullYear() && calMonth === today.getMonth() && d === today.getDate();
        html += `<div class="day ${has ? "has" : ""} ${isToday ? "today" : ""}">${d}</div>`;
      }
      grid.innerHTML = html;
    }

    renderCal();
    document.getElementById("cal-prev").onclick = () => {
      calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; }
      renderCal();
    };
    document.getElementById("cal-next").onclick = () => {
      calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; }
      renderCal();
    };
  });
})();
