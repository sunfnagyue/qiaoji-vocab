/* 艾宾浩斯调度（移植自 app/scheduler.py）。 */
/* global DB */
(function () {
  "use strict";

  const DEFAULT_INTERVALS = "1,2,4,7,15,30,60";
  const MASTERED_DAYS = 90;

  const Scheduler = {};

  async function getIntervals() {
    const s = await DB.getSetting("intervals", DEFAULT_INTERVALS);
    const vals = String(s).split(",").map((x) => parseFloat(x)).filter((n) => !isNaN(n));
    if (vals.length) return vals;
    return DEFAULT_INTERVALS.split(",").map(parseFloat);
  }

  // 记录一次作答并排期，返回更新后的状态。
  // word: 含 id(Word) + stateId(ReviewState) 的对象
  Scheduler.recordAnswer = async function (word, correct) {
    const intervals = await getIntervals();
    let stateId = word.stateId;
    let state = stateId ? word : await DB.ensureReviewState(word.id);
    stateId = stateId || state.stateId;
    const wasNew = state.status === "new";

    let stage = state.stage || 0;
    let correctCount = state.correctCount || 0;
    let wrongCount = state.wrongCount || 0;
    let lapses = state.lapses || 0;
    let reviewCount = state.reviewCount || 0;
    const stageBefore = stage;

    let status, intervalDays;
    if (correct) {
      correctCount += 1;
      stage = stage + 1;
      if (stage > intervals.length) {
        status = "mastered";
        intervalDays = MASTERED_DAYS;
      } else {
        status = "reviewing";
        intervalDays = intervals[stage - 1];
      }
    } else {
      wrongCount += 1;
      lapses += 1;
      stage = Math.max(1, stage - 2);
      status = "learning";
      intervalDays = intervals[0];
    }

    reviewCount += 1;
    const dueAt = new Date(Date.now() + intervalDays * 24 * 3600 * 1000);
    const now = new Date();

    const fields = {
      stage, status, intervalDays, dueAt,
      lastReviewedAt: now,
      reviewCount, correctCount, wrongCount, lapses,
    };
    if (!correct) fields.lastWrongAt = now;
    await DB.updateReviewState(stateId, fields);

    // 打卡 + 学习统计（失败不影响学习）
    try {
      await DB.recordStudy({
        answers: 1,
        correct: correct ? 1 : 0,
        wrong: correct ? 0 : 1,
        news: wasNew ? 1 : 0,
      });
    } catch (e) { /* 忽略 */ }

    return { stage, status, dueAt, correct, stageBefore };
  };

  window.Scheduler = Scheduler;
})();
