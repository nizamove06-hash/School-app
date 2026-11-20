/* ===== extras.js: уведомления + своё фото на фоне ===== */
(function () {
'use strict';

var KEY = 'schoolSchedule';      // настройки основного сайта (только читаем)
var XKEY = 'schoolExtras';       // настройки этого файла
var FKEY = 'schoolExtrasFired';  // какие уведомления уже отправлены

var $ = function (s) { return document.querySelector(s); };
var el = function (id) { return document.getElementById(id); };
var pad = function (n) { return String(n).padStart(2, '0'); };
var fmt = function (m) { return pad(Math.floor(m / 60) % 24) + ':' + pad(m % 60); };
var clamp = function (v, a, b) { v = +v; if (isNaN(v)) v = a; return Math.min(b, Math.max(a, v)); };

/* ---------- настройки ---------- */
var X = { notify: false, onStart: true, onEnd: true, warn: 5, sound: true, photo: false, dim: 45, blur: 0 };
try { Object.assign(X, JSON.parse(localStorage.getItem(XKEY)) || {}); } catch (e) {}
X.dim = clamp(X.dim, 0, 90);
X.blur = clamp(X.blur, 0, 20);
X.warn = clamp(X.warn, 0, 30);
function saveX() { try { localStorage.setItem(XKEY, JSON.stringify(X)); } catch (e) {} }

/* ---------- стили ---------- */
var st = document.createElement('style');
st.textContent =
'#extBg,#extShade{position:fixed;inset:0;z-index:0;pointer-events:none}' +
'#extBg{background-size:cover;background-position:center;background-repeat:no-repeat;transform:scale(1.06)}' +
'#extShade{background:var(--bg);transition:opacity .3s}' +
'#extBg[hidden],#extShade[hidden]{display:none}' +
'.wrap{position:relative;z-index:1}' +
'.x-sec{padding:16px 0;border-bottom:1px solid var(--border)}' +
'.x-sec h3{margin:0 0 12px;font-size:16px}' +
'.x-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:10px 0}' +
'.x-sw{-webkit-appearance:none;appearance:none;width:52px;height:30px;border-radius:99px;background:var(--border);position:relative;cursor:pointer;flex:none;margin:0;border:0;outline:none;transition:background .3s}' +
'.x-sw::after{content:"";position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:#fff;transition:transform .3s}' +
'.x-sw:checked{background:linear-gradient(135deg,var(--accent),var(--accent2))}' +
'.x-sw:checked::after{transform:translateX(22px)}' +
'.x-btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}' +
'.x-btn{padding:11px 16px;border-radius:12px;border:1px solid var(--border);background:var(--card);color:var(--text);font:inherit;font-weight:700;font-size:15px;cursor:pointer}' +
'.x-btn:active{transform:scale(.97)}' +
'.x-btn.danger{color:#ff6b6b;border-color:rgba(255,107,107,.45)}' +
'.x-sel{padding:8px 10px;border-radius:12px;border:1px solid var(--border);background:rgba(128,128,128,.12);color:var(--text);font:inherit}' +
'.x-lbl{display:block;font-size:13px;color:var(--muted);margin:12px 0 4px}' +
'.x-range{width:100%;accent-color:var(--accent)}' +
'.x-hint{font-size:13px;color:var(--muted);margin:8px 0 0;line-height:1.45}' +
'.x-sec [hidden]{display:none!important}';
document.head.appendChild(st);

/* =====================================================
   ЧАСТЬ 1. СВОЁ ФОТО НА ФОНЕ
   ===================================================== */
var bg = document.createElement('div'); bg.id = 'extBg'; bg.hidden = true;
var shade = document.createElement('div'); shade.id = 'extShade'; shade.hidden = true;
var base = $('.bg');
if (base && base.parentNode) {
  base.parentNode.insertBefore(bg, base.nextSibling);
  base.parentNode.insertBefore(shade, bg.nextSibling);
} else {
  document.body.insertBefore(shade, document.body.firstChild);
  document.body.insertBefore(bg, document.body.firstChild);
}

var hasPhoto = false, objUrl = null;

function applyPhoto() {
  var on = X.photo && hasPhoto;
  bg.hidden = shade.hidden = !on;
  bg.style.filter = 'blur(' + X.blur + 'px)';
  shade.style.opacity = X.dim / 100;
}
function setPhotoBlob(blob) {
  if (objUrl) URL.revokeObjectURL(objUrl);
  objUrl = URL.createObjectURL(blob);
  bg.style.backgroundImage = 'url("' + objUrl + '")';
  hasPhoto = true;
}

/* хранилище для фото (IndexedDB) */
function idb() {
  return new Promise(function (res, rej) {
    var r = indexedDB.open('schoolExtras', 1);
    r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
    r.onsuccess = function () { res(r.result); };
    r.onerror = function () { rej(r.error); };
  });
}
function idbGet(k) {
  return idb().then(function (db) {
    return new Promise(function (res, rej) {
      var q = db.transaction('kv').objectStore('kv').get(k);
      q.onsuccess = function () { res(q.result); };
      q.onerror = function () { rej(q.error); };
    });
  });
}
function idbSet(k, v) {
  return idb().then(function (db) {
    return new Promise(function (res, rej) {
      var t = db.transaction('kv', 'readwrite');
      t.objectStore('kv').put(v, k);
      t.oncomplete = function () { res(); };
      t.onerror = function () { rej(t.error); };
    });
  });
}
function idbDel(k) {
  return idb().then(function (db) {
    return new Promise(function (res, rej) {
      var t = db.transaction('kv', 'readwrite');
      t.objectStore('kv').delete(k);
      t.oncomplete = function () { res(); };
      t.onerror = function () { rej(t.error); };
    });
  });
}

/* уменьшаем фото, чтобы не занимало много места */
function processImage(file) {
  return new Promise(function (res, rej) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      var w = img.naturalWidth, h = img.naturalHeight;
      var k = Math.min(1, 1600 / Math.max(w, h));
      w = Math.round(w * k); h = Math.round(h * k);
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      c.toBlob(function (b) { b ? res(b) : rej(new Error('blob')); }, 'image/jpeg', 0.82);
    };
    img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('img')); };
    img.src = url;
  });
}

