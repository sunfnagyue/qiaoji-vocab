/* 导入 / 导出：CSV（与桌面版模板一致）。 */
/* global App, DB, U */
(function () {
  "use strict";

  const HEADER = "词语,拼音,释义,记忆方法,易混淆辨析,备注,例句,例句来源,例句链接,标签";

  // 简易 CSV 解析（支持引号包裹、内部逗号）
  function parseCsv(text) {
    const rows = [];
    let row = [], field = "", inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ',') { row.push(field); field = ""; }
        else if (c === '\n' || c === '\r') {
          if (c === '\r' && text[i + 1] === '\n') i++;
          row.push(field); field = "";
          if (row.some((x) => x.trim() !== "")) rows.push(row);
          row = [];
        } else field += c;
      }
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function csvField(s) {
    s = String(s == null ? "" : s);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function toCsv(rows) {
    return rows.map((r) => r.map(csvField).join(",")).join("\r\n");
  }

  function download(filename, text) {
    const blob = new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  }

  App.register("import", function (root) {
    root.innerHTML = `
      <div class="shell">
        <div class="page-title">导入 / 导出</div>
        <div class="card">
          <div class="sub-title">导出词库到 CSV（可在 Excel 打开）</div>
          <button class="block" id="btn-export">⬇ 导出全部词语</button>
        </div>

        <div class="card">
          <div class="sub-title">下载导入模板（先按这个格式填）</div>
          <button class="block secondary" id="btn-template">⬇ 下载模板 CSV</button>
        </div>

        <div class="card">
          <div class="sub-title">导入 CSV（粘贴内容或选择文件）</div>
          <div class="field">
            <label>选择 CSV 文件</label>
            <input id="imp-file" type="file" accept=".csv,text/csv">
          </div>
          <div class="field">
            <label>或粘贴 CSV 内容</label>
            <textarea id="imp-text" placeholder="词语,拼音,释义,记忆方法,易混淆辨析,备注,例句,例句来源,例句链接,标签"></textarea>
          </div>
          <div class="small" style="margin:6px 0">第一行是表头，会自动跳过；至少要有「词语」和「释义」两列。</div>
          <div id="imp-msg" class="small" style="color:#B96A6A;margin:8px 0"></div>
          <button class="block" id="btn-import">⬆ 开始导入</button>
        </div>
      </div>`;

    const fileEl = document.getElementById("imp-file");
    const textEl = document.getElementById("imp-text");
    const msg = document.getElementById("imp-msg");

    document.getElementById("btn-export").onclick = async () => {
      const list = await DB.listWords();
      const rows = [HEADER.split(",")].concat(list.map((w) => [
        w.word, w.pinyin, w.definition, w.memoryTip, w.confusable, w.note,
        w.example, w.exampleSource, w.exampleUrl, w.tags,
      ]));
      download("巧记词汇_词库.csv", toCsv(rows));
    };

    document.getElementById("btn-template").onclick = () => {
      download("导入模板.csv", HEADER + "\r\n因地制宜,yīn dì zhì yí,根据各地具体情况制定适宜的办法,,,,,,,成语");
    };

    fileEl.addEventListener("change", () => {
      const f = fileEl.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => { textEl.value = reader.result; };
      reader.readAsText(f, "utf-8");
    });

    document.getElementById("btn-import").onclick = async () => {
      const text = textEl.value.trim();
      if (!text) { msg.textContent = "请先粘贴内容或选择文件"; return; }
      let rows;
      try {
        rows = parseCsv(text.replace(/^﻿/, ""));
      } catch (e) {
        msg.textContent = "CSV 解析失败，请检查格式";
        return;
      }
      if (!rows.length) { msg.textContent = "没有可导入的数据"; return; }

      // 跳过表头
      const first = rows[0].map((x) => x.trim());
      let dataRows = rows;
      if (first[0] === "词语" || first[0] === "word") dataRows = rows.slice(1);

      let ok = 0, skip = 0, fail = 0;
      const btn = document.getElementById("btn-import");
      btn.disabled = true;
      msg.textContent = "导入中…";

      for (const r of dataRows) {
        const word = (r[0] || "").trim();
        const definition = (r[2] || "").trim();
        if (!word || !definition) { skip++; continue; }
        const pinyin = (r[1] || "").trim();
        const data = {
          word,
          pinyin: pinyin || U.pinyinDisplay(word),
          pinyinRaw: U.pinyinRaw(word),
          definition,
          memoryTip: (r[3] || "").trim(),
          confusable: (r[4] || "").trim(),
          note: (r[5] || "").trim(),
          example: (r[6] || "").trim(),
          exampleSource: (r[7] || "").trim(),
          exampleUrl: (r[8] || "").trim(),
          tags: (r[9] || "").trim(),
          source: "import",
        };
        try {
          const newId = await DB.addWord(data);
          await DB.ensureReviewState(newId);
          ok++;
        } catch (e) {
          fail++;
        }
      }

      btn.disabled = false;
      msg.textContent = `导入完成：成功 ${ok} 个，跳过 ${skip} 个（缺词语或释义），失败 ${fail} 个。`;
      if (fail) msg.textContent += "（失败可能是网络波动，可重试）";
      if (ok) textEl.value = "";
    };
  });
})();
