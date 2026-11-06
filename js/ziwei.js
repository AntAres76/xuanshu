/*
 * 紫微斗数排盘（三合派通行安星法，以《紫微斗数全书》卷二诸安星诀为底本）。
 * 依赖 lunar.js、ganzhi.js、timeutil.js、bazi.js（共用真太阳时换算）。
 * 约定：宫位一律用地支序号 0=子 … 11=亥。
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    var L = require('./lib/lunar.js');
    module.exports = factory(L.Solar, L.Lunar, require('./ganzhi.js'), require('./bazi.js'));
  } else {
    root.Ziwei = factory(root.Solar, root.Lunar, root.GZ, root.Bazi);
  }
})(this, function (Solar, Lunar, GZ, Bazi) {
  'use strict';

  var Z = GZ.ZHI;
  function zi(z) { return Z.indexOf(z); }
  function md(n) { return ((n % 12) + 12) % 12; }

  var PALACE_NAMES = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母'];
  var JU = { '水': 2, '木': 3, '金': 4, '土': 5, '火': 6 };
  var JU_NAME = { 2: '水二局', 3: '木三局', 4: '金四局', 5: '土五局', 6: '火六局' };

  // 紫微系：相对紫微的逆行距离；天府系：相对天府的顺行距离（《全书》安南北斗诸星诀）
  var ZW_SERIES = { '紫微': 0, '天机': -1, '太阳': -3, '武曲': -4, '天同': -5, '廉贞': -8 };
  var TF_SERIES = { '天府': 0, '太阴': 1, '贪狼': 2, '巨门': 3, '天相': 4, '天梁': 5, '七杀': 6, '破军': 10 };
  var MAJORS = ['紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军'];
  var AUX = ['文昌', '文曲', '左辅', '右弼', '天魁', '天钺', '禄存', '天马'];
  var SHA = ['擎羊', '陀罗', '火星', '铃星', '地空', '地劫'];

  // 亮度表，下标从寅宫起（寅卯辰巳午未申酉戌亥子丑）。诸本小有出入，此取通行表。
  var BRIGHT = {
    '紫微': '旺旺得旺庙庙旺旺得旺平庙', '天机': '得旺利平庙陷得旺利平庙陷', '太阳': '旺庙旺旺旺得得平不陷陷不',
    '武曲': '得利庙平旺庙得利庙平旺庙', '天同': '利平平庙陷不旺平平庙旺不', '廉贞': '庙平利陷平利庙平利陷平利',
    '天府': '庙得庙得旺庙得旺庙得庙庙', '太阴': '旺陷陷陷不不利旺旺庙庙庙', '贪狼': '平利庙陷旺庙平利庙陷旺庙',
    '巨门': '庙庙陷旺旺不庙庙陷旺旺不', '天相': '庙陷得得庙得庙陷得得庙庙', '天梁': '庙庙庙陷庙旺陷得庙陷庙旺',
    '七杀': '庙旺庙平旺庙庙旺庙平旺庙', '破军': '得陷旺平庙旺得陷旺平庙旺',
    '文昌': '陷利得庙陷利得庙陷利得庙', '文曲': '平旺得庙陷旺得庙陷旺得庙',
    '火星': '庙利陷得庙利陷得庙利陷得', '铃星': '庙利陷得庙利陷得庙利陷得',
    '擎羊': ' 陷庙 陷庙 陷庙 陷庙', '陀罗': '陷 庙陷 庙陷 庙陷 庙'
  };
  var BRIGHT_RANK = { '庙': 6, '旺': 5, '得': 4, '利': 3, '平': 2, '不': 1, '陷': 0 };
  function bright(star, b) {
    var t = BRIGHT[star]; if (!t) return '';
    var c = t.charAt(md(b - 2));
    return c === ' ' ? '' : c;
  }

  // 四化：禄权科忌（通行本。庚干、壬干等诸本有异，见释义）
  var SIHUA = {
    '甲': ['廉贞', '破军', '武曲', '太阳'], '乙': ['天机', '天梁', '紫微', '太阴'], '丙': ['天同', '天机', '文昌', '廉贞'],
    '丁': ['太阴', '天同', '天机', '巨门'], '戊': ['贪狼', '太阴', '右弼', '天机'], '己': ['武曲', '贪狼', '天梁', '文曲'],
    '庚': ['太阳', '武曲', '太阴', '天同'], '辛': ['巨门', '太阳', '文曲', '文昌'], '壬': ['天梁', '紫微', '左辅', '武曲'],
    '癸': ['破军', '巨门', '太阴', '贪狼']
  };
  var HUA = ['禄', '权', '科', '忌'];

  var LUCUN = { '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午', '戊': '巳', '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子' };
  var KUI_YUE = { '甲': '丑未', '戊': '丑未', '庚': '丑未', '乙': '子申', '己': '子申', '辛': '午寅', '丙': '亥酉', '丁': '亥酉', '壬': '卯巳', '癸': '卯巳' };
  var TIANGUAN = { '甲': '未', '乙': '辰', '丙': '巳', '丁': '寅', '戊': '卯', '己': '酉', '庚': '亥', '辛': '酉', '壬': '戌', '癸': '午' };
  var TIANFU = { '甲': '酉', '乙': '申', '丙': '子', '丁': '亥', '戊': '卯', '己': '寅', '庚': '午', '辛': '巳', '壬': '午', '癸': '巳' };
  var TIANCHU = { '甲': '巳', '乙': '午', '丙': '子', '丁': '巳', '戊': '午', '己': '申', '庚': '寅', '辛': '午', '壬': '酉', '癸': '亥' };
  var JIELU = { '甲': '申酉', '己': '申酉', '乙': '午未', '庚': '午未', '丙': '辰巳', '辛': '辰巳', '丁': '寅卯', '壬': '寅卯', '戊': '子丑', '癸': '子丑' };
  // 年支三合组 0申子辰 1巳酉丑 2寅午戌 3亥卯未
  function group(b) { return b % 4; }
  var TIANMA = ['寅', '亥', '申', '巳'];
  var HUO_BASE = ['寅', '卯', '丑', '酉'], LING_BASE = ['戌', '戌', '卯', '戌'];
  var HUAGAI = ['辰', '丑', '戌', '未'], XIANCHI = ['酉', '午', '卯', '子'];
  var JIANGXING = ['子', '酉', '午', '卯'];
  var FEILIAN = '申酉戌巳午未寅卯辰亥子丑';
  var POSUI = '巳丑酉巳丑酉巳丑酉巳丑酉';
  var JIESHEN = '申申戌戌子子寅寅辰辰午午';
  var TIANWU = '巳申寅亥巳申寅亥巳申寅亥';
  var TIANYUE = '戌巳辰寅未卯亥未寅午戌寅';
  var YINSHA = '寅子戌申午辰寅子戌申午辰';
  var MINGZHU = { '子': '贪狼', '丑': '巨门', '寅': '禄存', '卯': '文曲', '辰': '廉贞', '巳': '武曲', '午': '破军', '未': '武曲', '申': '廉贞', '酉': '文曲', '戌': '禄存', '亥': '巨门' };
  var SHENZHU = { '子': '火星', '午': '火星', '丑': '天相', '未': '天相', '寅': '天梁', '申': '天梁', '卯': '天同', '酉': '天同', '辰': '文昌', '戌': '文昌', '巳': '天机', '亥': '天机' };
  var CHANGSHENG12 = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
  var CS_START = { 2: '申', 3: '亥', 4: '巳', 5: '申', 6: '寅' };
  var BOSHI12 = ['博士', '力士', '青龙', '小耗', '将军', '奏书', '飞廉', '喜神', '病符', '大耗', '伏兵', '官府'];
  var SUIQIAN12 = ['岁建', '晦气', '丧门', '贯索', '官符', '小耗', '大耗', '龙德', '白虎', '天德', '吊客', '病符'];
  var JIANGQIAN12 = ['将星', '攀鞍', '岁驿', '息神', '华盖', '劫煞', '灾煞', '天煞', '指背', '咸池', '月煞', '亡神'];
  var XIAOXIAN_START = ['戌', '未', '辰', '丑'];

  /** 解析出生时间 → 紫微所用的农历年、月、日、时 */
  function resolveLunar(inp) {
    var t = Bazi.resolveTime(inp);
    var s = t.solar;
    var hour = s.getHour();
    var late = hour >= 23;
    var ziMode = inp.ziMode === 'same' ? 'same' : 'next';
    var ds = late && ziMode === 'next' ? s.next(1) : s;
    var lu = ds.getLunar();
    var rawM = lu.getMonth(), leap = rawM < 0, m = Math.abs(rawM), d = lu.getDay();
    var leapMode = inp.leapMode === 'this' || inp.leapMode === 'next' ? inp.leapMode : 'mid';
    var mFix = m;
    if (leap && (leapMode === 'next' || (leapMode === 'mid' && d > 15))) mFix = m + 1;
    return {
      time: t, solar: s, late: late, ziMode: ziMode, lunar: lu, lunarYear: lu.getYear(), rawMonth: m, leap: leap, month: mFix, day: d, leapMode: leapMode,
      yearGz: lu.getYearInGanZhi(), hourIdx: Math.floor((hour + 1) / 2) % 12
    };
  }

  /** 紫微星所在宫：局数 j、生日 d。《全书》以"局"分列起紫微表，这里是等价的算式。 */
  function ziweiPos(j, d) {
    var k = 0;
    while ((d + k) % j !== 0) k++;
    var q = (d + k) / j;
    var pos = 2 + (q - 1);        // 寅起第 q 位
    pos += k % 2 === 0 ? k : -k;  // 补数为偶顺进，为奇逆退
    return { pos: md(pos), k: k, q: q };
  }

  function compute(inp) {
    var gender = +inp.gender === 0 ? 0 : 1;
    var L = resolveLunar(inp);
    var yg = L.yearGz.charAt(0), yz = L.yearGz.charAt(1), yb = zi(yz), hi = L.hourIdx, m = L.month, d = L.day;
    var yang = GZ.isYang(yg);
    var shun = (yang && gender === 1) || (!yang && gender === 0);
    var monthPos = md(2 + m - 1);
    var ming = md(monthPos - hi), shen = md(monthPos + hi);

    var palaces = [];
    for (var b = 0; b < 12; b++) {
      palaces.push({
        b: b, zhi: Z[b], gan: GZ.monthGanOfYear(yg, Z[b]), name: PALACE_NAMES[md(ming - b)], idx: md(ming - b),
        isMing: b === ming, isShen: b === shen,
        major: [], aux: [], sha: [], misc: [], changsheng: '', boshi: '', suiqian: '', jiangqian: '', xiaoxian: []
      });
    }
    var mingGz = palaces[ming].gan + palaces[ming].zhi;
    var nyWx = GZ.naYinWx(mingGz);
    var ju = JU[nyWx];
    var zp = ziweiPos(ju, d);
    var tf = md(4 - zp.pos);          // 天府与紫微以寅申为轴对称：两者序号和恒为 4（mod 12）

    var where = {};  // 星名 → 宫（文字星可落两宫的单列）
    function put(list, name, b0) {
      var bb = md(b0);
      palaces[bb][list].push({ name: name, bright: bright(name, bb), hua: '', b: bb });
      if (where[name] == null) where[name] = bb;
    }
    Object.keys(ZW_SERIES).forEach(function (s) { put('major', s, zp.pos + ZW_SERIES[s]); });
    Object.keys(TF_SERIES).forEach(function (s) { put('major', s, tf + TF_SERIES[s]); });

    // 辅星
    put('aux', '文昌', 10 - hi);
    put('aux', '文曲', 4 + hi);
    put('aux', '左辅', 4 + (m - 1));
    put('aux', '右弼', 10 - (m - 1));
    put('aux', '天魁', zi(KUI_YUE[yg].charAt(0)));
    put('aux', '天钺', zi(KUI_YUE[yg].charAt(1)));
    var lc = zi(LUCUN[yg]);
    put('aux', '禄存', lc);
    var g = group(yb);
    put('aux', '天马', zi(TIANMA[g]));
    // 煞星
    put('sha', '擎羊', lc + 1);
    put('sha', '陀罗', lc - 1);
    put('sha', '火星', zi(HUO_BASE[g]) + hi);
    put('sha', '铃星', zi(LING_BASE[g]) + hi);
    put('sha', '地劫', 11 + hi);
    put('sha', '地空', 11 - hi);

    // 杂曜
    function misc(n, bb) { put('misc', n, bb); }
    misc('红鸾', 3 - yb); misc('天喜', 3 - yb + 6);
    misc('天哭', 6 - yb); misc('天虚', 6 + yb);
    misc('龙池', 4 + yb); misc('凤阁', 10 - yb);
    misc('华盖', zi(HUAGAI[g])); misc('咸池', zi(XIANCHI[g]));
    misc('孤辰', zi(['寅', '巳', '申', '亥'][Math.floor(((yb + 1) % 12) / 3)]));
    misc('寡宿', zi(['戌', '丑', '辰', '未'][Math.floor(((yb + 1) % 12) / 3)]));
    misc('蜚廉', zi(FEILIAN.charAt(yb))); misc('破碎', zi(POSUI.charAt(yb)));
    misc('年解', 10 - yb); misc('天空', yb + 1);
    misc('天才', ming + yb); misc('天寿', shen + yb);
    misc('天刑', 9 + (m - 1)); misc('天姚', 1 + (m - 1));
    var mi = md(m - 1);
    misc('解神', zi(JIESHEN.charAt(mi))); misc('天巫', zi(TIANWU.charAt(mi)));
    misc('天月', zi(TIANYUE.charAt(mi))); misc('阴煞', zi(YINSHA.charAt(mi)));
    misc('台辅', 6 + hi); misc('封诰', 2 + hi);
    var zuo = where['左辅'], you = where['右弼'], chang = where['文昌'], qu = where['文曲'];
    misc('三台', zuo + (d - 1)); misc('八座', you - (d - 1));
    misc('恩光', chang + (d - 1) - 1); misc('天贵', qu + (d - 1) - 1);
    misc('天官', zi(TIANGUAN[yg])); misc('天福', zi(TIANFU[yg])); misc('天厨', zi(TIANCHU[yg]));
    misc('天伤', ming - 7); misc('天使', ming - 5);
    JIELU[yg].split('').forEach(function (z) { misc('截路', zi(z)); });
    GZ.xunKong(L.yearGz).forEach(function (z) { misc('旬空', zi(z)); });

    // 生年四化
    var sihua = [];
    SIHUA[yg].forEach(function (name, i) {
      var pb = where[name];
      if (pb == null) return;
      var P = palaces[pb];
      [P.major, P.aux].forEach(function (lst) { lst.forEach(function (s) { if (s.name === name) s.hua = HUA[i]; }); });
      sihua.push({ star: name, hua: HUA[i], b: pb, palace: P.name });
    });

    // 十二神
    var cs = zi(CS_START[ju]);
    CHANGSHENG12.forEach(function (n, i) { palaces[md(cs + (shun ? i : -i))].changsheng = n; });
    BOSHI12.forEach(function (n, i) { palaces[md(lc + (shun ? i : -i))].boshi = n; });
    SUIQIAN12.forEach(function (n, i) { palaces[md(yb + i)].suiqian = n; });
    var jx = zi(JIANGXING[g]);
    JIANGQIAN12.forEach(function (n, i) { palaces[md(jx + i)].jiangqian = n; });

    // 大限
    var dxFrom = inp.daxianFrom === 'book' ? (shun ? 1 : -1) : 0;
    var daxian = [];
    for (var i = 0; i < 12; i++) {
      var pb = md(ming + dxFrom + (shun ? i : -i));
      var item = { i: i, b: pb, gan: palaces[pb].gan, zhi: palaces[pb].zhi, palace: palaces[pb].name, from: ju + i * 10, to: ju + i * 10 + 9 };
      daxian.push(item);
      palaces[pb].daxian = [item.from, item.to];
    }
    // 小限
    var xs = zi(XIAOXIAN_START[g]);
    var xiaoxianStart = xs, xiaoDir = gender === 1 ? 1 : -1;
    for (var a = 1; a <= 96; a++) palaces[md(xs + (a - 1) * xiaoDir)].xiaoxian.push(a);

    var res = {
      input: inp, name: inp.name || '', gender: gender, L: L,
      yearGz: L.yearGz, yearGan: yg, yearZhi: yz, yang: yang, shun: shun,
      genderText: (yang ? '阳' : '阴') + (gender === 1 ? '男' : '女'),
      month: m, day: d, hourIdx: hi, hourZhi: Z[hi],
      monthPos: monthPos, ming: ming, shen: shen, mingGz: mingGz, nayin: GZ.naYin(mingGz), nyWx: nyWx, ju: ju, juName: JU_NAME[ju],
      zw: zp, tf: tf, palaces: palaces, where: where, sihua: sihua, daxian: daxian,
      xiaoxianStart: xiaoxianStart, xiaoDir: xiaoDir,
      mingzhu: MINGZHU[Z[ming]], shenzhu: SHENZHU[yz],
      laiyin: findLaiyin(palaces, yg)
    };
    res.patterns = detectPatterns(res);
    return res;
  }

  /** 来因宫：宫干与生年干相同之宫（子丑两宫的宫干可能重复，只取寅至亥一组） */
  function findLaiyin(palaces, yg) {
    for (var i = 0; i < 10; i++) { var b = md(2 + i); if (palaces[b].gan === yg) return b; }
    return null;
  }

  /* ---------- 运限 ---------- */
  function yearGz(y) { return GZ.JIAZI[((y - 4) % 60 + 60) % 60]; }
  function nominalAge(res, y) { return y - res.L.lunarYear + 1; }
  function daxianOfAge(res, age) {
    for (var i = 0; i < res.daxian.length; i++) { var d = res.daxian[i]; if (age >= d.from && age <= d.to) return d; }
    return null;
  }
  function xiaoxianBranch(res, age) { return md(res.xiaoxianStart + (age - 1) * res.xiaoDir); }

  /** 以 anchor 为"运命宫"得到一轮运的十二宫名与四化 */
  function overlay(res, anchor, stem) {
    var names = {}; res.palaces.forEach(function (P) { names[P.b] = PALACE_NAMES[md(anchor - P.b)]; });
    var hua = stem ? SIHUA[stem].map(function (s, i) { return { star: s, hua: HUA[i], b: res.where[s], palace: res.palaces[res.where[s]].name }; }) : [];
    return { anchor: anchor, names: names, stem: stem, hua: hua };
  }
  /** 斗君（流年正月所在宫）：流年太岁宫起正月逆至生月，再从该宫起子时顺至生时 */
  function douJun(res, y) { return md(zi(yearGz(y).charAt(1)) - (res.month - 1) + res.hourIdx); }
  function liuYue(res, y) {
    var gz = yearGz(y), dj = douJun(res, y), out = [];
    for (var k = 1; k <= 12; k++) {
      var z = Z[md(2 + k - 1)], stem = GZ.monthGanOfYear(gz.charAt(0), z);
      out.push({ k: k, b: md(dj + k - 1), gz: stem + z, stem: stem });
    }
    return out;
  }

  /** 三方四正：本宫、对宫、两个三合宫 */
  function sanFang(b) { return [md(b), md(b + 4), md(b - 4), md(b + 6)]; }

  /** 宫干飞化：某宫宫干令哪四颗星化禄权科忌，它们分别落在哪宫 */
  function feiHua(res, b) {
    var P = res.palaces[b];
    return SIHUA[P.gan].map(function (s, i) {
      var t = res.where[s];
      return { star: s, hua: HUA[i], b: t, palace: res.palaces[t].name, self: t === b, opp: t === md(b + 6) };
    });
  }

  /* ---------- 格局 ---------- */
  function detectPatterns(r) {
    var out = [], P = r.palaces, m = r.ming, w = r.where;
    function has(b, n) {
      var p = P[md(b)];
      return p.major.concat(p.aux, p.sha, p.misc).some(function (s) { return s.name === n; });
    }
    function inM(n) { return has(m, n); }
    function all(b, arr) { return arr.every(function (n) { return has(b, n); }); }
    var sf = sanFang(m);
    function inSF(n) { return sf.some(function (b) { return has(b, n); }); }
    function hua(k) { for (var i = 0; i < r.sihua.length; i++) if (r.sihua[i].hua === k) return r.sihua[i]; return null; }
    function huaIn(k, bs) { var h = hua(k); return !!h && bs.indexOf(h.b) >= 0; }
    function jia(b, x, y) { return (has(b - 1, x) && has(b + 1, y)) || (has(b - 1, y) && has(b + 1, x)); }
    function add(key, name, level, why) { out.push({ key: key, name: name, level: level, why: why }); }
    var mz = Z[m], noMajor = P[m].major.length === 0;
    function mZ(s) { return s.indexOf(mz) >= 0; }
    var br = function (n) { return bright(n, w[n]); };
    var strong = function (n) { return ['庙', '旺'].indexOf(br(n)) >= 0; };
    var weak = function (n) { return ['陷', '不'].indexOf(br(n)) >= 0; };

    if (all(m, ['紫微', '天府'])) add('紫府同宫', '紫府同宫', '吉', '紫微、天府同在命宫（' + mz + '）。');
    if (inM('紫微') && (inM('左辅') || inM('右弼'))) add('君臣庆会', '君臣庆会', '吉', '紫微守命，左辅/右弼同宫。');
    if (inM('紫微') && !(inM('左辅') || inM('右弼')) && inSF('左辅') && inSF('右弼')) add('辅弼拱主', '辅弼拱主', '吉', '紫微守命，左辅、右弼在三方四正来拱。');
    if (inM('紫微') && jia(m, '左辅', '右弼')) add('辅弼拱主', '辅弼夹帝', '吉', '紫微守命，左辅、右弼分居前后两宫相夹。');
    if (inM('紫微') && mz === '午' && !inM('擎羊') && !inM('陀罗') && !inM('火星') && !inM('铃星')) add('紫微居午', '紫微居午', '吉', '紫微在午宫守命，且无四煞同宫。');
    if (inM('天府') && mz === '戌') add('天府临戌', '天府临戌', '吉', '天府在戌宫守命。');
    if (!inM('天府') && !inM('天相') && sf.indexOf(w['天府']) >= 0 && sf.indexOf(w['天相']) >= 0) add('府相朝垣', '府相朝垣', '吉', '天府、天相不在命宫，而在三方四正朝向命宫。');
    if (!inM('紫微') && !inM('天府') && sf.indexOf(w['紫微']) >= 0 && sf.indexOf(w['天府']) >= 0) add('紫府朝垣', '紫府朝垣', '吉', '紫微、天府在三方四正朝向命宫。');
    if (inM('七杀') && '寅申'.indexOf(mz) >= 0) add('七杀朝斗', mz === '寅' ? '七杀仰斗' : '七杀朝斗', '吉', '七杀在' + mz + '宫守命，对宫紫微、天府同宫。');
    if (inM('太阳') && mz === '午') add('日丽中天', '日丽中天（金灿光辉）', '吉', '太阳在午宫守命。');
    if (inM('太阳') && mz === '卯') add('日照雷门', '日照雷门（日出扶桑）', '吉', '太阳在卯宫守命。');
    if (inM('太阴') && mz === '亥') add('月朗天门', '月朗天门', '吉', '太阴在亥宫守命。');
    if (inM('太阴') && mz === '子') add('水澄桂萼', '水澄桂萼', '吉', '太阴在子宫守命。');
    if (P.filter(function (x) { return x.name === "田宅"; })[0].zhi === "子" && has(0, "太阴")) add('月生沧海', '月生沧海', '吉', '太阴在子宫坐田宅宫。');
    if (all(m, ['太阳', '太阴'])) add('日月同临', '日月同临', '吉', '太阳、太阴同守命宫（' + mz + '）。');
    if (jia(m, '太阳', '太阴')) add('日月夹命', '日月夹命', '吉', '太阳、太阴分居命宫前后两宫。');
    if (inSF('太阳') && inSF('太阴') && strong('太阳') && strong('太阴')) add('日月并明', '日月并明', '吉', '太阳（' + br('太阳') + '）、太阴（' + br('太阴') + '）都在三方四正内且庙旺。');
    if (inSF('太阳') && inSF('太阴') && weak('太阳') && weak('太阴')) add('日月反背', '日月反背', '凶', '太阳（' + br('太阳') + '）、太阴（' + br('太阴') + '）都在三方四正内而失辉。');
    if (noMajor && mz === '未' && Z[w['太阳']] === '卯' && Z[w['太阴']] === '亥') add('明珠出海', '明珠出海', '吉', '命立未宫无主星，太阳在卯、太阴在亥，三合来照。');
    if (['天机', '太阴', '天同', '天梁'].every(inSF)) add('机月同梁', '机月同梁', '平', '天机、太阴、天同、天梁四星全在命宫三方四正。');
    if (['七杀', '破军', '贪狼'].every(inSF)) add('杀破狼', '杀破狼', '平', '七杀、破军、贪狼全在命宫三方四正。');
    if (inM('贪狼') && inM('火星')) add('火贪', '火贪格（贪火相逢）', '吉', '贪狼与火星同守命宫。');
    if (inM('贪狼') && inM('铃星')) add('铃贪', '铃贪格', '吉', '贪狼与铃星同守命宫。');
    if (all(m, ['武曲', '贪狼'])) add('武贪同行', '武贪同行', '平', '武曲、贪狼同守命宫（' + mz + '）。');
    if (all(m, ['巨门', '天机'])) add('巨机同宫', '巨机同宫', '吉', '巨门、天机同守命宫（' + mz + '）。');
    if (all(m, ['巨门', '太阳'])) add('巨日同宫', '巨日同宫', '吉', '巨门、太阳同守命宫（' + mz + '）。');
    var lu0 = sf.indexOf(w['禄存']) >= 0 || huaIn('禄', sf);
    if (inSF('太阳') && inSF('天梁') && inSF('文昌') && lu0) add('阳梁昌禄', '阳梁昌禄', '吉', '太阳、天梁、文昌与禄星（禄存或化禄）会于三方四正。');
    if (huaIn('禄', sf) && huaIn('权', sf) && huaIn('科', sf)) add('三奇嘉会', '三奇嘉会（科权禄拱）', '吉', '生年化禄、化权、化科全在命宫三方四正。');
    if (huaIn('禄', [m]) && huaIn('权', [m])) add('权禄生逢', '权禄生逢', '吉', '化禄、化权同守命宫。');
    for (var q = 0; q < 4; q++) if (has(sf[q], '天马') && (has(sf[q], '禄存') || huaIn('禄', [sf[q]]))) { add('禄马交驰', '禄马交驰', '吉', P[sf[q]].name + '（' + P[sf[q]].zhi + '）禄星与天马同宫，且在三方四正内。'); break; }
    if (jia(m, '文昌', '文曲')) add('昌曲夹命', '昌曲夹命', '吉', '文昌、文曲分居命宫前后两宫。');
    if (jia(m, '左辅', '右弼') && !inM('紫微')) add('左右夹命', '左右夹命', '吉', '左辅、右弼分居命宫前后两宫。');
    if ((inM('天魁') && sf.indexOf(w['天钺']) >= 0) || (inM('天钺') && sf.indexOf(w['天魁']) >= 0)) add('坐贵向贵', '坐贵向贵', '吉', '天魁、天钺一守命宫，一在三方四正来拱。');
    if (inM('巨门') && '子午'.indexOf(mz) >= 0) add('石中隐玉', '石中隐玉', '吉', '巨门在' + mz + '宫守命。');
    if (inM('破军') && '子午'.indexOf(mz) >= 0) add('破军子午', '子午破军', '吉', '破军在' + mz + '宫守命。');
    if (inM('天梁') && mz === '午') add('梁居午位', '梁居午位', '吉', '天梁在午宫守命。');
    if (all(m, ['天同', '天梁']) && '寅申'.indexOf(mz) >= 0) add('寅申同梁', '同梁寅申', '吉', '天同、天梁在' + mz + '宫同守命。');
    if (inM('贪狼') && '亥子'.indexOf(mz) >= 0) add('泛水桃花', '泛水桃花', '平', '贪狼在' + mz + '宫守命。');
    if (inM('贪狼') && (inM('擎羊') || inM('天刑'))) add('风流彩杖', '风流彩杖', '平', '贪狼与' + (inM('擎羊') ? '擎羊' : '天刑') + '同守命宫。');
    if (all(m, ['紫微', '贪狼']) && '卯酉'.indexOf(mz) >= 0) add('极居卯酉', '极居卯酉（桃花犯主）', '平', '紫微、贪狼在' + mz + '宫同守命。');
    if (inM('廉贞') && '卯酉'.indexOf(mz) >= 0) add('贞居卯酉', '贞居卯酉', '平', '廉贞在' + mz + '宫守命。');
    if (inM('紫微') && '辰戌'.indexOf(mz) >= 0) add('紫微辰戌', '紫微辰戌遇破军', '平', '紫微在' + mz + '宫守命，破军在对宫。');
    if (all(m, ['廉贞', '七杀'])) add('廉杀同宫', '廉贞七杀同宫', '平', '廉贞、七杀同守命宫（' + mz + '）。');
    if (inM('巨门') && '辰戌'.indexOf(mz) >= 0) add('巨门辰戌', '巨门辰戌', r.yearGan === '辛' ? '吉' : '凶', '巨门在' + mz + '宫守命' + (r.yearGan === '辛' ? '，辛年生人巨门化禄。' : '。'));
    if (inM('天同') && mz === '戌') add('天同戌宫', '天同戌宫反背', r.yearGan === '丁' ? '吉' : '平', '天同在戌宫守命' + (r.yearGan === '丁' ? '，丁年生人天同化权。' : '。'));
    if (inM('文昌') && inM('贪狼')) add('昌贪', '昌贪居命', '凶', '文昌、贪狼同守命宫。');
    if (inM('天相') && inM('廉贞') && (inM('擎羊') || inM('天刑'))) add('刑囚夹印', '刑囚夹印', '凶', '廉贞、天相同宫，又见' + (inM('擎羊') ? '擎羊' : '天刑') + '。');
    else if (inM('天刑') && inM('廉贞')) add('刑囚夹印', '刑囚夹印', '平', '天刑、廉贞同临命宫。');
    if (inM('天相') && jia(m, '武曲', '天梁')) add('财荫夹印', '财荫夹印', '吉', '天相守命，武曲、天梁相夹。');
    if (inM('禄存') && jia(m, '天梁', '天相')) add('财印夹禄', '财印夹禄', '吉', '禄存守命，天梁、天相相夹。');
    if (inM('武曲') && jia(m, '太阳', '太阴')) add('日月夹财', '日月夹财', '吉', '武曲守命，太阳、太阴相夹。');
    if (inM('天马') && jia(m, '武曲', '禄存')) add('财禄夹马', '财禄夹马', '吉', '天马守命，武曲、禄存相夹。');
    if (inM('擎羊') && (mz === '午' || inM('天马'))) add('马头带箭', '马头带箭', '平', mz === '午' ? '擎羊在午宫守命（午属马）。' : '擎羊与天马同守命宫。');
    if (inM('擎羊') && '辰戌丑未'.indexOf(mz) >= 0) add('羊刃入庙', '擎羊入庙', '平', '擎羊在四墓宫（' + mz + '）守命。');
    if (inM('武曲') && mz === '卯') add('武曲守垣', '武曲守垣', '吉', '武曲在卯宫守命。');
    if (noMajor) add('命无正曜', '命无正曜', '平', '命宫没有十四主星，需借对宫（' + P[md(m + 6)].zhi + '宫）主星来看。');
    var ji = hua('忌');
    if (ji && ji.b === w['禄存']) add('羊陀夹忌', '羊陀夹忌', '凶', '化忌与禄存同落' + ji.palace + '，前后被擎羊、陀罗相夹。');
    var shaInM = ['擎羊', '陀罗', '火星', '铃星'].filter(inM);
    if (shaInM.length >= 2 && shaInM.every(function (n) { return ['陷', '不', ''].indexOf(br(n)) >= 0; })) add('君子在野', '君子在野', '凶', '命宫见' + shaInM.join('、') + '，且落陷。');
    if ((inM('旬空') || inM('截路')) && inM('廉贞')) add('生不逢时', '生不逢时', '凶', '命宫逢' + (inM('旬空') ? '旬空' : '截路') + '，又见廉贞。');
    if (inM('天马') && (inM('旬空') || inM('截路'))) add('马落空亡', '马落空亡', '平', '天马守命而逢空亡。');
    if (inM('禄存') && (inM('旬空') || inM('截路')) && (inM('地空') || inM('地劫'))) add('禄逢两杀', '禄逢两杀', '凶', '禄存坐空亡，又逢地空/地劫。');
    if (inM('禄存') && huaIn('禄', [m]) && (inM('地空') || inM('地劫'))) add('两重华盖', '两重华盖', '平', '禄存、化禄同坐命宫，又遇地空/地劫。');
    if (inM('破军') && weak('破军')) add('破军陷命', '破军陷地守命', '凶', '破军在' + mz + '宫（' + br('破军') + '）守命。');
    return out;
  }

  return {
    compute: compute, resolveLunar: resolveLunar, ziweiPos: ziweiPos,
    yearGz: yearGz, nominalAge: nominalAge, daxianOfAge: daxianOfAge, xiaoxianBranch: xiaoxianBranch, overlay: overlay, douJun: douJun, liuYue: liuYue,
    sanFang: sanFang, feiHua: feiHua, md: md, bright: bright,
    PALACE_NAMES: PALACE_NAMES, MAJORS: MAJORS, AUX: AUX, SHA: SHA, SIHUA: SIHUA, HUA: HUA, ZW_SERIES: ZW_SERIES, TF_SERIES: TF_SERIES, BRIGHT: BRIGHT, BRIGHT_RANK: BRIGHT_RANK,
    MINGZHU: MINGZHU, SHENZHU: SHENZHU, LUCUN: LUCUN, KUI_YUE: KUI_YUE, TIANMA: TIANMA, HUO_BASE: HUO_BASE, LING_BASE: LING_BASE, JU_NAME: JU_NAME, CS_START: CS_START, XIAOXIAN_START: XIAOXIAN_START, group: group
  };
});