try {
  idbGet('photo').then(function (b) {
    if (b) setPhotoBlob(b);
    applyPhoto(); syncUI();
  }).catch(function () {});
} catch (e) {}

/* =====================================================
   ЧАСТЬ 2. УВЕДОМЛЕНИЯ
   ===================================================== */
var supported = 'Notification' in window;
function perm() { return supported ? Notification.permission : 'unsupported'; }
var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function askPerm() {
  if (!supported) return Promise.resolve('unsupported');
  if (Notification.permission !== 'default') return Promise.resolve(Notification.permission);
  return new Promise(function (res) {
    var r = Notification.requestPermission(function (p) { res(p); });
    if (r && r.then) r.then(res);
  });
}

/* звук (работает, пока страница открыта) */
var ac = null;
function unlockAudio() {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
  } catch (e) {}
}
function beep() {
  try {
    unlockAudio();
    var o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
    o.type = 'sine'; o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    o.connect(g); g.connect(ac.destination);
    o.start(t); o.stop(t + 0.75);
  } catch (e) {}
}

function send(title, body, tag) {
  if (X.sound) beep();
  var opts = { body: body, tag: tag, icon: 'icon.svg', badge: 'icon.svg', vibrate: [200, 100, 200], renotify: true };
  var fallback = function () { try { new Notification(title, opts); } catch (e) {} };
  if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistration) {
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (reg && reg.showNotification) return reg.showNotification(title, opts);
      fallback();
    }).catch(fallback);
  } else fallback();
}

/* читаем расписание из сохранённых настроек сайта */
function readS() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
function hm(v) {
  if (typeof v !== 'string' || !/^\d{1,2}:\d{2}$/.test(v)) return null;
  var p = v.split(':'); return (+p[0]) * 60 + (+p[1]);
}
function nz(v, d) { return (v === undefined || v === null || isNaN(+v)) ? d : +v; }

function buildRows(s) {
  var start = null;
  if (s.selected === 'custom') start = hm(s.custom);
  else if (Number.isInteger(s.selected) && Array.isArray(s.starts)) start = hm(s.starts[s.selected]);
  if (start === null) return [];
  var L = nz(s.lessons, 6), ll = nz(s.lessonLen, 45), bl = nz(s.breakLen, 10), ba = nz(s.bigAfter, 3), bgl = nz(s.bigLen, 20);
  var out = [], t = start;
  for (var i = 1; i <= L; i++) {
    out.push({ type: 'lesson', n: i, a: t, b: t + ll }); t += ll;
    if (i < L) {
      var big = (i === ba), g = big ? bgl : bl;
      if (g > 0) { out.push({ type: 'break', big: big, a: t, b: t + g }); t += g; }
    }
  }
  return out;
}
function roomText(r) { return /^\d/.test(r) ? 'каб. ' + r : r; }
function label(s, n) {
  var x = (s.subjects && s.subjects[n - 1]) || {};
  var p = [n + ' урок'];
  if (x.n) p.push(x.n);
  if (x.r) p.push(roomText(x.r));
  return p.join(' · ');
}

