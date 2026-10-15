/* 选义测试页（艾宾浩斯复习 / 新词学习）。 */
/* global App, DB, Scheduler, U */
(function () {
  "use strict";

  App.register("study", async function (root, params) {
    const mode = params.mode || "new";

    // 学习进度持久化：没学完时退出，下次进来继续，直到按计划学完
    const LS_STUDY = "qiaoji.study";
    function saveStudy() {
      const s = App.study;
      if (s && s.queue && s.idx < s.queue.length) {
        localStorage.setItem(LS_STUDY, JSON.stringify({
          mode: s.mode,
          idx: s.idx,
          queue: s.queue.map((w) => ({ id: w.id, word: w.word, pinyin: w.pinyin, definition: w.definition })),
        }));
      } else {
        localStorage.removeItem(LS_STUDY);
      }
    }
    function loadStudy(m) {
      try {
        const d = JSON.parse(localStorage.getItem(LS_STUDY) || "null");
        if (d && d.mode === m && Array.isArray(d.queue) && d.queue.length && d.idx < d.queue.length) return d;
      } catch (e) { /* 忽略 */ }
      return null;
    }

    root.innerHTML = `
      <div class="shell">
        <div class="row" style="margin:14px 0">
          <button class="ghost" id="btn-quit">← 返回首页</button>
          <span class="spacer"></span>
          <span class="small" id="progress"></span>
        </div>
        <div id="study-body"></div>
      </div>`;

    document.getElementById("btn-quit").onclick = () => App.go("home");

    // 从详情页「继续下一题」返回：idx 已在作答时前进，直接渲染下一题
    const resuming = params.continue && App.study.mode === mode && App.study.queue.length;
    if (resuming) {
      renderQuestion();
      return;
    }

    // 有未完成的同模式学习 → 继续上次进度，直到学完
    const saved = loadStudy(mode);
    if (saved) {
      App.study.mode = mode;
      App.study.queue = saved.queue;
      App.study.idx = saved.idx;
      renderQuestion();
      return;
    }

    // 全新开始（或换模式）
    document.getElementById("study-body").innerHTML = U.spinner("正在准备题目…");
    const queue = mode === "review"
      ? await DB.dueQueue()
      : (mode === "wrong"
        ? await DB.wrongWords()
        : await DB.newQueue(await DB.getSetting("daily_new", 20)));
    App.study.mode = mode;
    App.study.queue = queue;
    App.study.idx = 0;
    if (!queue.length) {
      const emptyMsg = mode === "review"
        ? "今天没有待复习的词！"
        : (mode === "wrong" ? "错题本里没有答错的词，继续保持！" : "今天的新词已经学完啦！");
      document.getElementById("study-body").innerHTML =
        `<div class="card center">
           <p style="font-size:18px">🎉 ${emptyMsg}</p>
           <button class="block" onclick="App.go('home')">返回首页</button>
         </div>`;
      return;
    }
    saveStudy();
    renderQuestion();

    async function renderQuestion() {
      const body = document.getElementById("study-body");
      const q = App.study.queue;
      const idx = App.study.idx;
      body.innerHTML = U.spinner("正在出题…");
      if (idx >= q.length) {
        App.study.queue = [];
        saveStudy();
        body.innerHTML =
          `<div class="card center">
             <p style="font-size:18px">🎉 本轮学习完成，做得很棒！</p>
             <button class="block" onclick="App.go('home')">返回首页</button>
           </div>`;
        return;
      }
      const w = q[idx];
      const correct = (w.definition || "").trim() || "（暂无释义）";

      // 准备干扰项（其它词的释义），缓存到本题对象上
      if (!w._distractors) {
        try {
          w._distractors = await DB.randomDistractors(w.id, 3);
        } catch (e) {
          w._distractors = [];
        }
      }
      const options = U.shuffle([correct].concat(w._distractors.slice(0, 3)));

      body.innerHTML = `
        <div class="card">
          <div class="big-word">${U.escapeHtml(w.word)}</div>
          <div class="pinyin">${U.escapeHtml(w.pinyin || "")}</div>
          <div class="small center" style="margin-top:4px">选择正确的释义</div>
          <div id="opts" style="margin-top:10px"></div>
          <div id="feedback" class="hidden"></div>
        </div>`;

      document.getElementById("progress").textContent = `${idx + 1} / ${q.length}`;
      const optBox = document.getElementById("opts");
      const keys = ["1", "2", "3", "4"];
      options.forEach((opt, i) => {
        const b = document.createElement("button");
        b.className = "opt";
        b.innerHTML = `<span class="key">${keys[i]}</span>${U.escapeHtml(opt)}`;
        b.onclick = () => choose(i);
        optBox.appendChild(b);
      });
      w._options = options;
      w._correct = correct;

      function choose(i) {
        if (w._answered) return;
        w._answered = true;
        const ok = options[i] === correct;
        const btns = optBox.querySelectorAll(".opt");
        btns.forEach((b, j) => {
          b.disabled = true;
          if (options[j] === correct) b.classList.add("correct");
          else if (j === i) b.classList.add("wrong");
        });

        Scheduler.recordAnswer(w, ok).then(() => {
          const fb = document.getElementById("feedback");
          fb.className = "feedback " + (ok ? "good" : "bad");
          fb.classList.remove("hidden");
          if (ok) {
            fb.innerHTML = `<div class="head">✅ 回答正确！</div>`;
            // 当前词已完成，前进到下一题并保存进度
            App.study.idx += 1;
            saveStudy();
            // 答对：自动跳详情
            setTimeout(() => App.go("detail", { id: w.id, fromStudy: true }), 500);
          } else {
            // 答错：重新排到队尾（本轮稍后再练一次），并给出反馈
            App.study.queue.push({
              id: w.id, word: w.word, pinyin: w.pinyin, definition: w.definition,
            });
            App.study.idx += 1;
            saveStudy();
            fb.innerHTML = `
              <div class="head">❌ 回答错误，绿色是正确答案</div>
              <div>释义：${U.escapeHtml(correct)}</div>
              <button class="block" style="margin-top:10px" id="btn-next">下一题 →</button>
              <button class="block secondary" style="margin-top:8px" id="btn-view">查看详细内容（记忆方法 / 易混淆辨析）</button>
              <button class="block secondary" style="margin-top:8px" id="btn-ask-ai">🤖 问AI · 帮我理解这个词</button>`;
            document.getElementById("btn-next").onclick = () => renderQuestion();
            document.getElementById("btn-view").onclick = () =>
              App.go("detail", { id: w.id, fromStudy: true });
            document.getElementById("btn-ask-ai").onclick = function() {
              AI.show(w);
            };
          }
        }).catch((e) => {
          w._answered = false;
          alert("保存进度失败：" + (e.message || e.rawMessage || "网络异常"));
        });
      }
    }
  });
})();