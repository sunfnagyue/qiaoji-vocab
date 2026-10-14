/* 添加 / 编辑词语。 */
/* global App, DB, U */
(function () {
  "use strict";

  App.register("edit", async function (root, params) {
    const id = params.id;           // 有 id = 编辑，无 = 添加
    let existing = null;
    if (id) {
      try { existing = await DB.getWord(id); }
      catch (e) { /* 忽略，按新词处理 */ }
    }
    const w = existing || {};

    root.innerHTML = `
      <div class="shell">
        <div class="row" style="margin:14px 0">
          <button class="ghost" id="btn-cancel">← 取消</button>
          <span class="spacer"></span>
          <span class="small">${id ? "编辑词语" : "添加词语"}</span>
        </div>
        <div class="card">
          <div class="field">
            <label>词语 *</label>
            <input id="f-word" type="text" placeholder="如：因地制宜" value="${U.escapeHtml(w.word || "")}">
          </div>
          <div class="field">
            <label>拼音（留空自动生成）</label>
            <input id="f-pinyin" type="text" placeholder="如：yīn dì zhì yí" value="${U.escapeHtml(w.pinyin || "")}">
          </div>
          <div class="field">
            <label>释义 *</label>
            <textarea id="f-definition" placeholder="这个词语的意思">${U.escapeHtml(w.definition || "")}</textarea>
          </div>
          <div class="field">
            <label>记忆方法</label>
            <textarea id="f-tip" placeholder="结合现实生活怎么记住它">${U.escapeHtml(w.memoryTip || "")}</textarea>
          </div>
          <div class="field">
            <label>易混淆辨析</label>
            <textarea id="f-conf" placeholder="和哪些词容易搞混、怎么区分">${U.escapeHtml(w.confusable || "")}</textarea>
          </div>
          <div class="field">
            <label>备注</label>
            <textarea id="f-note" placeholder="其它要记的">${U.escapeHtml(w.note || "")}</textarea>
          </div>
          <div class="field">
            <label>例句</label>
            <textarea id="f-example" placeholder="例句（可选）">${U.escapeHtml(w.example || "")}</textarea>
          </div>
          <div class="field">
            <label>例句来源</label>
            <input id="f-source" type="text" placeholder="如：人民日报" value="${U.escapeHtml(w.exampleSource || "")}">
          </div>
          <div class="field">
            <label>例句链接</label>
            <input id="f-url" type="text" placeholder="https://…" value="${U.escapeHtml(w.exampleUrl || "")}">
          </div>
          <div class="field">
            <label>标签（用逗号分隔）</label>
            <input id="f-tags" type="text" placeholder="如：成语, 高频" value="${U.escapeHtml(w.tags || "")}">
          </div>
          <div id="edit-msg" class="small" style="color:#B96A6A;margin:8px 0"></div>
          <button class="block" id="btn-save">保存</button>
        </div>
      </div>`;

    document.getElementById("btn-cancel").onclick = () => {
      App.go(id ? "detail" : "library", id ? { id } : {});
    };

    const wordEl = document.getElementById("f-word");
    const pinyinEl = document.getElementById("f-pinyin");
    wordEl.addEventListener("blur", () => {
      if (!pinyinEl.value.trim() && wordEl.value.trim()) {
        pinyinEl.value = U.pinyinDisplay(wordEl.value.trim());
      }
    });

    document.getElementById("btn-save").onclick = async () => {
      const data = {
        word: wordEl.value.trim(),
        pinyin: pinyinEl.value.trim(),
        definition: document.getElementById("f-definition").value.trim(),
        memoryTip: document.getElementById("f-tip").value.trim(),
        confusable: document.getElementById("f-conf").value.trim(),
        note: document.getElementById("f-note").value.trim(),
        example: document.getElementById("f-example").value.trim(),
        exampleSource: document.getElementById("f-source").value.trim(),
        exampleUrl: document.getElementById("f-url").value.trim(),
        tags: document.getElementById("f-tags").value.trim(),
      };
      if (!data.word) { setMsg("请填写词语"); return; }
      if (!data.definition) { setMsg("请填写释义"); return; }
      if (!data.pinyin) data.pinyin = U.pinyinDisplay(data.word);
      data.pinyinRaw = U.pinyinRaw(data.word);

      const btn = document.getElementById("btn-save");
      btn.disabled = true;
      setMsg("保存中…");
      try {
        if (id) {
          await DB.updateWord(id, data);
          App.go("detail", { id });
        } else {
          const newId = await DB.addWord(data);
          // 为新词建立复习状态（status=new）
          await DB.ensureReviewState(newId);
          alert("已添加，可在「首页 → 学习新词」里学到它");
          App.go("library");
        }
      } catch (e) {
        btn.disabled = false;
        setMsg("保存失败：" + (e.message || e.rawMessage || "网络异常"));
      }
    };

    function setMsg(s) { document.getElementById("edit-msg").textContent = s || ""; }
  });
})();
