/*
 * 时家奇门遁甲（转盘）：拆补法 / 置闰法定局，地盘、天盘、九星、八门、八神、暗干、空亡、驿马、格局。
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    var L = require('./lib/lunar.js');
    module.exports = factory(L.Solar, L.Lunar, require('./ganzhi.js'), require('./timeutil.js'));
  } else {
    root.Qimen = factory(root.Solar, root.Lunar, root.GZ, root.TU);
  }
})(this, function (Solar, Lunar, GZ, TU) {
  'use strict';

  var PALACE = {
    1: { name: '坎', gua: '☵', dir: '北', wx: '水', zhi: ['子'] },
    2: { name: '坤', gua: '☷', dir: '西南', wx: '土', zhi: ['未', '申'] },
    3: { name: '震', gua: '☳', dir: '东', wx: '木', zhi: ['卯'] },
    4: { name: '巽', gua: '☴', dir: '东南', wx: '木', zhi: ['辰', '巳'] },
    5: { name: '中', gua: '', dir: '中', wx: '土', zhi: [] },
    6: { name: '乾', gua: '☰', dir: '西北', wx: '金', zhi: ['戌', '亥'] },
    7: { name: '兑', gua: '☱', dir: '西', wx: '金', zhi: ['酉'] },
    8: { name: '艮', gua: '☶', dir: '东北', wx: '土', zhi: ['丑', '寅'] },
    9: { name: '离', gua: '☲', dir: '南', wx: '火', zhi: ['午'] }
  };
  var ZHI_PALACE = { '子': 1, '丑': 8, '寅': 8, '卯': 3, '辰': 4, '巳': 4, '午': 9, '未': 2, '申': 2, '酉': 7, '戌': 6, '亥': 6 };
  var RING = [1, 8, 3, 4, 9, 2, 7, 6]; // 顺时针
  var STAR = { 1: '天蓬', 2: '天芮', 3: '天冲', 4: '天辅', 5: '天禽', 6: '天心', 7: '天柱', 8: '天任', 9: '天英' };
  var STAR_WX = { '天蓬': '水', '天芮': '土', '天冲': '木', '天辅': '木', '天禽': '土', '天心': '金', '天柱': '金', '天任': '土', '天英': '火' };
  var DOOR = { 1: '休门', 8: '生门', 3: '伤门', 4: '杜门', 9: '景门', 2: '死门', 7: '惊门', 6: '开门' };
  var DOOR_WX = { '休门': '水', '生门': '土', '伤门': '木', '杜门': '木', '景门': '火', '死门': '土', '惊门': '金', '开门': '金' };
  var GODS = ['值符', '螣蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'];
  var QIYI = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'];
  var XUN_YI = { '甲子': '戊', '甲戌': '己', '甲申': '庚', '甲午': '辛', '甲辰': '壬', '甲寅': '癸' };

  // 节气 → [阴阳, 上, 中, 下]
  var JU = {
    '冬至': [1, 1, 7, 4], '小寒': [1, 2, 8, 5], '大寒': [1, 3, 9, 6], '立春': [1, 8, 5, 2], '雨水': [1, 9, 6, 3], '惊蛰': [1, 1, 7, 4],
    '春分': [1, 3, 9, 6], '清明': [1, 4, 1, 7], '谷雨': [1, 5, 2, 8], '立夏': [1, 4, 1, 7], '小满': [1, 5, 2, 8], '芒种': [1, 6, 3, 9],
    '夏至': [0, 9, 3, 6], '小暑': [0, 8, 2, 5], '大暑': [0, 7, 1, 4], '立秋': [0, 2, 5, 8], '处暑': [0, 1, 4, 7], '白露': [0, 9, 3, 6],
    '秋分': [0, 7, 1, 4], '寒露': [0, 6, 9, 3], '霜降': [0, 5, 8, 2], '立冬': [0, 6, 9, 3], '小雪': [0, 5, 8, 2], '大雪': [0, 4, 7, 1]
  };
  var JQ_ORDER = ['冬至', '小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪'];
  var JQ_EN = { DONG_ZHI: '冬至', XIAO_HAN: '小寒', DA_HAN: '大寒', LI_CHUN: '立春', YU_SHUI: '雨水', JING_ZHE: '惊蛰', DA_XUE: '大雪' };
  var YUAN = ['上元', '中元', '下元'];
  var CN_NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

  function ringIdx(p) { return RING.indexOf(p); }
  function jdn(y, m, d) { return Math.floor(Solar.fromYmd(y, m, d).getJulianDay() + 0.5); }
  function dayGzIndexOfJdn(n) { return ((n + 49) % 60 + 60) % 60; }
  function stepPalace(p, n, yang) { // 九宫数序前进 n 步
    var x = yang ? (p - 1 + n) % 9 : ((p - 1 - n) % 9 + 9) % 9;
    return x + 1;
  }

  /* ---------------- 节气表（置闰用） ---------------- */
  var termCache = {};
  function termsOfYear(y) {
    if (termCache[y]) return termCache[y];
    var tbl = Lunar.fromYmd(y, 6, 1).getJieQiTable();
    var arr = [];
    for (var k in tbl) {
      var name = JQ_EN[k] || k;
      if (JQ_ORDER.indexOf(name) < 0) continue;
      var s = tbl[k];
      arr.push({ name: name, solar: s, jdn: jdn(s.getYear(), s.getMonth(), s.getDay()), t: s.toYmdHms() });
    }
    termCache[y] = arr;
    return arr;
  }
  function termsRange(y0, y1) {
    var map = {}, out = [];
    for (var y = y0; y <= y1; y++) termsOfYear(y).forEach(function (t) { if (!map[t.t]) { map[t.t] = 1; out.push(t); } });
    out.sort(function (a, b) { return a.t < b.t ? -1 : a.t > b.t ? 1 : 0; });
    return out;
  }

  /** 置闰法：模拟符头与节气的推移，返回 {term, yuan, status, offset, isRun} */
  function zhiRun(targetJdn, year) {
    var terms = termsRange(year - 12, year + 1);
    // 起点：约 11 年前的第一个上元符头（甲子、己卯、甲午、己酉日）
    var start = terms[0].jdn + 20;
    while (dayGzIndexOfJdn(start) % 15 !== 0) start++;
    // 初始节气取最近者
    var j = 0, best = 1e9;
    for (var i = 0; i < terms.length; i++) {
      var dlt = Math.abs(terms[i].jdn - start);
      if (dlt < best) { best = dlt; j = i; }
    }
    var F = start, isRun = false;
    var guard = 0;
    while (F + 15 <= targetJdn && guard++ < 1000) {
      var T = terms[j];
      var chao = T.jdn - F; // >0 超神
      if (!isRun && (T.name === '芒种' || T.name === '大雪') && chao > 9) {
        isRun = true; // 下一块重复本节气（置闰）
      } else {
        isRun = false;
        j++;
      }
      F += 15;
    }
    var term = terms[j];
    var off = term.jdn - F;
    var status = isRun ? '置闰' : off > 0 ? '超神' + off + '日' : off < 0 ? '接气' + (-off) + '日' : '正授';
    return { term: term.name, termTime: term.t, yuan: Math.floor((targetJdn - F) / 5), status: status, isRun: isRun, fuTouJdn: F };
  }

  /* ---------------- 主排盘 ---------------- */
  /**
   * opt: {y,m,d,h,mi, method:'chaibu'|'zhirun', trueSolar, longitude, tz, dst, birthYearGan(可选，年命)}
   */
  function compute(opt) {
    var adj = TU.adjust(+opt.y, +opt.m, +opt.d, +opt.h, +opt.mi, {
      longitude: opt.longitude === '' || opt.longitude == null ? null : +opt.longitude,
      tz: opt.tz === '' || opt.tz == null ? 8 : +opt.tz, dst: !!opt.dst, trueSolar: !!opt.trueSolar
    });
    var p = TU.parts(adj.used);
    var solar = Solar.fromYmdHms(p.y, p.m, p.d, p.h, p.mi, 0);
    var lunar = solar.getLunar();
    var ec = lunar.getEightChar();
    ec.setSect(1); // 23 点换日
    var yearGz = ec.getYear(), monthGz = ec.getMonth(), dayGz = ec.getDay(), hourGz = ec.getTime();
    var method = opt.method === 'zhirun' ? 'zhirun' : 'chaibu';

    // 奇门日（23点后算次日）
    var qmJdn = jdn(p.y, p.m, p.d) + (p.h >= 23 ? 1 : 0);

    var termName, yuan, status = '', termTime;
    var prevJq = lunar.getPrevJieQi(false);
    if (method === 'chaibu') {
      termName = JQ_EN[prevJq.getName()] || prevJq.getName();
      termTime = prevJq.getSolar().toYmdHms();
      var di = GZ.jiaziIndex(dayGz);
      var fu = di - (di % 5);
      var fz = fu % 12;
      yuan = [0, 6, 3, 9].indexOf(fz) >= 0 ? 0 : [2, 8, 5, 11].indexOf(fz) >= 0 ? 1 : 2;
      status = '符头' + GZ.JIAZI[fu];
    } else {
      var zr = zhiRun(qmJdn, p.y);
      termName = zr.term; yuan = zr.yuan; status = zr.status; termTime = zr.termTime;
      var fuIdx = dayGzIndexOfJdn(zr.fuTouJdn + yuan * 5);
      status = '符头' + GZ.JIAZI[fuIdx] + ' · ' + status;
    }
    var juInfo = JU[termName];
    var yang = juInfo[0] === 1;
    var ju = juInfo[1 + yuan];

    // 地盘
    var earth = {}; // palace -> stem
    var earthPos = {}; // stem -> palace
    for (var i = 0; i < 9; i++) {
      var pal = stepPalace(ju, i, yang);
      earth[pal] = QIYI[i]; earthPos[QIYI[i]] = pal;
    }

    // 旬首
    var hi = GZ.jiaziIndex(hourGz);
    var xunStart = hi - (hi % 10);
    var xunShou = GZ.JIAZI[xunStart];
    var xunYi = XUN_YI[xunShou];
    var zfPalace = earthPos[xunYi]; // 值符原宫（可能为5）
    var zfFrom = zfPalace === 5 ? 2 : zfPalace;
    var zhiFuStar = STAR[zfPalace];
    var zhiShiDoor = DOOR[zfFrom];

    var hourGan = hourGz.charAt(0);
    var effHourGan = hourGan === '甲' ? xunYi : hourGan;
    var target = earthPos[effHourGan];
    var targetAdj = target === 5 ? 2 : target;
    var k = (ringIdx(targetAdj) - ringIdx(zfFrom) + 8) % 8;

    var palaces = {};
    for (var n = 1; n <= 9; n++) {
      palaces[n] = { num: n, info: PALACE[n], earth: [earth[n]], heaven: [], stars: [], door: null, god: null, hidden: null, marks: [], patterns: [] };
    }
    // 中五地盘干寄坤二
    palaces[2].earthJi = earth[5];

    RING.forEach(function (src, idx) {
      var dst = RING[(idx + k) % 8];
      palaces[dst].stars.push(STAR[src]);
      palaces[dst].heaven.push(earth[src]);
      if (src === 2) { palaces[dst].stars.push('天禽'); palaces[dst].heaven.push(earth[5]); }
    });

    // 八门
    var steps = hi - xunStart;
    var doorLand = stepPalace(zfPalace, steps, yang);
    var doorLandAdj = doorLand === 5 ? 2 : doorLand;
    var dk = (ringIdx(doorLandAdj) - ringIdx(zfFrom) + 8) % 8;
    RING.forEach(function (src, idx) {
      palaces[RING[(idx + dk) % 8]].door = DOOR[src];
    });

    // 八神
    var gStart = ringIdx(targetAdj);
    for (var g = 0; g < 8; g++) {
      var pp = RING[((gStart + (yang ? g : -g)) % 8 + 8) % 8];
      palaces[pp].god = GODS[g];
    }

    // 暗干（隐干）：值使门落宫起时干，按阴阳遁顺逆布三奇六仪
    var hs = QIYI.indexOf(effHourGan);
    for (var a = 0; a < 9; a++) {
      palaces[stepPalace(doorLand, a, yang)].hidden = QIYI[(hs + a) % 9];
    }

    // 空亡、驿马
    var kong = GZ.xunKong(hourGz);
    var kongPal = [];
    kong.forEach(function (z) { var pz = ZHI_PALACE[z]; if (kongPal.indexOf(pz) < 0) kongPal.push(pz); palaces[pz].marks.push('空'); });
    var hz = hourGz.charAt(1);
    var maZhi = ['寅', '亥', '申', '巳'][GZ.zi(hz) % 4];
    var maPal = ZHI_PALACE[maZhi];
    palaces[maPal].marks.push('马');

    // 日干、时干、年命落宫（天盘）
    function heavenPalaceOf(stem) {
      for (var q = 1; q <= 9; q++) if (palaces[q].heaven.indexOf(stem) >= 0) return q;
      return null;
    }
    var dayGan = dayGz.charAt(0);
    var dayXunYi = XUN_YI[GZ.xun(dayGz)];
    var effDayGan = dayGan === '甲' ? dayXunYi : dayGan;
    var dayPal = heavenPalaceOf(effDayGan);
    var hourPal = heavenPalaceOf(effHourGan);
    var yearGan = yearGz.charAt(0);
    var effYearGan = yearGan === '甲' ? XUN_YI[GZ.xun(yearGz)] : yearGan;
    var monthGan = monthGz.charAt(0);
    var effMonthGan = monthGan === '甲' ? XUN_YI[GZ.xun(monthGz)] : monthGan;
    var markers = { '日干': dayPal, '时干': hourPal, '月干': heavenPalaceOf(effMonthGan), '年干': heavenPalaceOf(effYearGan) };
    if (opt.birthGz) {
      var bg = opt.birthGz.charAt(0);
      var eb = bg === '甲' ? XUN_YI[GZ.xun(opt.birthGz)] : bg;
      markers['年命'] = heavenPalaceOf(eb);
    }

    // 旺衰
    var monthZhi = monthGz.charAt(1);
    var mwx = GZ.zhiWx(monthZhi);
    function starState(s) { // 九星（《烟波钓叟歌》）：我生月令旺，同类相，我克月令（财）休，月令克我（鬼）囚，月令生我（父母）废
      var r = GZ.wxRel(STAR_WX[s], mwx);
      return { '生': '旺', '同': '相', '克': '休', '被克': '囚', '被生': '废' }[r];
    }
    function doorState(d) { // 八门：同旺，月令生相，我生月令休，我克月令囚，月令克死
      var r = GZ.wxRel(DOOR_WX[d], mwx);
      return { '同': '旺', '被生': '相', '生': '休', '克': '囚', '被克': '死' }[r];
    }

    // 格局
    var patterns = [];
    var fuyin = k === 0, fanyin = k === 4;
    if (fuyin) patterns.push({ name: '星伏吟', level: '凶', desc: '九星伏于本宫，主事迟滞，宜守不宜动。' });
    if (fanyin) patterns.push({ name: '星反吟', level: '凶', desc: '九星落对冲之宫，主事反复、变动急速。' });
    if (dk === 0) patterns.push({ name: '门伏吟', level: '凶', desc: '八门伏于本宫，主事难成、停滞。' });
    if (dk === 4) patterns.push({ name: '门反吟', level: '凶', desc: '八门反吟，主事反覆不定。' });
    var JIXING = { '戊': 3, '己': 2, '庚': 8, '辛': 9, '壬': 4, '癸': 4 };
    var MU = { '乙': 6, '丙': 6, '戊': 6, '丁': 8, '己': 8, '庚': 8, '辛': 4, '壬': 4, '癸': 2 };
    var JI_DOOR = ['开门', '休门', '生门'];

    for (var q = 1; q <= 9; q++) {
      var P = palaces[q];
      if (q === 5) continue;
      P.heaven.forEach(function (st, si) {
        if (JIXING[st] === q) P.patterns.push({ name: '六仪击刑', level: '凶', desc: st + '临' + PALACE[q].name + '宫受刑，主刑伤、官非、病灾。' });
        if (MU[st] === q) P.patterns.push({ name: (['乙', '丙', '丁'].indexOf(st) >= 0 ? '三奇入墓' : '十干入墓'), level: '凶', desc: st + '入墓于' + PALACE[q].name + '宫，主昏暗受困、难以伸展。' });
        var ea = P.earth.concat(q === 2 && P.earthJi ? [P.earthJi] : []);
        ea.forEach(function (es) {
          var key = st + es;
          var ky = KEYING[key];
          if (ky) P.patterns.push({ name: ky[0] + '（' + st + '+' + es + '）', level: ky[1], desc: ky[2] });
        });
      });
      // 门迫/门制/门生宫
      if (P.door) {
        var rel = GZ.wxRel(DOOR_WX[P.door], PALACE[q].wx);
        P.doorRel = { '克': '门迫', '被克': '门受制', '生': '门生宫', '被生': '宫生门', '同': '门宫比和' }[rel];
        if (rel === '克') P.patterns.push({ name: '门迫', level: JI_DOOR.indexOf(P.door) >= 0 ? '凶' : '凶', desc: P.door + '（' + DOOR_WX[P.door] + '）克' + PALACE[q].name + '宫（' + PALACE[q].wx + '），' + (JI_DOOR.indexOf(P.door) >= 0 ? '吉门被迫，吉事不吉。' : '凶门被迫，凶事更凶。') });
        P.doorState = doorState(P.door);
      }
      P.starRel = P.stars.length ? { '克': '星克宫', '被克': '宫克星', '生': '星生宫', '被生': '宫生星', '同': '星宫比和' }[GZ.wxRel(STAR_WX[P.stars[0]], PALACE[q].wx)] : '';
      P.starStates = P.stars.map(starState);
      var H = P.heaven, D = P.door, E = P.earth[0], Gd = P.god;
      // 三奇得使
      if ((H.indexOf('乙') >= 0 && (E === '己' || E === '辛')) || (H.indexOf('丙') >= 0 && (E === '戊' || E === '庚')) || (H.indexOf('丁') >= 0 && (E === '壬' || E === '癸')))
        P.patterns.push({ name: '三奇得使', level: '吉', desc: '三奇临得使之仪，百事吉利。' });
      // 九遁
      if (H.indexOf('丙') >= 0 && D === '生门' && E === '丁') P.patterns.push({ name: '天遁', level: '吉', desc: '丙奇+生门+地盘丁，宜求官、上书、出行，百事吉。' });
      if (H.indexOf('乙') >= 0 && D === '开门' && E === '己') P.patterns.push({ name: '地遁', level: '吉', desc: '乙奇+开门+地盘己，宜安营、藏伏、修造。' });
      if (H.indexOf('丁') >= 0 && D === '休门' && Gd === '太阴') P.patterns.push({ name: '人遁', level: '吉', desc: '丁奇+休门+太阴，宜求贤、和谈、婚姻。' });
      if (H.indexOf('丙') >= 0 && D === '生门' && Gd === '九天') P.patterns.push({ name: '神遁', level: '吉', desc: '丙奇+生门+九天，宜祭祀、攻虚。' });
      if (H.indexOf('丁') >= 0 && (D === '杜门' || D === '开门') && Gd === '九地') P.patterns.push({ name: '鬼遁', level: '吉', desc: '丁奇+杜/开门+九地，宜偷营、刺探、暗中行事。' });
      if (H.indexOf('乙') >= 0 && JI_DOOR.indexOf(D) >= 0 && q === 4) P.patterns.push({ name: '风遁', level: '吉', desc: '乙奇+吉门临巽宫，宜顺风行事。' });
      if (H.indexOf('乙') >= 0 && JI_DOOR.indexOf(D) >= 0 && E === '辛') P.patterns.push({ name: '云遁', level: '吉', desc: '乙奇+吉门+地盘辛，宜求雨、立营。' });
      if (H.indexOf('乙') >= 0 && JI_DOOR.indexOf(D) >= 0 && (q === 1 || E === '癸')) P.patterns.push({ name: '龙遁', level: '吉', desc: '乙奇+吉门临坎宫或地盘癸，宜水战、祈雨、渡水。' });
      if (H.indexOf('乙') >= 0 && (D === '生门' || D === '休门') && q === 8 && E === '辛') P.patterns.push({ name: '虎遁', level: '吉', desc: '乙奇+生/休门+地盘辛临艮宫，宜招安、设险。' });
      if (D === zhiShiDoor && E === '丁') P.patterns.push({ name: '玉女守门', level: '吉', desc: '值使门加临地盘丁奇，宜婚姻、宴会、私事。' });
      if (kongPal.indexOf(q) >= 0) P.patterns.push({ name: '旬空', level: '平', desc: '本宫逢时旬空亡，吉凶皆减。' });
      if (q === maPal) P.patterns.push({ name: '驿马', level: '平', desc: '时支驿马临此宫，主动、快速、出行。' });
    }

    // 时干相关整体格局
    if (GZ.wxRel(GZ.ganWx(hourGan), GZ.ganWx(dayGan)) === '克' && GZ.isYang(hourGan) === GZ.isYang(dayGan))
      patterns.push({ name: '五不遇时', level: '凶', desc: '时干' + hourGan + '克日干' + dayGan + '（阳克阳/阴克阴），百事不宜，宜静守。' });
    if (['丙戌', '丁丑', '戊戌', '己丑', '壬辰', '癸未'].indexOf(hourGz) >= 0)
      patterns.push({ name: '时干入墓', level: '凶', desc: '时柱' + hourGz + '，时干坐墓，主事昏晦不明。' });
    if (hourGz.charAt(0) === '甲') patterns.push({ name: '六甲时', level: '平', desc: '甲为直符之首，遁于' + xunYi + '下，以' + xunYi + '代之。' });

    return {
      method: method, methodName: method === 'chaibu' ? '拆补法' : '置闰法',
      solar: solar.toYmdHms().slice(0, 16), clock: TU.fmt(adj.clock), adjNotes: adj.notes, trueSolar: adj.trueSolar,
      lunarText: lunar.getYearInChinese() + '年' + lunar.getMonthInChinese() + '月' + lunar.getDayInChinese() + ' ' + lunar.getTimeZhi() + '时',
      week: solar.getWeekInChinese(),
      gz: { year: yearGz, month: monthGz, day: dayGz, hour: hourGz },
      kongs: { year: GZ.xunKong(yearGz).join(''), month: GZ.xunKong(monthGz).join(''), day: GZ.xunKong(dayGz).join(''), hour: kong.join('') },
      term: termName, termTime: termTime, prevJieQi: (JQ_EN[prevJq.getName()] || prevJq.getName()) + ' ' + prevJq.getSolar().toYmdHms().slice(0, 16),
      yang: yang, ju: ju, yuan: YUAN[yuan], status: status,
      juText: (yang ? '阳遁' : '阴遁') + CN_NUM[ju] + '局',
      xunShou: xunShou, xunYi: xunYi, zhiFu: zhiFuStar, zhiFuPalace: zfPalace, zhiShi: zhiShiDoor, zhiShiPalace: doorLandAdj,
      zhiFuLand: targetAdj,
      hourKong: kong.join(''), maZhi: maZhi, maPalace: maPal,
      palaces: palaces, patterns: patterns, markers: markers,
      starShift: k, doorShift: dk
    };
  }

  /* 十干克应（天盘干 + 地盘干）：[名称, 吉凶, 释义] */
  var KEYING = {
    '戊戊': ['伏吟', '凶', '凡事不利，道路闭塞，以守为好。'],
    '戊乙': ['青龙合灵', '吉', '门吉则事吉，门凶则事凶。'],
    '戊丙': ['青龙返首', '吉', '大吉大利，动作有成，若逢击刑、迫墓则吉事成凶。'],
    '戊丁': ['青龙耀明', '吉', '宜见上级、贵人，求功名利禄，事事吉利。'],
    '戊己': ['贵人入狱', '凶', '公私皆不利。'],
    '戊庚': ['值符飞宫', '凶', '吉事不吉，凶事更凶，求财没利益。'],
    '戊辛': ['青龙折足', '凶', '吉门有生助尚能谋事，否则招灾、失财、足疾。'],
    '戊壬': ['青龙入天牢', '凶', '凡阴阳事皆不吉。'],
    '戊癸': ['青龙华盖', '平', '逢吉门为吉，可招福临门；逢凶门事多不利。'],
    '乙乙': ['日奇伏吟', '平', '不宜谒贵求名，只可安分守身。'],
    '乙丙': ['奇仪顺遂', '吉', '吉星迁官进职，凶星夫妻反目离别。'],
    '乙丁': ['奇仪相佐', '吉', '最利文书、考试，百事可为。'],
    '乙戊': ['阴害阳门', '凶', '利阴人、阴事，不利阳人、阳事，门凶事必凶。'],
    '乙己': ['日奇入雾', '凶', '被土暗昧，门凶必凶，门吉亦不能全吉。'],
    '乙庚': ['日奇被刑', '凶', '争讼财产，夫妻怀有私意。'],
    '乙辛': ['青龙逃走', '凶', '人亡财破，奴仆拐带，六畜皆伤。'],
    '乙壬': ['日奇入地', '凶', '尊卑悖乱，官讼是非，有人谋害之事。'],
    '乙癸': ['华盖逢星', '平', '遁迹修道，隐匿藏形，躲灾避难为吉。'],
    '丙丙': ['月奇悖师', '凶', '文书逼迫，破耗遗失。'],
    '丙乙': ['日月并行', '吉', '公谋私为皆为吉。'],
    '丙丁': ['星奇朱雀', '吉', '贵人文书吉利，常人平静安乐。'],
    '丙戊': ['飞鸟跌穴', '吉', '百事吉，事业可为，可谋大事。'],
    '丙己': ['火悖入刑', '凶', '囚人刑杖，文书不行。'],
    '丙庚': ['荧入太白', '凶', '门户破败，盗贼耗失，事业亦凶。'],
    '丙辛': ['谋事就成', '吉', '病人不凶，谋事能成。'],
    '丙壬': ['火入天罗', '凶', '为客不利，是非颇多。'],
    '丙癸': ['华盖悖师', '凶', '阴人害事，灾祸频生。'],
    '丁丁': ['星奇伏吟', '平', '文书即至，喜事从心，万事如意。'],
    '丁乙': ['人遁吉格', '吉', '贵人加官进爵，常人婚姻财帛有喜。'],
    '丁丙': ['星随月转', '吉', '贵人越级高升，常人乐极生悲。'],
    '丁戊': ['青龙转光', '吉', '官人升迁，常人威昌。'],
    '丁己': ['火入勾陈', '凶', '奸私仇冤，事因女人。'],
    '丁庚': ['星奇受阻', '凶', '文书阻隔，行人必归。'],
    '丁辛': ['朱雀入狱', '凶', '罪人释囚，官人失位。'],
    '丁壬': ['奇仪相合', '吉', '贵人恩诏，讼狱公平，测婚多为苟合。'],
    '丁癸': ['朱雀投江', '凶', '文书口舌是非，经官动府，词讼不利，音信沉溺。'],
    '己己': ['地户逢鬼', '凶', '病者必死，百事不遂。'],
    '己乙': ['墓神不明', '凶', '地户逢星，宜遁迹隐形为利。'],
    '己丙': ['火悖地户', '凶', '男人冤冤相害，女人必致淫污。'],
    '己丁': ['朱雀入墓', '凶', '文状词讼，先曲后直。'],
    '己戊': ['犬遇青龙', '吉', '门吉为谋望遂意，上人见喜；门凶枉劳心机。'],
    '己庚': ['刑格返名', '凶', '词讼先动者不利，如临阴星则有谋害之情。'],
    '己辛': ['游魂入墓', '凶', '易遭阴邪鬼魅作祟。'],
    '己壬': ['地网高张', '凶', '狡童佚女，奸情伤杀。'],
    '己癸': ['地刑玄武', '凶', '男女疾病垂危，有囚狱词讼之灾。'],
    '庚庚': ['太白同宫', '凶', '又名战格，官灾横祸，兄弟或同辈朋友相冲撞。'],
    '庚乙': ['太白逢星', '凶', '退吉进凶，谋为不利。'],
    '庚丙': ['太白入荧', '凶', '占贼必来，为客进利，为主破财。'],
    '庚丁': ['亭亭之格', '凶', '因私昵起官司，门吉有救。'],
    '庚戊': ['天乙伏宫', '凶', '百事不可谋，大凶。'],
    '庚己': ['官符刑格', '凶', '主有官司口舌，因官讼被判刑。'],
    '庚辛': ['白虎干格', '凶', '不宜远行，远行车折马伤。'],
    '庚壬': ['移荡格', '凶', '又名上格，远行道路迷失，男女音信难通。'],
    '庚癸': ['大格', '凶', '行人不至，官事不止，生育母子俱伤。'],
    '辛辛': ['伏吟天庭', '凶', '公废私就，讼狱自罹罪名。'],
    '辛乙': ['白虎猖狂', '凶', '家败人亡，出行有惊，远行多灾。'],
    '辛丙': ['干合悖师', '平', '门吉则事吉，门凶则事凶；测事易因财致讼。'],
    '辛丁': ['狱神得奇', '吉', '经商求财获利倍增，囚人逢天赦释免。'],
    '辛戊': ['困龙被伤', '凶', '主官司破财，屈抑守分尚可，妄动则带来祸殃。'],
    '辛己': ['入狱自刑', '凶', '奴仆背主，有苦诉讼难伸。'],
    '辛庚': ['白虎出力', '凶', '刀刃相交，主客相残，逊让退步稍可。'],
    '辛壬': ['凶蛇入狱', '凶', '两男争女，讼狱不息，先动失理。'],
    '辛癸': ['天牢华盖', '凶', '日月失明，误入天网，动止乖张。'],
    '壬壬': ['蛇入地罗', '凶', '外人缠绕，内事索索，吉门吉星庶免蹉跎。'],
    '壬乙': ['小蛇得势', '吉', '女人柔顺，男人通达，测孕育生子禄马光华。'],
    '壬丙': ['水蛇入火', '凶', '官灾刑禁，络绎不绝。'],
    '壬丁': ['干合蛇刑', '平', '文书牵连，贵人匆匆，男吉女凶。'],
    '壬戊': ['小蛇化龙', '吉', '男人发达，女产婴童。'],
    '壬己': ['反吟蛇刑', '凶', '官讼败诉，大祸将至，顺守可吉，妄动必凶。'],
    '壬庚': ['太白擒蛇', '平', '刑狱公平，立剖邪正。'],
    '壬辛': ['螣蛇相缠', '凶', '纵得吉门，亦不能安，若有谋望，被人欺瞒。'],
    '壬癸': ['幼女奸淫', '凶', '主有家丑外扬之事，门吉星凶，易反福为祸。'],
    '癸癸': ['天网四张', '凶', '主行人失伴，病讼皆伤。'],
    '癸乙': ['华盖逢星', '吉', '贵人禄位，常人平安。'],
    '癸丙': ['华盖悖师', '凶', '贵贱逢之皆不利，唯上人见喜。'],
    '癸丁': ['螣蛇夭矫', '凶', '文书官司，火焚难逃。'],
    '癸戊': ['天乙会合', '吉', '吉格，财喜婚姻，吉人赞助成合。'],
    '癸己': ['华盖地户', '凶', '男女测之，音信皆阻，躲灾避难方为吉。'],
    '癸庚': ['太白入网', '凶', '主以暴力争讼，自罹罪责。'],
    '癸辛': ['网盖天牢', '凶', '主官司败诉，死罪难逃；测病亦大凶。'],
    '癸壬': ['复见螣蛇', '凶', '主嫁娶重婚，后嫁无子，不保年华。']
  };

  var STAR_INFO = {
    '天蓬': ['大凶', '水', '主智谋、胆大、冒险、盗贼、水患。宜安边、筑城，不宜嫁娶、经商。'],
    '天芮': ['大凶', '土', '主疾病、病人、问题、学生。宜求师、交友、受道，忌嫁娶、争讼。'],
    '天冲': ['小吉', '木', '主勇猛、迅速、冲动、军警。宜出兵、报仇、竞技，不宜嫁娶、修造。'],
    '天辅': ['大吉', '木', '主文化、教育、文书、礼仪。宜求学、考试、婚姻、上书。'],
    '天禽': ['大吉', '土', '主中正、领导、统筹。百事皆宜。'],
    '天心': ['大吉', '金', '主医药、谋划、管理、领导。宜治病、求财、谋事。'],
    '天柱': ['小凶', '金', '主口舌、破坏、惊恐、言说。宜固守、屯兵，不宜出行、经商。'],
    '天任': ['小吉', '土', '主稳重、厚道、富贵、田产。宜祈福、嫁娶、求财、修造。'],
    '天英': ['小凶', '火', '主文明、光彩、血光、虚名。宜献策、上书、谒贵，不宜嫁娶、远行。']
  };
  var DOOR_INFO = {
    '开门': ['吉', '金', '主开创、事业、工作、官职、开张。宜求职、开业、出行、见贵。'],
    '休门': ['吉', '水', '主休养、贵人、人事、和合。宜求见贵人、上任、婚姻、修造。'],
    '生门': ['吉', '土', '主生机、财利、房产、营利。宜求财、经商、置业、婚嫁。'],
    '伤门': ['凶', '木', '主伤害、竞争、索债、捕猎。宜讨债、捕捉、竞技，忌出行、婚嫁。'],
    '杜门': ['平', '木', '主闭塞、隐藏、技术、保密。宜躲避、隐藏、修筑、技术，忌出行。'],
    '景门': ['平', '火', '主文书、考试、信息、宣传、血光。宜献策、考试、宣传、文书。'],
    '死门': ['凶', '土', '主死亡、终结、不动产、田地。宜吊丧、捕猎、刑戮，余事皆凶。'],
    '惊门': ['凶', '金', '主惊恐、官讼、口舌、是非。宜捕盗、争讼、掩捕，余事不宜。']
  };
  var GOD_INFO = {
    '值符': ['吉', '天乙贵神，诸神之首，主领导、贵人、权威，所临之宫百恶消散。'],
    '螣蛇': ['凶', '虚诈之神，主虚惊怪异、缠绕反复、梦境。'],
    '太阴': ['吉', '阴佑之神，主暗助、隐秘、谋划、女性贵人。'],
    '六合': ['吉', '护卫之神，主婚姻、合作、中介、交易。'],
    '白虎': ['凶', '凶猛之神，主刀兵、伤灾、道路、官司、强硬。'],
    '玄武': ['凶', '盗贼之神，主盗窃、欺骗、暧昧、小人。'],
    '九地': ['吉', '坚牢之神，主稳固、藏匿、田土、母亲，宜守。'],
    '九天': ['吉', '威悍之神，主高远、扬兵、出行、开拓，宜攻。']
  };

  // 常用用神
  var YONGSHEN = {
    '求测人自身': ['日干'], '所测之事': ['时干'], '求财': ['生门', '戊'], '事业工作': ['开门', '值符'], '考试文书': ['景门', '丁', '天辅'],
    '婚姻感情': ['六合', '乙', '庚'], '疾病': ['天芮', '天心', '乙'], '官司诉讼': ['惊门', '开门', '丁'], '出行': ['开门', '驿马'],
    '房产置业': ['生门', '九地'], '贵人领导': ['值符', '休门'], '失物寻人': ['时干', '六合', '玄武'], '合作交易': ['六合', '生门']
  };

  return {
    compute: compute, zhiRun: zhiRun, PALACE: PALACE, RING: RING, KEYING: KEYING, STAR_INFO: STAR_INFO, DOOR_INFO: DOOR_INFO,
    GOD_INFO: GOD_INFO, YONGSHEN: YONGSHEN, STAR_WX: STAR_WX, DOOR_WX: DOOR_WX, JU: JU, ZHI_PALACE: ZHI_PALACE
  };
});
