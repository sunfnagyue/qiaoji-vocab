/* 巧记词汇 Service Worker：静态资源缓存优先，支持离线打开。 */
const CACHE = "qiaoji-v28";

const ASSETS = [
  "./",
  "index.html",
  "manifest.json",
  "icon.svg",
  "css/theme.css",
  "js/app.js",
  "js/util.js",
  "js/yesapi.js",
  "js/scheduler.js",
  "js/config.js",
  "js/vendor/pinyin-pro.js",
  "js/pages/auth.js",
  "js/pages/home.js",
  "js/pages/study.js",
  "js/pages/library.js",
  "js/pages/stats.js",
  "js/pages/detail.js",
  "js/pages/edit.js",
  "js/pages/import.js",
  "js/pages/settings.js",
  "data/builtin_terms.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  // 数据接口都是 POST，只缓存 GET 静态资源
  if (e.request.method !== "GET") return;

  // 网络优先：在线时始终拿最新内容，失败再回退缓存（保证离线可用、更新及时）
  e.respondWith(
    fetch(e.request, { cache: "no-store" }).then((res) => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return res;
    }).catch(() =>
      caches.match(e.request).then((hit) => {
        if (hit) return hit;
        // 离线且未缓存时，回到首页
        if (e.request.mode === "navigate") return caches.match("./");
      })
    )
  );
});
