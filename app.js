'use strict';
/* Yakıt — kişisel beslenme takibi. Tüm veri cihazda (localStorage) durur. */

const KEY = 'bp.v1';
const SLOTS = { kahvalti: 'Kahvaltı', ogle: 'Öğle', ara: 'Ara öğün', aksam: 'Akşam' };
// ex: antrenman yakımı, kcal / kg vücut ağırlığı
const TYPES = {
  rest: { n: 'Tam dinlenme', s: 'Dinlenme', ex: 0 },
  active: { n: 'Aktif dinlenme', s: 'Aktif', ex: 2.5 },
  single: { n: 'Tek antrenman', s: 'Tek', ex: 6.5 },
  double: { n: 'Çift antrenman', s: 'Çift', ex: 12 }
};
const DEFS = { 0.15: 'Hafif', 0.2: 'Dengeli', 0.25: 'Sıkı' };

const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => parseFloat(String(v == null ? '' : v).replace(',', '.')) || 0;
const r0 = v => Math.round(v);
const lower = s => String(s).toLocaleLowerCase('tr');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ---------- tarih ---------- */
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const pd = s => { const a = s.split('-').map(Number); return new Date(a[0], a[1] - 1, a[2]); };
const shift = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return iso(d); };
const today = () => iso(new Date());
const fmtLong = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
const fmtShort = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' });
const fmtDow = new Intl.DateTimeFormat('tr-TR', { weekday: 'short' });
const fmtWd = new Intl.DateTimeFormat('tr-TR', { weekday: 'long' });