function getFired(day) {
  try {
    var f = JSON.parse(localStorage.getItem(FKEY));
    if (f && f.day === day) return f;
  } catch (e) {}
  return { day: day, ids: {} };
}

function check() {
  if (!X.notify || perm() !== 'granted') return;
  var s = readS(), rs = buildRows(s);
  if (!rs.length) return;

  var d = new Date();
  var now = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  var day = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  var f = getFired(day), changed = false;

  function fire(id, t, title, body) {
    if (f.ids[id]) return;
    if (now >= t && now - t < 100) {
      f.ids[id] = 1; changed = true;
      send(title, body, id);
    }
  }

  rs.forEach(function (r, i) {
    if (r.type !== 'lesson') return;
    var lab = label(s, r.n);
    if (X.warn > 0 && X.warn * 60 < (r.b - r.a) * 60) {
      fire('w' + r.n, r.b * 60 - X.warn * 60, '⏰ Через ' + X.warn + ' мин звонок', lab);
    }
    if (X.onStart) {
      fire('s' + r.n, r.a * 60, '▶ Начался ' + r.n + ' урок', lab + ' · звонок в ' + fmt(r.b));
    }
    if (X.onEnd) {
      var nx = rs[i + 1], body;
      if (!nx) body = 'Уроки на сегодня закончились 🎉';
      else if (nx.type === 'break') {
        var after = rs[i + 2];
        body = (nx.big ? 'Большая перемена ' : 'Перемена ') + (nx.b - nx.a) + ' мин' + (after ? ' · дальше ' + label(s, after.n) : '');
      } else body = 'Дальше ' + label(s, nx.n);
      fire('e' + r.n, r.b * 60, '🔔 Звонок! ' + r.n + ' урок закончился', body);
    }
  });

  if (changed) { try { localStorage.setItem(FKEY, JSON.stringify(f)); } catch (e) {} }
}

/* =====================================================
   ЧАСТЬ 3. РАЗДЕЛЫ В НАСТРОЙКАХ
   ===================================================== */
