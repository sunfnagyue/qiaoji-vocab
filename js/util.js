/* 通用工具：拼音、HTML 转义、格式化。 */
/* global pinyinPro */
(function () {
  "use strict";
  const U = {};

  // 带声调拼音，如 "因地制宜" -> "yīn dì zhì yí"
  U.pinyinDisplay = function (text) {
    try {
      return pinyinPro.pinyin(text || "", { toneType: "symbol", nonZh: "consecutive" });
    } catch (e) {
      return "";
    }
  };

  // 无声调拼音，用于搜索，如 "yindizhiyi"
  U.pinyinRaw = function (text) {
    try {
      const s = pinyinPro.pinyin(text || "", { toneType: "none", nonZh: "consecutive" });
      return s.replace(/\s+/g, "").toLowerCase();
    } catch (e) {
      return "";
    }
  };

  U.escapeHtml = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  U.nl2br = function (s) {
    return U.escapeHtml(s).replace(/\n/g, "<br>");
  };

  // 日期格式化（云端的 dueAt 是 Date）
  U.formatDate = function (d) {
    if (!d) return "";
    const t = d instanceof Date ? d : new Date(d);
    if (isNaN(t.getTime())) return "";
    const p = (n) => String(n).padStart(2, "0");
    return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
  };

  U.shuffle = function (arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  window.U = U;
})();
