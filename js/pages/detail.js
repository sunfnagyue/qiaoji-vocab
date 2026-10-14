/* 词语详情页：释义、记忆方法、易混淆辨析、例句、发音。 */
/* global App, DB, U */
(function () {
  "use strict";

  App.register("detail", async function (root, params) {
    const fromStudy = !!params.fromStudy;
    root.innerHTML = `
      <div class="shell">
        <div class="row" style="margin:14px 0">
          <button class="ghost" id="btn-back">← 返回</button>
          <span class="spacer"></span>
          <span class="small">词语详情</span>
        </div>
        <div id="detail-body"><div class="center small" style="margin-top:40px">加载中…</div></div>
      </div>`;

    document.getElementById("btn-back").onclick = () => {
      if (fromStudy) App.go("study", { mode: App.study.mode, continue: true });
      else App.go("library");
    };

    let w;
    try {
      w = await DB.getWord(params.id);
    } catch (e) {
      document.getElementById("detail-body").innerHTML =
        `<div class="card center">加载失败：${U.escapeHtml(e.message || e.rawMessage || "")}</div>`;
      return;
    }

    const tags = (w.tags || "").split(/[,，\s]+/).filter(Boolean)
      .map((t) => `<span class="tag">${U.escapeHtml(t)}</span>`).join("");

    const sections = [
      { cls: "tip", icon: "💡", title: "记忆方法", body: w.memoryTip },
      { cls: "conf", icon: "🔍", title: "易混淆辨析", body: w.confusable },
      { cls: "", icon: "📝", title: "备注", body: w.note },
    ];

    const secHtml = sections
      .filter((s) => (s.body || "").trim())
      .map((s) => `
        <div class="section-title ${s.cls}">${s.icon} ${s.title}</div>
        <div>${U.nl2br(s.body)}</div>`)
      .join("");

    const exList = (w.examples && w.examples.length)
      ? w.examples
      : ((w.example || "").trim() ? [{ text: w.example, source: w.exampleSource, url: w.exampleUrl }] : []);

    const exampleHtml = exList.length ? `
      <div class="section-title">📖 例句</div>
      ${exList.map((ex, i) => `
        <div class="example-item">
          <div>${i + 1}. ${U.nl2br(ex.text || "")}</div>
          ${ex.source ? `<div class="small">—— 来源：${U.escapeHtml(ex.source)}${ex.url ? ` · <a href="${U.escapeHtml(ex.url)}" target="_blank" rel="noopener">查看原文 ↗</a>` : ""}</div>` : ""}
        </div>`).join("")}` : "";

    document.getElementById("detail-body").innerHTML = `
      <div class="card">
        <div class="big-word">${U.escapeHtml(w.word)}</div>
        <div class="pinyin">${U.escapeHtml(w.pinyin || U.pinyinDisplay(w.word))}</div>
        <div class="row" style="margin-top:6px;justify-content:center">
          <button id="btn-tts" class="secondary">🔊 发音</button>
          <button id="btn-fav" class="secondary">${w.fav ? "★ 已收藏" : "☆ 收藏"}</button>
        </div>
        <div class="section-title">📖 释义</div>
        <div>${U.nl2br(w.definition)}</div>
        ${secHtml}
        ${exampleHtml}
        ${tags ? `<div style="margin-top:12px">${tags}</div>` : ""}
        <div class="row" style="margin-top:14px">
          <button class="secondary grow" id="btn-edit">✏️ 编辑</button>
          <button class="danger grow" id="btn-del">🗑 删除</button>
        </div>
        ${fromStudy ? `<button class="block" style="margin-top:10px" id="btn-continue">继续下一题 →</button>` : ""}
      </div>`;

    // 发音
    document.getElementById("btn-tts").onclick = () => {
      if (!("speechSynthesis" in window)) { alert("当前浏览器不支持发音"); return; }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(w.word);
      u.lang = "zh-CN";
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    };

    // 收藏 / 取消收藏
    const favBtn = document.getElementById("btn-fav");
    favBtn.onclick = async () => {
      const next = !w.fav;
      try {
        await DB.toggleFav(w.id, next);
        w.fav = next;
        favBtn.textContent = next ? "★ 已收藏" : "☆ 收藏";
      } catch (e) {
        alert("操作失败：" + (e.message || e.rawMessage || ""));
      }
    };

    document.getElementById("btn-edit").onclick = () => App.go("edit", { id: w.id });

    document.getElementById("btn-del").onclick = async () => {
      if (!confirm(`确定删除「${w.word}」吗？删除后不再出现在学习中。`)) return;
      try {
        await DB.deleteWord(w.id);
        alert("已删除");
        if (fromStudy) App.go("study", { mode: App.study.mode, continue: true });
        else App.go("library");
      } catch (e) {
        alert("删除失败：" + (e.message || e.rawMessage || ""));
      }
    };

    if (fromStudy) {
      document.getElementById("btn-continue").onclick = () =>
        App.go("study", { mode: App.study.mode, continue: true });
    }
  });
})();
