/* Daily Deal App Shell — লাইভ সাইট লোড, অটো-আপডেট, আপডেট নোটিস, নিরাপত্তা যাচাই */
(function () {
  'use strict';
  var B = document.body;
  var MODE = B.dataset.mode === 'admin' ? 'admin' : 'user';
  var ROOT = new URL(B.dataset.root || './', location.href);
  var CFG = window.APP_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  var iframe = null, loadTimer = null, fellBack = false, deferredInstall = null;
  var shownAt = Date.now(), lastEtag = '', lastCheck = 0;

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function isApp() {
    return matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: minimal-ui)').matches ||
      navigator.standalone === true || (document.referrer || '').indexOf('android-app://') === 0;
  }

  /* ---------- টার্গেট URL (নিরাপত্তা যাচাইসহ) ---------- */
  function bundled() { return new URL(MODE === 'admin' ? 'site/admin.html' : 'site/index.html', ROOT); }
  function allowedHost(u) {
    if (u.protocol !== 'https:') return false;
    if (u.hostname === location.hostname) return true;
    if (/\.github\.io$/i.test(u.hostname)) return true;
    return (CFG.ALLOWED_HOSTS || []).indexOf(u.hostname) > -1;
  }
  function target(forceBundled) {
    var u = null, raw = MODE === 'admin' ? CFG.ADMIN_URL : CFG.USER_URL;
    if (!forceBundled && raw) {
      try { var t = new URL(raw); if (allowedHost(t)) u = t; } catch (e) {}
    }
    if (!u) u = bundled();
    var p = new URLSearchParams(location.search);       // শেয়ার লিংকের ?l=... ইত্যাদি ফরওয়ার্ড
    p.delete('iv');
    p.forEach(function (v, k) { u.searchParams.set(k, v); });
    return u;
  }

  /* ---------- ফ্রেম লোড ---------- */
  function revalidate(u) {
    var same = u.origin === location.origin;
    return fetch(u.href, { cache: 'no-cache', mode: same ? 'same-origin' : 'no-cors', credentials: 'omit' })
      .then(function (r) { if (same) lastEtag = r.headers.get('etag') || r.headers.get('last-modified') || ''; })
      .catch(function () {});
  }
  function mount(u) {
    if (iframe) iframe.remove();
    clearTimeout(loadTimer);
    $('err').classList.remove('show');
    iframe = document.createElement('iframe');
    iframe.id = 'appFrame';
    iframe.title = 'Daily Deal';
    iframe.setAttribute('allow', 'clipboard-write; clipboard-read; fullscreen; web-share');
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    iframe.addEventListener('load', onLoad);
    iframe.src = u.href;
    $('frameBox').appendChild(iframe);
    loadTimer = setTimeout(showErr, 20000);
  }
  function start(forceBundled) {
    var u = target(forceBundled);
    return Promise.race([revalidate(u), sleep(2500)]).then(function () { mount(u); });
  }
  function onLoad() {
    clearTimeout(loadTimer);
    try {
      var d = iframe.contentDocument;
      if (d && d.title && /(^|\s)(404|not found)/i.test(d.title) && !fellBack && target(false).href !== bundled().href) {
        fellBack = true; return start(true);          // অরিজিনাল লিংক ভুল হলে বান্ডেল কপিতে ফিরে যাবে
      }
      if (d && d.head && !d.getElementById('dd-bridge')) {
        var s = d.createElement('script');
        s.id = 'dd-bridge'; s.dataset.mode = MODE;
        s.src = new URL('app-bridge.js', ROOT).href;
        d.head.appendChild(s);
      }
    } catch (e) { /* ক্রস-অরিজিন: ব্রিজ ছাড়াই চলবে */ }
    var wait = Math.max(0, 700 - (Date.now() - shownAt));
    setTimeout(function () { $('splash').classList.add('hide'); }, wait);
  }
  function showErr() { $('splash').classList.add('hide'); $('err').classList.add('show'); }
  function reloadFrame() {
    if (!iframe) return start();
    try { iframe.contentWindow.location.reload(); } catch (e) { iframe.src = iframe.src; }
  }

  /* ---------- স্ন্যাকবার ---------- */
  function snack(msg, label, fn) {
    var s = $('snack'); $('snackMsg').textContent = msg;
    var b = $('snackBtn'); b.hidden = !label; b.textContent = label || '';
    b.onclick = function () { s.classList.remove('show'); if (fn) fn(); };
    s.classList.add('show');
    if (!label) setTimeout(function () { s.classList.remove('show'); }, 3500);
  }

  /* ---------- আপডেট (আইকন/নতুন APK) ---------- */
  function installedIV() {
    var p = new URLSearchParams(location.search).get('iv');
    if (p) { store('iv_' + MODE, p); return +p; }
    return +read('iv_' + MODE) || 0;
  }
  function showUpdate(v) {
    var skip = +read('updskip_' + v.iconVersion) || 0;
    if (!v.force && Date.now() - skip < 12 * 3600 * 1000) return;
    $('updMsg').textContent = v.notes || 'অ্যাপের নতুন ভার্সন (নতুন আইকন/ফিচার) এসেছে। আপডেট করে নিন।';
    $('updLater').hidden = !!v.force;
    $('upd').classList.add('show');
    $('updLater').onclick = function () { store('updskip_' + v.iconVersion, String(Date.now())); $('upd').classList.remove('show'); };
    $('updGo').onclick = function () {
      var url = MODE === 'admin' ? (v.adminApkUrl || v.apkUrl) : v.apkUrl;
      try { if (url && new URL(url).protocol === 'https:') { window.open(url, '_blank', 'noopener'); return; } } catch (e) {}
      $('updHelp').hidden = false;
    };
  }
  function checkVersion() {
    fetch(new URL('version.json', ROOT).href + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (v) {
        var inst = installedIV();
        if (isApp() && inst && +v.iconVersion > inst) showUpdate(v);
        var key = 'cv_' + MODE, seen = read(key);
        if (v.contentVersion != null) {
          if (seen !== null && seen !== String(v.contentVersion)) snack('নতুন আপডেট পাওয়া গেছে', 'রিফ্রেশ', reloadFrame);
          store(key, String(v.contentVersion));
        }
      }).catch(function () {});
  }
  function pollContent() {      // একই ডোমেইনের সাইট হলে ETag বদলালে "রিফ্রেশ" দেখাবে (কাজের মাঝখানে জোর করে রিলোড করবে না)
    if (!iframe || Date.now() - lastCheck < 60000) return;
    lastCheck = Date.now();
    var u; try { u = new URL(iframe.src); } catch (e) { return; }
    if (u.origin !== location.origin) return;
    fetch(u.href, { cache: 'no-cache', credentials: 'omit' }).then(function (r) {
      var t = r.headers.get('etag') || r.headers.get('last-modified') || '';
      if (lastEtag && t && t !== lastEtag) { lastEtag = t; snack('সাইট আপডেট হয়েছে', 'রিফ্রেশ', reloadFrame); }
      else if (!lastEtag) lastEtag = t;
    }).catch(function () {});
  }

  /* ---------- ইনস্টল ব্যানার (ব্রাউজারে খুললে) ---------- */
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferredInstall = e;
    if (!isApp() && !read('inst_x')) $('inst').classList.add('show');
  });
  window.addEventListener('appinstalled', function () { $('inst').classList.remove('show'); });

  function init() {
    $('retry').onclick = function () { shownAt = Date.now(); $('splash').classList.remove('hide'); start(); };
    $('instGo').onclick = function () {
      if (deferredInstall) { deferredInstall.prompt(); deferredInstall = null; }
      $('inst').classList.remove('show');
    };
    $('instX').onclick = function () { store('inst_x', '1'); $('inst').classList.remove('show'); };
    window.addEventListener('offline', function () { snack('ইন্টারনেট সংযোগ নেই'); });
    window.addEventListener('online', function () { snack('আবার অনলাইন'); pollContent(); });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState !== 'visible') return;
      checkVersion(); pollContent();
      if (navigator.serviceWorker) navigator.serviceWorker.getRegistration().then(function (r) { if (r) r.update(); });
    });
    if ('serviceWorker' in navigator) {
      var had = !!navigator.serviceWorker.controller, reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (had && !reloaded) { reloaded = true; location.reload(); }   // নতুন শেল এলে একবার রিলোড
      });
      navigator.serviceWorker.register(new URL('sw.js', ROOT).href, { updateViaCache: 'none' }).catch(function () {});
    }
    start();
    checkVersion();
    setInterval(pollContent, 5 * 60 * 1000);
  }
  init();
})();