/* ---------- durum ---------- */
let S = { profile: { done: false, sex: 'm', age: '', height: '', weight: '', bf: '', goal: '', def: 0.2, appleRest: '' }, days: {}, body: [], custom: [] };
try {
  const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (raw && raw.profile) S = Object.assign(S, raw, { profile: Object.assign(S.profile, raw.profile) });
} catch (e) { /* bozuk veri: temiz başla */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Kaydedilemedi: depolama dolu'); } };

let tab = 'today', cur = today(), sheet = null, planIdx = {}, undo = null;

function getDay(d) {
  if (!S.days[d]) {
    const prev = S.days[shift(d, -7)];
    S.days[d] = { type: prev ? prev.type : 'single', meals: [], active: '' };
  }
  return S.days[d];
}
const allFoods = () => S.custom.map(f => Object.assign({ cat: 'Benim listem', mine: true }, f)).concat(FOODS);

/* ---------- beslenme motoru ---------- */
function calc(d) {
  const p = S.profile, dy = getDay(d);
  const w = num(p.weight) || 80, bf = num(p.bf);
  const bmr = bf > 3 && bf < 50
    ? 370 + 21.6 * w * (1 - bf / 100)                                              // Katch-McArdle
    : 10 * w + 6.25 * (num(p.height) || 175) - 5 * (num(p.age) || 30) + (p.sex === 'f' ? -161 : 5); // Mifflin-St Jeor
  const rest = num(p.appleRest) > 800 ? num(p.appleRest) : bmr;
  const act = num(dy.active);
  // Apple aktif enerjisi saatte fazla ölçebildiği için %85'i alınır; 1.06 sindirim ısısı.
  const tdee = act > 0 ? (rest + act * 0.85) * 1.06 : rest * 1.25 + TYPES[dy.type].ex * w;
  let def = num(p.def) || 0.2;
  if (dy.type === 'double') def = Math.min(def, 0.2); // çift günde toparlanma için açık sınırlı
  const target = Math.round(Math.max(tdee * (1 - def), bmr) / 10) * 10;
  const prot = r0(2.2 * w), fat = r0(0.8 * w);
  const carb = Math.max(40, r0((target - prot * 4 - fat * 9) / 4));
  const eat = dy.meals.reduce((a, m) => { a.k += num(m.k); a.p += num(m.p); a.c += num(m.c); a.f += num(m.f); return a; }, { k: 0, p: 0, c: 0, f: 0 });
  return { bmr, rest, tdee, def, target, prot, fat, carb, eat, left: r0(target - eat.k), pLeft: r0(prot - eat.p) };
}

function coach(d) {
  const c = calc(d), dy = getDay(d), L = c.left, P = c.pLeft;
  let tone = 'ok', title, text;
  if (!dy.meals.length) {
    title = 'Bugünkü yakıtın ' + c.target + ' kcal';
    text = TYPES[dy.type].n + ' gününe göre ayarlandı. Proteini öğünlere yay: öğün başı ' + r0(c.prot / 4) + ' g civarı.';
  } else if (L > 700) {
    title = L + ' kcal alanın var';
    text = 'Rahatsın. Kalan öğünleri planla, antrenman öncesi ve sonrası karbonhidratı ihmal etme.';
  } else if (L > 300) {
    title = 'Bir ana öğün daha sığar';
    text = L + ' kcal kaldı. Tabağın yarısı sebze, avuç içi kadar protein, yumruk kadar karbonhidrat.';
  } else if (L > 100) {
    title = 'Hafif bir ara öğünlük yer var';
    text = L + ' kcal kaldı. Yoğurt, meyve ya da yağsız protein iyi kapatır.';
  } else if (L >= -100) {
    tone = 'warn'; title = 'Hedef tamam';
    text = 'Bugün artık yemezsen iyi olur. Su, şekersiz çay ve sade kahve serbest.';
  } else {
    tone = 'over'; title = Math.abs(L) + ' kcal fazla';
    text = 'Olur böyle günler. Yarın aç kalarak telafi etme, normal plana dön. Belirleyici olan haftalık ortalama.';
  }
  if (dy.meals.length) {
    if (P > 20 && L > 100) text += ' Protein ' + P + ' g eksik: yağsız protein seç.';
    else if (P > 30 && L <= 100) text += ' Protein ' + P + ' g eksik kaldı; yarın ilk öğünlerden başla.';
  }
  let sugg = [];
  if (L > 60) {
    const needP = P > 20;
    sugg = FOODS.filter(f => f.k <= L && f.k >= 45 && f.cat !== 'İçecek' && f.cat !== 'Dışarıda' && (needP ? f.p / f.k > 0.07 : f.cat !== 'Atıştırmalık'))
      .sort((a, b) => needP ? b.p / b.k - a.p / a.k : Math.abs(a.k - L * 0.6) - Math.abs(b.k - L * 0.6))
      .slice(0, 4);
  }
  return { tone, title, text, sugg, c };
}

/* ---------- arayüz parçaları ---------- */
const ICON = {
  today: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  plan: '<svg viewBox="0 0 24 24"><path d="M5 5h14M5 12h14M5 19h9"/></svg>',
  prog: '<svg viewBox="0 0 24 24"><path d="M4 18l5-6 4 3 7-9"/></svg>',
  prof: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1-4 4-5.5 7.5-5.5s6.500 1.500 7.500 5.500"/></svg>'
};
const seg = (act, opts, val, cls) => '<div class="seg ' + (cls || '') + '">' + opts.map(o =>
  '<button data-a="' + act + '" data-v="' + o[0] + '" class="' + (String(o[0]) === String(val) ? 'on' : '') + '">' + o[1] + '</button>').join('') + '</div>';
const bar = (label, v, t, cls) => {
  const pct = Math.min(100, t ? v / t * 100 : 0);
  return '<div class="mt ' + cls + '"><small>' + label + '</small><b>' + r0(v) + '</b><i>/ ' + t + ' g</i><div class="track"><div class="fill' + (v > t * 1.08 ? ' over' : '') + '" style="width:' + pct + '%"></div></div></div>';
};
const SLOT_IC = {
  kahvalti: '<svg viewBox="0 0 24 24"><path d="M4 18h16M7 18a5 5 0 0110 0M12 6v3M5.500 9.500l1.800 1.800M18.500 9.500l-1.800 1.800"/></svg>',
  ogle: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.600 5.600l1.400 1.400M17 17l1.400 1.400M18.400 5.600L17 7M7 17l-1.400 1.400"/></svg>',
  ara: '<svg viewBox="0 0 24 24"><path d="M13 3L5 14h6l-1 7 8-11h-6z"/></svg>',
  aksam: '<svg viewBox="0 0 24 24"><path d="M20 14.500A8 8 0 019.500 4a8 8 0 1010.500 10.500z"/></svg>'
};

/* ---------- Bugün ---------- */
function vToday() {
  const dy = getDay(cur), co = coach(cur), c = co.c;
  const over = c.left < 0, R = 52, C = 2 * Math.PI * R, pr = Math.min(1, c.eat.k / c.target);
  const isToday = cur === today();
  let h = '<header class="top plain"><div class="top-mid"><small>' + fmtLong.format(pd(cur)) + '</small><h1>' +
    (isToday ? 'Bugün' : cur === shift(today(), -1) ? 'Dün' : fmtWd.format(pd(cur))) + '</h1></div></header>';
  h += '<div class="week">';
  for (let i = 13; i >= 0; i--) {
    const d = shift(today(), -i), has = S.days[d] && S.days[d].meals.length;
    h += '<button data-a="goto" data-v="' + d + '" class="' + (d === cur ? 'on' : '') + '"><small>' + fmtDow.format(pd(d)) + '</small><b>' + pd(d).getDate() + '</b><i class="' + (has ? 'dot' : '') + '"></i></button>';
  }
  h += '</div>';

  h += seg('type', Object.keys(TYPES).map(k => [k, TYPES[k].s]), dy.type, 'seg-type');

  h += '<section class="card hero"><div class="ring"><svg viewBox="0 0 120 120"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ecff8a"/><stop offset="1" stop-color="#a6d91c"/></linearGradient></defs><circle class="ring-bg" cx="60" cy="60" r="' + R + '"/>' +
    '<circle class="ring-fg' + (over ? ' over' : '') + '" cx="60" cy="60" r="' + R + '" stroke-dasharray="' + C + '" stroke-dashoffset="' + C * (1 - pr) + '"/></svg>' +
    '<div class="ring-in"><b class="' + (over ? 'neg' : '') + '">' + Math.abs(c.left) + '</b><span>kcal ' + (over ? 'fazla' : 'kaldı') + '</span></div></div>' +
    '<div class="hero-meta"><span class="pill">' + TYPES[dy.type].n + '</span><span>açık %' + r0(c.def * 100) + '</span></div>' +
    '<dl class="hero-stats"><div><dt>Hedef</dt><dd>' + c.target + '</dd></div><div><dt>Yenen</dt><dd>' + r0(c.eat.k) + '</dd></div><div><dt>Günlük yakım</dt><dd>' + r0(c.tdee) + '</dd></div></dl></section>';

  h += '<section class="macros">' + bar('Protein', c.eat.p, c.prot, 'p') + bar('Karb.', c.eat.c, c.carb, 'c') + bar('Yağ', c.eat.f, c.fat, 'f') + '</section>';

  h += '<section class="card coach ' + co.tone + '"><div class="coach-tag">Diyetisyen notu</div><h2>' + co.title + '</h2><p>' + co.text + '</p>';
  if (co.sugg.length) h += '<div class="chips">' + co.sugg.map(f => '<button data-a="food" data-n="' + esc(f.n) + '">' + esc(f.n) + '<i>' + f.k + '</i></button>').join('') + '</div>';
  h += '</section>';

  Object.keys(SLOTS).forEach(s => {
    const ms = dy.meals.filter(m => m.s === s), sum = ms.reduce((a, m) => a + num(m.k), 0);
    h += '<section class="slot"><div class="slot-head"><i class="slot-ic">' + SLOT_IC[s] + '</i><h3>' + SLOTS[s] + '</h3><span>' + (sum ? r0(sum) + ' kcal' : 'boş') + '</span><button data-a="add" data-v="' + s + '" aria-label="' + SLOTS[s] + ' ekle">+</button></div>';
    h += ms.length ? '<ul>' + ms.map(m => '<li><div><b>' + esc(m.n) + '</b><small>P ' + r0(m.p) + ' · K ' + r0(m.c) + ' · Y ' + r0(m.f) + '</small></div><span class="kc">' + r0(m.k) + '</span><button class="del" data-a="del" data-v="' + m.id + '" aria-label="Sil">×</button></li>').join('') + '</ul>' : '';
    h += '</section>';
  });

  h += '<section class="card row"><label for="act">Apple aktif enerji <small>opsiyonel, kcal</small></label><input id="act" inputmode="numeric" placeholder="—" value="' + esc(dy.active) + '" data-ch="active"></section>';
  h += '<button class="btn ghost" data-a="copy">Durumu Claude için kopyala</button>';
  return h;
}

/* ---------- Plan ---------- */
function planFor(d) {
  const c = calc(d), dy = getDay(d);
  const lay = dy.type === 'double'
    ? [['kahvalti', .22], ['ara', .12], ['ogle', .27], ['ara', .12], ['aksam', .27]]
    : [['kahvalti', .26], ['ogle', .31], ['ara', .12], ['aksam', .31]];
  return lay.map((l, i) => {
    const list = MEALS[l[0]], key = l[0] + i;
    const m = list[((planIdx[key] || 0) + i) % list.length];
    const sc = Math.min(1.7, Math.max(.6, c.target * l[1] / m.k));
    return { key, slot: l[0], m, sc, k: r0(m.k * sc), p: r0(m.p * sc), c: r0(m.c * sc), f: r0(m.f * sc) };
  });
}
function qty(v, u, sc) {
  let x = v * sc;
  x = (u === 'g' || u === 'ml') ? Math.round(x / 10) * 10 : Math.max(.5, Math.round(x * 2) / 2);
  return String(x).replace('.', ',') + ' ' + u;
}
function vPlan() {
  const c = calc(cur), dy = getDay(cur), pl = planFor(cur);
  const tot = pl.reduce((a, x) => { a.k += x.k; a.p += x.p; return a; }, { k: 0, p: 0 });
  let h = '<header class="top plain"><div class="top-mid"><small>' + TYPES[dy.type].n + ' · ' + fmtShort.format(pd(cur)) + '</small><h1>Örnek gün</h1></div></header>';
  h += '<p class="lead">Hedef <b>' + c.target + ' kcal</b>, protein <b>' + c.prot + ' g</b>. Bu menü toplam ' + tot.k + ' kcal ve ' + tot.p + ' g protein. Porsiyonlar bugünkü hedefine göre ölçeklendi.</p>';
  pl.forEach(x => {
    h += '<section class="card meal"><div class="meal-head"><small>' + SLOTS[x.slot] + (dy.type === 'double' && x.slot === 'ara' ? (x.key === 'ara1' ? ' · 1. antrenman öncesi' : ' · 2. antrenman öncesi') : '') + '</small><b>' + x.k + ' kcal</b></div><h2>' + x.m.n + '</h2><ul>' +
      x.m.items.map(it => '<li><span>' + it[0] + '</span><i>' + (it[1] ? qty(it[1], it[2], x.sc) : '') + '</i></li>').join('') +
      '</ul><div class="meal-mac">P ' + x.p + ' g · K ' + x.c + ' g · Y ' + x.f + ' g</div><div class="meal-act"><button class="btn sm ghost" data-a="swap" data-v="' + x.key + '">Başka öner</button><button class="btn sm" data-a="eat" data-v="' + x.key + '">Yedim, ekle</button></div></section>';
  });
  h += '<section class="card note"><h3>Göbek yağı hakkında</h3><p>Bölgesel yağ yakımı yok: göbek, toplam yağ oranı düştükçe incelir ve genelde en son giden bölgedir. İşleyen üçlü: istikrarlı kalori açığı, yüksek protein, ağır antrenman. Bel çevreni haftada bir ölç; terazi oynamasa da bel inceliyorsa doğru yoldasın.</p></section>';
  return h;
}

/* ---------- İlerleme ---------- */
function vProg() {
  const days = []; for (let i = 6; i >= 0; i--) days.push(shift(today(), -i));
  const rows = days.map(d => { const dy = S.days[d]; return dy && dy.meals.length ? Object.assign({ d }, calc(d)) : { d, empty: true }; });
  const log = rows.filter(r => !r.empty);
  const max = Math.max(1, ...log.map(r => Math.max(r.eat.k, r.target)));
  const defSum = log.reduce((a, r) => a + (r.tdee - r.eat.k), 0);
  const avg = log.length ? r0(log.reduce((a, r) => a + r.eat.k, 0) / log.length) : 0;
  const avgP = log.length ? r0(log.reduce((a, r) => a + r.eat.p, 0) / log.length) : 0;
  const hit = log.filter(r => Math.abs(r.left) <= r.target * 0.07 || (r.left > 0 && r.left < r.target * 0.15)).length;

  let h = '<header class="top plain"><div class="top-mid"><small>Son 7 gün</small><h1>İlerleme</h1></div></header>';
  h += '<section class="card"><div class="bars">' + rows.map(r => {
    const hh = r.empty ? 4 : Math.max(4, r.eat.k / max * 100), tt = r.empty ? 0 : r.target / max * 100;
    return '<div class="bcol" data-a="goto" data-v="' + r.d + '"><div class="bwrap">' + (r.empty ? '' : '<i class="tline" style="bottom:' + tt + '%"></i>') + '<div class="b' + (r.empty ? ' empty' : r.left < -100 ? ' over' : '') + '" style="height:' + hh + '%"></div></div><span>' + fmtDow.format(pd(r.d)) + '</span></div>';
  }).join('') + '</div><p class="legend"><i class="tline"></i> çizgi günlük hedef · sütun yenen</p></section>';

  h += '<section class="grid2"><div class="card stat"><small>Ortalama alım</small><b>' + (avg || '—') + '</b><span>kcal / gün</span></div><div class="card stat"><small>Ortalama protein</small><b>' + (avgP || '—') + '</b><span>g / gün</span></div>' +
    '<div class="card stat"><small>Hedefe uyan gün</small><b>' + hit + '<i> / ' + log.length + '</i></b><span>kayıtlı gün</span></div><div class="card stat"><small>Tahmini yağ kaybı</small><b>' + (log.length ? (defSum / 7700).toFixed(2).replace('.', ',') : '—') + '</b><span>kg, kayıtlı günlerde</span></div></section>';

  const body = S.body.slice().sort((a, b) => a.d < b.d ? -1 : 1);
  h += '<section class="card"><h3 class="ct">Kilo ve bel çevresi</h3>';
  if (body.length > 1) {
    const ws = body.map(b => num(b.w)).filter(Boolean), mn = Math.min(...ws) - .5, mx = Math.max(...ws) + .5;
    const pts = body.filter(b => num(b.w)).map((b, i, a) => (a.length > 1 ? i / (a.length - 1) * 300 : 150).toFixed(1) + ',' + (70 - (num(b.w) - mn) / (mx - mn) * 60).toFixed(1));
    h += '<svg class="spark" viewBox="-4 0 308 80" preserveAspectRatio="none"><polyline points="' + pts.join(' ') + '"/></svg>';
    const f = body[0], l = body[body.length - 1], dw = num(l.w) - num(f.w), db = num(l.waist) && num(f.waist) ? num(l.waist) - num(f.waist) : null;
    h += '<p class="delta">' + fmtShort.format(pd(f.d)) + ' → ' + fmtShort.format(pd(l.d)) + ': <b>' + (dw > 0 ? '+' : '') + dw.toFixed(1).replace('.', ',') + ' kg</b>' + (db !== null ? ' · bel <b>' + (db > 0 ? '+' : '') + db.toFixed(1).replace('.', ',') + ' cm</b>' : '') + '</p>';
  } else h += '<p class="muted">Sabah aç karnına tartıl, haftada bir bel çevreni göbek deliği hizasından ölç. İki kayıttan sonra grafik çıkar.</p>';
  h += '<div class="form2"><label>Kilo (kg)<input id="bw" inputmode="decimal" placeholder="' + esc(S.profile.weight || '80') + '"></label><label>Bel (cm)<input id="bwa" inputmode="decimal" placeholder="opsiyonel"></label></div><button class="btn" data-a="body">Bugünkü ölçümü kaydet</button>';
  if (body.length) h += '<ul class="hist">' + body.slice(-6).reverse().map(b => '<li><span>' + fmtShort.format(pd(b.d)) + '</span><b>' + esc(b.w) + ' kg</b><i>' + (b.waist ? esc(b.waist) + ' cm' : '') + '</i></li>').join('') + '</ul>';
  h += '</section>';
  return h;
}

/* ---------- Profil ---------- */
const fld = (k, label, ph, mode) => '<label>' + label + '<input data-pf="' + k + '" inputmode="' + (mode || 'decimal') + '" placeholder="' + ph + '" value="' + esc(S.profile[k]) + '"></label>';
function calcBox() {
  const p = S.profile;
  if (!num(p.weight) || !num(p.height) || !num(p.age)) return '<p class="muted">Yaş, boy ve kiloyu girince hedeflerin burada görünür.</p>';
  const save_ = S.days.__tmp; let h = '<table class="tbl"><tr><th>Gün tipi</th><th>Yakım</th><th>Hedef</th></tr>';
  Object.keys(TYPES).forEach(t => { S.days.__tmp = { type: t, meals: [], active: '' }; const c = calc('__tmp'); h += '<tr><td>' + TYPES[t].n + '</td><td>' + r0(c.tdee) + '</td><td><b>' + c.target + '</b></td></tr>'; });
  S.days.__tmp = { type: 'single', meals: [], active: '' }; const c = calc('__tmp');
  delete S.days.__tmp; if (save_) S.days.__tmp = save_;
  return h + '</table><p class="muted">Bazal metabolizma ' + r0(c.rest) + ' kcal' + (num(p.appleRest) > 800 ? ' (Apple verisi)' : num(p.bf) > 3 ? ' (Katch-McArdle)' : ' (Mifflin-St Jeor)') + ' · protein ' + c.prot + ' g · yağ ' + c.fat + ' g, kalanı karbonhidrat.</p>';
}
function vProfile(first) {
  const p = S.profile;
  let h = '<header class="top plain"><div class="top-mid"><small>' + (first ? 'Hoş geldin' : 'Ayarlar') + '</small><h1>' + (first ? 'Önce seni tanıyayım' : 'Profil') + '</h1></div></header>';
  if (first) h += '<p class="lead">Hedeflerini bu bilgilerle hesaplıyorum. Hepsi yalnızca bu telefonda saklanır.</p>';
  h += '<section class="card"><h3 class="ct">Vücut</h3>' + seg('sex', [['m', 'Erkek'], ['f', 'Kadın']], p.sex) +
    '<div class="form2">' + fld('age', 'Yaş', '30', 'numeric') + fld('height', 'Boy (cm)', '178') + fld('weight', 'Kilo (kg)', '80') + fld('bf', 'Yağ oranı % <small>biliyorsan</small>', '18') + '</div></section>';
  h += '<section class="card"><h3 class="ct">Kalori açığı</h3>' + seg('def', Object.keys(DEFS).sort().map(k => [k, DEFS[k] + ' %' + r0(k * 100)]), p.def) +
    '<p class="muted">Çift antrenman yapan biri için Dengeli iyi başlangıç. Sıkı mod, çift günlerde otomatik %20\'ye iner; hedef hiçbir gün bazal metabolizmanın altına düşmez.</p></section>';
  h += '<section class="card"><h3 class="ct">Apple Sağlık <small>opsiyonel</small></h3><div class="form2 one">' + fld('appleRest', 'Dinlenme enerjisi, günlük ortalama (kcal)', 'örn. 1850', 'numeric') + '</div><p class="muted">Sağlık › Göz At › Aktivite › Dinlenme Enerjisi › son 1 ayın günlük ortalaması. Girersen formül yerine bu kullanılır. Günlük Aktif Enerji\'yi Bugün ekranından girebilirsin.</p></section>';
  h += '<section class="card"><h3 class="ct">Günlük hedeflerin</h3><div id="calcBox">' + calcBox() + '</div></section>';
  if (first) h += '<button class="btn big" data-a="start">Başla</button>';
  else h += '<section class="card"><h3 class="ct">Yedek</h3><p class="muted">Veri yalnızca bu cihazda. Arada bir yedeği kopyalayıp Notlar\'a yapıştır.</p><div class="meal-act"><button class="btn sm ghost" data-a="backup">Yedeği kopyala</button><button class="btn sm ghost" data-a="restore">Yedekten yükle</button></div></section>';
  return h;
}

/* ---------- çizim ---------- */
function render() {
  const first = !S.profile.done;
  $('#view').innerHTML = first ? vProfile(true) : ({ today: vToday, plan: vPlan, prog: vProg, prof: vProfile })[tab]();
  $('#tabs').hidden = first;
  document.querySelectorAll('#tabs [data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
  const wk = $('.week'), on = wk && wk.querySelector('.on');
  if (on) wk.scrollLeft = on.offsetLeft - wk.offsetLeft - (wk.clientWidth - on.offsetWidth) / 2;
}
let enterT;
function enter() { const v = $('#view'); v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter'); clearTimeout(enterT); enterT = setTimeout(() => v.classList.remove('enter'), 800); }
function go(t) { tab = t; render(); window.scrollTo(0, 0); enter(); }

let toastT;
function toast(msg, undoFn) {
  const t = $('#toast'); undo = undoFn || null;
  t.innerHTML = '<span>' + esc(msg) + '</span>' + (undoFn ? '<button data-a="undo">Geri al</button>' : '');
  t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), undoFn ? 5000 : 2200);
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (_) { } ta.remove(); return ok;
  }
}

