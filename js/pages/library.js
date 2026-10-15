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
        <div class="row" style="margin:8px 0;gap:8px">
          <button class="tab-pill active" data-filter="all">全部</button>
          <button class="tab-pill" data-filter="fav">⭐ 收藏</button>
          <button class="tab-pill" data-filter="wrong">❌ 错题</button>
        </div>
        <div class="row" style="margin:8px 0">
          <span class="small" id="lib-count"></span>
          <span class="spacer"></span>
          <button id="btn-add">＋ 添加词语</button>
        </div>
        <div id="lib-list"></div>
      </div>`;

    document.getElementById("btn-add").onclick = () => App.go("edit", {});

    let filter = "all";

    async function load() {
      const kw = document.getElementById("lib-kw").value;
      const field = document.getElementById("lib-field").value;
      document.getElementById("lib-list").innerHTML = U.spinner("正在加载…");
      let list;
      if (filter === "fav") list = await DB.favWords();
      else if (filter === "wrong") list = await DB.wrongWords();
      else list = await DB.searchWords(kw, field, 1000);

      // 收藏 / 错题标签下再按关键词过滤
      if (filter !== "all" && kw.trim()) {
        const kl = kw.trim().toLowerCase();
        list = list.filter((r) => {
          if (field === "pinyin") return (r.pinyin || "").toLowerCase().includes(kl) || (r.pinyinRaw || "").includes(kl);
          if (field === "definition") return (r.definition || "").toLowerCase().includes(kl);
          return (r.word || "").includes(kw.trim()) || (r.pinyinRaw || "").includes(kl);
        });
      }

      // 记录当前列表顺序，供详情页左右滑动切换上一个/下一个
      App.lib = list;
      document.getElementById("lib-count").textContent = `共 ${list.length} 个`;
      const box = document.getElementById("lib-list");
      if (!list.length) {
        const emptyMsg = filter === "fav" ? "还没有收藏的词语" : (filter === "wrong" ? "没有答错的词" : "没有找到相关词语");
        box.innerHTML = `<p class="center small" style="margin-top:30px">${emptyMsg}</p>`;
        return;
      }
      box.innerHTML = list.map((w) => `
        <div class="word-row" data-id="${w.id}">
          <div class="w">${U.escapeHtml(w.word)} <span class="p">${U.escapeHtml(w.pinyin || "")}</span></div>
          <div class="d">${U.escapeHtml(w.definition || "")}</div>
        </div>`).join("");
      box.querySelectorAll(".word-row").forEach((row) => {
        row.onclick = () => App.go("detail", { id: row.dataset.id, fromLibrary: true });
      });
    }

    let timer;
    document.getElementById("lib-kw").addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(load, 250);
    });
    document.getElementById("lib-field").addEventListener("change", load);

    root.querySelectorAll(".tab-pill").forEach((t) => {
      t.onclick = () => {
        filter = t.dataset.filter;
        root.querySelectorAll(".tab-pill").forEach((x) => x.classList.toggle("active", x === t));
        load();
      };
    });

    try {
      await load();
    } catch (e) {
      document.getElementById("lib-list").innerHTML =
        `<p class="center small">加载失败：${U.escapeHtml(e.message || e.rawMessage || "")}</p>`;
    }
  });
})();