function mount() {
  var drawer = el('drawer') || $('aside');
  if (!drawer) return;

  var notif = document.createElement('section');
  notif.className = 'x-sec';
  notif.innerHTML =
    '<h3>🔔 Уведомления</h3>' +
    '<div class="x-row"><span>Включить уведомления</span><input type="checkbox" class="x-sw" id="xNotify"></div>' +
    '<div id="xOpts" hidden>' +
      '<div class="x-row"><span>В начале урока</span><input type="checkbox" class="x-sw" id="xStart"></div>' +
      '<div class="x-row"><span>Звонок в конце урока</span><input type="checkbox" class="x-sw" id="xEnd"></div>' +
      '<div class="x-row"><span>Предупредить заранее</span>' +
        '<select class="x-sel" id="xWarn">' +
          '<option value="0">нет</option><option value="1">за 1 мин</option><option value="2">за 2 мин</option>' +
          '<option value="3">за 3 мин</option><option value="5">за 5 мин</option><option value="10">за 10 мин</option>' +
        '</select></div>' +
      '<div class="x-row"><span>Звук в приложении</span><input type="checkbox" class="x-sw" id="xSound"></div>' +
      '<div class="x-btns"><button class="x-btn" id="xTest" type="button">Проверить уведомление</button></div>' +
    '</div>' +
    '<p class="x-hint" id="xNotifHint"></p>';

  var photo = document.createElement('section');
  photo.className = 'x-sec';
  photo.innerHTML =
    '<h3>🖼 Своё фото на фоне</h3>' +
    '<div class="x-row"><span>Показывать фото</span><input type="checkbox" class="x-sw" id="xPhotoOn"></div>' +
    '<input type="file" id="xFile" accept="image/*" hidden>' +
    '<div class="x-btns">' +
      '<button class="x-btn" id="xPick" type="button">Выбрать из галереи</button>' +
      '<button class="x-btn danger" id="xDel" type="button" hidden>Удалить фото</button>' +
    '</div>' +
    '<div id="xPhotoOpts" hidden>' +
      '<label class="x-lbl" for="xDim">Затемнение: <b id="xDimV"></b></label>' +
      '<input class="x-range" type="range" id="xDim" min="0" max="90">' +
      '<label class="x-lbl" for="xBlur">Размытие: <b id="xBlurV"></b></label>' +
      '<input class="x-range" type="range" id="xBlur" min="0" max="20">' +
    '</div>' +
    '<p class="x-hint" id="xPhotoHint"></p>';

  var rb = el('reset');
  var anchor = rb && rb.closest('#drawer > *');
  if (anchor && anchor.parentNode === drawer) {
    drawer.insertBefore(notif, anchor);
    drawer.insertBefore(photo, anchor);
  } else {
    drawer.appendChild(notif);
    drawer.appendChild(photo);
  }

  /* --- уведомления --- */
  el('xNotify').addEventListener('change', function (e) {
    if (!e.target.checked) { X.notify = false; saveX(); syncUI(); return; }
    unlockAudio();
    askPerm().then(function (p) { X.notify = (p === 'granted'); saveX(); syncUI(); });
  });
  el('xStart').addEventListener('change', function (e) { X.onStart = e.target.checked; saveX(); });
  el('xEnd').addEventListener('change', function (e) { X.onEnd = e.target.checked; saveX(); });
  el('xWarn').addEventListener('change', function (e) { X.warn = clamp(e.target.value, 0, 30); saveX(); });
  el('xSound').addEventListener('change', function (e) { X.sound = e.target.checked; saveX(); if (X.sound) beep(); });
  el('xTest').addEventListener('click', function () {
    unlockAudio();
    askPerm().then(function (p) {
      if (p === 'granted') send('🔔 Тест уведомления', 'Всё работает!', 'test');
      syncUI();
    });
  });

  /* --- фото --- */
  el('xPick').addEventListener('click', function () { el('xFile').click(); });
  el('xPhotoOn').addEventListener('change', function (e) {
    if (e.target.checked && !hasPhoto) { e.target.checked = false; el('xFile').click(); return; }
    X.photo = e.target.checked; saveX(); applyPhoto(); syncUI();
  });
  el('xFile').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    el('xPhotoHint').textContent = 'Обрабатываю фото…';
    processImage(f)
      .then(function (blob) { return idbSet('photo', blob).then(function () { return blob; }); })
      .then(function (blob) { setPhotoBlob(blob); X.photo = true; saveX(); applyPhoto(); syncUI(); })
      .catch(function () { syncUI(); el('xPhotoHint').textContent = 'Не удалось загрузить фото. Попробуйте другое.'; });
  });
  el('xDel').addEventListener('click', function () {
    if (!confirm('Удалить фото с фона?')) return;
    idbDel('photo').catch(function () {});
    if (objUrl) { URL.revokeObjectURL(objUrl); objUrl = null; }
    bg.style.backgroundImage = '';
    hasPhoto = false; X.photo = false; saveX(); applyPhoto(); syncUI();
  });
  el('xDim').addEventListener('input', function (e) { X.dim = clamp(e.target.value, 0, 90); saveX(); applyPhoto(); syncUI(); });
  el('xBlur').addEventListener('input', function (e) { X.blur = clamp(e.target.value, 0, 20); saveX(); applyPhoto(); syncUI(); });

  syncUI();
}

function syncUI() {
  if (!el('xNotify')) return;
  var granted = perm() === 'granted';
  var on = X.notify && granted;
  el('xNotify').checked = on;
  el('xOpts').hidden = !on;
  el('xStart').checked = X.onStart;
  el('xEnd').checked = X.onEnd;
  el('xWarn').value = String(X.warn);
  el('xSound').checked = X.sound;

  var h;
  if (!supported) {
    h = isIOS
      ? 'На iPhone уведомления работают только в установленном приложении (iOS 16.4 и новее): «Поделиться» → «На экран Домой», потом откройте его с экрана.'
      : 'Этот браузер не поддерживает уведомления.';
  } else if (perm() === 'denied') {
    h = 'Уведомления заблокированы. Разрешите их в настройках сайта (значок замка рядом с адресом) и включите переключатель снова.';
  } else if (on) {
    h = 'Включено ✓ Уведомления приходят, пока приложение открыто или свёрнуто. Если телефон полностью закрыл приложение, уведомление может не прийти.';
  } else {
    h = 'Включите переключатель и разрешите уведомления в окне браузера.';
  }
  el('xNotifHint').textContent = h;

  el('xPhotoOn').checked = X.photo && hasPhoto;
  el('xDel').hidden = !hasPhoto;
  el('xPhotoOpts').hidden = !hasPhoto;
  el('xDim').value = X.dim; el('xDimV').textContent = X.dim + '%';
  el('xBlur').value = X.blur; el('xBlurV').textContent = X.blur + ' px';
  el('xPhotoHint').textContent = hasPhoto
    ? 'Фото хранится только на этом устройстве и никуда не отправляется. На другом устройстве или адресе его нужно выбрать заново.'
    : 'Выберите картинку из галереи. Она станет фоном для любой темы.';
}

/* ---------- запуск ---------- */
mount();
applyPhoto();
setInterval(check, 1000);
document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
})();
/* ===== конец extras.js ===== */