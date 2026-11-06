/* 界面层：表单、渲染、档案、分享 */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var WXC = { '木': 'mu', '火': 'huo', '土': 'tu', '金': 'jin', '水': 'shui' };
  function cw(ch) { return WXC[GZ.charWx(ch)] || ''; }
  function col(ch) { return '<span class="c-' + cw(ch) + '">' + ch + '</span>'; }
  function gzHtml(gz) { return gz ? col(gz.charAt(0)) + col(gz.charAt(1)) : ''; }
  function wxSpan(w) { return '<span class="c-' + WXC[w] + '">' + w + '</span>'; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function todayParts() { var d = new Date(); return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), h: d.getHours(), mi: d.getMinutes() }; }
  function todayYmd() { var t = todayParts(); return t.y + '-' + pad(t.m) + '-' + pad(t.d); }
  var HOUR_ZHI = function (h) { return GZ.ZHI[Math.floor((h + 1) / 2) % 12]; };

  var GOOD_SS = ['天乙贵人', '太极贵人', '天德贵人', '天德合', '月德贵人', '月德合', '文昌贵人', '国印贵人', '福星贵人', '禄神', '金舆', '学堂', '将星', '红鸾', '天喜', '天医', '天赦', '六秀日', '十灵日'];
  var BAD_SS = ['羊刃', '飞刃', '劫煞', '灾煞', '亡神', '孤辰', '寡宿', '元辰', '勾煞', '绞煞', '阴差阳错', '十恶大败', '孤鸾煞', '九丑', '天罗', '地网', '空亡', '丧门', '吊客', '披麻', '流霞'];
  function ssClass(n) { return GOOD_SS.indexOf(n) >= 0 ? 'j' : BAD_SS.indexOf(n) >= 0 ? 'x' : ''; }
  /** 可点开看原理的文字 */
  function xpt(key, html, cls) { return '<button type="button" class="xpt' + (cls ? ' ' + cls : '') + '" data-xp="' + esc(key) + '">' + html + '</button>'; }
  /** “为什么”小按钮 */
  function xpw(key, label) { return '<button type="button" class="xpw" data-xp="' + esc(key) + '">' + (label || '为什么') + '</button>'; }
  function relKey(r) { return 'rel|' + r.scope + '|' + r.type + '|' + (r.chars || []).join('|') + '|' + r.who.join(','); }

  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }
  function copyText(s) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(s).then(function () { toast('链接已复制'); }, function () { prompt('复制以下链接：', s); });
    } else prompt('复制以下链接：', s);
  }
  function store(key, val) {
    try {
      if (val === undefined) { var v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }

  /* ================= 主题 & 标签页 ================= */
  (function () {
    var t = store('xs.theme');
    if (t) document.documentElement.setAttribute('data-theme', t);
    $('#themeBtn').addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme');
      if (!cur) cur = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      var nx = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nx); store('xs.theme', nx);
    });
  })();
  function showTab(name) {
    $$('.tab').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === name ? 'true' : 'false'); });
    $$('main > section').forEach(function (s) { s.hidden = s.id !== 'tab-' + name; });
    if (name === 'records') renderRecords();
    if (name === 'almanac' && !almanacInit) initAlmanac();
    if (name === 'ziwei' && !zwState.res) { var cp = currentProfile(); if (cp) { setZiweiInput(cp.input); } runZiwei(); }
    window.scrollTo(0, 0);
  }
  $$('.tab').forEach(function (b) { b.addEventListener('click', function () { showTab(b.dataset.tab); }); });

  /* ================= 日期时间选择器 ================= */
  function opt(v, t, sel) { return '<option value="' + v + '"' + (sel ? ' selected' : '') + '>' + t + '</option>'; }
  var LUNAR_DAY = ['', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十', '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
  var LUNAR_MON = ['', '正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];

  function DTP(el, o) {
    o = o || {};
    var self = this; this.el = el; this.o = o; this.cal = 'solar'; this.onChange = null;
    var id = o.id;
    el.innerHTML = (o.lunar ? '<div class="seg" style="margin-bottom:6px" role="radiogroup" aria-label="历法">' +
      '<label><input type="radio" name="' + id + '-cal" value="solar" checked><span>公历</span></label>' +
      '<label><input type="radio" name="' + id + '-cal" value="lunar"><span>农历</span></label></div>' : '') +
      '<div class="dtp"><select class="y" aria-label="年"></select><select class="m" aria-label="月"></select><select class="d" aria-label="日"></select>' +
      '<select class="h" aria-label="时"></select><select class="mi" aria-label="分"></select></div><div class="hint dtp-hint"></div>';
    this.y = $('.y', el); this.m = $('.m', el); this.d = $('.d', el); this.h = $('.h', el); this.mi = $('.mi', el); this.hint = $('.dtp-hint', el);
    var ys = ''; for (var y = 1900; y <= 2100; y++) ys += opt(y, y + '年');
    this.y.innerHTML = ys;
    var hs = ''; for (var h = 0; h < 24; h++) hs += opt(h, pad(h) + '时 ' + HOUR_ZHI(h) + '时');
    this.h.innerHTML = hs;
    var ms = ''; for (var mi = 0; mi < 60; mi++) ms += opt(mi, pad(mi) + '分');
    this.mi.innerHTML = ms;
    $$('input[type=radio]', el).forEach(function (r) {
      r.addEventListener('change', function () { if (r.checked) self.switchCal(r.value); });
    });
    this.y.addEventListener('change', function () { self.fillMonths(); self.fillDays(); self.changed(); });
    this.m.addEventListener('change', function () { self.fillDays(); self.changed(); });
    [this.d, this.h, this.mi].forEach(function (s) { s.addEventListener('change', function () { self.changed(); }); });
    var t = todayParts();
    this.set({ calendar: 'solar', y: t.y, m: t.m, d: t.d, h: t.h, mi: t.mi });
  }
  DTP.prototype.fillMonths = function () {
    var y = +this.y.value, cur = this.m.value, s = '';
    if (this.cal === 'lunar') {
      var leap = LunarYear.fromYear(y).getLeapMonth();
      for (var m = 1; m <= 12; m++) {
        s += opt(m, LUNAR_MON[m] + '月');
        if (m === leap) s += opt(-m, '闰' + LUNAR_MON[m] + '月');
      }
    } else for (var k = 1; k <= 12; k++) s += opt(k, k + '月');
    this.m.innerHTML = s;
    if ($('option[value="' + cur + '"]', this.m)) this.m.value = cur; else if (+cur < 0) this.m.value = String(-cur);
  };
  DTP.prototype.fillDays = function () {
    var y = +this.y.value, m = +this.m.value, cur = +this.d.value || 1, n, s = '';
    if (this.cal === 'lunar') { n = LunarMonth.fromYm(y, m).getDayCount(); for (var i = 1; i <= n; i++) s += opt(i, LUNAR_DAY[i]); }
    else { n = SolarUtil.getDaysOfMonth(y, m); for (var j = 1; j <= n; j++) s += opt(j, j + '日'); }
    this.d.innerHTML = s;
    this.d.value = String(Math.min(cur, n));
  };
  DTP.prototype.get = function () {
    var m = +this.m.value;
    return { calendar: this.cal, y: +this.y.value, m: Math.abs(m), leap: m < 0, d: +this.d.value, h: +this.h.value, mi: +this.mi.value };
  };
  DTP.prototype.solar = function () {
    var v = this.get();
    if (v.calendar === 'lunar') return Lunar.fromYmdHms(v.y, v.leap ? -v.m : v.m, v.d, v.h, v.mi, 0).getSolar();
    return Solar.fromYmdHms(v.y, v.m, v.d, v.h, v.mi, 0);
  };
  DTP.prototype.set = function (v) {
    this.cal = v.calendar === 'lunar' && this.o.lunar ? 'lunar' : 'solar';
    var r = $('input[value="' + this.cal + '"]', this.el); if (r) r.checked = true;
    this.y.value = String(v.y);
    this.fillMonths();
    this.m.value = String(v.leap ? -v.m : v.m);
    if (!this.m.value) this.m.value = String(v.m);
    this.fillDays();
    this.d.value = String(v.d);
    this.h.value = String(v.h || 0); this.mi.value = String(v.mi || 0);
    this.changed(true);
  };
  DTP.prototype.switchCal = function (cal) {
    var s = this.solar();
    if (cal === 'lunar') {
      var l = s.getLunar();
      this.set({ calendar: 'lunar', y: l.getYear(), m: Math.abs(l.getMonth()), leap: l.getMonth() < 0, d: l.getDay(), h: s.getHour(), mi: s.getMinute() });
    } else this.set({ calendar: 'solar', y: s.getYear(), m: s.getMonth(), d: s.getDay(), h: s.getHour(), mi: s.getMinute() });
  };
  DTP.prototype.setNow = function () { var t = todayParts(); var s = Solar.fromYmdHms(t.y, t.m, t.d, t.h, t.mi, 0); this.setSolar(s); };
  DTP.prototype.setSolar = function (s) {
    if (this.cal === 'lunar') { var l = s.getLunar(); this.set({ calendar: 'lunar', y: l.getYear(), m: Math.abs(l.getMonth()), leap: l.getMonth() < 0, d: l.getDay(), h: s.getHour(), mi: s.getMinute() }); }
    else this.set({ calendar: 'solar', y: s.getYear(), m: s.getMonth(), d: s.getDay(), h: s.getHour(), mi: s.getMinute() });
  };
  DTP.prototype.changed = function (silent) {
    try {
      var s = this.solar(), l = s.getLunar();
      var txt = this.cal === 'lunar'
        ? '公历 ' + s.toYmd() + ' 星期' + s.getWeekInChinese()
        : '农历 ' + l.getYearInGanZhi() + '年 ' + l.getMonthInChinese() + '月' + l.getDayInChinese() + ' · 星期' + s.getWeekInChinese();
      this.hint.textContent = txt;
    } catch (e) { this.hint.textContent = ''; }
    if (this.onChange) this.onChange(silent);
  };

  /* ================= 出生地 / 真太阳时 ================= */
  var cityOpts = TU.CITIES.map(function (c) { return '<option value="' + c[0] + '">'; }).join('');
  document.body.insertAdjacentHTML('beforeend', '<datalist id="cityList">' + cityOpts + '</datalist>');
  function Loc(el, o) {
    o = o || {};
    var id = o.id, self = this; this.el = el;
    var tzs = ''; for (var z = -12; z <= 14; z++) tzs += opt(z, 'UTC' + (z >= 0 ? '+' : '') + z + (z === 8 ? '（北京时间）' : ''), z === 8);
    el.innerHTML = '<div class="form-grid" style="grid-template-columns:repeat(auto-fill,minmax(170px,1fr))">' +
      '<div class="field"><label for="' + id + '-city">' + (o.label || '出生地') + '（选城市自动填经度）</label><input type="text" id="' + id + '-city" list="cityList" placeholder="输入城市，如 上海"></div>' +
      '<div class="field"><label for="' + id + '-lon">经度（东经为正）</label><input type="number" id="' + id + '-lon" step="0.01" min="-180" max="180" placeholder="如 121.47"></div>' +
      '<div class="field"><label for="' + id + '-tz">时区</label><select id="' + id + '-tz">' + tzs + '</select></div>' +
      '<div class="field"><span class="lbl">校正</span><div class="row" style="gap:12px;min-height:36px">' +
      '<label class="check"><input type="checkbox" id="' + id + '-ts">真太阳时</label>' +
      '<label class="check"><input type="checkbox" id="' + id + '-dst">夏令时</label></div></div></div>' +
      '<div class="hint" id="' + id + '-loc-hint"></div>';
    this.city = $('#' + id + '-city'); this.lon = $('#' + id + '-lon'); this.tz = $('#' + id + '-tz');
    this.ts = $('#' + id + '-ts'); this.dst = $('#' + id + '-dst'); this.hintEl = $('#' + id + '-loc-hint');
    this.city.addEventListener('change', function () {
      var c = TU.CITIES.filter(function (x) { return x[0] === self.city.value.trim(); })[0];
      if (c) { self.lon.value = c[1]; self.tz.value = String(c[3]); self.ts.checked = true; }
      self.update();
    });
    [this.lon, this.tz, this.ts, this.dst].forEach(function (e) { e.addEventListener('change', function () { self.update(); }); });
  }
  Loc.prototype.get = function () {
    return { city: this.city.value.trim(), longitude: this.lon.value === '' ? null : +this.lon.value, tz: +this.tz.value, trueSolar: this.ts.checked, dst: this.dst.checked };
  };
  Loc.prototype.set = function (v) {
    this.city.value = v.city || ''; this.lon.value = v.longitude == null ? '' : v.longitude; this.tz.value = String(v.tz == null ? 8 : v.tz);
    this.ts.checked = !!v.trueSolar; this.dst.checked = !!v.dst; this.update();
  };
  Loc.prototype.checkDst = function (s) {
    var inDst = +this.tz.value === 8 && TU.inChinaDST(s.getYear(), s.getMonth(), s.getDay(), s.getHour());
    if (inDst && !this.dstAuto) { this.dst.checked = true; this.dstAuto = true; }
    if (!inDst && this.dstAuto) { this.dst.checked = false; this.dstAuto = false; }
    this.inDst = inDst; this.update();
  };
  Loc.prototype.update = function () {
    var msgs = [];
    if (this.inDst) msgs.push('该时间处于中国夏令时期间（1986–1991），当时钟表比标准时间快 1 小时。' + (this.dst.checked ? '已按夏令时扣除 1 小时，若输入的已是标准时间请取消勾选。' : '若输入的是当时的钟表时间，请勾选“夏令时”。'));
    if (this.ts.checked && this.lon.value === '') msgs.push('请填写经度，否则不做真太阳时校正。');
    this.hintEl.textContent = msgs.join(' ');
    this.hintEl.className = 'hint' + (msgs.length ? ' warn' : '');
  };

  /* ================= 八字 ================= */
  var bzDtp = new DTP($('[data-dtp="bz"]'), { id: 'bz', lunar: true });
  var bzLoc = new Loc($('[data-loc="bz"]'), { id: 'bz' });
  bzDtp.onChange = function () { try { bzLoc.checkDst(bzDtp.solar()); } catch (e) { } };
  bzDtp.set({ calendar: 'solar', y: 1990, m: 1, d: 1, h: 12, mi: 0 });
  var bzState = { res: null, sel: {} };

  function baziInput() {
    var v = bzDtp.get(), l = bzLoc.get();
    return {
      name: $('#bz-name').value.trim(), gender: +($('input[name=bz-gender]:checked').value),
      calendar: v.calendar, y: v.y, m: v.m, d: v.d, leap: v.leap, h: v.h, mi: v.mi,
      city: l.city, longitude: l.longitude, tz: l.tz, trueSolar: l.trueSolar && l.longitude != null, dst: l.dst,
      sect: +$('#bz-sect').value, yunSect: +$('#bz-yunsect').value
    };
  }
  function setBaziInput(inp) {
    $('#bz-name').value = inp.name || '';
    $$('input[name=bz-gender]').forEach(function (r) { r.checked = +r.value === (+inp.gender === 0 ? 0 : 1); });
    bzLoc.dstAuto = false;
    bzDtp.set({ calendar: inp.calendar, y: +inp.y, m: +inp.m, d: +inp.d, leap: inp.leap === true || inp.leap === 'true' || inp.leap === 1 || inp.leap === '1', h: +inp.h, mi: +inp.mi });
    bzLoc.set({ city: inp.city, longitude: inp.longitude === '' || inp.longitude == null ? null : +inp.longitude, tz: inp.tz == null || inp.tz === '' ? 8 : +inp.tz, trueSolar: !!inp.trueSolar && inp.trueSolar !== 'false' && inp.trueSolar !== '0', dst: !!inp.dst && inp.dst !== 'false' && inp.dst !== '0' });
    $('#bz-sect').value = String(+inp.sect === 2 ? 2 : 1);
    $('#bz-yunsect').value = String(+inp.yunSect === 2 ? 2 : 1);
  }

  function dynPillar(title, sub, gz, ctx, dayGan, pos) {
    var g = gz.charAt(0), z = gz.charAt(1);
    return {
      title: title, sub: sub, gan: g, zhi: z, ss: GZ.shiShen(dayGan, g),
      hide: GZ.HIDE[z].map(function (x) { return { gan: x, shishen: GZ.shiShen(dayGan, x) }; }),
      dishi: GZ.diShi(dayGan, z), zizuo: GZ.diShi(g, z), xunkong: GZ.xunKong(gz).join(''), nayin: GZ.naYin(gz),
      shensha: GZ.shenSha(g, z, pos, ctx), dyn: true
    };
  }

  function selectedCols(res) {
    var s = bzState.sel, cols = [];
    var dy = res.yun.daYun[s.dy];
    if (!dy) return cols;
    var ln = dy.liuNian[s.ln];
    if (dy.gz) cols.push(dynPillar('大运', dy.startAge + '岁 · ' + dy.startYear, dy.gz, res.ctx, res.dayGan, 4));
    else if (ln) {
      var xy = dy.xiaoYun.filter(function (x) { return x.year === ln.year; })[0];
      if (xy) cols.push(dynPillar('小运', xy.age + '岁', xy.gz, res.ctx, res.dayGan, 4));
    }
    if (ln) {
      cols.push(dynPillar('流年', ln.year + ' · ' + ln.age + '岁', ln.gz, res.ctx, res.dayGan, 5));
      if (s.ly != null) {
        var lys = Bazi.liuYue(ln.year, res.dayGan, res.ctx);
        var ly = lys[s.ly];
        if (ly) cols.push(dynPillar('流月', ly.jie + ' ' + ly.startYmd.slice(5), ly.gz, res.ctx, res.dayGan, 6));
      }
    }
    if (cols.length) cols[0].first = true;
    return cols;
  }

  function panTable(res) {
    var cols = res.pillars.map(function (p, i) {
      return {
        title: p.label, sub: i === 2 ? '日主' : '', gan: p.gan, zhi: p.zhi, ss: p.shishen, hide: p.hide, dishi: p.dishi, zizuo: p.zizuo,
        xunkong: p.xunkong, nayin: p.nayin, shensha: p.shensha, day: i === 2
      };
    }).concat(selectedCols(res));
    function cls(c) { return (c.dyn ? 'dyn' : '') + (c.first ? ' dyn-first' : ''); }
    var h = '<div class="pan-wrap"><table class="pan" style="min-width:' + (56 + cols.length * 74) + 'px"><colgroup><col style="width:52px">' + cols.map(function () { return '<col>'; }).join('') + '</colgroup><thead><tr><th></th>';
    cols.forEach(function (c) { h += '<th class="' + cls(c) + '">' + c.title + (c.sub ? '<small>' + esc(c.sub) + '</small>' : '<small>&nbsp;</small>') + '</th>'; });
    h += '</tr></thead><tbody>';
    function row(name, fn) {
      h += '<tr><th>' + name + '</th>';
      cols.forEach(function (c) { h += '<td class="' + cls(c) + '">' + fn(c) + '</td>'; });
      h += '</tr>';
    }
    row(xpt('term|十神', '主星'), function (c) { return '<span class="ss' + (c.day ? ' daymaster' : '') + '">' + (c.day ? xpt('term|十神', c.ss) : xpt('ss|' + c.ss, c.ss)) + '</span>'; });
    row('天干', function (c) { return '<div class="gz">' + col(c.gan) + '</div>'; });
    row('地支', function (c) { return '<div class="gz">' + col(c.zhi) + '</div>'; });
    row(xpt('term|藏干', '藏干'), function (c) { return '<div class="hide">' + c.hide.map(function (x) { return '<div>' + col(x.gan) + '<small>' + xpt('ss|' + x.shishen, x.shishen) + '</small></div>'; }).join('') + '</div>'; });
    row(xpt('cs|长生', '星运'), function (c) { return xpt('cs|' + c.dishi, c.dishi); });
    row(xpt('cs|长生', '自坐'), function (c) { return xpt('cs|' + c.zizuo, c.zizuo); });
    row(xpt('term|空亡', '空亡'), function (c) { return c.xunkong; });
    row(xpt('term|纳音', '纳音'), function (c) { return c.nayin; });
    row('神煞', function (c) { return '<div class="ssa">' + c.shensha.map(function (n) { return '<button type="button" class="xpt ' + ssClass(n) + '" data-xp="sha|' + n + '" title="' + esc(GZ.SHENSHA_INFO[n] || '') + '">' + n + '</button>'; }).join('') + '</div>'; });
    h += '</tbody></table></div>' + (cols.length > 4 ? '<p class="hint mobile-only">← 左右滑动查看运岁列 →</p>' : '');
    return h;
  }

  function relHtml(list) {
    if (!list.length) return '<p class="hint">无明显刑冲合会关系。</p>';
    return '<div class="rel-list">' + list.map(function (r) {
      return '<button type="button" class="rel t-' + r.type + '" data-xp="' + esc(relKey(r)) + '">' + esc(r.text) + '<small>' + r.who.join('·') + '</small></button>';
    }).join('') + '</div>';
  }

  function renderBazi(res) {
    var j = res.jieqi, w = res.wx, inp = res.input;
    var h = '';
    // 基本信息
    h += '<div class="card"><h2>' + (res.name ? esc(res.name) + ' · ' : '') + (res.gender === 1 ? '乾造' : '坤造') +
      '<span class="sub">' + res.pillars.map(function (p) { return p.gz; }).join(' ') + '</span></h2><div class="kv">';
    var inputText = inp.calendar === 'lunar' ? '农历 ' + inp.y + '年' + (inp.leap ? '闰' : '') + LUNAR_MON[inp.m] + '月' + LUNAR_DAY[inp.d] + ' ' + pad(inp.h) + ':' + pad(inp.mi) + '（公历 ' + res.inputSolar.slice(0, 16) + '）' : '公历 ' + res.inputSolar.slice(0, 16);
    h += '<div><b>出生时间</b><span>' + inputText + ' 星期' + Solar.fromYmd(+res.inputSolar.slice(0, 4), +res.inputSolar.slice(5, 7), +res.inputSolar.slice(8, 10)).getWeekInChinese() + '</span></div>';
    if (res.trueSolar || res.adjNotes.length) h += '<div><b>' + xpt('term|真太阳时', res.trueSolar ? '真太阳时' : '校正后') + '</b><span>' + res.solar.slice(0, 16) + '（' + res.adjNotes.join('，') + '）' + (inp.city ? ' · ' + esc(inp.city) : '') + '</span></div>';
    h += '<div><b>农历</b><span>' + res.lunarText + '</span></div>';
    h += '<div><b>生肖星座</b><span>属' + res.shengxiao + ' · ' + res.xingzuo + '座</span></div>';
    h += '<div><b>' + xpt('term|十神', '日主') + '</b><span>' + col(res.dayGan) + ' ' + res.dayWx + '（' + (GZ.isYang(res.dayGan) ? '阳' : '阴') + res.dayWx + '）· 日空 ' + res.pillars[2].xunkong + '</span></div>';
    h += '<div><b>' + xpt('term|大运', '节气') + '</b><span>生于' + j.prevJie + '后 ' + j.after + '，' + j.nextJie + '前 ' + j.before + '</span></div>';
    h += '<div><b>' + xpt('term|人元司令', '人元司令') + '</b><span>' + col(j.siling) + '（' + res.ctx.monthZhi + '月：' + j.silingTable.map(function (x) { return x[0] + x[1] + '日'; }).join(' ') + '）</span></div>';
    h += '<div><b>' + xpt('term|物候', '物候') + '</b><span>' + res.wuhou + '</span></div>';
    h += '</div><div class="chips" style="margin-top:10px">';
    [['胎元', res.extra.taiYuan], ['胎息', res.extra.taiXi], ['命宫', res.extra.mingGong], ['身宫', res.extra.shenGong]].forEach(function (x) {
      h += '<button type="button" class="chip" data-xp="term|' + (x[0] === '胎元' || x[0] === '胎息' ? '胎元' : '命宫') + '">' + x[0] + ' ' + gzHtml(x[1].gz) + ' <small>' + x[1].nayin + '</small></button>';
    });
    h += '<button type="button" class="chip gold" data-xp="ge|' + res.geju.name + '">' + res.geju.name + '</button>';
    res.geju.extra.forEach(function (e) { h += '<span class="chip gold">' + e + '</span>'; });
    h += '</div>' + jumpStrip('bazi') + '</div>';

    // 命盘
    h += '<div class="card"><h2>四柱命盘<span class="sub">虚线的字都可以点开看原理 · 点选大运流年可加入盘面</span></h2>' + panTable(res);
    h += '<h3>原局干支关系 <small class="hint">点击任一项，看它为什么成立、牵动了什么</small></h3>' + relHtml(res.relations);
    var dynRel = dynRelations(res);
    if (dynRel) h += '<h3>' + dynRel.title + '</h3>' + relHtml(dynRel.list);
    h += '</div>';

    // 大运流年
    h += '<div class="card" id="yunCard">' + yunHtml(res) + '</div>';

    // 五行 & 旺衰
    h += '<div class="grid2" style="margin-bottom:14px"><div class="card"><h2>五行力量<span class="sub">' + xpw('term|五行力量', '怎么算的') + '</span></h2><div class="wx-bars">';
    var maxp = Math.max.apply(null, GZ.WX.map(function (k) { return w.pct[k]; })) || 1;
    GZ.WX.forEach(function (k) {
      h += '<div class="wx-bar"><span class="name c-' + WXC[k] + '">' + k + '</span><div class="track"><div class="fill bg-' + WXC[k] + '" style="width:' + (w.pct[k] / maxp * 100) + '%"></div></div>' +
        '<span class="val">' + w.pct[k] + '% <small>' + w.wangXiang[k] + '</small></span></div>';
    });
    h += '</div><h3>个数统计</h3><div class="chips">';
    GZ.WX.forEach(function (k) { h += '<span class="chip">' + wxSpan(k) + ' 明 ' + w.count[k] + ' · 藏 ' + w.hideCount[k] + '</span>'; });
    h += '</div>';
    if (w.missing.length) h += '<p class="desc">八字天干地支中缺 ' + w.missing.map(wxSpan).join('、') + '（藏干中' + (w.missing.every(function (k) { return w.hideCount[k] === 0; }) ? '亦无' : '有') + '）。</p>';
    h += '<h3>十神力量</h3><div class="chips">';
    var tot = 0; Object.keys(w.lei).forEach(function (k) { tot += w.lei[k]; });
    ['比劫', '印枭', '食伤', '财才', '官杀'].forEach(function (k) { h += '<span class="chip">' + k + ' ' + (tot ? Math.round(w.lei[k] / tot * 100) : 0) + '%</span>'; });
    h += '</div><p class="note">算法：天干计 1，地支藏干按本气/中气/余气分配，月支 ×2、日支 ×1.2，再乘以月令旺相休囚死系数。</p></div>';

    h += '<div class="card"><h2>旺衰 · 格局 · 喜用<span class="sub">' + xpw('term|旺衰', '旺衰怎么判') + '</span></h2>';
    h += '<div class="row" style="justify-content:space-between"><span class="big-level">' + w.level + '</span><span class="chips">' +
      '<button type="button" data-xp="term|得令" class="chip ' + (w.deLing ? 'good' : '') + '">' + (w.deLing ? '得令' : '失令') + '</button>' +
      '<button type="button" data-xp="term|得地" class="chip ' + (w.deDi ? 'good' : '') + '">' + (w.deDi ? '得地' : '失地') + '</button>' +
      '<button type="button" data-xp="term|得势" class="chip ' + (w.deShi ? 'good' : '') + '">' + (w.deShi ? '得势' : '失势') + '</button></span></div>';
    h += '<div class="meter"><div class="needle" data-v="生扶 ' + w.ratio + '%" style="left:' + Math.max(0, Math.min(100, w.ratio)) + '%"></div></div>' +
      '<div class="meter-scale"><span>身弱</span><span>偏弱</span><span>中和</span><span>偏强</span><span>身旺</span></div>';
    h += '<h3>格局 ' + xpw('ge|' + res.geju.name) + '</h3><p class="desc"><b>' + res.geju.name + '</b> — ' + res.geju.basis + (res.geju.extra.length ? '；另见' + res.geju.extra.join('、') : '') + '</p>';
    h += '<h3>喜用神（参考） ' + xpw('term|喜用', '怎么定的') + '</h3><div class="chips">' + w.xi.map(function (x, i) { return '<span class="chip good">' + (i === 0 ? '用 ' : '喜 ') + wxSpan(x.wx) + ' ' + x.lei + '</span>'; }).join('') +
      w.ji.map(function (x) { return '<span class="chip bad">忌 ' + wxSpan(x.wx) + ' ' + x.lei + '</span>'; }).join('') + '</div>';
    h += '<p class="desc">' + w.reason + '</p><p class="desc">' + w.tiaohou + ' ' + xpw('term|调候', '调候') + '</p>';
    var xw = w.xi[0].wx, info = GZ.WX_INFO[xw];
    h += '<h3>开运参考（' + wxSpan(xw) + '） ' + xpw('term|开运', '怎么来的') + '</h3><div class="kv"><div><b>颜色</b><span>' + info.color + '</span></div><div><b>方位</b><span>' + info.dir + '方</span></div><div><b>数字</b><span>' + info.num + '</span></div><div><b>脏腑</b><span>' + info.organ + '（宜注意 ' + GZ.WX_INFO[w.ji[0].wx].organ + '）</span></div></div>';
    h += '<p class="note">旺衰与喜用按通用“扶抑 + 调候”法估算，复杂命局（从格、化格、专旺等）请结合人工判断。</p></div></div>';

    // 神煞详解
    var seen = {};
    res.pillars.forEach(function (p) { p.shensha.forEach(function (n) { (seen[n] = seen[n] || []).push(p.label); }); });
    h += '<div class="card"><h2>神煞详解</h2>';
    var names = Object.keys(seen);
    if (!names.length) h += '<p class="hint">原局无常见神煞。</p>';
    else h += '<div class="detail-grid">' + names.map(function (n) {
      return '<div class="detail-item"><div class="h"><span class="' + (ssClass(n) === 'j' ? 'luck-j' : ssClass(n) === 'x' ? 'luck-x' : '') + '">' + n + '</span><small>' + seen[n].join('、') + '</small>' + xpw('sha|' + n, '怎么查 · 为什么') + '</div><p>' + esc(GZ.SHENSHA_INFO[n] || '') + '</p></div>';
    }).join('') + '</div>';
    h += '</div>';

    // 十神释义
    h += '<div class="card"><h2>十神释义<span class="sub">' + xpw('term|十神', '十神是怎么来的') + '</span></h2><div class="detail-grid">';
    var present = {};
    res.pillars.forEach(function (p, i) { if (i !== 2) present[p.shishen] = 1; p.hide.forEach(function (x) { present[x.shishen] = 1; }); });
    Object.keys(GZ.SHISHEN_INFO).forEach(function (k) {
      h += '<div class="detail-item"' + (present[k] ? '' : ' style="opacity:.5"') + '><div class="h">' + k + '<small>' + GZ.shiShenWx(res.dayGan, k) + (present[k] ? ' · 命局可见' : ' · 命局不见') + '</small>' + xpw('ss|' + k, '详解') + '</div><p>' + GZ.SHISHEN_INFO[k] + '</p></div>';
    });
    h += '</div></div>';

    $('#baziResult').innerHTML = h;
  }

  function dynRelations(res) {
    var cols = selectedCols(res);
    if (!cols.length) return null;
    var items = res.pillars.map(function (p) { return { label: p.label, gan: p.gan, zhi: p.zhi }; });
    var dynLabels = cols.map(function (c) { return c.title; });
    cols.forEach(function (c) { items.push({ label: c.title, gan: c.gan, zhi: c.zhi }); });
    var list = GZ.analyzeRelations(items).filter(function (r) { return r.who.some(function (x) { return dynLabels.indexOf(x) >= 0; }); });
    return { title: dynLabels.join('、') + '与原局关系', list: list };
  }

  function yunHtml(res) {
    var y = res.yun, s = bzState.sel, nowY = new Date().getFullYear(), today = todayYmd();
    var h = '<h2>大运 · 流年 · 流月 · 流日<span class="sub">' + xpw('term|大运', (y.forward ? '顺排' : '逆排') + '，为什么') + '</span></h2>';
    h += '<p class="desc">出生后 <b>' + y.startYear + '</b> 年 <b>' + y.startMonth + '</b> 个月 <b>' + y.startDay + '</b> 天' + (y.startHour ? ' <b>' + y.startHour + '</b> 小时' : '') + '起运，于公历 <b>' + y.startSolar + '</b> 交运' + (y.jiaoYun ? '；' + y.jiaoYun : '') + '。</p>';
    h += '<div class="yun-sec-title"><b>大运</b><span>点击查看该运十年流年</span></div><div class="strip">';
    y.daYun.forEach(function (d, i) {
      var isNow = nowY >= d.startYear && nowY <= d.endYear;
      h += '<button type="button" class="yun-cell' + (isNow ? ' now' : '') + '" data-dy="' + i + '" aria-pressed="' + (s.dy === i) + '">' +
        '<div class="t">' + d.startAge + '–' + d.endAge + '岁</div>' +
        '<div class="g">' + (d.gz ? gzHtml(d.gz) : '<span style="font-size:15px">小运</span>') + '</div>' +
        '<div class="s">' + (d.gz ? d.ssGan + '·' + d.ssZhi : '起运前') + '</div><div class="t">' + d.startYear + '</div></button>';
    });
    h += '</div>';
    var dy = y.daYun[s.dy];
    if (dy) {
      h += '<div class="yun-sec-title"><b>' + xpt('term|流年', '流年') + '</b><span>' + (dy.gz ? dy.gz + '运 ' : '起运前 ') + dy.startYear + '–' + dy.endYear + '</span></div><div class="strip">';
      dy.liuNian.forEach(function (ln, i) {
        h += '<button type="button" class="yun-cell' + (ln.year === nowY ? ' now' : '') + '" data-ln="' + i + '" aria-pressed="' + (s.ln === i) + '">' +
          '<div class="t">' + ln.year + ' · ' + ln.age + '岁</div><div class="g">' + gzHtml(ln.gz) + '</div><div class="s">' + ln.ssGan + '·' + ln.ssZhi + '</div>' +
          (ln.taisui.length ? '<span class="flag">' + ln.taisui.map(function (t) { return t.replace('（本命年）', ''); }).join(' ') + '</span>' : '<span class="flag">&nbsp;</span>') + '</button>';
      });
      h += '</div>';
      var ln = dy.liuNian[s.ln];
      if (ln) {
        h += '<div class="kv" style="margin:4px 0 6px"><div><b>' + ln.year + '年</b><span>' + gzHtml(ln.gz) + ' ' + ln.nayin + ' · ' + ln.ssGan + '/' + ln.ssZhi + ' · 星运' + ln.dishi + '</span></div>' +
          '<div><b>' + xpt('term|流年', '太岁') + '</b><span>' + (ln.taisui.length ? ln.taisui.join('、') : '不犯太岁') + '</span></div>' +
          '<div><b>岁煞</b><span>' + (ln.shensha.length ? ln.shensha.map(function (n) { return xpt('sha|' + n, n, ssClass(n) === 'j' ? 'luck-j' : ssClass(n) === 'x' ? 'luck-x' : ''); }).join(' ') : '—') + '</span></div></div>';
        var lys = Bazi.liuYue(ln.year, res.dayGan, res.ctx);
        h += '<div class="yun-sec-title"><b>' + xpt('term|流月', '流月') + '</b><span>' + ln.year + '年（以节换月）</span></div><div class="strip">';
        lys.forEach(function (m, i) {
          var isNow = today >= m.startYmd && today < m.endYmd;
          h += '<button type="button" class="yun-cell' + (isNow ? ' now' : '') + '" data-ly="' + i + '" aria-pressed="' + (s.ly === i) + '">' +
            '<div class="t">' + m.jie + ' ' + m.startYmd.slice(5) + '</div><div class="g">' + gzHtml(m.gz) + '</div><div class="s">' + m.ssGan + '·' + m.ssZhi + '</div></button>';
        });
        h += '</div>';
        var ly = s.ly != null ? lys[s.ly] : null;
        if (ly) {
          var days = Bazi.liuRi(ly.startYmd, ly.endYmd, res.dayGan);
          h += '<div class="yun-sec-title"><b>流日</b><span>' + ly.gz + '月 ' + ly.startYmd + ' 至 ' + days[days.length - 1].ymd + '</span></div><div class="days">';
          days.forEach(function (d) {
            h += '<div class="day' + (d.ymd === today ? ' today' : '') + '"><div class="d">' + d.ymd.slice(5) + ' ' + d.week + (d.jieqi ? ' <span class="jq">' + d.jieqi + '</span>' : '') + '</div><div class="g">' + gzHtml(d.gz) + '</div><div>' + d.ssGan + '·' + d.ssZhi + '</div><div class="d">' + d.lunar + '</div></div>';
          });
          h += '</div>';
        }
      }
    }
    if (y.daYun[0] && y.daYun[0].xiaoYun.length && s.dy === 0) {
      h += '<p class="note">起运前以小运论：' + y.daYun[0].xiaoYun.map(function (x) { return x.year + ' ' + x.gz; }).join('，') + '。</p>';
    }
    return h;
  }

  function defaultSel(res) {
    var nowY = new Date().getFullYear(), today = todayYmd();
    var sel = { dy: 1, ln: 0, ly: null };
    res.yun.daYun.forEach(function (d, i) {
      if (nowY >= d.startYear && nowY <= d.endYear) {
        sel.dy = i;
        d.liuNian.forEach(function (ln, j) { if (ln.year === nowY) sel.ln = j; });
      }
    });
    var dy = res.yun.daYun[sel.dy];
    if (dy && dy.liuNian[sel.ln]) {
      var lys = Bazi.liuYue(dy.liuNian[sel.ln].year, res.dayGan, res.ctx);
      lys.forEach(function (m, i) { if (today >= m.startYmd && today < m.endYmd) sel.ly = i; });
    }
    return sel;
  }

  function runBazi(inp, keepSel) {
    try {
      var res = Bazi.compute(inp || baziInput());
      bzState.res = res;
      if (!keepSel) bzState.sel = defaultSel(res);
      renderBazi(res);
      return res;
    } catch (e) {
      console.error(e);
      $('#baziResult').innerHTML = '<div class="card"><p class="hint warn">排盘失败：' + esc(e.message) + '</p></div>';
    }
  }
  $('#baziForm').addEventListener('submit', function (e) {
    e.preventDefault(); var ip = baziInput();
    if (runBazi(ip)) rememberProfile(ip);
    var r = $('#baziResult'); if (r) r.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('#bz-now').addEventListener('click', function () { bzDtp.setNow(); });
  $('#bz-print').addEventListener('click', function () { if (!bzState.res) runBazi(); setTimeout(function () { window.print(); }, 50); });
  $('#baziResult').addEventListener('click', function (e) {
    if (e.target.closest('[data-xp]')) return;
    var b = e.target.closest('.yun-cell'); if (!b || !bzState.res) return;
    var s = bzState.sel;
    if (b.dataset.dy != null) { s.dy = +b.dataset.dy; s.ln = 0; s.ly = null; }
    else if (b.dataset.ln != null) { s.ln = +b.dataset.ln; s.ly = null; }
    else if (b.dataset.ly != null) { s.ly = s.ly === +b.dataset.ly ? null : +b.dataset.ly; }
    var sy = window.scrollY;
    renderBazi(bzState.res);
    window.scrollTo(0, sy);
  });

  function encodeParams(o) {
    return Object.keys(o).filter(function (k) { return o[k] !== '' && o[k] != null; }).map(function (k) {
      var v = o[k]; if (typeof v === 'boolean') v = v ? 1 : 0; return k + '=' + encodeURIComponent(v);
    }).join('&');
  }
  function decodeParams(s) {
    var o = {}; s.split('&').forEach(function (kv) { if (!kv) return; var i = kv.indexOf('='); o[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1)); });
    return o;
  }
  $('#bz-share').addEventListener('click', function () {
    var inp = baziInput();
    var url = location.href.split('#')[0] + '#bazi?' + encodeParams(inp);
    copyText(url);
  });

  /* ================= 档案 ================= */
  var REC_KEY = 'xs.records.v1';
  function records() { return store(REC_KEY) || []; }
  function saveRecords(a) { store(REC_KEY, a); }
  $('#bz-save').addEventListener('click', function () {
    var inp = baziInput();
    if (runBazi(inp, false)) { rememberProfile(inp, { manual: true }); toast('已保存到命例档案'); }
  });
  function renderRecords() {
    var q = ($('#rec-q').value || '').trim();
    var list = records().filter(function (r) { return !q || [r.name, r.bazi, r.note, r.solar].join(' ').indexOf(q) >= 0; });
    if (!list.length) { $('#recList').innerHTML = '<div class="empty">' + (q ? '没有匹配的命例' : '暂无档案。在八字或紫微里排一次盘，就会自动存到这里。') + '</div>'; return; }
    $('#recList').innerHTML = list.map(function (r) {
      return '<div class="rec" data-id="' + r.id + '"><div><div class="nm">' + esc(r.name || '未命名') + ' <span class="chip">' + (+r.gender === 1 ? '男' : '女') + '</span>' + (r.auto ? ' <span class="chip">自动保存</span>' : '') + '</div>' +
        '<div class="bz">' + r.bazi.split(' ').map(gzHtml).join(' ') + '</div><div class="meta">公历 ' + esc(r.solar) + (r.input.city ? ' · ' + esc(r.input.city) : '') + (r.note ? ' · ' + esc(r.note) : '') + '</div></div>' +
        '<div class="row rec-acts"><button class="btn sm primary" data-act="open">八字</button><button class="btn sm primary" data-act="ziwei">紫微</button><button class="btn sm" data-act="hha">合婚甲</button><button class="btn sm" data-act="hhb">合婚乙</button><button class="btn sm" data-act="qm">奇门年命</button><button class="btn sm" data-act="rename">改名</button><button class="btn sm" data-act="note">备注</button><button class="btn sm" data-act="del">删除</button></div></div>';
    }).join('');
  }
  $('#rec-q').addEventListener('input', renderRecords);
  $('#recList').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-act]'); if (!b) return;
    var id = b.closest('.rec').dataset.id, list = records(), r = list.filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    if (b.dataset.act === 'open') { applyProfile(r, { run: false }); showTab('bazi'); runBazi(r.input); }
    else if (b.dataset.act === 'ziwei') { applyProfile(r, { run: false }); showTab('ziwei'); runZiwei(r.input); }
    else if (b.dataset.act === 'hha' || b.dataset.act === 'hhb') { hhFill(b.dataset.act.slice(-1), r); showTab('hehun'); toast('已填入' + (b.dataset.act === 'hha' ? '甲方' : '乙方')); }
    else if (b.dataset.act === 'qm') { applyProfile(r, { run: false }); showTab('qimen'); runQimen(); toast('已标注年命 ' + r.bazi.split(' ')[0]); }
    else if (b.dataset.act === 'rename') { var nn = prompt('姓名：', r.name || ''); if (nn != null) { r.name = nn.trim(); r.input.name = r.name; r.auto = false; saveRecords(list); renderRecords(); refreshProfiles(); } }
    else if (b.dataset.act === 'del') { if (confirm('删除“' + (r.name || '未命名') + '”？')) { saveRecords(list.filter(function (x) { return x.id !== id; })); renderRecords(); refreshProfiles(); } }
    else if (b.dataset.act === 'note') { var n = prompt('备注：', r.note || ''); if (n != null) { r.note = n; saveRecords(list); renderRecords(); } }
  });
  $('#rec-export').addEventListener('click', function () {
    var fname = '命例档案-' + todayYmd() + '.json';
    var blob = new Blob([JSON.stringify(records(), null, 2)], { type: 'application/json' });
    // iPhone / iPad 上用系统分享面板（可存到“文件”、发微信、隔空投送），主屏幕模式下普通下载不可靠
    try {
      var f = new File([blob], fname, { type: 'application/json' });
      if (PWA.ios && navigator.canShare && navigator.canShare({ files: [f] })) {
        navigator.share({ files: [f], title: fname }).catch(function () { });
        return;
      }
    } catch (e) { }
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fname;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 100);
  });
  $('#rec-import').addEventListener('change', function () {
    var f = this.files[0]; if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var arr = JSON.parse(rd.result); if (!Array.isArray(arr)) throw new Error('格式不正确');
        var list = records(), ids = {}; list.forEach(function (x) { ids[x.id] = 1; });
        var n = 0; arr.forEach(function (x) { if (x && x.id && x.input && !ids[x.id]) { list.push(x); n++; } });
        saveRecords(list); renderRecords(); refreshProfiles(); toast('导入 ' + n + ' 条');
      } catch (err) { toast('导入失败：' + err.message); }
    };
    rd.readAsText(f);
    this.value = '';
  });

  /* ================= 奇门 ================= */
  var qmDtp = new DTP($('[data-dtp="qm"]'), { id: 'qm', lunar: false });
  var qmLoc = new Loc($('[data-loc="qm"]'), { id: 'qm', label: '起局地点' });
  qmDtp.onChange = function () { try { qmLoc.checkDst(qmDtp.solar()); } catch (e) { } };
  (function () {
    var s = '<option value="">不标注</option>';
    GZ.JIAZI.forEach(function (g) { s += opt(g, g + '年生'); });
    $('#qm-ming').innerHTML = s;
    var y = '<option value="">— 选择所测之事 —</option>';
    Object.keys(Qimen.YONGSHEN).forEach(function (k) { y += opt(k, k + '（' + Qimen.YONGSHEN[k].join('、') + '）'); });
    $('#qm-ys').innerHTML = y;
  })();
  var qmState = { res: null, sel: null };
  function qimenInput() {
    var v = qmDtp.get(), l = qmLoc.get();
    return { y: v.y, m: v.m, d: v.d, h: v.h, mi: v.mi, method: $('#qm-method').value, birthGz: $('#qm-ming').value, city: l.city, longitude: l.longitude, tz: l.tz, trueSolar: l.trueSolar && l.longitude != null, dst: l.dst };
  }
  var JI_GOD = ['值符', '太阴', '六合', '九地', '九天'];
  function starCls(s) { var i = Qimen.STAR_INFO[s]; return i && i[0].indexOf('吉') >= 0 ? 'j' : i && i[0].indexOf('凶') >= 0 ? 'x' : ''; }
  function doorCls(d) { var i = Qimen.DOOR_INFO[d]; return i && i[0] === '吉' ? 'j' : i && i[0] === '凶' ? 'x' : ''; }
  function stemsHtml(arr) { return arr.map(function (s, i) { return i ? '<small>' + col(s) + '</small>' : col(s); }).join(''); }

  function renderQimen(r) {
    var h = '<div class="qm-layout"><div>';
    h += '<div class="card"><div class="qm-head">';
    [['年', r.gz.year, r.kongs.year], ['月', r.gz.month, r.kongs.month], ['日', r.gz.day, r.kongs.day], ['时', r.gz.hour, r.kongs.hour]].forEach(function (x) {
      h += '<div class="pz"><div class="l">' + x[0] + '柱</div><div class="g">' + gzHtml(x[1]) + '</div><div class="k">空 ' + x[2] + '</div></div>';
    });
    h += '</div><div class="kv" style="margin-bottom:12px">' +
      '<div><b>时间</b><span>' + r.solar + ' 星期' + r.week + (r.trueSolar || r.adjNotes.length ? '（钟表 ' + r.clock + '，' + r.adjNotes.join('，') + '）' : '') + '</span></div>' +
      '<div><b>农历</b><span>' + r.lunarText + '</span></div>' +
      '<div><b>' + xpt('qm|定局法', '节气') + '</b><span>' + r.term + (r.method === 'chaibu' ? '（' + r.termTime.slice(0, 16) + '）' : '') + '</span></div>' +
      '<div><b>' + xpt('qm|总览', '局数') + '</b><span><b style="color:var(--accent)">' + r.juText + '</b> · ' + r.yuan + ' · ' + r.methodName + '</span></div>' +
      '<div><b>' + xpt('qm|定局法', '定局') + '</b><span>' + r.status + '</span></div>' +
      '<div><b>旬首</b><span>' + r.xunShou + '（遁' + r.xunYi + '）</span></div>' +
      '<div><b>' + xpt('qm|总览', '值符') + '</b><span>' + r.zhiFu + ' 落' + Qimen.PALACE[r.zhiFuLand].name + r.zhiFuLand + '宫</span></div>' +
      '<div><b>' + xpt('qm|总览', '值使') + '</b><span>' + r.zhiShi + ' 落' + Qimen.PALACE[r.zhiShiPalace].name + r.zhiShiPalace + '宫</span></div>' +
      '<div><b>' + xpt('term|空亡', '空亡') + '</b><span>时空 ' + r.hourKong + ' · 驿马 ' + r.maZhi + '（' + Qimen.PALACE[r.maPalace].name + '宫）</span></div>' +
      '</div>';
    // 九宫盘
    var hl = yongShenPalaces(r);
    h += '<div class="board">';
    [4, 9, 2, 3, 5, 7, 8, 1, 6].forEach(function (n) {
      var P = r.palaces[n];
      if (n === 5) {
        h += '<div class="gong center"><div class="foot">中五宫</div><div class="ju">' + r.juText + '</div><div class="foot">' + r.yuan + '</div><div class="stem earth">' + col(P.earth[0]) + '</div><div class="foot">地盘（寄坤二）</div></div>';
        return;
      }
      var mk = '';
      P.marks.forEach(function (m) { mk += '<span class="mk ' + (m === '空' ? 'kong' : 'ma') + '">' + m + '</span>'; });
      Object.keys(r.markers).forEach(function (k) { if (r.markers[k] === n) mk += '<span class="mk ' + (k === '日干' ? 'ri' : k === '时干' ? 'shi' : 'ming') + '">' + k.charAt(0) + '</span>'; });
      var flags = P.patterns.filter(function (p) { return p.name !== '旬空' && p.name !== '驿马'; }).slice(0, 3).map(function (p) {
        return '<i class="' + (p.level === '吉' ? 'j' : p.level === '凶' ? 'x' : 'p') + '">' + p.name.replace(/（.*）/, '') + '</i>';
      }).join('');
      h += '<div class="gong' + (qmState.sel === n ? ' sel' : '') + (hl.indexOf(n) >= 0 ? ' hl' : '') + '" data-p="' + n + '" tabindex="0" role="button" aria-label="' + P.info.name + '宫">' +
        '<div class="r"><span class="god ' + (JI_GOD.indexOf(P.god) >= 0 ? 'j' : 'x') + '">' + P.god + '</span><span class="marks">' + mk + '</span></div>' +
        '<div class="r"><span class="star ' + starCls(P.stars[0]) + '">' + P.stars.map(function (s, i) { return i ? '<small>' + s.slice(1) + '</small>' : s; }).join('') + '<small>' + (P.starStates[0] || '') + '</small></span><span class="stem heaven">' + stemsHtml(P.heaven) + '</span></div>' +
        '<div class="r"><span class="door ' + doorCls(P.door) + '">' + P.door + '<small>' + (P.doorState || '') + '</small></span><span class="stem earth">' + stemsHtml(P.earth.concat(P.earthJi ? [P.earthJi] : [])) + '</span></div>' +
        '<div class="r foot"><span>暗' + (P.hidden || '') + '</span><span>' + P.info.gua + ' ' + P.info.name + n + ' · ' + P.info.dir + '</span></div>' +
        '<div class="flags">' + flags + '</div></div>';
    });
    h += '</div><p class="qm-how">' + xpw('qm|总览', '这一局是怎么一步步排出来的') + ' ' + xpw('qm|旺衰', '星门旺衰') + ' ' + xpw('qm|用神', '用神') + '</p><div class="legend"><span>上：八神 · 标记</span><span>中：九星（旺衰）· 天盘干</span><span>下：八门（旺衰）· 地盘干</span><span>底：暗干 · 宫位</span><span>日/时/年 = 日干、时干、年命落宫</span></div>';
    if (hl.length) h += '<p class="desc" style="margin-top:8px">用神「' + esc($('#qm-ys').value) + '」所在：' + hl.map(function (n) { return Qimen.PALACE[n].name + n + '宫'; }).join('、') + '（金框标出）</p>';
    h += '</div></div>';

    // 右侧：宫位详解 + 格局
    h += '<div><div class="card" id="qmDetail">' + palaceDetail(r, qmState.sel || r.zhiFuLand) + '</div>';
    h += '<div class="card"><h2>格局汇总<span class="sub">点击格局名看成立条件和出处</span></h2>';
    var all = [];
    r.patterns.forEach(function (p) { all.push({ p: p, where: '全局' }); });
    [1, 8, 3, 4, 9, 2, 7, 6].forEach(function (n) {
      r.palaces[n].patterns.forEach(function (p) { if (p.name !== '旬空' && p.name !== '驿马') all.push({ p: p, where: Qimen.PALACE[n].name + n + '宫' }); });
    });
    if (!all.length) h += '<p class="hint">无特殊格局。</p>';
    all.sort(function (a, b) { var o = { '吉': 0, '凶': 1, '平': 2 }; return o[a.p.level] - o[b.p.level]; });
    all.forEach(function (x) { h += '<div class="pat"><span class="n">' + xpt('qmp|' + x.p.name, esc(x.p.name)) + '</span><span class="lv ' + x.p.level + '">' + x.p.level + '</span> <small class="hint">' + x.where + '</small><p>' + esc(x.p.desc) + '</p></div>'; });
    h += '</div></div></div>';
    $('#qimenResult').innerHTML = h;
  }

  function yongShenPalaces(r) {
    var k = $('#qm-ys').value; if (!k) return [];
    var toks = Qimen.YONGSHEN[k], out = [];
    function add(n) { if (n && out.indexOf(n) < 0) out.push(n); }
    toks.forEach(function (t) {
      if (t === '日干' || t === '时干') add(r.markers[t]);
      else if (t === '驿马') add(r.maPalace);
      else for (var n = 1; n <= 9; n++) {
        if (n === 5) continue;
        var P = r.palaces[n];
        if (P.door === t || P.god === t || P.stars.indexOf(t) >= 0 || P.heaven.indexOf(t) >= 0) add(n);
      }
    });
    return out;
  }

  function palaceDetail(r, n) {
    var P = r.palaces[n];
    if (!P || n === 5) return '<h2>宫位详解</h2><p class="hint">点击九宫中的任一宫查看详解。</p>';
    var h = '<h2>' + P.info.name + n + '宫 · ' + P.info.dir + '<span class="sub">' + P.info.wx + ' · ' + P.info.zhi.join('') + '</span></h2><div class="detail-grid">';
    var gi = Qimen.GOD_INFO[P.god];
    h += '<div class="detail-item"><div class="h">八神 ' + xpt('qmg|' + P.god, P.god) + '<small>' + gi[0] + '</small></div><p>' + gi[1] + '</p></div>';
    P.stars.forEach(function (s, i) {
      var si = Qimen.STAR_INFO[s];
      h += '<div class="detail-item"><div class="h"><span class="' + (si[0].indexOf('吉') >= 0 ? 'luck-j' : 'luck-x') + '">' + xpt('qms|' + s, s) + '</span><small>' + si[0] + ' · ' + si[1] + ' · ' + (P.starStates[i] || '') + (i === 0 && P.starRel ? ' · ' + P.starRel : '') + '</small></div><p>' + si[2] + '</p></div>';
    });
    var di = Qimen.DOOR_INFO[P.door];
    h += '<div class="detail-item"><div class="h"><span class="' + (di[0] === '吉' ? 'luck-j' : di[0] === '凶' ? 'luck-x' : '') + '">' + xpt('qmd|' + P.door, P.door) + '</span><small>' + di[0] + ' · ' + di[1] + ' · ' + (P.doorState || '') + ' · ' + (P.doorRel || '') + '</small></div><p>' + di[2] + '</p></div>';
    h += '<div class="detail-item"><div class="h">天盘 ' + stemsHtml(P.heaven) + ' / 地盘 ' + stemsHtml(P.earth.concat(P.earthJi ? [P.earthJi] : [])) + ' / 暗干 ' + (P.hidden ? col(P.hidden) : '') + '</div>';
    var marks = [];
    Object.keys(r.markers).forEach(function (k) { if (r.markers[k] === n) marks.push(k + '落此宫'); });
    if (marks.length) h += '<p>' + marks.join('，') + '。</p>';
    h += '</div>';
    if (P.patterns.length) {
      h += '<div>' + P.patterns.map(function (p) { return '<div class="pat"><span class="n">' + xpt('qmp|' + p.name, esc(p.name)) + '</span><span class="lv ' + p.level + '">' + p.level + '</span><p>' + esc(p.desc) + '</p></div>'; }).join('') + '</div>';
    }
    h += '</div>';
    return h;
  }

  function runQimen() {
    try {
      var inp = qimenInput();
      qmState.res = Qimen.compute(inp);
      renderQimen(qmState.res);
    } catch (e) {
      console.error(e);
      $('#qimenResult').innerHTML = '<div class="card"><p class="hint warn">起局失败：' + esc(e.message) + '</p></div>';
    }
  }
  $('#qimenForm').addEventListener('submit', function (e) { e.preventDefault(); qmState.sel = null; runQimen(); });
  $('#qm-now').addEventListener('click', function () { qmDtp.setNow(); qmState.sel = null; runQimen(); });
  function shiftQm(hours) {
    var s = qmDtp.solar();
    var dt = TU.addMinutes(TU.mk(s.getYear(), s.getMonth(), s.getDay(), s.getHour(), s.getMinute()), hours * 60);
    var p = TU.parts(dt);
    qmDtp.set({ calendar: 'solar', y: p.y, m: p.m, d: p.d, h: p.h, mi: p.mi });
    runQimen();
  }
  $('#qm-prev').addEventListener('click', function () { shiftQm(-2); });
  $('#qm-next').addEventListener('click', function () { shiftQm(2); });
  ['#qm-method', '#qm-ming', '#qm-ys'].forEach(function (s) { $(s).addEventListener('change', function () { if (qmState.res) runQimen(); }); });
  $('#qimenResult').addEventListener('click', function (e) {
    if (e.target.closest('[data-xp]')) return;
    var g = e.target.closest('.gong[data-p]'); if (!g || !qmState.res) return;
    qmState.sel = +g.dataset.p;
    $$('.gong.sel').forEach(function (x) { x.classList.remove('sel'); }); g.classList.add('sel');
    $('#qmDetail').innerHTML = palaceDetail(qmState.res, qmState.sel);
    if (window.innerWidth < 900) $('#qmDetail').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('#qimenResult').addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('gong')) { e.preventDefault(); e.target.click(); }
  });
  $('#qm-share').addEventListener('click', function () {
    var inp = qimenInput();
    copyText(location.href.split('#')[0] + '#qimen?' + encodeParams(inp));
  });

  /* ================= 黄历 ================= */
  var almanacInit = false, cal = { y: 0, m: 0, sel: '' };
  var ZR_EVENTS = ['嫁娶', '纳采', '订盟', '入宅', '移徙', '开市', '交易', '立券', '纳财', '出行', '赴任', '动土', '修造', '破土', '上梁', '安床', '作灶', '祭祀', '祈福', '求嗣', '开光', '求医', '治病', '入学', '理发', '栽种', '安葬', '会亲友', '词讼', '解除'];
  function initAlmanac() {
    almanacInit = true;
    var t = todayParts(); cal.y = t.y; cal.m = t.m; cal.sel = todayYmd();
    $('#zr-event').innerHTML = ZR_EVENTS.map(function (e) { return opt(e, e); }).join('');
    $('#zr-sx').innerHTML = GZ.SHENGXIAO.map(function (s) { return opt(s, s); }).join('');
    var cp = currentProfile();
    if (cp) { try { $('#zr-sx').value = Bazi.compute(cp.input).shengxiao; } catch (e) { } }
    renderCal(); renderAlmanac(cal.sel);
  }
  function renderCal() {
    var first = Solar.fromYmd(cal.y, cal.m, 1);
    var startW = first.getWeek(); // 0=日
    var n = SolarUtil.getDaysOfMonth(cal.y, cal.m);
    var today = todayYmd();
    var lm = first.getLunar();
    var h = '<div class="cal-head"><button class="btn sm" data-cal="-12" aria-label="上一年">«</button><button class="btn sm" data-cal="-1" aria-label="上个月">‹</button>' +
      '<div class="title">' + cal.y + '年' + cal.m + '月</div><button class="btn sm" data-cal="1" aria-label="下个月">›</button><button class="btn sm" data-cal="12" aria-label="下一年">»</button>' +
      '<button class="btn sm" data-cal="0">今天</button><span class="hint">' + lm.getYearInGanZhi() + '年 属' + lm.getYearShengXiao() + '</span></div>';
    h += '<div class="cal">' + '日一二三四五六'.split('').map(function (w) { return '<div class="wd">' + w + '</div>'; }).join('');
    var s = first.next(-startW);
    for (var i = 0; i < 42; i++) {
      if (i >= 35 && s.getMonth() !== cal.m) break;
      var l = s.getLunar(), ymd = s.toYmd();
      var fest = l.getJieQi() || (l.getFestivals()[0]) || (s.getFestivals()[0]) || '';
      var lab = fest || (l.getDay() === 1 ? (l.getMonth() < 0 ? '闰' : '') + l.getMonthInChinese() + '月' : l.getDayInChinese());
      var w = s.getWeek();
      h += '<div class="cd' + (s.getMonth() !== cal.m ? ' other' : '') + (ymd === today ? ' today' : '') + (ymd === cal.sel ? ' sel' : '') + (w === 0 || w === 6 ? ' we' : '') + '" data-ymd="' + ymd + '" role="button" tabindex="0">' +
        '<div class="n">' + s.getDay() + '</div><div class="l' + (fest ? ' f' : '') + '">' + lab + '</div></div>';
      s = s.next(1);
    }
    h += '</div>';
    $('#calCard').innerHTML = h;
  }
  $('#calCard').addEventListener('click', function (e) {
    var b = e.target.closest('[data-cal]');
    if (b) {
      var d = +b.dataset.cal;
      if (d === 0) { var t = todayParts(); cal.y = t.y; cal.m = t.m; cal.sel = todayYmd(); renderAlmanac(cal.sel); }
      else { var mm = cal.y * 12 + cal.m - 1 + d; cal.y = Math.floor(mm / 12); cal.m = mm % 12 + 1; }
      if (cal.y < 1900) { cal.y = 1900; cal.m = 1; } if (cal.y > 2100) { cal.y = 2100; cal.m = 12; }
      renderCal(); return;
    }
    var c = e.target.closest('.cd'); if (!c) return;
    cal.sel = c.dataset.ymd;
    var p = cal.sel.split('-').map(Number);
    if (p[1] !== cal.m) { cal.y = p[0]; cal.m = p[1]; }
    renderCal(); renderAlmanac(cal.sel);
  });
  $('#calCard').addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('cd')) { e.preventDefault(); e.target.click(); } });

  function renderAlmanac(ymd) {
    var p = ymd.split('-').map(Number);
    var s = Solar.fromYmd(p[0], p[1], p[2]), l = s.getLunar();
    var fests = [].concat(l.getFestivals(), s.getFestivals(), l.getOtherFestivals ? l.getOtherFestivals() : [], s.getOtherFestivals ? s.getOtherFestivals() : []);
    var jq = l.getJieQi();
    var h = '<div class="almanac-top"><div class="big">' + p[2] + '</div><div><div class="t1">' + l.getMonthInChinese() + '月' + l.getDayInChinese() + '</div>' +
      '<div class="t2">' + ymd + ' 星期' + s.getWeekInChinese() + ' · ' + s.getXingZuo() + '座</div>' +
      '<div class="t2">' + l.getYearInGanZhi() + '年【属' + l.getYearShengXiao() + '】 ' + l.getMonthInGanZhi() + '月 ' + l.getDayInGanZhi() + '日</div>' +
      ((jq || fests.length) ? '<div class="chips" style="margin-top:4px">' + (jq ? '<span class="chip solid">' + jq + '</span>' : '') + fests.map(function (f) { return '<span class="chip gold">' + esc(f) + '</span>'; }).join('') + '</div>' : '') + '</div></div>';
    h += '<div class="yiji"><div class="yi"><div class="hd">宜</div><div class="bd">' + (l.getDayYi().join(' ') || '—') + '</div></div><div class="ji"><div class="hd">忌</div><div class="bd">' + (l.getDayJi().join(' ') || '—') + '</div></div></div>';
    var shu = l.getShuJiu && l.getShuJiu(), fu = l.getFu && l.getFu();
    h += '<div class="kv">' +
      '<div><b>值神</b><span class="' + (l.getDayTianShenType() === '黄道' ? 'luck-j' : 'luck-x') + '">' + l.getDayTianShen() + '（' + l.getDayTianShenType() + ' · ' + l.getDayTianShenLuck() + '）</span></div>' +
      '<div><b>建除</b><span>' + l.getZhiXing() + '日</span></div>' +
      '<div><b>冲煞</b><span>冲' + l.getDayChongDesc() + ' 煞' + l.getDaySha() + '</span></div>' +
      '<div><b>星宿</b><span>' + l.getXiu() + l.getZheng() + l.getAnimal() + '（' + l.getXiuLuck() + '）</span></div>' +
      '<div><b>纳音</b><span>' + l.getDayNaYin() + '</span></div>' +
      '<div><b>九星</b><span>' + l.getDayNineStar().toString() + '</span></div>' +
      '<div><b>胎神</b><span>' + l.getDayPositionTai() + '</span></div>' +
      '<div><b>彭祖百忌</b><span>' + l.getPengZuGan() + '；' + l.getPengZuZhi() + '</span></div>' +
      '<div><b>喜神</b><span>' + l.getDayPositionXiDesc() + '</span></div>' +
      '<div><b>财神</b><span>' + l.getDayPositionCaiDesc() + '</span></div>' +
      '<div><b>福神</b><span>' + l.getDayPositionFuDesc() + '</span></div>' +
      '<div><b>贵神</b><span>阳 ' + l.getDayPositionYangGuiDesc() + ' · 阴 ' + l.getDayPositionYinGuiDesc() + '</span></div>' +
      '<div><b>物候</b><span>' + l.getHou() + ' ' + l.getWuHou() + '</span></div>' +
      '<div><b>月相</b><span>' + l.getYueXiang() + '</span></div>' +
      (shu ? '<div><b>数九</b><span>' + shu.toFullString() + '</span></div>' : '') +
      (fu ? '<div><b>三伏</b><span>' + fu.toFullString() + '</span></div>' : '') +
      '<div><b>岁空</b><span>' + l.getYearXunKong() + ' · 月空 ' + l.getMonthXunKong() + ' · 日空 ' + l.getDayXunKong() + '</span></div>' +
      '</div>';
    h += '<h3>吉神宜趋</h3><p class="desc">' + (l.getDayJiShen().join(' ') || '—') + '</p><h3>凶煞宜忌</h3><p class="desc">' + (l.getDayXiongSha().join(' ') || '—') + '</p>';
    $('#almanacDetail').innerHTML = h;

    var t = '<h2>时辰吉凶<span class="sub">' + ymd + '</span></h2><div class="tbl-wrap"><table class="simple"><thead><tr><th>时辰</th><th>时间</th><th>值神</th><th>吉凶</th><th>冲煞</th><th>宜</th><th>忌</th></tr></thead><tbody>';
    l.getTimes().forEach(function (tm, i) {
      if (i === 12) return; // 晚子时与早子时重复
      var lk = tm.getTianShenLuck();
      t += '<tr><td><b>' + gzHtml(tm.getGanZhi()) + '</b>' + (i === 0 ? '<small class="hint">（早子）</small>' : '') + '</td><td>' + tm.getMinHm() + '–' + tm.getMaxHm() + '</td><td>' + tm.getTianShen() + '</td><td class="' + (lk === '吉' ? 'luck-j' : 'luck-x') + '">' + lk + '</td><td>冲' + tm.getChongDesc() + ' 煞' + tm.getSha() + '</td><td>' + tm.getYi().join(' ') + '</td><td>' + tm.getJi().join(' ') + '</td></tr>';
    });
    t += '</tbody></table></div>';
    $('#almanacTimes').innerHTML = t;
  }
  $('#zr-go').addEventListener('click', function () {
    var ev = $('#zr-event').value, days = +$('#zr-days').value, hd = $('#zr-huangdao').checked, av = $('#zr-chong').checked, sx = $('#zr-sx').value;
    var p = cal.sel.split('-').map(Number), s = Solar.fromYmd(p[0], p[1], p[2]);
    var rows = [];
    for (var i = 0; i < days; i++) {
      var l = s.getLunar();
      if (l.getDayYi().indexOf(ev) >= 0 && (!hd || l.getDayTianShenType() === '黄道') && (!av || l.getDayChongShengXiao() !== sx)) {
        rows.push('<tr data-ymd="' + s.toYmd() + '" style="cursor:pointer"><td><b>' + s.toYmd() + '</b> 周' + s.getWeekInChinese() + '</td><td>' + l.getMonthInChinese() + '月' + l.getDayInChinese() + '</td><td>' + gzHtml(l.getDayInGanZhi()) + '日</td><td>' + l.getDayTianShen() + '（' + l.getDayTianShenType() + '）</td><td>' + l.getZhiXing() + '</td><td>冲' + l.getDayChongDesc() + '</td></tr>');
      }
      s = s.next(1);
    }
    $('#zrResult').innerHTML = rows.length ? '<p class="hint">共 ' + rows.length + ' 天宜「' + ev + '」，点击行查看当日黄历。</p><div class="tbl-wrap"><table class="simple"><thead><tr><th>日期</th><th>农历</th><th>干支</th><th>值神</th><th>建除</th><th>冲煞</th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div>' : '<p class="hint">所选范围内没有符合条件的日子，可扩大范围或放宽筛选。</p>';
  });
  $('#zrResult').addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-ymd]'); if (!tr) return;
    cal.sel = tr.dataset.ymd; var p = cal.sel.split('-').map(Number); cal.y = p[0]; cal.m = p[1];
    renderCal(); renderAlmanac(cal.sel); $('#calCard').scrollIntoView({ behavior: 'smooth' });
  });

  /* ================= 合婚 ================= */
  var hhA = new DTP($('[data-dtp="hha"]'), { id: 'hha', lunar: true });
  var hhB = new DTP($('[data-dtp="hhb"]'), { id: 'hhb', lunar: true });
  hhA.set({ calendar: 'solar', y: 1990, m: 1, d: 1, h: 12, mi: 0 });
  hhB.set({ calendar: 'solar', y: 1992, m: 1, d: 1, h: 12, mi: 0 });
  // 从命例带来的地点、真太阳时等；手动改时间后作废
  var hhMeta = { a: null, b: null };
  hhA.onChange = function (silent) { if (!silent) { hhMeta.a = null; $('#hh-a-pick').value = ''; } };
  hhB.onChange = function (silent) { if (!silent) { hhMeta.b = null; $('#hh-b-pick').value = ''; } };
  function hhSide(sd) {
    var dt = sd === 'a' ? hhA : hhB, v = dt.get(), m = hhMeta[sd];
    if (m) ['city', 'longitude', 'tz', 'trueSolar', 'dst', 'sect', 'yunSect'].forEach(function (k) { if (m[k] != null) v[k] = m[k]; });
    v.gender = +($('input[name=hh-' + sd + '-gender]:checked').value);
    v.name = $('#hh-' + sd + '-name').value.trim();
    return v;
  }
  $('#hehunForm').addEventListener('submit', function (e) {
    e.preventDefault();
    try {
      var va = hhSide('a'), vb = hhSide('b');
      var a = Bazi.compute(va), b = Bazi.compute(vb);
      var r = Bazi.heHun(a, b);
      function mini(x, who) {
        return '<div style="text-align:center"><div class="hint">' + who + (x.name ? ' · ' + esc(x.name) : '') + ' · ' + (x.gender === 1 ? '男' : '女') + ' · 属' + x.shengxiao + '</div><div class="mini-pan">' +
          x.pillars.map(function (p) { return '<div>' + col(p.gan) + '<br>' + col(p.zhi) + '<small>' + p.label.charAt(0) + '</small></div>'; }).join('') + '</div>' +
          '<div class="hint" style="margin-top:4px">' + x.dayGan + x.dayWx + '日主 · ' + x.wx.level + ' · 喜' + x.wx.xi.map(function (q) { return q.wx; }).join('') + '</div></div>';
      }
      var sum = 0; r.items.forEach(function (it) { sum += it.delta; });
      var h = '<div class="card"><h2>合婚结果<span class="sub">' + xpt('hhall|', '这个分数怎么算出来的') + '</span></h2><div class="grid2 hh-top" style="grid-template-columns:1fr auto 1fr;align-items:center;gap:10px">' + mini(a, '甲方') +
        '<div><div class="score-ring" style="--v:' + r.score + '"><div><div><b>' + r.score + '</b><br><small class="hint">' + r.grade + '</small></div></div></div></div>' + mini(b, '乙方') + '</div>';
      h += '<div class="hh-formula">基准 60 ' + r.items.filter(function (it) { return it.delta; }).map(function (it) { return '<span class="' + (it.delta > 0 ? 'delta-p' : 'delta-n') + '">' + (it.delta > 0 ? '+ ' : '− ') + Math.abs(it.delta) + '</span>'; }).join(' ') + ' = <b>' + r.raw + '</b>' + (r.raw !== r.score ? '（限制到 30–99 → ' + r.score + '）' : '') + '</div>';
      h += '<div class="tbl-wrap" style="margin-top:6px"><table class="simple hh-table"><thead><tr><th>项目</th><th>分析</th><th>评分</th><th></th></tr></thead><tbody>';
      r.items.forEach(function (it, i) {
        h += '<tr><td>' + it.cat + '</td><td>' + esc(it.text) + '</td><td class="' + (it.delta > 0 ? 'delta-p' : it.delta < 0 ? 'delta-n' : 'delta-z') + '">' + (it.delta > 0 ? '+' : '') + it.delta + '</td><td><button type="button" class="btn sm hh-why" data-i="' + i + '" aria-expanded="false">为什么</button></td></tr>';
        h += '<tr class="hh-exp" id="hh-exp-' + i + '" hidden><td colspan="4"><div class="xcalc">' + esc(it.calc) + '</div><p class="desc">' + HH_REASON(it) + '</p><div class="row">' +
          '<button type="button" class="btn sm" data-xp="hh|' + it.cat + '">这一项的规则和原理</button>' +
          (it.rel ? '<button type="button" class="btn sm primary" data-xp="' + esc(it.rel) + '">这组关系为什么成立</button>' : '') + '</div></td></tr>';
      });
      h += '</tbody></table></div>';
      h += '<p class="note">分值是本软件设计的权重，古书并没有合婚打分。原理是传统的，数字是约定的。请多看每一项的原因，不要只看总分，更不要用它去决定一段真实的关系。</p></div>';

      // 夫妻宫与配偶星
      h += '<div class="card"><h2>各自的夫妻宫与配偶星<span class="sub">' + xpt('hh|配偶星', '配偶星是什么') + '</span></h2><div class="grid2">';
      [[a, r.spouse[0], '甲方'], [b, r.spouse[1], '乙方']].forEach(function (x) {
        var s = x[1];
        h += '<div class="detail-item"><div class="h">' + x[2] + (x[0].name ? ' · ' + esc(x[0].name) : '') + '<small>' + (x[0].gender === 1 ? '男命以财为配偶星' : '女命以官杀为配偶星') + '</small></div>' +
          '<p>日支（夫妻宫）' + col(s.dz) + '，藏 ' + s.hide.join('、') + '。' + (s.inGong ? '配偶星就坐在夫妻宫。' : '夫妻宫里没有配偶星。') + '</p>' +
          '<p>配偶星：' + (s.stars.length ? s.stars.join('；') : '盘中未见') + '。</p>' +
          (s.conflict.length ? '<p>夫妻宫在自己盘上的关系：' + s.conflict.join('、') + '。</p>' : '') + '</div>';
      });
      h += '</div></div>';

      // 四柱交叉
      h += '<div class="card"><h2>双方四柱对照<span class="sub">不计分，点击关系看原理</span></h2><p class="desc">横向是甲方的四柱，纵向是乙方的四柱。总分只比较了年支和日柱，这张表把其他位置也摆出来。常见读法是：日柱之间最贴身，其次是月柱（环境）。半合、拱合、暗合、相破较轻，除日柱对日柱外不列。</p><div class="tbl-wrap"><table class="simple hh-cross"><thead><tr><th>甲方＼乙方</th>' +
        r.cross.head.map(function (x) { return '<th>' + x.label + ' ' + gzHtml(x.gz) + '</th>'; }).join('') + '</tr></thead><tbody>';
      r.cross.rows.forEach(function (row) {
        h += '<tr><th>' + row.label + ' ' + gzHtml(row.gz) + '</th>' + row.cells.map(function (list) {
          return '<td>' + (list.length ? list.map(function (it) { return '<button type="button" class="rel t-' + it.type + '" data-xp="' + esc(it.key) + '">' + esc(it.text) + '</button>'; }).join('') : '<span class="hint">—</span>') + '</td>';
        }).join('') + '</tr>';
      });
      h += '</tbody></table></div></div>';

      // 命卦
      var g = r.gua;
      h += '<div class="card"><h2>另一种看法：命卦（八宅）<span class="sub">' + xpt('hh|命卦', '这是什么') + '</span></h2><div class="kv"><div><b>甲方</b><span>' + g.a.name + '卦 · ' + g.a.group + '</span></div><div><b>乙方</b><span>' + g.b.name + '卦 · ' + g.b.group + '</span></div><div><b>游年</b><span class="' + (g.good ? 'luck-j' : 'luck-x') + '">' + g.you + '（' + (g.good ? '四吉之一' : '四凶之一') + '）</span></div></div><p class="note">这是另一套体系，所以不计入总分，也可能和上面的结论不一样。两套方法说法不同是常态。</p></div>';
      $('#hehunResult').innerHTML = h;
      rememberProfile(va, { noCurrent: true }); rememberProfile(vb, { noCurrent: true });
      $('#hehunResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) { console.error(err); $('#hehunResult').innerHTML = '<div class="card"><p class="hint warn">计算失败：' + esc(err.message) + '</p></div>'; }
  });
  function HH_REASON(it) {
    var pos = it.delta > 0;
    var map = {
      '生肖': it.delta === 0 ? '两个年支之间没有合、冲、刑、害、破，这一项不加不减。' : (pos ? '年支有合，传统上视为两人气味相投。' : '年支相遇有冲突，传统上视为性情容易相左。') + '年支代表出生年，同年的人都一样，所以这一项只是粗看。',
      '纳音': pos ? '纳音相生或同类，传统上视为彼此滋养。' : '纳音相克，传统上视为一方压制另一方。',
      '日柱': it.delta >= 5 ? '日干代表本人。日干相合或相生，被视为两人本身最直接的和谐，所以分值最高。' : it.delta > 0 ? '日干五行相同，好坏参半，所以只加一点。' : '日干相冲或相克，被视为步调和价值观有差异。扣分不算重，它不代表合不来。',
      '夫妻宫': pos ? '日支是夫妻宫。夫妻宫相合，传统上视为共同生活容易融合。' : '日支是夫妻宫。夫妻宫有冲突，传统上视为共同生活需要多磨合。',
      '五行': it.delta > 0 ? '对方盘里最旺的五行，正是这一方需要的。这是互补的意思。' : '双方最旺的五行和对方的喜用没有重合，这一项不加不减。',
      '配偶星': '只作展示，不计分：配偶星多或少都不直接等于好坏。'
    };
    return map[it.cat] || '';
  }
  $('#hehunResult').addEventListener('click', function (e) {
    var b = e.target.closest('.hh-why'); if (!b) return;
    var row = $('#hh-exp-' + b.dataset.i), open = row.hidden;
    row.hidden = !open; b.setAttribute('aria-expanded', open ? 'true' : 'false'); b.textContent = open ? '收起' : '为什么';
  });

  /* ================= 反查 ================= */
  (function () {
    var all = GZ.JIAZI.map(function (g) { return opt(g, g); }).join('');
    $('#rv-y').innerHTML = all; $('#rv-d').innerHTML = all;
    function fillM() {
      var yg = $('#rv-y').value.charAt(0), cur = $('#rv-m').value, s = '';
      for (var i = 0; i < 12; i++) { var z = GZ.ZHI[(i + 2) % 12]; var g = GZ.monthGanOfYear(yg, z) + z; s += opt(g, g + '（' + ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'][i] + '月）'); }
      $('#rv-m').innerHTML = s; if ($('option[value="' + cur + '"]', $('#rv-m'))) $('#rv-m').value = cur;
    }
    function fillT() {
      var dg = $('#rv-d').value.charAt(0), cur = $('#rv-t').value, s = '';
      for (var i = 0; i < 12; i++) { var g = GZ.hourGanOfDay(dg, GZ.ZHI[i]) + GZ.ZHI[i]; s += opt(g, g + '时'); }
      $('#rv-t').innerHTML = s; if ($('option[value="' + cur + '"]', $('#rv-t'))) $('#rv-t').value = cur;
    }
    $('#rv-y').addEventListener('change', fillM); $('#rv-d').addEventListener('change', fillT);
    $('#rv-y').value = '庚午'; $('#rv-d').value = '庚辰'; fillM(); fillT(); $('#rv-m').value = '辛巳'; $('#rv-t').value = '癸未';
  })();
  $('#reverseForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var list = Bazi.reverse($('#rv-y').value, $('#rv-m').value, $('#rv-d').value, $('#rv-t').value, +$('#rv-sect').value, +$('#rv-base').value);
    var h = list.length ? '<p class="hint">找到 ' + list.length + ' 个符合的时间（显示该时辰起始时刻）：</p><div class="rec-list">' + list.map(function (t) {
      var p = t.split(/[- :]/).map(Number), l = Solar.fromYmdHms(p[0], p[1], p[2], p[3], p[4], 0).getLunar();
      return '<div class="rec"><div><div class="nm">公历 ' + t.slice(0, 16) + '</div><div class="meta">农历 ' + l.getYearInChinese() + '年' + l.getMonthInChinese() + '月' + l.getDayInChinese() + ' ' + l.getTimeZhi() + '时</div></div>' +
        '<div class="row"><button type="button" class="btn sm primary" data-t="' + t + '" data-g="1">排男命</button><button type="button" class="btn sm" data-t="' + t + '" data-g="0">排女命</button></div></div>';
    }).join('') + '</div>' : '<p class="hint warn">在所选年份范围内没有找到符合该四柱的时间。</p>';
    $('#reverseResult').innerHTML = h;
  });
  $('#reverseResult').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-t]'); if (!b) return;
    var p = b.dataset.t.split(/[- :]/).map(Number);
    setBaziInput({ name: '', gender: +b.dataset.g, calendar: 'solar', y: p[0], m: p[1], d: p[2], h: p[3], mi: p[4], sect: +$('#rv-sect').value, tz: 8 });
    showTab('bazi'); runBazi();
  });

  /* ================= 紫微斗数 ================= */
  var zwDtp = new DTP($('[data-dtp="zw"]'), { id: 'zw', lunar: true });
  var zwLoc = new Loc($('[data-loc="zw"]'), { id: 'zw' });
  zwDtp.onChange = function () { try { zwLoc.checkDst(zwDtp.solar()); } catch (e) { } };
  zwDtp.set({ calendar: 'solar', y: 1990, m: 1, d: 1, h: 12, mi: 0 });
  var zwState = { res: null, sel: null, dx: null, ly: null, lm: null };
  // 盘面位置：地支序号 → [列, 行]（4×4 外圈）
  var ZW_CELL = { 5: [0, 0], 6: [1, 0], 7: [2, 0], 8: [3, 0], 9: [3, 1], 10: [3, 2], 11: [3, 3], 0: [2, 3], 1: [1, 3], 2: [0, 3], 3: [0, 2], 4: [0, 1] };

  function ziweiInput() {
    var v = zwDtp.get(), l = zwLoc.get();
    return {
      name: $('#zw-name').value.trim(), gender: +($('input[name=zw-gender]:checked').value),
      calendar: v.calendar, y: v.y, m: v.m, d: v.d, leap: v.leap, h: v.h, mi: v.mi,
      city: l.city, longitude: l.longitude, tz: l.tz, trueSolar: l.trueSolar && l.longitude != null, dst: l.dst,
      leapMode: $('#zw-leap').value, ziMode: $('#zw-zi').value, daxianFrom: $('#zw-dx').value
    };
  }
  function setZiweiInput(inp) {
    $('#zw-name').value = inp.name || '';
    $$('input[name=zw-gender]').forEach(function (r) { r.checked = +r.value === (+inp.gender === 0 ? 0 : 1); });
    zwLoc.dstAuto = false;
    zwDtp.set({ calendar: inp.calendar, y: +inp.y, m: +inp.m, d: +inp.d, leap: inp.leap === true || inp.leap === 'true' || inp.leap === 1 || inp.leap === '1', h: +inp.h, mi: +inp.mi });
    zwLoc.set({ city: inp.city, longitude: inp.longitude === '' || inp.longitude == null ? null : +inp.longitude, tz: inp.tz == null || inp.tz === '' ? 8 : +inp.tz, trueSolar: !!inp.trueSolar && inp.trueSolar !== 'false' && inp.trueSolar !== '0', dst: !!inp.dst && inp.dst !== 'false' && inp.dst !== '0' });
  }

  function zwOverlays(r) {
    var ov = {};
    var d = zwState.dx != null ? r.daxian[zwState.dx] : null;
    if (d) ov.dx = Ziwei.overlay(r, d.b, d.gan);
    if (zwState.ly != null) {
      var gz = Ziwei.yearGz(zwState.ly);
      ov.ly = Ziwei.overlay(r, GZ.zi(gz.charAt(1)), gz.charAt(0));
      ov.lyGz = gz;
      if (zwState.lm != null) {
        var ms = Ziwei.liuYue(r, zwState.ly), m = ms[zwState.lm];
        if (m) { ov.lm = Ziwei.overlay(r, m.b, m.stem); ov.lmInfo = m; }
      }
    }
    return ov;
  }
  function zwStarHtml(s, ov, cls) {
    var marks = '';
    if (s.hua) marks += '<i class="hua h-' + s.hua + '">' + s.hua + '</i>';
    [['dx', '大'], ['ly', '年'], ['lm', '月']].forEach(function (x) {
      var o = ov[x[0]]; if (!o) return;
      o.hua.forEach(function (h) { if (h.star === s.name) marks += '<i class="hua hy h-' + h.hua + '">' + x[1] + h.hua + '</i>'; });
    });
    return '<span class="' + cls + '">' + s.name + (s.bright ? '<small>' + s.bright + '</small>' : '') + marks + '</span>';
  }
  function zwBoard(r, ov) {
    var sel = zwState.sel == null ? r.ming : zwState.sel;
    var sf = Ziwei.sanFang(sel), opp = sf[3];
    var h = '<div class="zw-board-wrap"><div class="zw-board" role="grid" aria-label="紫微斗数十二宫盘">';
    for (var b = 0; b < 12; b++) {
      var P = r.palaces[b], c = ZW_CELL[b];
      var cl = 'zw-cell';
      if (b === sel) cl += ' sel'; else if (b === opp) cl += ' opp'; else if (sf.indexOf(b) >= 0) cl += ' tri';
      var badges = '';
      if (P.isMing) badges += '<b class="zb ming">命</b>';
      if (P.isShen) badges += '<b class="zb shen">身</b>';
      var runs = '';
      if (ov.dx) runs += '<span class="zrun d">大' + ov.dx.names[b].replace('宫', '') + '</span>';
      if (ov.ly) runs += '<span class="zrun y">年' + ov.ly.names[b].replace('宫', '') + '</span>';
      if (ov.lm) runs += '<span class="zrun m">月' + ov.lm.names[b].replace('宫', '') + '</span>';
      h += '<div class="' + cl + '" data-zb="' + b + '" tabindex="0" role="button" aria-label="' + P.name + ' ' + P.gan + P.zhi + '" style="grid-column:' + (c[0] + 1) + ';grid-row:' + (c[1] + 1) + '">' +
        '<div class="zw-stars">' + P.major.map(function (s) { return zwStarHtml(s, ov, 'zm' + (Ziwei.BRIGHT_RANK[s.bright] <= 1 ? ' dim' : '')); }).join('') + '</div>' +
        '<div class="zw-aux">' + P.aux.map(function (s) { return zwStarHtml(s, ov, 'za'); }).concat(P.sha.map(function (s) { return zwStarHtml(s, ov, 'zs'); })).join('') + '</div>' +
        '<div class="zw-misc">' + P.misc.map(function (s) { return '<span>' + s.name + '</span>'; }).join('') + '</div>' +
        '<div class="zw-runs">' + runs + '</div>' +
        '<div class="zw-foot"><div class="zw-god">' + P.changsheng + ' · ' + P.boshi + '<br>' + P.daxian[0] + '–' + P.daxian[1] + '</div><div class="zw-name">' + badges + '<span class="pn">' + P.name + '</span><span class="gz">' + col(P.gan) + col(P.zhi) + '</span></div></div>' +
        '</div>';
    }
    // 中宫
    var L0 = r.L;
    h += '<div class="zw-center" style="grid-column:2 / span 2;grid-row:2 / span 2">' +
      '<div class="zc-title">' + (r.name ? esc(r.name) + ' · ' : '') + r.genderText + '</div>' +
      '<div class="zc-big">' + xpt('zw|五行局', r.juName) + '</div>' +
      '<div class="zc-line">' + L0.solar.toYmdHms().slice(0, 16) + '</div>' +
      '<div class="zc-line">农历 ' + r.yearGz + '年' + (L0.leap ? '闰' : '') + LUNAR_MON[L0.rawMonth] + '月' + LUNAR_DAY[r.day] + ' ' + r.hourZhi + '时</div>' +
      '<div class="zc-line">命宫 ' + r.mingGz + '（' + r.nayin + '）</div>' +
      '<div class="zc-line">' + xpt('zw|命主身主', '命主 ' + r.mingzhu + ' · 身主 ' + r.shenzhu) + '</div>' +
      '<div class="zc-line hua-line">' + r.sihua.map(function (x) { return xpt('zwh|' + x.hua, x.star + '<i class="hua h-' + x.hua + '">' + x.hua + '</i>'); }).join(' ') + '</div>' +
      '<div class="zc-line">' + xpt('zw|排盘过程', '这张盘怎么排出来的') + '</div>' +
      '</div>';
    // 三方四正连线
    var cen = function (x) { var c = ZW_CELL[x]; return [c[0] * 100 + 50, c[1] * 100 + 50]; };
    var a = cen(sel), t1 = cen(sf[1]), t2 = cen(sf[2]), o = cen(opp);
    h += '<svg class="zw-lines" viewBox="0 0 400 400" preserveAspectRatio="none" aria-hidden="true">' +
      '<polygon points="' + [a, t1, t2].map(function (p) { return p.join(','); }).join(' ') + '" class="ztri"/>' +
      '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + o[0] + '" y2="' + o[1] + '" class="zopp"/></svg>';
    h += '</div></div>';
    h += '<div class="legend"><span>金框：所选宫</span><span>实线三角：三合</span><span>虚线：对宫</span><span>彩色“禄权科忌”：生年四化</span><span>“大/年/月”：运限四化</span>' + xpt('zw|三方四正', '三方四正是什么') + xpt('zw|亮度', '亮度是什么') + '</div>';
    return h;
  }
  function zwTimeline(r) {
    var nowY = new Date().getFullYear();
    var h = '<h2>大限 · 流年 · 流月<span class="sub">' + r.genderText + ' · ' + (r.shun ? '顺行' : '逆行') + '</span></h2>';
    h += '<div class="yun-sec-title"><b>' + xpt('zw|大限', '大限') + '</b><span>每宫十年。点选后，盘上标出大限十二宫和大限四化，再点一次取消</span></div><div class="strip">';
    var nowAge = Ziwei.nominalAge(r, nowY);
    r.daxian.forEach(function (d) {
      var isNow = nowAge >= d.from && nowAge <= d.to;
      h += '<button type="button" class="yun-cell' + (isNow ? ' now' : '') + '" data-zd="' + d.i + '" aria-pressed="' + (zwState.dx === d.i) + '">' +
        '<div class="t">' + d.from + '–' + d.to + '岁</div><div class="g">' + gzHtml(d.gan + d.zhi) + '</div><div class="s">' + d.palace + '</div></button>';
    });
    h += '</div>';
    var dx = zwState.dx != null ? r.daxian[zwState.dx] : null;
    if (dx) {
      var y0 = r.L.lunarYear + dx.from - 1;
      h += '<div class="yun-sec-title"><b>' + xpt('zw|流年', '流年') + '</b><span>' + dx.gan + dx.zhi + '限 · 虚岁计</span></div><div class="strip">';
      for (var i = 0; i < 10; i++) {
        var y = y0 + i, gz = Ziwei.yearGz(y), age = Ziwei.nominalAge(r, y), xb = Ziwei.xiaoxianBranch(r, age);
        h += '<button type="button" class="yun-cell' + (y === nowY ? ' now' : '') + '" data-zy="' + y + '" aria-pressed="' + (zwState.ly === y) + '">' +
          '<div class="t">' + y + ' · ' + age + '岁</div><div class="g">' + gzHtml(gz) + '</div><div class="s">小限 ' + r.palaces[xb].name.replace('宫', '') + '</div></button>';
      }
      h += '</div>';
    }
    if (zwState.ly != null) {
      var ms = Ziwei.liuYue(r, zwState.ly);
      h += '<div class="yun-sec-title"><b>' + xpt('zw|斗君', '流月') + '</b><span>' + zwState.ly + ' 年，斗君（正月）在 ' + GZ.ZHI[Ziwei.douJun(r, zwState.ly)] + ' 宫</span></div><div class="strip">';
      ms.forEach(function (m, idx) {
        h += '<button type="button" class="yun-cell" data-zm="' + idx + '" aria-pressed="' + (zwState.lm === idx) + '">' +
          '<div class="t">' + LUNAR_MON[m.k] + '月</div><div class="g">' + gzHtml(m.gz) + '</div><div class="s">' + r.palaces[m.b].name.replace('宫', '') + '</div></button>';
      });
      h += '</div>';
    }
    var ov = zwOverlays(r), notes = [];
    if (ov.dx) notes.push('<b>大限四化</b>（' + ov.dx.stem + '干）：' + ov.dx.hua.map(function (x) { return x.star + '化' + x.hua + '入本命' + x.palace; }).join('，'));
    if (ov.ly) notes.push('<b>流年四化</b>（' + ov.lyGz + '）：' + ov.ly.hua.map(function (x) { return x.star + '化' + x.hua + '入本命' + x.palace; }).join('，') + '。流年命宫在 ' + r.palaces[ov.ly.anchor].zhi + '（本命' + r.palaces[ov.ly.anchor].name + '）');
    if (ov.lm) notes.push('<b>流月四化</b>（' + ov.lmInfo.gz + '）：' + ov.lm.hua.map(function (x) { return x.star + '化' + x.hua + '入本命' + x.palace; }).join('，'));
    if (notes.length) h += '<div class="zw-notes">' + notes.map(function (n) { return '<p class="desc">' + n + '</p>'; }).join('') + '</div>';
    if (zwState.ly != null) {
      var a2 = Ziwei.nominalAge(r, zwState.ly);
      if (a2 < r.ju) h += '<p class="note">虚岁 ' + a2 + ' 还没到第一个大限（' + r.ju + ' 岁），古法看“童限”（一命二财三疾厄，四妻五福六官禄）。</p>';
    }
    return h;
  }
  function zwDetail(r) {
    var b = zwState.sel == null ? r.ming : zwState.sel, P = r.palaces[b], sf = Ziwei.sanFang(b);
    var info = ZX.PALACE[P.name];
    var h = '<h2>' + xpt('zwp|' + P.name, P.name) + ' · ' + P.gan + P.zhi + '<span class="sub">大限 ' + P.daxian[0] + '–' + P.daxian[1] + ' 岁</span></h2>';
    h += '<p class="desc">' + info[0] + '</p>';
    h += '<div class="zr-list">' + ZX.palaceReading(r, b) + '</div>';
    h += '<h3>' + xpt('zw|三方四正', '三方四正') + '</h3><div class="zsf">';
    [[sf[3], '对宫'], [sf[1], '三合'], [sf[2], '三合']].forEach(function (x) {
      var Q = r.palaces[x[0]];
      h += '<button type="button" class="zsf-i" data-zb="' + x[0] + '"><small>' + x[1] + '</small><b>' + Q.name + '</b><span>' + (Q.major.map(function (s) { return s.name; }).join('、') || '空宫') + '</span></button>';
    });
    h += '</div>';
    h += '<h3>' + xpt('zw|飞化', '宫干飞化') + '（' + P.gan + '干）</h3><div class="chips">';
    Ziwei.feiHua(r, b).forEach(function (f) {
      h += '<span class="chip' + (f.hua === '忌' ? ' bad' : f.hua === '禄' ? ' good' : '') + '">' + f.star + '化' + f.hua + ' → ' + f.palace + (f.self ? '（自化）' : '') + '</span>';
    });
    h += '</div>';
    h += '<p class="note">小限（虚岁）：' + P.xiaoxian.slice(0, 8).join('、') + ' …  · 宫神：' + P.changsheng + '、' + P.boshi + '、' + P.suiqian + '、' + P.jiangqian + ' ' + xpt('zw|十二神', '这些小字是什么') + '</p>';
    return h;
  }
  function renderZiwei(r) {
    var ov = zwOverlays(r);
    var h = '<div class="card" id="zwBoardCard"><h2>紫微命盘<span class="sub">点击任一宫看详解</span></h2>' + jumpStrip('ziwei') + zwBoard(r, ov) + '</div>';
    h += '<div class="zw-layout"><div class="card" id="zwDetail">' + zwDetail(r) + '</div>';
    h += '<div class="card"><h2>格局<span class="sub">本盘满足条件的结构</span></h2>';
    if (r.patterns.length) {
      var o = { '吉': 0, '平': 1, '凶': 2 };
      r.patterns.slice().sort(function (a, b) { return o[a.level] - o[b.level]; }).forEach(function (p) {
        h += '<div class="pat"><span class="n">' + xpt('zwg|' + p.key, p.name) + '</span><span class="lv ' + p.level + '">' + p.level + '</span><p>' + esc(p.why) + '</p></div>';
      });
    } else h += '<p class="hint">本盘没有命中已收录的格局。这不是坏事：大多数人的盘都不成“格”。</p>';
    h += '<p class="note">吉凶标签来自古书的笼统分类，点开名称可以看成格条件和古书原话。</p></div></div>';
    h += '<div class="card" id="zwTimeline">' + zwTimeline(r) + '</div>';
    h += '<div class="card"><h2>十二宫总览<span class="sub">展开查看每一宫的白话解读</span></h2><div class="zw-all">';
    var order = []; for (var i = 0; i < 12; i++) order.push(Ziwei.md(r.ming - i));
    order.forEach(function (b) {
      var P = r.palaces[b];
      h += '<details class="zw-acc"' + (b === r.ming ? ' open' : '') + '><summary><b>' + P.name + '</b> <small>' + P.gan + P.zhi + '</small> <span>' + (P.major.map(function (s) { return s.name + (s.hua ? '化' + s.hua : ''); }).join('、') || '空宫') + '</span></summary>' +
        '<p class="desc">' + ZX.PALACE[P.name][0] + '</p>' + ZX.palaceReading(r, b) + '</details>';
    });
    h += '</div><p class="note">解读是把每颗星的传统含义按宫位直译，没有综合全盘。实际论断要看星曜组合、亮度、四化和三方四正的相互作用。命理内容为传统文化参考。</p></div>';
    $('#ziweiResult').innerHTML = h;
  }
  function refreshZw(partial) {
    var r = zwState.res; if (!r) return;
    var sy = window.scrollY;
    renderZiwei(r);
    window.scrollTo(0, sy);
  }
  function runZiwei(inp) {
    try {
      var r = Ziwei.compute(inp || ziweiInput());
      zwState.res = r; zwState.sel = r.ming;
      var nowY = new Date().getFullYear(), age = Ziwei.nominalAge(r, nowY);
      var d = Ziwei.daxianOfAge(r, age);
      zwState.dx = d ? d.i : 0;
      zwState.ly = d ? nowY : r.L.lunarYear + r.daxian[0].from - 1;
      zwState.lm = null;
      renderZiwei(r);
      return r;
    } catch (e) {
      console.error(e);
      $('#ziweiResult').innerHTML = '<div class="card"><p class="hint warn">排盘失败：' + esc(e.message) + '</p></div>';
    }
  }
  $('#ziweiForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var inp = ziweiInput();
    if (runZiwei(inp)) { rememberProfile(inp); var el = $('#ziweiResult'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
  $('#zw-now').addEventListener('click', function () { zwDtp.setNow(); });
  $('#zw-save').addEventListener('click', function () {
    var inp = ziweiInput();
    if (runZiwei(inp)) { rememberProfile(inp, { manual: true }); toast('已保存到命例档案'); }
  });
  ['#zw-leap', '#zw-zi', '#zw-dx'].forEach(function (s) { $(s).addEventListener('change', function () { if (zwState.res) runZiwei(); }); });
  $('#ziweiResult').addEventListener('click', function (e) {
    var r = zwState.res; if (!r) return;
    if (e.target.closest('[data-xp]')) return;
    var c = e.target.closest('[data-zb]');
    if (c) {
      zwState.sel = +c.dataset.zb;
      refreshZw();
      if (window.innerWidth < 900 && c.classList.contains('zw-cell')) { var d = $('#zwDetail'); if (d) d.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      return;
    }
    var b = e.target.closest('.yun-cell'); if (!b) return;
    if (b.dataset.zd != null) {
      var i = +b.dataset.zd;
      if (zwState.dx === i) { zwState.dx = null; zwState.ly = null; zwState.lm = null; }
      else { zwState.dx = i; var d0 = r.daxian[i]; zwState.ly = null; zwState.lm = null; }
    } else if (b.dataset.zy != null) {
      var y = +b.dataset.zy;
      if (zwState.ly === y) { zwState.ly = null; zwState.lm = null; } else { zwState.ly = y; zwState.lm = null; }
    } else if (b.dataset.zm != null) {
      var m = +b.dataset.zm;
      zwState.lm = zwState.lm === m ? null : m;
    }
    refreshZw();
  });
  $('#ziweiResult').addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('zw-cell')) { e.preventDefault(); e.target.click(); }
  });

  /* ================= 原理抽屉 ================= */
  var xpStack = [];
  function xpCtx() {
    var cur = $('.tab[aria-selected="true"]'), tab = cur ? cur.dataset.tab : '';
    var ctx = { QimenInfo: Qimen };
    if (tab === 'bazi' && bzState.res) ctx.bazi = bzState.res;
    if (tab === 'qimen' && qmState.res) ctx.qimen = qmState.res;
    if (tab === 'ziwei' && zwState.res) ctx.ziwei = zwState.res;
    return ctx;
  }
  function xpRender() {
    var key = xpStack[xpStack.length - 1], d = $('#xpDrawer');
    if (!key) { d.hidden = true; $('#xpScrim').hidden = true; document.body.classList.remove('xp-open'); if (xpRender.last && xpRender.last.isConnected) xpRender.last.focus(); return; }
    var pg = XP.page(key, xpCtx());
    $('#xpTag').textContent = pg.tag || '';
    $('#xpTitle').textContent = pg.title;
    $('#xpBody').innerHTML = pg.html + '<p class="xp-foot">这里说明的是传统理论如何推出结果，不代表它已被科学验证。引文链接到维基文库，个别传本用字有异。</p>';
    $('#xpBody').scrollTop = 0;
    $('#xpBack').style.visibility = xpStack.length > 1 ? 'visible' : 'hidden';
    d.hidden = false; $('#xpScrim').hidden = false; document.body.classList.add('xp-open');
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-xp]');
    if (t) {
      e.preventDefault();
      if (!$('#xpDrawer').contains(t)) { xpStack = []; xpRender.last = t; }
      xpStack.push(t.getAttribute('data-xp'));
      xpRender();
      $('#xpClose').focus();
    }
  });
  $('#xpClose').addEventListener('click', function () { xpStack = []; xpRender(); });
  $('#xpScrim').addEventListener('click', function () { xpStack = []; xpRender(); });
  $('#xpBack').addEventListener('click', function () { xpStack.pop(); xpRender(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && xpStack.length) { xpStack = []; xpRender(); } });

  /* ================= 命例联动 ================= */
  function profileLabel(r) {
    var n = r.name ? r.name : '未命名';
    return n + '（' + (+r.gender === 1 ? '男' : '女') + '）' + r.solar;
  }
  function refreshProfiles() {
    var list = records(), cur = store('xs.current');
    var opts = list.map(function (r) { return opt(r.id, esc(profileLabel(r))); }).join('');
    var sel = $('#curProfile');
    sel.innerHTML = '<option value="">' + (list.length ? '— 选择命例 —' : '排一次盘就会出现在这里') + '</option>' + opts;
    sel.value = list.some(function (r) { return r.id === cur; }) ? cur : '';
    ['#hh-a-pick', '#hh-b-pick'].forEach(function (s) {
      var el = $(s), v = el.value;
      el.innerHTML = '<option value="">手动输入</option>' + opts;
      if (list.some(function (r) { return r.id === v; })) el.value = v;
    });
    var auto = $('#rec-auto'); if (auto) auto.checked = autoSaveOn();
  }
  function autoSaveOn() { var v = store('xs.autoSave'); return v == null ? true : !!v; }
  function profileKey(inp) {
    var s = Bazi.resolveTime(inp).inputSolar.toYmdHms();
    return s.slice(0, 16) + '|' + (+inp.gender === 0 ? 0 : 1) + '|' + (inp.longitude == null || inp.longitude === '' ? '' : (+inp.longitude).toFixed(2)) + '|' + (inp.trueSolar ? 1 : 0) + '|' + (inp.dst ? 1 : 0);
  }
  /** 把一次输入存成命例：相同出生信息只存一份，返回记录 */
  function rememberProfile(inp, o) {
    o = o || {};
    if (!o.manual && !autoSaveOn()) return null;
    try {
      var res = Bazi.compute(inp);
      var key = profileKey(inp), list = records(), hit = null;
      list.forEach(function (r) { if (!hit) { try { if (profileKey(r.input) === key) hit = r; } catch (e) { } } });
      var keep = { calendar: inp.calendar, y: inp.y, m: inp.m, d: inp.d, leap: inp.leap, h: inp.h, mi: inp.mi, gender: inp.gender, name: inp.name || (hit && hit.name) || '', city: inp.city, longitude: inp.longitude, tz: inp.tz, trueSolar: inp.trueSolar, dst: inp.dst };
      // 只有来自同类表单的流派选项才覆盖，其余保留
      ['sect', 'yunSect', 'leapMode', 'ziMode', 'daxianFrom'].forEach(function (k) { var v = inp[k] != null ? inp[k] : (hit && hit.input[k]); if (v != null) keep[k] = v; });
      if (hit) {
        hit.input = keep; hit.name = keep.name; hit.updated = new Date().toISOString();
        hit.bazi = res.pillars.map(function (p) { return p.gz; }).join(' '); hit.solar = res.inputSolar.slice(0, 16);
        if (o.manual) hit.auto = false;
        list = [hit].concat(list.filter(function (r) { return r !== hit; }));
      } else {
        hit = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), input: keep, name: keep.name, gender: keep.gender, bazi: res.pillars.map(function (p) { return p.gz; }).join(' '), solar: res.inputSolar.slice(0, 16), note: '', created: new Date().toISOString(), auto: !o.manual };
        list.unshift(hit);
        // 未命名的自动记录最多留 50 条
        var cnt = 0; list = list.filter(function (r) { if (r.auto && !r.name) { cnt++; return cnt <= 50; } return true; });
      }
      saveRecords(list);
      if (!o.noCurrent) store('xs.current', hit.id);
      refreshProfiles();
      return hit;
    } catch (e) { console.error(e); return null; }
  }
  /** 把命例填到所有用得上的地方 */
  function applyProfile(r, o) {
    o = o || {};
    if (!r) return;
    store('xs.current', r.id);
    setBaziInput(r.input); setZiweiInput(r.input);
    try {
      var b = Bazi.compute(r.input);
      if (!o.noQimen) { $('#qm-ming').value = b.pillars[0].gz; }
      $('#zr-sx').value = b.shengxiao;
    } catch (e) { }
    if (o.run !== false) { runBazi(r.input); runZiwei(r.input); if (qmState.res) runQimen(); }
    refreshProfiles();
  }
  function currentProfile() { var id = store('xs.current'); return records().filter(function (r) { return r.id === id; })[0] || null; }
  function hhFill(side, r) {
    var dt = side === 'a' ? hhA : hhB;
    dt.set({ calendar: r.input.calendar, y: +r.input.y, m: +r.input.m, d: +r.input.d, leap: !!r.input.leap && r.input.leap !== 'false' && r.input.leap !== '0', h: +r.input.h, mi: +r.input.mi });
    $('#hh-' + side + '-name').value = r.name || '';
    $$('input[name=hh-' + side + '-gender]').forEach(function (x) { x.checked = +x.value === (+r.gender === 0 ? 0 : 1); });
    $('#hh-' + side + '-pick').value = r.id;
    hhMeta[side] = r.input;
  }
  function jumpStrip(from) {
    var btn = function (go, t) { return '<button type="button" class="btn sm" data-jump="' + go + '">' + t + '</button>'; };
    var s = '<div class="jump"><span class="hint">用这个人的生日继续看：</span>';
    if (from !== 'bazi') s += btn('bazi', '八字排盘');
    if (from !== 'ziwei') s += btn('ziwei', '紫微斗数');
    s += btn('hehun-a', '合婚（放甲方）') + btn('hehun-b', '合婚（放乙方）') + btn('qimen', '奇门年命') + btn('almanac', '择日避冲');
    return s + '</div>';
  }
  function jumpTo(go, inp) {
    var rec = rememberProfile(inp, { manual: false }) || { id: '', input: inp, name: inp.name, gender: inp.gender };
    if (go === 'bazi') { setBaziInput(rec.input); showTab('bazi'); runBazi(rec.input); }
    else if (go === 'ziwei') { setZiweiInput(rec.input); showTab('ziwei'); runZiwei(rec.input); }
    else if (go === 'hehun-a' || go === 'hehun-b') {
      var sd = go.slice(-1);
      hhFill(sd, rec); showTab('hehun');
      toast('已填入' + (sd === 'a' ? '甲方' : '乙方') + '，再选另一方即可分析');
    } else if (go === 'qimen') {
      var b = Bazi.compute(rec.input);
      $('#qm-ming').value = b.pillars[0].gz; showTab('qimen'); runQimen();
      toast('已标注年命 ' + b.pillars[0].gz);
    } else if (go === 'almanac') {
      var c = Bazi.compute(rec.input);
      showTab('almanac'); $('#zr-sx').value = c.shengxiao; $('#zr-chong').checked = true;
      toast('择日已设为避开冲属' + c.shengxiao);
    }
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-jump]'); if (!b) return;
    var cur = $('.tab[aria-selected="true"]').dataset.tab;
    var inp = cur === 'ziwei' ? ziweiInput() : cur === 'bazi' ? baziInput() : null;
    if (!inp) { var r = currentProfile(); if (!r) { toast('请先在“当前命例”中选择一个人'); return; } inp = r.input; }
    jumpTo(b.dataset.jump, inp);
  });
  $('#curProfile').addEventListener('change', function () {
    var r = records().filter(function (x) { return x.id === this.value; }, this)[0];
    if (r) { applyProfile(r); toast('已切换到 ' + (r.name || '未命名') + '，各栏目已同步'); }
  });
  ['a', 'b'].forEach(function (sd) {
    $('#hh-' + sd + '-pick').addEventListener('change', function () {
      var v = this.value, r = records().filter(function (x) { return x.id === v; })[0];
      if (r) hhFill(sd, r); else hhMeta[sd] = null;
    });
  });
  $('#rec-auto').addEventListener('change', function () { store('xs.autoSave', this.checked); });

  /* ================= 手机安装与离线 ================= */
  var PWA = (function () {
    var ua = navigator.userAgent;
    var ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var standalone = navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
    var local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    var secure = location.protocol === 'https:' || (location.protocol === 'http:' && local);
    var st = { ios: ios, standalone: standalone, secure: secure, file: location.protocol === 'file:', ready: false, count: 0 };
    function check() {
      if (!window.caches) return Promise.resolve();
      return caches.keys().then(function (keys) {
        var k = keys.filter(function (x) { return x.indexOf('xuanshu-') === 0; })[0];
        if (!k) return;
        return caches.open(k).then(function (c) { return c.keys(); }).then(function (rs) { st.count = rs.length; st.ready = rs.length > 0; });
      });
    }
    if ('serviceWorker' in navigator && secure) {
      var hadCtrl = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.register('sw.js').then(function () { return navigator.serviceWorker.ready; }).then(check).then(function () {
        if (st.ready && !store('xs.offlineOk')) { store('xs.offlineOk', true); toast('已缓存到本机，之后断网也能用'); }
      }).catch(function (e) { console.warn('离线缓存未启用', e); });
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        check();
        if (hadCtrl) toast('已更新到新版本，下次打开时生效');
      });
      if (navigator.storage && navigator.storage.persist) { try { navigator.storage.persist(); } catch (e) { } }
    }
    return st;
  })();
  XP.register('app', function () {
    var h_ = XP.h, P = h_.P, H = h_.H, NOTE = h_.NOTE, CALC = h_.CALC, ul = h_.ul, s = '';
    var state;
    if (PWA.ready) state = '<b>离线缓存已就绪</b>（' + PWA.count + ' 个文件）。现在断网也能正常使用。';
    else if (PWA.file) state = '你现在是直接打开电脑上的文件。电脑上这样本来就能离线；手机和 iPad 需要通过网址安装一次。';
    else if (!PWA.secure) state = '当前地址不是 HTTPS，浏览器不允许离线缓存，请改用 HTTPS 地址打开。';
    else state = '离线缓存还没准备好。保持联网，等几秒后再打开这页看看。';
    s += CALC(state);
    s += H('在 iPhone / iPad 上安装');
    s += ul(['用 <b>Safari</b> 打开这个软件的网址（第一次需要联网）。', '点<b>分享</b>按钮。iPhone 一般在屏幕下方，新版 iOS 可能要先点地址栏旁的“···”；iPad 在右上角。', '往下找到<b>添加到主屏幕</b>。如果有“作为网页 App 打开”的开关，保持打开，再点<b>添加</b>。', '从主屏幕的“玄枢”图标打开。它全屏运行，看起来和普通 App 一样。', '打开后等提示“已缓存到本机”，之后开飞行模式也能用。']);
    s += NOTE('安装时请用 Safari；用其他浏览器时，分享菜单里可能没有这个选项。');
    s += H('关于数据');
    s += ul(['命例只保存在这台设备上，不会上传，手机和电脑之间也不会自动同步。', '主屏幕 App 和 Safari 网页的数据是分开的，请固定用其中一个。', '<b>删除主屏幕图标会同时删除它的命例。</b>换手机或删除前，请到“命例档案”点“导出 JSON”备份，再到新设备上导入。']);
    s += H('离线时哪些不能用');
    s += P('排盘、解释、档案都完全离线。只有引文下面指向维基文库的链接需要联网，引文本身已经内置，断网也能看。');
    s += H('它算不算真正的 App');
    s += P('这是“网页应用”（PWA）：有图标、全屏、离线，但不是从 App Store 下载的。上架 App Store 需要 Mac 电脑和每年 99 美元的开发者账号，而这个软件并不需要 App 才有的权限，所以 PWA 已经够用。');
    return { title: '手机 / iPad 安装与离线', tag: '使用说明', html: s };
  });
  (function () {
    var bar = $('#installHint');
    if (PWA.ios && !PWA.standalone && PWA.secure && !store('xs.hideInstall')) bar.hidden = false;
    $('#installHide').addEventListener('click', function () { store('xs.hideInstall', true); bar.hidden = true; });
  })();
  function syncThemeColor() {
    var bg = getComputedStyle(document.body).backgroundColor;
    $$('meta[name="theme-color"]').forEach(function (m) { m.setAttribute('content', bg); });
  }
  syncThemeColor();
  $('#themeBtn').addEventListener('click', function () { setTimeout(syncThemeColor, 0); });

  /* ================= 路由（分享链接） ================= */
  function route() {
    var hs = location.hash.slice(1);
    if (!hs) return false;
    var qi = hs.indexOf('?'), name = qi >= 0 ? hs.slice(0, qi) : hs, prm = qi >= 0 ? decodeParams(hs.slice(qi + 1)) : {};
    if (name === 'bazi' && prm.y) {
      setBaziInput(prm); showTab('bazi'); runBazi(); return true;
    }
    if (name === 'qimen') {
      showTab('qimen');
      if (prm.y) {
        qmDtp.set({ calendar: 'solar', y: +prm.y, m: +prm.m, d: +prm.d, h: +prm.h, mi: +prm.mi });
        if (prm.method) $('#qm-method').value = prm.method;
        if (prm.birthGz) $('#qm-ming').value = prm.birthGz;
        qmLoc.set({ city: prm.city, longitude: prm.longitude == null ? null : +prm.longitude, tz: prm.tz == null ? 8 : +prm.tz, trueSolar: prm.trueSolar === '1', dst: prm.dst === '1' });
      }
      runQimen(); return true;
    }
    if (name === 'ziwei' && prm.y) { setZiweiInput(prm); showTab('ziwei'); runZiwei(); return true; }
    if (['almanac', 'hehun', 'reverse', 'records', 'bazi', 'ziwei'].indexOf(name) >= 0) { showTab(name); return true; }
    return false;
  }
  window.addEventListener('hashchange', route);
  XP.setYongShen(Qimen.YONGSHEN);
  qmDtp.setNow();
  refreshProfiles();
  if (!route()) {
    var cp0 = currentProfile();
    if (cp0) { setBaziInput(cp0.input); setZiweiInput(cp0.input); try { $('#qm-ming').value = Bazi.compute(cp0.input).pillars[0].gz; } catch (e) { } runBazi(cp0.input); }
    else runBazi();
  }
  if (!qmState.res) runQimen();
})();
