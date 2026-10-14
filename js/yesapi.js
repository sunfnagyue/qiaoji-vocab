/* 数据访问层：基于果创云 YesApi 的 CRUD（替代原 LeanCloud）。
 * 对应桌面版 models.py + db.py。
 * 设计：词条与复习进度合并存于一张表（qiaojiword），
 *       每条记录带 uid 字段 = 登录用户 uuid，所有读写都按 uid 过滤隔离。
 */
/* global APP_CONFIG, BUILTIN_TERMS */
(function () {
  "use strict";

  const DB = {};

  const HOST = APP_CONFIG.apiHost;
  const APP_KEY = APP_CONFIG.appKey;
  const WORD = APP_CONFIG.wordModel;
  const SETTING = APP_CONFIG.settingModel;
  const STUDY = "qiaoji_study";

  const LS_USER = "qiaoji.user";

  // ---------- 本地登录态 ----------
  function saveUser(u) { localStorage.setItem(LS_USER, JSON.stringify(u)); }

  function loadUser() {
    try { return JSON.parse(localStorage.getItem(LS_USER) || "null"); }
    catch (e) { return null; }
  }

  function uid() { return (loadUser() || {}).uuid || ""; }

  function num(v) {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }

  DB.init = function () { /* 无需初始化，登录态存 localStorage */ };

  DB.currentUser = function () { return loadUser(); };

  // ---------- HTTP 请求 ----------
  function post(params) {
    const body = new URLSearchParams();
    body.append("app_key", APP_KEY);
    Object.keys(params || {}).forEach((k) => {
      const v = params[k];
      if (v === undefined || v === null) return;
      body.append(k, typeof v === "object" ? JSON.stringify(v) : String(v));
    });
    return fetch(HOST, {
      method: "POST",
      body: body,
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    }).then((r) => r.json()).then((resp) => {
      if (!resp || resp.ret !== 200) throw new Error("网络错误，请稍后重试");
      const d = resp.data || {};
      if (d.err_code !== 0) throw new Error(d.err_msg || "操作失败");
      return d;
    }).catch((e) => {
      if (e && e.message && e.message.indexOf("Failed to fetch") < 0) throw e;
      throw new Error("网络异常，请检查网络连接");
    });
  }

  // 带登录态参数
  function auth() {
    const u = loadUser();
    if (!u) return {};
    return { uuid: u.uuid, token: u.token };
  }

  // ---------- 账号 ----------
  DB.login = async function (username, password) {
    const d = await post({ s: "App.User.LoginExt", username: username, password: password });
    const u = { uuid: d.uuid, token: d.token, username: username };
    saveUser(u);
    return u;
  };

  DB.signup = async function (username, password) {
    await post({ s: "App.User.RegisterExt", username: username, password: password });
    return DB.login(username, password); // 注册后再登录拿 token
  };

  DB.logout = async function () {
    localStorage.removeItem(LS_USER);
  };

  // ---------- 字段映射 ----------
  // 记录 → 页面对象（词条 + 复习状态合一）
  function recordToWord(r) {
    return {
      id: r.id,
      stateId: r.id,   // 单表：复习状态即词条本身
      wordId: r.id,
      word: r.word || "",
      pinyin: r.pinyin || "",
      pinyinRaw: r.pinyinRaw || "",
      definition: r.definition || "",
      note: r.note || "",
      memoryTip: r.memoryTip || "",
      confusable: r.confusable || "",
      example: r.example || "",
      exampleSource: r.exampleSource || "",
      exampleUrl: r.exampleUrl || "",
      tags: r.tags || "",
      source: r.src || "manual",
      enabled: num(r.enabled) !== 0,
      stage: num(r.stage),
      status: r.st || "new",
      intervalDays: num(r.intervalDays),
      dueAt: r.dueAt ? num(r.dueAt) : null,   // 毫秒时间戳
      lastReviewedAt: r.lastReviewedAt ? num(r.lastReviewedAt) : null,
      reviewCount: num(r.reviewCount),
      correctCount: num(r.correctCount),
      wrongCount: num(r.wrongCount),
      lapses: num(r.lapses),
      fav: num(r.fav) !== 0,
      lastWrongAt: r.lastWrongAt ? num(r.lastWrongAt) : null,
    };
  }

  // 页面字段 → 存储字段（status→st、source→src、Date→毫秒字符串）
  function toStore(fields) {
    const map = {
      word: "word", pinyin: "pinyin", pinyinRaw: "pinyinRaw",
      definition: "definition", note: "note", memoryTip: "memoryTip",
      confusable: "confusable", example: "example",
      exampleSource: "exampleSource", exampleUrl: "exampleUrl",
      tags: "tags", enabled: "enabled",
      status: "st", source: "src",
      stage: "stage", intervalDays: "intervalDays",
      dueAt: "dueAt", lastReviewedAt: "lastReviewedAt",
      reviewCount: "reviewCount", correctCount: "correctCount",
      wrongCount: "wrongCount", lapses: "lapses",
      fav: "fav", lastWrongAt: "lastWrongAt",
    };
    const out = {};
    Object.keys(fields).forEach((k) => {
      if (fields[k] === undefined || !(k in map)) return;
      let v = fields[k];
      if (v instanceof Date) v = String(v.getTime());
      else if (k === "dueAt" || k === "lastReviewedAt" || k === "lastWrongAt") v = String(v);
      else if (k === "enabled" || k === "fav") v = v ? 1 : 0;
      out[map[k]] = v;
    });
    return out;
  }

  // 取当前用户全部词条（按 id 升序）
  async function fetchAll() {
    const d = await post(Object.assign({}, auth(), {
      s: "App.Table.FreeQuery",
      model_name: WORD,
      where: [["uid", "=", uid()]],
      perpage: 10000,
      page: 1,
    }));
    return (d.list || []).map(recordToWord);
  }

  async function enabledWords() {
    const all = await fetchAll();
    return all.filter((w) => w.enabled);
  }

  // ---------- 词条 CRUD ----------
  DB.addWord = async function (data) {
    const store = toStore(data);
    store.uid = uid();
    if (store.st === undefined) store.st = "new";
    if (store.stage === undefined) store.stage = 0;
    if (store.enabled === undefined) store.enabled = 1;
    const d = await post(Object.assign({}, auth(), {
      s: "App.Table.Create",
      model_name: WORD,
      data: store,
    }));
    return d.id;
  };

  DB.updateWord = async function (id, fields) {
    id = Number(id);
    const store = toStore(fields);
    if (!Object.keys(store).length) return;
    await post(Object.assign({}, auth(), {
      s: "App.Table.FreeUpdate",
      model_name: WORD,
      where: [["id", "=", id], ["uid", "=", uid()]],
      data: store,
    }));
  };

  DB.deleteWord = async function (id) {
    id = Number(id);
    await post(Object.assign({}, auth(), {
      s: "App.Table.FreeUpdate",
      model_name: WORD,
      where: [["id", "=", id], ["uid", "=", uid()]],
      data: { enabled: 0 },
    }));
  };

  DB.getWord = async function (id) {
    id = Number(id);
    const d = await post(Object.assign({}, auth(), {
      s: "App.Table.FreeQuery",
      model_name: WORD,
      where: [["id", "=", id], ["uid", "=", uid()]],
      perpage: 1,
    }));
    const list = d.list || [];
    if (!list.length) throw new Error("词语不存在");
    return recordToWord(list[0]);
  };

  DB.searchWords = async function (query, field, limit) {
    limit = limit || 300;
    let list = await enabledWords();
    const kw = (query || "").trim().toLowerCase();
    if (kw) {
      list = list.filter((r) => {
        if (field === "pinyin") {
          return (r.pinyin.toLowerCase().includes(kw)) || (r.pinyinRaw || "").includes(kw);
        }
        if (field === "definition") {
          return (r.definition || "").toLowerCase().includes(kw);
        }
        return (r.word || "").includes(query.trim()) || (r.pinyinRaw || "").includes(kw);
      });
    }
    return list.slice(0, limit);
  };

  DB.listWords = function () {
    return enabledWords();
  };

  // 随机干扰项（其它词的释义）
  DB.randomDistractors = async function (excludeId, n) {
    n = n || 3;
    const list = await enabledWords();
    const pool = [];
    for (const w of list) {
      if (w.id === excludeId) continue;
      const d = (w.definition || "").trim();
      if (d && d.length >= 4 && pool.indexOf(d) < 0) pool.push(d);
      if (pool.length >= n) break;
    }
    return pool;
  };

  // ---------- 复习状态（单表，词条即状态） ----------
  DB.getReviewState = function (wordId) {
    return DB.getWord(wordId);
  };

  DB.ensureReviewState = function (wordId) {
    return DB.getWord(wordId);
  };

  DB.updateReviewState = function (id, fields) {
    return DB.updateWord(id, fields);
  };

  // 待复习队列（learning/reviewing 且已到期）
  DB.dueQueue = async function (limit) {
    const now = Date.now();
    let list = (await enabledWords())
      .filter((w) => (w.status === "learning" || w.status === "reviewing") && w.dueAt && w.dueAt <= now)
      .sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0));
    if (limit) list = list.slice(0, limit);
    return list;
  };

  // 新词队列
  DB.newQueue = async function (limit) {
    let list = (await enabledWords())
      .filter((w) => w.status === "new")
      .sort((a, b) => a.id - b.id);
    if (limit) list = list.slice(0, limit);
    return list;
  };

  // 计数
  DB.counts = async function () {
    const words = await enabledWords();
    const now = Date.now();
    let nNew = 0, nDue = 0, nLearning = 0, nMastered = 0, nFav = 0, nWrong = 0;
    words.forEach((w) => {
      if (w.fav) nFav++;
      if (w.wrongCount > 0 && w.status !== "mastered") nWrong++;
      if (w.status === "new") nNew++;
      else if (w.status === "learning" || w.status === "reviewing") {
        nLearning++;
        if (w.dueAt && w.dueAt <= now) nDue++;
      } else if (w.status === "mastered") nMastered++;
    });
    return { total: words.length, new: nNew, due: nDue, learning: nLearning, mastered: nMastered, fav: nFav, wrong: nWrong };
  };

  // ---------- 收藏 / 错题 ----------
  DB.favWords = async function () {
    return (await enabledWords()).filter((w) => w.fav);
  };

  // 错题：答错过且尚未掌握，按最近答错时间排序
  DB.wrongWords = async function () {
    return (await enabledWords())
      .filter((w) => w.wrongCount > 0 && w.status !== "mastered")
      .sort((a, b) => (b.lastWrongAt || 0) - (a.lastWrongAt || 0));
  };

  DB.toggleFav = function (id, fav) {
    return DB.updateWord(id, { fav: !!fav });
  };

  // ---------- 学习记录（打卡 / 统计） ----------
  function dayStr(d) {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function todayStr() { return dayStr(new Date()); }

  // 记录一次作答（累加到今天的记录）
  DB.recordStudy = async function (delta) {
    const day = todayStr();
    const where = [["logday", "=", day], ["uid", "=", uid()]];
    const d = await post(Object.assign({}, auth(), {
      s: "App.Table.FreeQuery", model_name: STUDY, where: where, perpage: 1,
    }));
    const list = d.list || [];
    const inc = {
      answers: delta.answers || 0,
      correct: delta.correct || 0,
      wrong: delta.wrong || 0,
      news: delta.news || 0,
    };
    if (list.length) {
      const row = list[0];
      await post(Object.assign({}, auth(), {
        s: "App.Table.FreeUpdate", model_name: STUDY,
        where: [["id", "=", row.id], ["uid", "=", uid()]],
        data: {
          answers: num(row.answers) + inc.answers,
          correct: num(row.correct) + inc.correct,
          wrong: num(row.wrong) + inc.wrong,
          news: num(row.news) + inc.news,
        },
      }));
    } else {
      await post(Object.assign({}, auth(), {
        s: "App.Table.Create", model_name: STUDY,
        data: { uid: uid(), logday: day, answers: inc.answers, correct: inc.correct, wrong: inc.wrong, news: inc.news },
      }));
    }
  };

  DB.studyStats = async function () {
    const d = await post(Object.assign({}, auth(), {
      s: "App.Table.FreeQuery", model_name: STUDY, where: [["uid", "=", uid()]], perpage: 10000,
    }));
    const rows = (d.list || []).map((r) => ({
      day: r.logday || "",
      answers: num(r.answers),
      correct: num(r.correct),
      wrong: num(r.wrong),
      news: num(r.news),
    }));
    const daySet = {};
    rows.forEach((r) => { if (r.day) daySet[r.day] = r; });

    // 连续打卡天数（今天没学则从昨天往回算）
    let streak = 0;
    const cursor = new Date();
    if (!daySet[todayStr()]) cursor.setDate(cursor.getDate() - 1);
    while (daySet[dayStr(cursor)]) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    let totalAnswers = 0, totalCorrect = 0, totalWrong = 0, totalNews = 0;
    rows.forEach((r) => {
      totalAnswers += r.answers; totalCorrect += r.correct;
      totalWrong += r.wrong; totalNews += r.news;
    });
    const today = daySet[todayStr()] || { answers: 0, correct: 0, wrong: 0, news: 0 };

    return {
      rows, daySet, streak,
      totalDays: rows.length,
      totalAnswers, totalCorrect, totalWrong, totalNews,
      today,
    };
  };

  // ---------- 设置 ----------
  DB.getSetting = async function (key, def) {
    const d = await post(Object.assign({}, auth(), {
      s: "App.Table.FreeQuery",
      model_name: SETTING,
      where: [["sk", "=", key], ["uid", "=", uid()]],
      perpage: 1,
    }));
    const list = d.list || [];
    if (!list.length) return def;
    return list[0].sv;
  };

  DB.setSetting = async function (key, value) {
    const d = await post(Object.assign({}, auth(), {
      s: "App.Table.FreeQuery",
      model_name: SETTING,
      where: [["sk", "=", key], ["uid", "=", uid()]],
      perpage: 1,
    }));
    const list = d.list || [];
    if (list.length) {
      await post(Object.assign({}, auth(), {
        s: "App.Table.FreeUpdate",
        model_name: SETTING,
        where: [["id", "=", list[0].id], ["uid", "=", uid()]],
        data: { sv: String(value) },
      }));
    } else {
      await post(Object.assign({}, auth(), {
        s: "App.Table.Create",
        model_name: SETTING,
        data: { sk: key, sv: String(value), uid: uid() },
      }));
    }
  };

  // ---------- 首次播种内置词库 ----------
  DB.seedIfEmpty = async function () {
    const d = await post(Object.assign({}, auth(), {
      s: "App.Table.FreeQuery",
      model_name: WORD,
      where: [["uid", "=", uid()]],
      perpage: 1,
    }));
    if ((d.list || []).length) return false;

    const list = BUILTIN_TERMS;
    const CONC = 4; // 并发数，加快首次播种
    for (let i = 0; i < list.length; i += CONC) {
      await Promise.all(list.slice(i, i + CONC).map((t) => DB.addWord({
        word: t.word,
        pinyin: t.pinyin,
        pinyinRaw: t.pinyinRaw,
        definition: t.definition,
        note: t.note,
        memoryTip: t.memoryTip,
        confusable: t.confusable,
        example: t.example,
        exampleSource: t.exampleSource,
        exampleUrl: t.exampleUrl,
        tags: t.tags,
        source: "builtin",
      })));
    }
    return true;
  };

  window.DB = DB;
})();