/* ---------- ekleme paneli ---------- */
function slotNow() { const h = new Date().getHours(); return h < 11 ? 'kahvalti' : h < 15 ? 'ogle' : h < 18 ? 'ara' : 'aksam'; }
function openAdd(slot, t) { sheet = { tab: t || 'liste', slot: slot || slotNow(), q: '', food: null, qty: 1, parsed: null }; drawSheet(); }
function closeSheet() { sheet = null; $('#sheet').classList.remove('on'); $('#scrim').classList.remove('on'); document.body.classList.remove('lock'); }

function foodList() {
  const q = lower(sheet.q.trim()), L = calc(cur).left;
  const list = allFoods().filter(f => !q || lower(f.n).includes(q));
  if (!list.length) return '<p class="muted pad">Bulunamadı. Manuel sekmesinden ekleyebilirsin.</p>';
  let h = '', cat = '';
  list.forEach(f => {
    if (f.cat !== cat) { cat = f.cat; h += '<h4>' + cat + '</h4>'; }
    h += '<button class="food" data-a="food" data-n="' + esc(f.n) + '"><div><b>' + esc(f.n) + '</b><small>' + esc(f.por || '1 porsiyon') + ' · P ' + r0(f.p) + ' g</small></div><span class="' + (f.k > L ? 'neg' : '') + '">' + r0(f.k) + '</span></button>';
  });
  return h;
}
function detail() {
  const f = sheet.food, q = sheet.qty, k = r0(f.k * q), after = calc(cur).left - k;
  return '<button class="back" data-a="back">‹ Liste</button><h2 class="dn">' + esc(f.n) + '</h2><p class="muted">' + esc(f.por || '1 porsiyon') + '</p>' +
    '<div class="stepper"><button data-a="qty" data-v="-0.5" aria-label="Azalt">−</button><b>' + String(q).replace('.', ',') + '<i> porsiyon</i></b><button data-a="qty" data-v="0.5" aria-label="Artır">+</button></div>' +
    '<div class="dmac"><div><b>' + k + '</b><span>kcal</span></div><div><b>' + r0(f.p * q) + '</b><span>protein</span></div><div><b>' + r0(f.c * q) + '</b><span>karb.</span></div><div><b>' + r0(f.f * q) + '</b><span>yağ</span></div></div>' +
    '<p class="fit ' + (after < -100 ? 'over' : after < 0 ? 'warn' : 'ok') + '">' + (after >= 0 ? 'Sığar. Yedikten sonra ' + after + ' kcal kalır.' : after >= -100 ? 'Sınırda: hedefi ' + Math.abs(after) + ' kcal geçersin.' : 'Aşar: hedefin ' + Math.abs(after) + ' kcal üstüne çıkarsın. Yarım porsiyon dene ya da yarına bırak.') + '</p>' +
    '<button class="btn big" data-a="addfood">' + SLOTS[sheet.slot] + ' öğününe ekle</button>';
}
function drawSheet() {
  const s = sheet; let h = '<div class="grab"></div><div class="sh-head"><h2>Öğün ekle</h2><button data-a="close">Kapat</button></div>';
  h += seg('slot', Object.keys(SLOTS).map(k => [k, SLOTS[k]]), s.slot, 'seg-sm');
  if (s.food) h += detail();
  else {
    h += '<div class="tabs2">' + [['liste', 'Liste'], ['manuel', 'Manuel'], ['claude', 'Claude kodu']].map(t => '<button data-a="stab" data-v="' + t[0] + '" class="' + (s.tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>').join('') + '</div>';
    if (s.tab === 'liste') h += '<input id="q" class="search" type="search" placeholder="Besin ara: tavuk, yulaf, probis…" value="' + esc(s.q) + '" autocomplete="off"><div id="foodList" class="foods">' + foodList() + '</div>';
    else if (s.tab === 'manuel') h += '<div class="form2 one"><label>Ne yedin?<input id="mn" placeholder="örn. Ev yapımı mantı, 1 tabak" autocomplete="off"></label></div><div class="form2 four"><label>kcal<input id="mk" inputmode="numeric"></label><label>Protein<input id="mp" inputmode="decimal"></label><label>Karb.<input id="mc" inputmode="decimal"></label><label>Yağ<input id="mf" inputmode="decimal"></label></div><label class="chk"><input type="checkbox" id="ms"> Listeme kaydet, tekrar kullanırım</label><button class="btn big" data-a="addman">Ekle</button>';
    else {
      h += '<p class="muted">Yemek fotoğraflarını Claude\'a gönder. Verdiği kodu kopyala ve buraya yapıştır.</p><textarea id="cc" rows="5" placeholder=\'{"d":"2026-11-10","m":[…]}\'></textarea><div class="meal-act"><button class="btn sm ghost" data-a="paste">Panodan yapıştır</button><button class="btn sm" data-a="parse">Çözümle</button></div>';
      if (s.parsed) {
        const tot = s.parsed.m.reduce((a, m) => a + m.k, 0);
        h += '<div class="prev"><h4>' + fmtLong.format(pd(s.parsed.d)) + (s.parsed.t ? ' · ' + TYPES[s.parsed.t].n : '') + '</h4><ul>' + s.parsed.m.map(m => '<li><div><b>' + esc(m.n) + '</b><small>' + SLOTS[m.s] + ' · P ' + r0(m.p) + ' · K ' + r0(m.c) + ' · Y ' + r0(m.f) + '</small></div><span>' + r0(m.k) + '</span></li>').join('') + '</ul></div><button class="btn big" data-a="import">' + s.parsed.m.length + ' kaydı ekle · ' + r0(tot) + ' kcal</button>';
      }
    }
  }
  $('#sheet').innerHTML = h; $('#sheet').classList.add('on'); $('#scrim').classList.add('on'); document.body.classList.add('lock');
}
function parseClaude(txt) {
  const m = String(txt).replace(/[“”„]/g, '"').replace(/[‘’]/g, "'").match(/\{[\s\S]*\}/);
  if (!m) throw new Error('Kod bulunamadı');
  const o = JSON.parse(m[0]);
  const list = (o.m || o.meals || []).map(x => ({
    n: String(x.n || x.name || 'Öğün').slice(0, 80), s: SLOTS[x.s] ? x.s : slotNow(),
    k: num(x.k), p: num(x.p), c: num(x.c), f: num(x.f)
  })).filter(x => x.k > 0);
  if (!list.length) throw new Error('Kodda öğün yok');
  return { d: /^\d{4}-\d{2}-\d{2}$/.test(o.d) ? o.d : cur, t: TYPES[o.t] ? o.t : null, m: list };
}
function addMeal(d, m) { getDay(d).meals.push(Object.assign({ id: uid() }, m)); }

function statusText() {
  const c = calc(cur), dy = getDay(cur);
  return 'BESLENME DURUMU ' + cur + '\nGün tipi: ' + TYPES[dy.type].n + '\nHedef: ' + c.target + ' kcal (P ' + c.prot + ' / K ' + c.carb + ' / Y ' + c.fat + ' g)\nYenen: ' + r0(c.eat.k) + ' kcal (P ' + r0(c.eat.p) + ' / K ' + r0(c.eat.c) + ' / Y ' + r0(c.eat.f) + ' g)\nKalan: ' + c.left + ' kcal, protein ' + c.pLeft + ' g\nÖğünler: ' +
    (dy.meals.map(m => SLOTS[m.s] + ' — ' + m.n + ' (' + r0(m.k) + ')').join('; ') || 'henüz yok');
}

/* ---------- olaylar ---------- */
const A = {
  tab: v => go(v),
  day: v => { const n = shift(cur, +v); if (n <= today()) { cur = n; render(); } },
  goto: v => { cur = v; go('today'); },
  type: v => { getDay(cur).type = v; save(); render(); },
  add: v => openAdd(v),
  close: closeSheet,
  slot: v => { sheet.slot = v; drawSheet(); },
  stab: v => { sheet.tab = v; sheet.parsed = null; drawSheet(); },
  back: () => { sheet.food = null; drawSheet(); },
  food: (v, el) => {
    const f = allFoods().find(x => x.n === el.dataset.n); if (!f) return;
    if (!sheet) sheet = { tab: 'liste', slot: slotNow(), q: '', parsed: null };
    sheet.food = f; sheet.qty = 1; drawSheet();
  },
  qty: v => { sheet.qty = Math.min(10, Math.max(.5, sheet.qty + +v)); drawSheet(); },
  addfood: () => {
    const f = sheet.food, q = sheet.qty;
    addMeal(cur, { n: f.n + (q !== 1 ? ' ×' + String(q).replace('.', ',') : ''), s: sheet.slot, k: r0(f.k * q), p: +(f.p * q).toFixed(1), c: +(f.c * q).toFixed(1), f: +(f.f * q).toFixed(1) });
    save(); closeSheet(); render(); toast('Eklendi');
  },
  addman: () => {
    const n = $('#mn').value.trim(), k = num($('#mk').value);
    if (!n || !k) return toast('İsim ve kalori gerekli');
    const m = { n, k, p: num($('#mp').value), c: num($('#mc').value), f: num($('#mf').value) };
    addMeal(cur, Object.assign({ s: sheet.slot }, m));
    if ($('#ms').checked && !S.custom.some(x => x.n === n)) S.custom.unshift(Object.assign({ por: '1 porsiyon' }, m));
    save(); closeSheet(); render(); toast('Eklendi');
  },
  paste: async () => { try { $('#cc').value = await navigator.clipboard.readText(); A.parse(); } catch (e) { toast('Kutuya basılı tutup Yapıştır de'); } },
  parse: () => { try { sheet.parsed = parseClaude($('#cc').value); const v = $('#cc').value; drawSheet(); $('#cc').value = v; } catch (e) { toast(e.message.startsWith('Kod') ? e.message : 'Kod okunamadı, tamamını kopyala'); } },
  import: () => {
    const p = sheet.parsed; p.m.forEach(m => addMeal(p.d, m)); if (p.t) getDay(p.d).type = p.t;
    save(); cur = p.d <= today() ? p.d : cur; closeSheet(); go('today'); toast(p.m.length + ' kayıt eklendi');
  },
  del: v => {
    const dy = getDay(cur), i = dy.meals.findIndex(m => m.id === v); if (i < 0) return;
    const m = dy.meals.splice(i, 1)[0], d = cur; save(); render();
    toast('Silindi', () => { getDay(d).meals.splice(i, 0, m); save(); render(); });
  },
  undo: () => { if (undo) { undo(); undo = null; $('#toast').classList.remove('on'); } },
  copy: async () => toast(await copy(statusText()) ? 'Kopyalandı. Claude\'a yapıştır.' : 'Kopyalanamadı'),
  swap: v => { planIdx[v] = (planIdx[v] || 0) + 1; render(); },
  eat: v => { const x = planFor(cur).find(p => p.key === v); addMeal(cur, { n: x.m.n, s: x.slot, k: x.k, p: x.p, c: x.c, f: x.f }); save(); toast(SLOTS[x.slot] + ' öğününe eklendi'); },
  body: () => {
    const w = num($('#bw').value), wa = num($('#bwa').value); if (!w) return toast('Kilo gir');
    S.body = S.body.filter(b => b.d !== today()); S.body.push({ d: today(), w, waist: wa || '' });
    S.profile.weight = w; save(); render(); toast('Kaydedildi, hedefler güncellendi');
  },
  sex: v => { S.profile.sex = v; save(); render(); },
  def: v => { S.profile.def = +v; save(); render(); },
  start: () => {
    const p = S.profile; if (!num(p.age) || !num(p.height) || !num(p.weight)) return toast('Yaş, boy ve kilo gerekli');
    p.done = true; if (!S.body.length) S.body.push({ d: today(), w: num(p.weight), waist: '' }); save(); go('today');
  },
  backup: async () => toast(await copy(JSON.stringify(S)) ? 'Yedek kopyalandı' : 'Kopyalanamadı'),
  restore: () => {
    const t = prompt('Yedek metnini yapıştır. Mevcut verinin üzerine yazılır.'); if (!t) return;
    try { const o = JSON.parse(t); if (!o.profile || !o.days) throw 0; S = o; save(); render(); toast('Yedek yüklendi'); } catch (e) { toast('Geçersiz yedek'); }
  }
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
  const fn = A[el.dataset.a]; if (fn) fn(el.dataset.v, el);
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'q') { sheet.q = t.value; $('#foodList').innerHTML = foodList(); }
  else if (t.dataset.pf) { S.profile[t.dataset.pf] = t.value.trim(); save(); const b = $('#calcBox'); if (b) b.innerHTML = calcBox(); }
});
document.addEventListener('change', e => {
  if (e.target.dataset.ch === 'active') { getDay(cur).active = e.target.value.trim(); save(); render(); }
});
$('#scrim').addEventListener('click', closeSheet);
// Uygulama arka plandan dönünce gün değişmiş olabilir.
let lastDay = today();
document.addEventListener('visibilitychange', () => { if (!document.hidden && today() !== lastDay) { lastDay = cur = today(); render(); } });

render(); enter();
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => { });
