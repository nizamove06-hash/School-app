/* ===== phone.js: заставка при запуске + оптимизация для телефона ===== */
(function () {
'use strict';

var PK = 'schoolPhone';
var P = { perf: null, launch: true };   // perf: null = автоматически (вкл. на телефонах)
try {
  var r = JSON.parse(localStorage.getItem(PK));
  if (r) {
    if (typeof r.perf === 'boolean') P.perf = r.perf;
    if (typeof r.launch === 'boolean') P.launch = r.launch;
  }
} catch (e) {}
function save() { try { localStorage.setItem(PK, JSON.stringify(P)); } catch (e) {} }

var $ = function (id) { return document.getElementById(id); };
var root = document.documentElement;
var coarse = !!(window.matchMedia && matchMedia('(pointer:coarse)').matches);
var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

function perfOn() { return P.perf === null ? coarse : P.perf; }
function applyPerf() { root.classList.toggle('xperf', perfOn()); }
function applyApp() { root.classList.toggle('x-app', standalone && P.launch); }

/* ---------- стили ---------- */
var st = document.createElement('style');
st.textContent =
/* --- оптимизация --- */
'html.xperf *{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}' +
'html.xperf .grain{display:none!important}' +
'html.xperf .blob{filter:none!important;animation:none!important;will-change:auto}' +
'html.xperf .blob.b1{background:radial-gradient(circle,var(--b1) 0%,transparent 68%)!important}' +
'html.xperf .blob.b2{background:radial-gradient(circle,var(--b2) 0%,transparent 68%)!important}' +
'html.xperf .blob.b3{background:radial-gradient(circle,var(--b3) 0%,transparent 68%)!important}' +
'html.xperf .card,html.xperf .glass,html.xperf .panel,html.xperf .time-btn{box-shadow:none!important}' +
'html.xperf #extBg{filter:none!important;transform:none!important}' +
'html.xperf body{transition:none!important}' +
/* --- на телефоне в приложении родную заставку прячем, показываем свою --- */
'html.x-app #intro{display:none!important}' +
/* --- наша заставка --- */
'#xIntro{position:fixed;inset:0;z-index:9999;background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;cursor:pointer;transition:opacity .6s,visibility .6s}' +
'#xIntro.out{opacity:0;visibility:hidden}' +
'#xIntro svg{width:84px;height:84px}' +
'#xIntro .hand{transform-origin:50% 50%;animation:xSpin 1.6s cubic-bezier(.22,1,.36,1) both}' +
'@keyframes xSpin{from{transform:rotate(-300deg)}to{transform:none}}' +
'#xIntro h1{margin:0;font-family:var(--font);color:var(--text);font-size:clamp(26px,7vw,44px);font-weight:800;text-align:center}' +
'#xIntro h1 span{display:inline-block;animation:xRise .6s cubic-bezier(.22,1,.36,1) both;animation-delay:calc(var(--i)*40ms + .2s)}' +
'@keyframes xRise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}' +
/* --- раздел в настройках --- */
'.p-sec{padding:16px 0;border-bottom:1px solid var(--border)}' +
'.p-sec h3{margin:0 0 12px;font-size:16px}' +
'.p-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:10px 0}' +
'.p-sw{-webkit-appearance:none;appearance:none;width:52px;height:30px;border-radius:99px;background:var(--border);position:relative;cursor:pointer;flex:none;margin:0;border:0;outline:none;transition:background .3s}' +
'.p-sw::after{content:"";position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:#fff;transition:transform .3s}' +
'.p-sw:checked{background:linear-gradient(135deg,var(--accent),var(--accent2))}' +
'.p-sw:checked::after{transform:translateX(22px)}' +
'.p-btn{padding:11px 16px;border-radius:12px;border:1px solid var(--border);background:var(--card);color:var(--text);font:inherit;font-weight:700;font-size:15px;cursor:pointer;margin-top:6px}' +
'.p-btn:active{transform:scale(.97)}' +
'.p-hint{font-size:13px;color:var(--muted);margin:8px 0 0;line-height:1.45}';
document.head.appendChild(st);

applyPerf();
applyApp();

/* ---------- заставка ---------- */
var playing = false;
function play(force) {
  if (playing) return;
  if (!force && !P.launch) return;
  if (root.classList.contains('noanim')) return;   // анимации выключены в настройках сайта
  playing = true;

  var o = document.createElement('div');
  o.id = 'xIntro';
  var title = 'Школьное расписание';
  o.innerHTML =
    '<svg viewBox="0 0 100 100" fill="none" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="50" cy="50" r="38" style="stroke:var(--accent)"/>' +
      '<path class="hand" d="M50 28v24l16 10" style="stroke:var(--accent2)"/>' +
    '</svg><h1>' +
    title.split('').map(function (c, i) {
      return '<span style="--i:' + i + '">' + (c === ' ' ? '&nbsp;' : c) + '</span>';
    }).join('') + '</h1>';
  document.body.appendChild(o);

  var done = function () {
    if (!o.parentNode || o.classList.contains('out')) return;
    o.classList.add('out');
    setTimeout(function () { if (o.parentNode) o.parentNode.removeChild(o); playing = false; }, 700);
  };
  o.addEventListener('click', done);
  /* таймер стартует с первого реально показанного кадра, а не пока телефон ещё показывает системную картинку */
  requestAnimationFrame(function () { setTimeout(done, 2300); });
  setTimeout(done, 8000); // страховка
}

/* запуск приложения с экрана телефона */
if (standalone && P.launch) {
  var o0 = document.createElement('div'); // сразу закрываем экран, чтобы не мелькала страница
  play(false);
}

/* возвращение в приложение после паузы */
var hiddenAt = 0;
document.addEventListener('visibilitychange', function () {
  if (document.hidden) { hiddenAt = Date.now(); return; }
  if (standalone && P.launch && hiddenAt && Date.now() - hiddenAt > 30000) play(false);
  hiddenAt = 0;
});
window.addEventListener('pageshow', function (e) {
  if (e.persisted && standalone && P.launch) play(false);
});

/* ---------- раздел в настройках ---------- */
function mount() {
  var drawer = $('drawer') || document.querySelector('aside');
  if (!drawer) return;

  var sec = document.createElement('section');
  sec.className = 'p-sec';
  sec.innerHTML =
    '<h3>⚡ Телефон</h3>' +
    '<div class="p-row"><span>Оптимизация (плавнее)</span><input type="checkbox" class="p-sw" id="pPerf"></div>' +
    '<p class="p-hint">Отключает размытие «стекла» и тяжёлые эффекты фона. Выглядит чуть проще, зато меньше нагрузки и лагов. На телефонах включена сама.</p>' +
    '<div class="p-row"><span>Заставка при запуске</span><input type="checkbox" class="p-sw" id="pLaunch"></div>' +
    '<p class="p-hint">Анимация при открытии приложения и при возвращении в него. Работает в установленном приложении.</p>' +
    '<button class="p-btn" id="pPlay" type="button">▶ Показать заставку</button>';

  var rb = $('reset');
  var anchor = rb && rb.closest('#drawer > *');
  if (anchor && anchor.parentNode === drawer) drawer.insertBefore(sec, anchor);
  else drawer.appendChild(sec);

  $('pPerf').checked = perfOn();
  $('pLaunch').checked = P.launch;

  $('pPerf').addEventListener('change', function (e) { P.perf = e.target.checked; save(); applyPerf(); });
  $('pLaunch').addEventListener('change', function (e) { P.launch = e.target.checked; save(); applyApp(); });
  $('pPlay').addEventListener('click', function () {
    var d = $('drawer'), ov = $('overlay');
    if (d) d.classList.remove('open');
    if (ov) ov.classList.remove('open');
    play(true);
  });
}
mount();
})();
/* ===== конец phone.js ===== */