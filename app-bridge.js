/* Daily Deal — ব্রিজ স্ক্রিপ্ট (অ্যাপ শেল সাইটের ভেতরে ঢুকিয়ে দেয়)
   কাজ: ১) ট্যাপ/স্ক্রল স্মুথ করা  ২) অ্যাডমিন প্যানেলে ব্যাক বাটন সাপোর্ট
   (ট্যাব/মডাল খুললে হিস্টোরি এন্ট্রি; ব্যাক = আগের অবস্থা; একদম প্রথমে ব্যাক = অ্যাপ বন্ধ) */
(function () {
  'use strict';
  if (window.__ddBridge) return;
  window.__ddBridge = 1;

  try {
    var st = document.createElement('style');
    st.textContent = 'html{-webkit-tap-highlight-color:transparent;touch-action:manipulation;-webkit-text-size-adjust:100%}' +
      'html,body{scroll-behavior:auto}*{-webkit-overflow-scrolling:touch}';
    document.head.appendChild(st);
  } catch (e) {}

  function whenAlpine(cb) {
    var n = 0;
    (function t() {
      var A = window.Alpine, el = document.documentElement;
      if (A && el._x_dataStack) { cb(A, (A.$data ? A.$data(el) : el._x_dataStack[0])); return; }
      if (++n < 120) setTimeout(t, 250);
    })();
  }

  whenAlpine(function (A, d) {
    if (!d || typeof d._initHistoryNav === 'function') return;   // ইউজার সাইটের নিজস্ব ব্যাক সিস্টেম আছে → হাত দেবে না
    if (d.activeTab === undefined) return;

    var firstTab = d.activeTab, idx = 0, stack = [], skipPop = 0, applying = false, last = '';

    function keys() {
      var out = [];
      Object.keys(d).forEach(function (k) {
        var v; try { v = d[k]; } catch (e) { return; }
        if (typeof v === 'boolean' && /Open$/.test(k)) out.push(k);
        else if (v && typeof v === 'object' && typeof v.open === 'boolean') out.push(k);
      });
      return out;
    }
    function isOpen(k) { var v = d[k]; return typeof v === 'boolean' ? v : !!(v && v.open); }
    function closeKey(k) { if (typeof d[k] === 'boolean') d[k] = false; else if (d[k]) d[k].open = false; }
    function openList() { return keys().filter(isOpen).sort(); }
    function sig() { return JSON.stringify([d.activeTab, openList()]); }

    last = sig(); stack[0] = last;
    try { history.replaceState({ ddn: 1, ddi: 0, t: d.activeTab, o: openList() }, ''); } catch (e) {}

    A.effect(function () {
      var s = sig();
      if (applying) { last = s; return; }
      if (s === last) return;
      if (idx > 0 && stack[idx - 1] === s) {          // UI-র ক্লোজ/ব্যাক বাটন → হিস্টোরিও এক ধাপ পেছাবে
        last = s; idx--; stack.length = idx + 1; skipPop++;
        try { history.back(); } catch (e) { skipPop = 0; }
        return;
      }
      last = s; idx++; stack.length = idx; stack[idx] = s;
      try { history.pushState({ ddn: 1, ddi: idx, t: d.activeTab, o: openList() }, ''); } catch (e) {}
    });

    window.addEventListener('popstate', function (e) {
      var s = e.state, i = (s && s.ddn) ? s.ddi : 0;
      if (skipPop > 0) { skipPop--; idx = i; return; }
      idx = i; applying = true;
      var wantO = (s && s.o) || [], wantT = (s && s.t) || firstTab;
      keys().forEach(function (k) { if (isOpen(k) && wantO.indexOf(k) < 0) closeKey(k); });
      if (d.activeTab !== wantT) { if (typeof d.goTab === 'function') d.goTab(wantT); else d.activeTab = wantT; }
      setTimeout(function () { last = sig(); applying = false; }, 0);
    });
  });
})();
