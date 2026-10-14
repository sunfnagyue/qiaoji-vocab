/* 词库：浏览 + 搜索。 */
/* global App, DB, U */
(function () {
  "use strict";

  App.register("library", async function (root) {
    root.innerHTML = `
      <div class="shell">
        <div class="page-title">词库</div>
        <div class="row" style="margin:8px 0">
          <input id="lib-kw" class="grow" type="text" placeholder="搜索词语 / 拼音 / 释义">
          <select id="lib-field" style="width:auto">
            <option value="word">词语</option>
            <option value="pinyin">拼音</option>
            <option value="definition">释义</option>
          </select>
        </div>
        <div class="row" style="margin:8px 0">
          <span class="small" id="lib-count"></span>
          <span class="spacer"></span>
          <button id="btn-add">＋ 添加词语</button>
        </div>
        <div id="lib-list"></div>
      </div>`;

    document.getElementById("btn-add").onclick = () => App.go("edit", {});

    async function load() {
      const kw = document.getElementById("lib-kw").value;
      const field = document.getElementById("lib-field").value;
      const list = await DB.searchWords(kw, field, 1000);
      document.getElementById("lib-count").textContent = `共 ${list.length} 个`;
      const box = document.getElementById("lib-list");
      if (!list.length) {
        box.innerHTML = `<p class="center small" style="margin-top:30px">没有找到相关词语</p>`;
        return;
      }
      box.innerHTML = list.map((w) => `
        <div class="word-row" data-id="${w.id}">
          <div class="w">${U.escapeHtml(w.word)} <span class="p">${U.escapeHtml(w.pinyin || "")}</span></div>
          <div class="d">${U.escapeHtml(w.definition || "")}</div>
        </div>`).join("");
      box.querySelectorAll(".word-row").forEach((row) => {
        row.onclick = () => App.go("detail", { id: row.dataset.id });
      });
    }

    let timer;
    document.getElementById("lib-kw").addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(load, 250);
    });
    document.getElementById("lib-field").addEventListener("change", load);

    try {
      await load();
    } catch (e) {
      document.getElementById("lib-list").innerHTML =
        `<p class="center small">加载失败：${U.escapeHtml(e.message || e.rawMessage || "")}</p>`;
    }
  });
})();
