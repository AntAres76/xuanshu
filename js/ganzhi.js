/*
 * 干支基础：五行、十神、十二长生、藏干、刑冲合害、神煞。
 * 浏览器中挂在 window.GZ 上；在 Node 中 module.exports。
 */
(function (root, factory) {
  var o = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = o;
  else root.GZ = o;
})(this, function () {
  'use strict';

  var GAN = '甲乙丙丁戊己庚辛壬癸'.split('');
  var ZHI = '子丑寅卯辰巳午未申酉戌亥'.split('');
  var WX = ['木', '火', '土', '金', '水'];
  var GAN_WX = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
  var ZHI_WX = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
  var SHENGXIAO = '鼠牛虎兔龙蛇马羊猴鸡狗猪'.split('');
  // 地支藏干：本气、中气、余气
  var HIDE = {
    '子': ['癸'], '丑': ['己', '癸', '辛'], '寅': ['甲', '丙', '戊'], '卯': ['乙'],
    '辰': ['戊', '乙', '癸'], '巳': ['丙', '庚', '戊'], '午': ['丁', '己'], '未': ['己', '丁', '乙'],
    '申': ['庚', '壬', '戊'], '酉': ['辛'], '戌': ['戊', '辛', '丁'], '亥': ['壬', '甲']
  };
  var HIDE_WEIGHT = { 1: [1], 2: [0.7, 0.3], 3: [0.6, 0.3, 0.1] };
  var DISHI = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
  // 十干长生位（阳顺阴逆）
  var CHANGSHENG = { '甲': 11, '乙': 6, '丙': 2, '丁': 9, '戊': 2, '己': 9, '庚': 5, '辛': 0, '壬': 8, '癸': 3 };

  function gi(g) { return GAN.indexOf(g); }
  function zi(z) { return ZHI.indexOf(z); }
  function ganWx(g) { return WX[GAN_WX[gi(g)]]; }
  function zhiWx(z) { return WX[ZHI_WX[zi(z)]]; }
  function wxIndex(w) { return WX.indexOf(w); }
  function isYang(c) { var i = gi(c); if (i < 0) i = zi(c); return i % 2 === 0; }
  function charWx(c) { return gi(c) >= 0 ? ganWx(c) : zhiWx(c); }

  /** 六十甲子 */
  var JIAZI = [];
  for (var i = 0; i < 60; i++) JIAZI.push(GAN[i % 10] + ZHI[i % 12]);
  function jiaziIndex(gz) { return JIAZI.indexOf(gz); }
  /** 旬首与旬空 */
  function xun(gz) { var i = jiaziIndex(gz); return JIAZI[i - (i % 10)]; }
  function xunKong(gz) {
    var i = jiaziIndex(gz); var start = i - (i % 10);
    var z = (start + 10) % 12;
    return [ZHI[z], ZHI[(z + 1) % 12]];
  }

  /** 五行生克：a 对 b 的关系 */
  function wxRel(a, b) {
    var x = typeof a === 'number' ? a : wxIndex(a), y = typeof b === 'number' ? b : wxIndex(b);
    if (x === y) return '同';
    if ((x + 1) % 5 === y) return '生';
    if ((x + 2) % 5 === y) return '克';
    if ((y + 1) % 5 === x) return '被生';
    return '被克';
  }

  /** 十神：以日干 me 看 other（天干） */
  function shiShen(me, other) {
    var r = wxRel(ganWx(me), ganWx(other));
    var same = isYang(me) === isYang(other);
    switch (r) {
      case '同': return same ? '比肩' : '劫财';
      case '生': return same ? '食神' : '伤官';
      case '克': return same ? '偏财' : '正财';
      case '被克': return same ? '七杀' : '正官';
      default: return same ? '偏印' : '正印';
    }
  }
  var SHISHEN_SHORT = { '比肩': '比', '劫财': '劫', '食神': '食', '伤官': '伤', '偏财': '才', '正财': '财', '七杀': '杀', '正官': '官', '偏印': '枭', '正印': '印' };
  /** 十神所属五行（相对日主） */
  function shiShenWx(me, ss) {
    var m = wxIndex(ganWx(me));
    var off = { '比肩': 0, '劫财': 0, '食神': 1, '伤官': 1, '偏财': 2, '正财': 2, '七杀': 3, '正官': 3, '偏印': 4, '正印': 4 }[ss];
    return WX[(m + off) % 5];
  }
  /** 以日主看五行 → 十神类 */
  function wxToShenLei(me, w) {
    var r = wxRel(ganWx(me), w);
    return { '同': '比劫', '生': '食伤', '克': '财才', '被克': '官杀', '被生': '印枭' }[r];
  }

  /** 十二长生：天干 g 在地支 z */
  function diShi(g, z) {
    var s = CHANGSHENG[g], zz = zi(z);
    var off = isYang(g) ? (zz - s + 12) % 12 : (s - zz + 12) % 12;
    return DISHI[off];
  }

  /** 五行旺相休囚死（以月令五行为准） */
  function wangXiang(monthZhi) {
    var m = ZHI_WX[zi(monthZhi)];
    var res = {};
    res[WX[m]] = '旺';
    res[WX[(m + 1) % 5]] = '相';
    res[WX[(m + 4) % 5]] = '休';
    res[WX[(m + 3) % 5]] = '囚';
    res[WX[(m + 2) % 5]] = '死';
    return res;
  }

  /* ------------------------- 刑冲合害 ------------------------- */
  var GAN_HE = { '甲己': '土', '乙庚': '金', '丙辛': '水', '丁壬': '木', '戊癸': '火' };
  var GAN_CHONG = ['甲庚', '乙辛', '丙壬', '丁癸'];
  var ZHI_LIUHE = { '子丑': '土', '寅亥': '木', '卯戌': '火', '辰酉': '金', '巳申': '水', '午未': '土' };
  var ZHI_CHONG = ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'];
  var ZHI_HAI = ['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌'];
  var ZHI_PO = ['子酉', '卯午', '辰丑', '未戌', '寅亥', '巳申'];
  var ZHI_XING = { '子卯': '无礼之刑', '寅巳': '无恩之刑', '巳申': '无恩之刑', '寅申': '无恩之刑', '丑戌': '恃势之刑', '戌未': '恃势之刑', '丑未': '恃势之刑' };
  var ZI_XING = ['辰', '午', '酉', '亥'];
  var ZHI_ANHE = ['寅丑', '卯申', '午亥'];
  var SANHE = [['申', '子', '辰', '水'], ['亥', '卯', '未', '木'], ['寅', '午', '戌', '火'], ['巳', '酉', '丑', '金']];
  var SANHUI = [['寅', '卯', '辰', '木'], ['巳', '午', '未', '火'], ['申', '酉', '戌', '金'], ['亥', '子', '丑', '水']];

  function pairKey(map, a, b) {
    if (Array.isArray(map)) {
      if (map.indexOf(a + b) >= 0) return a + b;
      if (map.indexOf(b + a) >= 0) return b + a;
      return null;
    }
    if (map[a + b] !== undefined) return a + b;
    if (map[b + a] !== undefined) return b + a;
    return null;
  }

  /** 两天干关系 */
  function ganPairRel(a, b) {
    var out = [];
    var k = pairKey(GAN_HE, a, b);
    if (k) out.push({ type: '合', text: a + b + '合化' + GAN_HE[k] });
    if (pairKey(GAN_CHONG, a, b)) out.push({ type: '冲', text: a + b + '相冲' });
    return out;
  }
  /** 两地支关系 */
  function zhiPairRel(a, b) {
    var out = [], k;
    if (a === b) {
      if (ZI_XING.indexOf(a) >= 0) out.push({ type: '刑', text: a + a + '自刑', self: true });
      return out;
    }
    if ((k = pairKey(ZHI_LIUHE, a, b))) out.push({ type: '合', text: a + b + '六合' + ZHI_LIUHE[k] });
    if (pairKey(ZHI_CHONG, a, b)) out.push({ type: '冲', text: a + b + '相冲' });
    if ((k = pairKey(ZHI_XING, a, b))) out.push({ type: '刑', text: a + b + '相刑（' + ZHI_XING[k] + '）' });
    if (pairKey(ZHI_HAI, a, b)) out.push({ type: '害', text: a + b + '相害' });
    if (pairKey(ZHI_PO, a, b)) out.push({ type: '破', text: a + b + '相破' });
    if (pairKey(ZHI_ANHE, a, b)) out.push({ type: '暗合', text: a + b + '暗合' });
    SANHE.forEach(function (g) {
      var ia = g.indexOf(a), ib = g.indexOf(b);
      if (ia >= 0 && ib >= 0 && ia < 3 && ib < 3) {
        if (ia === 1 || ib === 1) out.push({ type: '半合', text: a + b + '半合' + g[3] + '局' });
        else out.push({ type: '拱合', text: a + b + '拱' + g[1] + '（' + g[3] + '局）' });
      }
    });
    return out;
  }

  /**
   * 分析一组柱的关系。items: [{label, gan, zhi}]
   * 返回 [{type, text, who:[labels]}]
   */
  function analyzeRelations(items, opts) {
    opts = opts || {};
    var res = [];
    var n = items.length;
    for (var a = 0; a < n; a++) {
      for (var b = a + 1; b < n; b++) {
        if (opts.onlyWith != null && a !== opts.onlyWith && b !== opts.onlyWith) continue;
        var A = items[a], B = items[b];
        if (A.gan && B.gan) ganPairRel(A.gan, B.gan).forEach(function (r) {
          res.push({ scope: '天干', type: r.type, text: r.text, who: [A.label, B.label], chars: [A.gan, B.gan] });
        });
        if (A.zhi && B.zhi) zhiPairRel(A.zhi, B.zhi).forEach(function (r) {
          res.push({ scope: '地支', type: r.type, text: r.text, who: [A.label, B.label], chars: [A.zhi, B.zhi] });
        });
      }
    }
    // 三合、三会、三刑
    function triple(groups, kind) {
      groups.forEach(function (g) {
        var who = [];
        for (var j = 0; j < 3; j++) {
          var found = null;
          for (var t = 0; t < n; t++) if (items[t].zhi === g[j]) { found = items[t].label; break; }
          if (!found) return;
          who.push(found);
        }
        if (opts.onlyWith != null && who.indexOf(items[opts.onlyWith].label) < 0) return;
        res.push({ scope: '地支', type: kind, text: g[0] + g[1] + g[2] + kind + g[3] + '局', who: who, chars: [g[0], g[1], g[2]] });
      });
    }
    triple(SANHE, '三合');
    triple(SANHUI, '三会');
    [['寅', '巳', '申', '无恩之刑'], ['丑', '戌', '未', '恃势之刑']].forEach(function (g) {
      var who = [];
      for (var j = 0; j < 3; j++) {
        var found = null;
        for (var t = 0; t < n; t++) if (items[t].zhi === g[j]) { found = items[t].label; break; }
        if (!found) return;
        who.push(found);
      }
      if (opts.onlyWith != null && who.indexOf(items[opts.onlyWith].label) < 0) return;
      res.push({ scope: '地支', type: '三刑', text: g[0] + g[1] + g[2] + '三刑（' + g[3] + '）', who: who, chars: [g[0], g[1], g[2]] });
    });
    return res;
  }

  /* ------------------------- 神煞 ------------------------- */
  function m10(str) { var o = {}; for (var i = 0; i < 10; i++) o[GAN[i]] = str[i]; return o; }
  function m12(str) { var o = {}; for (var i = 0; i < 12; i++) o[ZHI[i]] = str[i]; return o; }
  // 以干查支
  var TIANYI = { '甲': '丑未', '乙': '子申', '丙': '亥酉', '丁': '亥酉', '戊': '丑未', '己': '子申', '庚': '丑未', '辛': '午寅', '壬': '卯巳', '癸': '卯巳' };
  var TAIJI = { '甲': '子午', '乙': '子午', '丙': '卯酉', '丁': '卯酉', '戊': '辰戌丑未', '己': '辰戌丑未', '庚': '寅亥', '辛': '寅亥', '壬': '巳申', '癸': '巳申' };
  var WENCHANG = m10('巳午申酉申酉亥子寅卯');
  var GUOYIN = m10('戌亥丑寅丑寅辰巳未申');
  var FUXING = { '甲': '寅子', '乙': '卯丑', '丙': '寅子', '丁': '亥', '戊': '申', '己': '未', '庚': '午', '辛': '巳', '壬': '辰', '癸': '卯丑' };
  var LU = m10('寅卯巳午巳午申酉亥子');
  var YANGREN = m10('卯辰午未午未酉戌子丑');
  var JINYU = m10('辰巳未申未申戌亥丑寅');
  var HONGYAN = m10('午申寅未辰辰戌酉子申');
  var XUETANG = m10('亥午寅酉寅酉巳子申卯');
  var LIUXIA = m10('酉戌未申巳午辰卯亥寅');
  // 以月支查
  var TIANDE = m12('巳庚丁申壬辛亥甲癸寅丙乙');
  var TIANDEHE = m12('申乙壬巳丁丙寅己戊亥辛庚');
  var YUEDE = m12('壬庚丙甲壬庚丙甲壬庚丙甲');
  var YUEDEHE = m12('丁乙辛己丁乙辛己丁乙辛己');
  // 以三合局查（年支/日支）
  function sanheGroup(z) { var i = zi(z) % 4; return i; } // 0:申子辰 1:巳酉丑 2:寅午戌 3:亥卯未
  // 依组索引 0 申子辰, 1 巳酉丑, 2 寅午戌, 3 亥卯未
  var YIMA = ['寅', '亥', '申', '巳'];
  var TAOHUA = ['酉', '午', '卯', '子'];
  var HUAGAI = ['辰', '丑', '戌', '未'];
  var JIANGXING = ['子', '酉', '午', '卯'];
  var JIESHA = ['巳', '寅', '亥', '申'];
  var ZAISHA = ['午', '卯', '子', '酉'];
  var WANGSHEN = ['亥', '申', '巳', '寅'];
  // 以年支查
  var HONGLUAN = m12('卯寅丑子亥戌酉申未午巳辰');
  var TIANXI = m12('酉申未午巳辰卯寅丑子亥戌');
  function guChen(z) { var s = Math.floor(((zi(z) + 1) % 12) / 3); return ['寅', '巳', '申', '亥'][s]; }
  function guaSu(z) { var s = Math.floor(((zi(z) + 1) % 12) / 3); return ['戌', '丑', '辰', '未'][s]; }
  // 日柱类
  var KUIGANG = ['庚辰', '庚戌', '壬辰', '戊戌'];
  var YINCHA = ['丙子', '丁丑', '戊寅', '辛卯', '壬辰', '癸巳', '丙午', '丁未', '戊申', '辛酉', '壬戌', '癸亥'];
  var SHIE = ['甲辰', '乙巳', '壬申', '丙申', '丁亥', '庚辰', '戊戌', '癸亥', '辛巳', '己丑'];
  var GULUAN = ['乙巳', '丁巳', '辛亥', '戊申', '甲寅', '壬子', '丙午', '戊午'];
  var LIUXIU = ['丙午', '丁未', '戊子', '戊午', '己丑', '己未'];
  var SHILING = ['甲辰', '乙亥', '丙辰', '丁酉', '戊午', '庚戌', '庚寅', '辛亥', '壬寅', '癸未'];
  var BAZHUAN = ['甲寅', '乙卯', '丁未', '戊戌', '己未', '庚申', '辛酉', '癸丑'];
  var JIUCHOU = ['丁酉', '戊子', '戊午', '己卯', '己酉', '辛卯', '辛酉', '壬子', '壬午'];

  var SHENSHA_INFO = {
    '天乙贵人': '吉。最尊贵之神，逢凶化吉，多得贵人相助。',
    '太极贵人': '吉。聪明好学，喜神秘文化，有福寿。',
    '天德贵人': '吉。逢凶化吉，心地善良，一生少灾。',
    '天德合': '吉。与天德同功，化解灾厄。',
    '月德贵人': '吉。福分深厚，性情温和，少病灾。',
    '月德合': '吉。与月德同功。',
    '文昌贵人': '吉。聪明好学，利考试、文书、学术。',
    '国印贵人': '吉。掌印信，利公职、权柄，为人诚实。',
    '福星贵人': '吉。一生福禄，衣食无忧。',
    '禄神': '吉。主俸禄、衣食，身体健康。',
    '羊刃': '刚强之煞，性急好胜，喜官杀制之，忌冲。',
    '飞刃': '冲羊刃者，主意外血光，宜谨慎。',
    '金舆': '吉。主富贵、车马，男得贤妻。',
    '红艳': '风流多情，异性缘佳。',
    '学堂': '吉。主聪明，学业有成。',
    '流霞': '主血光、外伤，女命忌产厄。',
    '驿马': '主奔波、迁移、出行、变动。',
    '桃花': '又名咸池，主人缘、异性缘、风流。',
    '华盖': '主聪明孤高，喜艺术、宗教、玄学。',
    '将星': '吉。主权威、领导才能。',
    '劫煞': '凶。主是非、破财、意外，有制则化为权。',
    '灾煞': '凶。又名白虎煞，主血光、灾难。',
    '亡神': '凶。主心机深、官非，有制主谋略。',
    '红鸾': '吉。主婚恋喜事。',
    '天喜': '吉。主喜庆、婚姻、添丁。',
    '孤辰': '主孤独，男忌孤辰，婚姻宜晚。',
    '寡宿': '主孤寡，女忌寡宿，婚姻宜晚。',
    '元辰': '又名大耗，主破耗、不顺。',
    '勾煞': '主牵连、是非。',
    '绞煞': '主纠缠、是非。',
    '天医': '主健康，宜从医、心理、玄学。',
    '天赦': '大吉。逢凶化吉，赦罪解厄。',
    '魁罡': '性格刚强果断，聪明有领导力，忌冲克。',
    '阴差阳错': '主婚姻多波折，与外家不睦。',
    '十恶大败': '主钱财难聚，宜节俭。',
    '孤鸾煞': '主婚姻不顺，夫妻感情易生变。',
    '六秀日': '主聪明秀气，多才艺。',
    '十灵日': '主聪明灵慧，直觉敏锐。',
    '八专': '主情欲较重，感情复杂。',
    '九丑': '主婚恋易生波折、名誉之忧。',
    '天罗': '主阻滞、官非，男忌天罗。',
    '地网': '主牵绊、困扰，女忌地网。',
    '空亡': '所临之柱力量减弱，主虚、空、不实。',
    '丧门': '岁煞，主孝服、哀伤。',
    '吊客': '岁煞，主孝服、探病。',
    '披麻': '岁煞，主孝服。'
  };

  /**
   * 计算一个柱（可为原局四柱，或大运、流年）的神煞。
   * ctx: {yearGan, yearZhi, monthZhi, dayGan, dayZhi, dayGz, gender(1男0女), yearNaYinWx, zhis:[原局四支]}
   * pos: 0年 1月 2日 3时 4以后=运岁
   */
  function shenSha(gan, zhi, pos, ctx) {
    var out = [];
    function add(n) { if (out.indexOf(n) < 0) out.push(n); }
    var bases = [];
    // 以年干、日干查
    [ctx.yearGan, ctx.dayGan].forEach(function (g) {
      if (TIANYI[g].indexOf(zhi) >= 0) add('天乙贵人');
      if (TAIJI[g].indexOf(zhi) >= 0) add('太极贵人');
      if (WENCHANG[g] === zhi) add('文昌贵人');
      if (GUOYIN[g] === zhi) add('国印贵人');
      if (FUXING[g].indexOf(zhi) >= 0) add('福星贵人');
    });
    // 以日干查
    var dg = ctx.dayGan;
    if (LU[dg] === zhi) add('禄神');
    if (YANGREN[dg] === zhi) add('羊刃');
    if (ZHI[(zi(YANGREN[dg]) + 6) % 12] === zhi) add('飞刃');
    if (JINYU[dg] === zhi) add('金舆');
    if (HONGYAN[dg] === zhi) add('红艳');
    if (XUETANG[dg] === zhi) add('学堂');
    if (LIUXIA[dg] === zhi) add('流霞');
    // 以月支查
    var mz = ctx.monthZhi;
    if (TIANDE[mz] === gan || TIANDE[mz] === zhi) add('天德贵人');
    if (TIANDEHE[mz] === gan || TIANDEHE[mz] === zhi) add('天德合');
    if (YUEDE[mz] === gan) add('月德贵人');
    if (YUEDEHE[mz] === gan) add('月德合');
    if (ZHI[(zi(mz) + 11) % 12] === zhi) add('天医');
    // 以年支、日支查（三合局类），本柱不以自身为基
    [[ctx.yearZhi, 0], [ctx.dayZhi, 2]].forEach(function (b) {
      if (b[1] === pos) return;
      var gidx = sanheGroup(b[0]);
      if (YIMA[gidx] === zhi) add('驿马');
      if (TAOHUA[gidx] === zhi) add('桃花');
      if (HUAGAI[gidx] === zhi) add('华盖');
      if (JIANGXING[gidx] === zhi) add('将星');
      if (JIESHA[gidx] === zhi) add('劫煞');
      if (ZAISHA[gidx] === zhi) add('灾煞');
      if (WANGSHEN[gidx] === zhi) add('亡神');
    });
    // 以年支查
    var yz = ctx.yearZhi;
    if (pos !== 0) {
      if (HONGLUAN[yz] === zhi) add('红鸾');
      if (TIANXI[yz] === zhi) add('天喜');
      if (guChen(yz) === zhi) add('孤辰');
      if (guaSu(yz) === zhi) add('寡宿');
      var yangNanYinNv = (isYang(ctx.yearGan) ? 1 : 0) === (ctx.gender === 1 ? 1 : 0);
      var chong = (zi(yz) + 6) % 12;
      if (ZHI[(chong + (yangNanYinNv ? 1 : 11)) % 12] === zhi) add('元辰');
      if (ZHI[(zi(yz) + (yangNanYinNv ? 3 : 9)) % 12] === zhi) add('勾煞');
      if (ZHI[(zi(yz) + (yangNanYinNv ? 9 : 3)) % 12] === zhi) add('绞煞');
      if (pos >= 4) {
        if (ZHI[(zi(yz) + 2) % 12] === zhi) add('丧门');
        if (ZHI[(zi(yz) + 10) % 12] === zhi) add('吊客');
        if (ZHI[(zi(yz) + 9) % 12] === zhi) add('披麻');
      }
    }
    // 天罗地网
    var all = (ctx.zhis || []).slice();
    if (pos >= 4) all.push(zhi);
    if ((zhi === '戌' && all.indexOf('亥') >= 0) || (zhi === '亥' && all.indexOf('戌') >= 0)) add('天罗');
    if ((zhi === '辰' && all.indexOf('巳') >= 0) || (zhi === '巳' && all.indexOf('辰') >= 0)) add('地网');
    // 日柱专属
    var gz = gan + zhi;
    if (pos === 2) {
      if (KUIGANG.indexOf(gz) >= 0) add('魁罡');
      if (YINCHA.indexOf(gz) >= 0) add('阴差阳错');
      if (SHIE.indexOf(gz) >= 0) add('十恶大败');
      if (GULUAN.indexOf(gz) >= 0) add('孤鸾煞');
      if (LIUXIU.indexOf(gz) >= 0) add('六秀日');
      if (SHILING.indexOf(gz) >= 0) add('十灵日');
      if (BAZHUAN.indexOf(gz) >= 0) add('八专');
      if (JIUCHOU.indexOf(gz) >= 0) add('九丑');
      var season = Math.floor(((zi(mz) + 10) % 12) / 3); // 0春 1夏 2秋 3冬
      if (['戊寅', '甲午', '戊申', '甲子'][season] === gz) add('天赦');
    }
    // 空亡（以日柱旬空查，日柱自身不论）
    if (pos !== 2 && xunKong(ctx.dayGz).indexOf(zhi) >= 0) add('空亡');
    return out;
  }

  /* ------------------------- 人元司令（月令分野） ------------------------- */
  var SILING = {
    '寅': [['戊', 7], ['丙', 7], ['甲', 16]], '卯': [['甲', 10], ['乙', 20]], '辰': [['乙', 9], ['癸', 3], ['戊', 18]],
    '巳': [['戊', 5], ['庚', 9], ['丙', 16]], '午': [['丙', 10], ['己', 9], ['丁', 11]], '未': [['丁', 9], ['乙', 3], ['己', 18]],
    '申': [['己', 7], ['戊', 3], ['壬', 3], ['庚', 17]], '酉': [['庚', 10], ['辛', 20]], '戌': [['辛', 9], ['丁', 3], ['戊', 18]],
    '亥': [['戊', 7], ['甲', 5], ['壬', 18]], '子': [['壬', 10], ['癸', 20]], '丑': [['癸', 9], ['辛', 3], ['己', 18]]
  };
  function siLing(monthZhi, daysAfterJie) {
    var arr = SILING[monthZhi], acc = 0;
    for (var i = 0; i < arr.length; i++) {
      acc += arr[i][1];
      if (daysAfterJie < acc || i === arr.length - 1) return { gan: arr[i][0], table: arr };
    }
  }

  /** 五虎遁：年干 → 寅月天干 */
  function monthGanOfYear(yearGan, monthZhi) {
    var start = [2, 4, 6, 8, 0][gi(yearGan) % 5]; // 甲己丙寅
    var off = (zi(monthZhi) - 2 + 12) % 12;
    return GAN[(start + off) % 10];
  }
  /** 五鼠遁：日干 → 时干 */
  function hourGanOfDay(dayGan, hourZhi) {
    var start = [0, 2, 4, 6, 8][gi(dayGan) % 5];
    return GAN[(start + zi(hourZhi)) % 10];
  }

  var NAYIN = {};
  (function () {
    var names = ['海中金', '炉中火', '大林木', '路旁土', '剑锋金', '山头火', '涧下水', '城头土', '白蜡金', '杨柳木', '泉中水', '屋上土', '霹雳火', '松柏木', '长流水', '沙中金', '山下火', '平地木', '壁上土', '金箔金', '覆灯火', '天河水', '大驿土', '钗钏金', '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水'];
    for (var i = 0; i < 60; i++) NAYIN[JIAZI[i]] = names[Math.floor(i / 2)];
  })();
  function naYin(gz) { return NAYIN[gz]; }
  function naYinWx(gz) { var n = NAYIN[gz]; return n ? n.charAt(2) : ''; }

  var SHISHEN_INFO = {
    '比肩': '自我、兄弟、朋友、同辈、竞争。',
    '劫财': '兄弟姐妹、同辈竞争、破财、冲动。',
    '食神': '才艺、口福、享受、子女（女命）、温和表达。',
    '伤官': '才华、叛逆、表现欲、技术、子女（女命）。',
    '偏财': '横财、投资、父亲、情人（男命）、慷慨。',
    '正财': '正当收入、妻子（男命）、勤俭务实。',
    '七杀': '权威、压力、魄力、小人、儿子（男命）、情人（女命）。',
    '正官': '事业、地位、规范、丈夫（女命）、女儿（男命）。',
    '偏印': '偏门学问、灵感、继母、孤独、宗教玄学。',
    '正印': '母亲、学业、名誉、贵人、文凭、房产。'
  };

  var WX_INFO = {
    '木': { color: '青/绿', dir: '东', season: '春', organ: '肝胆', num: '3、8', taste: '酸', nature: '仁' },
    '火': { color: '红/紫', dir: '南', season: '夏', organ: '心、小肠', num: '2、7', taste: '苦', nature: '礼' },
    '土': { color: '黄/棕', dir: '中', season: '四季月', organ: '脾胃', num: '5、10', taste: '甘', nature: '信' },
    '金': { color: '白/金', dir: '西', season: '秋', organ: '肺、大肠', num: '4、9', taste: '辛', nature: '义' },
    '水': { color: '黑/蓝', dir: '北', season: '冬', organ: '肾、膀胱', num: '1、6', taste: '咸', nature: '智' }
  };

  return {
    GAN: GAN, ZHI: ZHI, WX: WX, SHENGXIAO: SHENGXIAO, HIDE: HIDE, HIDE_WEIGHT: HIDE_WEIGHT, DISHI: DISHI, JIAZI: JIAZI,
    gi: gi, zi: zi, ganWx: ganWx, zhiWx: zhiWx, charWx: charWx, wxIndex: wxIndex, isYang: isYang,
    jiaziIndex: jiaziIndex, xun: xun, xunKong: xunKong, wxRel: wxRel,
    shiShen: shiShen, SHISHEN_SHORT: SHISHEN_SHORT, shiShenWx: shiShenWx, wxToShenLei: wxToShenLei,
    diShi: diShi, wangXiang: wangXiang,
    ganPairRel: ganPairRel, zhiPairRel: zhiPairRel, analyzeRelations: analyzeRelations,
    shenSha: shenSha, SHENSHA_INFO: SHENSHA_INFO, siLing: siLing, SILING: SILING,
    monthGanOfYear: monthGanOfYear, hourGanOfDay: hourGanOfDay, naYin: naYin, naYinWx: naYinWx,
    SHISHEN_INFO: SHISHEN_INFO, WX_INFO: WX_INFO,
    LU: LU, YANGREN: YANGREN, ZHI_CHONG: ZHI_CHONG
  };
});
