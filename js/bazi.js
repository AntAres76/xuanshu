/*
 * 八字排盘：四柱、十神、藏干、纳音、星运、神煞、五行旺衰、格局、喜用、大运、流年、流月、流日、合婚。
 * 依赖 lunar.js（Solar/Lunar）、ganzhi.js（GZ）、timeutil.js（TU）。
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    var L = require('./lib/lunar.js');
    module.exports = factory(L.Solar, L.Lunar, require('./ganzhi.js'), require('./timeutil.js'));
  } else {
    root.Bazi = factory(root.Solar, root.Lunar, root.GZ, root.TU);
  }
})(this, function (Solar, Lunar, GZ, TU) {
  'use strict';

  var LABELS = ['年柱', '月柱', '日柱', '时柱'];
  var JIE_ORDER = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];


  function solarToDate(s) { return TU.mk(s.getYear(), s.getMonth(), s.getDay(), s.getHour(), s.getMinute(), s.getSecond()); }
  function dateToSolar(dt) { var p = TU.parts(dt); return Solar.fromYmdHms(p.y, p.m, p.d, p.h, p.mi, p.s); }

  /** 解析输入，得到排盘用的公历时间 */
  function resolveTime(inp) {
    var y = +inp.y, m = +inp.m, d = +inp.d, h = +(inp.h || 0), mi = +(inp.mi || 0);
    var solar;
    if (inp.calendar === 'lunar') {
      var lu = Lunar.fromYmdHms(y, inp.leap ? -m : m, d, h, mi, 0);
      solar = lu.getSolar();
    } else {
      solar = Solar.fromYmdHms(y, m, d, h, mi, 0);
    }
    var adj = TU.adjust(solar.getYear(), solar.getMonth(), solar.getDay(), solar.getHour(), solar.getMinute(), {
      longitude: inp.longitude == null || inp.longitude === '' ? null : +inp.longitude,
      tz: inp.tz == null || inp.tz === '' ? 8 : +inp.tz,
      dst: !!inp.dst,
      trueSolar: !!inp.trueSolar
    });
    return { inputSolar: solar, adj: adj, solar: dateToSolar(adj.used) };
  }

  function hidePart(dayGan, zhi) {
    var hs = GZ.HIDE[zhi];
    var w = GZ.HIDE_WEIGHT[hs.length];
    return hs.map(function (g, i) {
      return { gan: g, wx: GZ.ganWx(g), shishen: GZ.shiShen(dayGan, g), weight: w[i], kind: ['本气', '中气', '余气'][i] };
    });
  }

  function makePillar(label, gz, dayGan, pos, ctx, isDayPillar) {
    var gan = gz.charAt(0), zhi = gz.charAt(1);
    return {
      label: label, gz: gz, gan: gan, zhi: zhi,
      ganWx: GZ.ganWx(gan), zhiWx: GZ.zhiWx(zhi),
      shishen: isDayPillar ? (ctx.gender === 1 ? '元男' : '元女') : GZ.shiShen(dayGan, gan),
      hide: hidePart(dayGan, zhi),
      nayin: GZ.naYin(gz),
      dishi: GZ.diShi(dayGan, zhi),       // 星运：日干在本支
      zizuo: GZ.diShi(gan, zhi),          // 自坐：本干在本支
      xunkong: GZ.xunKong(gz).join(''),
      xun: GZ.xun(gz),
      shensha: GZ.shenSha(gan, zhi, pos, ctx)
    };
  }

  /* ---------------- 五行力量与旺衰 ---------------- */
  var SEASON_FACTOR = { '旺': 1.2, '相': 1.1, '休': 1.0, '囚': 0.9, '死': 0.8 };
  function wuxingAnalysis(pillars, dayGan, monthZhi) {
    var count = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    var hideCount = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    var score = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    var zhiW = [1, 2, 1.2, 1];
    pillars.forEach(function (p, i) {
      count[p.ganWx]++; count[p.zhiWx]++;
      score[p.ganWx] += 1;
      p.hide.forEach(function (h) { hideCount[h.wx]++; score[h.wx] += h.weight * zhiW[i]; });
    });
    var wx = GZ.wangXiang(monthZhi);
    Object.keys(score).forEach(function (k) { score[k] = +(score[k] * SEASON_FACTOR[wx[k]]).toFixed(2); });
    var total = 0; Object.keys(score).forEach(function (k) { total += score[k]; });
    var pct = {}; Object.keys(score).forEach(function (k) { pct[k] = total ? Math.round(score[k] / total * 1000) / 10 : 0; });
    var missing = Object.keys(count).filter(function (k) { return count[k] === 0; });

    // 日主旺衰
    var me = GZ.ganWx(dayGan);
    var yin = GZ.WX[(GZ.wxIndex(me) + 4) % 5];
    var lei = {}; ['比劫', '印枭', '食伤', '财才', '官杀'].forEach(function (k) { lei[k] = 0; });
    Object.keys(score).forEach(function (k) { lei[GZ.wxToShenLei(dayGan, k)] += score[k]; });
    var help = lei['比劫'] + lei['印枭'];
    var ratio = total ? help / total : 0;
    var level;
    if (ratio >= 0.6) level = '身旺';
    else if (ratio >= 0.5) level = '偏强';
    else if (ratio >= 0.4) level = '中和';
    else if (ratio >= 0.3) level = '偏弱';
    else level = '身弱';

    // 得令、得地、得势
    var deLing = (wx[me] === '旺' || wx[me] === '相');
    var monthHide = GZ.HIDE[monthZhi];
    var deDi = pillars.some(function (p) {
      return p.hide.some(function (h, i) { return i < 2 && (h.wx === me || h.wx === yin); });
    });
    var helpGan = pillars.filter(function (p, i) { return i !== 2 && (p.ganWx === me || p.ganWx === yin); }).length;
    var deShi = helpGan >= 2;

    // 喜用（扶抑为主，参调候）
    var wxOf = function (l) {
      for (var i = 0; i < 5; i++) if (GZ.wxToShenLei(dayGan, GZ.WX[i]) === l) return GZ.WX[i];
    };
    var xi, ji, reason;
    if (ratio >= 0.5) {
      if (lei['印枭'] > lei['比劫']) { xi = ['财才', '食伤', '官杀']; reason = '日主偏强且印星重，宜财星破印，兼取食伤泄秀、官杀制身。'; }
      else { xi = ['官杀', '食伤', '财才']; reason = '日主偏强且比劫重，宜官杀制身，兼取食伤泄秀、财星耗身。'; }
      ji = ['印枭', '比劫'];
    } else if (ratio < 0.4) {
      var maxL = ['食伤', '财才', '官杀'].sort(function (a, b) { return lei[b] - lei[a]; })[0];
      if (maxL === '财才') { xi = ['比劫', '印枭']; reason = '日主偏弱而财星重，宜比劫帮身任财，次取印星生身。'; }
      else if (maxL === '官杀') { xi = ['印枭', '比劫']; reason = '日主偏弱而官杀重，宜印星化杀生身，次取比劫帮身。'; }
      else { xi = ['印枭', '比劫']; reason = '日主偏弱而食伤重，宜印星制食伤、生扶日主。'; }
      ji = ['官杀', '财才', '食伤'].filter(function (x) { return xi.indexOf(x) < 0; });
    } else {
      var sorted = GZ.WX.slice().sort(function (a, b) { return score[a] - score[b]; });
      xi = [GZ.wxToShenLei(dayGan, sorted[0]), GZ.wxToShenLei(dayGan, sorted[1])];
      ji = [GZ.wxToShenLei(dayGan, sorted[4])];
      reason = '日主中和，宜取命局中偏弱之五行以求流通平衡，忌最旺之五行再加强。';
    }
    var tiaohou = '';
    if ('亥子丑'.indexOf(monthZhi) >= 0) tiaohou = '生于冬月，气候寒冷，调候宜火暖局。';
    else if ('巳午未'.indexOf(monthZhi) >= 0) tiaohou = '生于夏月，气候炎燥，调候宜水润局。';
    else if ('寅卯辰'.indexOf(monthZhi) >= 0) tiaohou = '生于春月，木气当令，寒气未尽者可少取火。';
    else tiaohou = '生于秋月，金气当令，燥气重者可少取水润。';

    return {
      count: count, hideCount: hideCount, score: score, pct: pct, missing: missing, wangXiang: wx,
      lei: lei, ratio: Math.round(ratio * 1000) / 10, level: level,
      deLing: deLing, deDi: deDi, deShi: deShi,
      xi: xi.map(function (l) { return { lei: l, wx: wxOf(l) }; }),
      ji: ji.map(function (l) { return { lei: l, wx: wxOf(l) }; }),
      reason: reason, tiaohou: tiaohou
    };
  }

  /* ---------------- 格局（月令取格） ---------------- */
  function geJu(pillars, dayGan) {
    var mz = pillars[1].zhi;
    var hs = GZ.HIDE[mz];
    var benSS = GZ.shiShen(dayGan, hs[0]);
    var dayGz = pillars[2].gz;
    var extra = [];
    if (['庚辰', '庚戌', '壬辰', '戊戌'].indexOf(dayGz) >= 0) extra.push('魁罡格');
    if (GZ.LU[dayGan] === pillars[3].zhi) extra.push('归禄格（时上逢禄）');
    if (benSS === '比肩') return { name: '建禄格', basis: '月令' + mz + '为日主之禄（' + hs[0] + '）', extra: extra };
    if (benSS === '劫财') {
      return { name: GZ.isYang(dayGan) ? '羊刃格' : '月劫格', basis: '月令' + mz + '本气' + hs[0] + '为劫财', extra: extra };
    }
    var tou = [pillars[0].gan, pillars[1].gan, pillars[3].gan];
    for (var i = 0; i < hs.length; i++) {
      var ss = GZ.shiShen(dayGan, hs[i]);
      if (ss === '比肩' || ss === '劫财') continue;
      if (tou.indexOf(hs[i]) >= 0) {
        return { name: (ss === '偏印' ? '偏印格' : ss + '格'), basis: '月令' + mz + '藏' + hs[i] + '（' + ['本气', '中气', '余气'][i] + '）透出天干', extra: extra };
      }
    }
    return { name: benSS + '格', basis: '月令' + mz + '本气' + hs[0] + '，未透以本气论', extra: extra };
  }

  /* ---------------- 大运流年 ---------------- */
  function taiSuiRel(birthZhi, yearZhi) {
    var out = [];
    if (birthZhi === yearZhi) out.push('值太岁（本命年）');
    if (GZ.zhiPairRel(birthZhi, yearZhi).some(function (r) { return r.type === '冲'; })) out.push('冲太岁');
    var rels = GZ.zhiPairRel(birthZhi, yearZhi);
    if (rels.some(function (r) { return r.type === '刑'; })) out.push('刑太岁');
    if (rels.some(function (r) { return r.type === '害'; })) out.push('害太岁');
    if (rels.some(function (r) { return r.type === '破'; })) out.push('破太岁');
    if (rels.some(function (r) { return r.type === '合'; })) out.push('合太岁');
    return out;
  }

  function buildYun(ec, gender, yunSect, dayGan, ctx, pillars) {
    var yun = ec.getYun(gender, yunSect);
    var dys = yun.getDaYun(11);
    var items = pillars.map(function (p) { return { label: p.label, gan: p.gan, zhi: p.zhi }; });
    var res = {
      forward: yun.isForward(),
      startYear: yun.getStartYear(), startMonth: yun.getStartMonth(), startDay: yun.getStartDay(),
      startHour: yun.getStartHour ? yun.getStartHour() : 0,
      startSolar: yun.getStartSolar().toYmd(),
      daYun: []
    };
    dys.forEach(function (dy, idx) {
      var gz = dy.getGanZhi();
      var d = {
        index: idx, gz: gz, startYear: dy.getStartYear(), endYear: dy.getEndYear(),
        startAge: dy.getStartAge(), endAge: dy.getEndAge(), liuNian: [], xiaoYun: []
      };
      if (gz) {
        d.gan = gz.charAt(0); d.zhi = gz.charAt(1);
        d.ssGan = GZ.shiShen(dayGan, d.gan);
        d.ssZhi = GZ.shiShen(dayGan, GZ.HIDE[d.zhi][0]);
        d.hide = hidePart(dayGan, d.zhi);
        d.dishi = GZ.diShi(dayGan, d.zhi);
        d.zizuo = GZ.diShi(d.gan, d.zhi);
        d.nayin = GZ.naYin(gz);
        d.xunkong = GZ.xunKong(gz).join('');
        d.shensha = GZ.shenSha(d.gan, d.zhi, 4, ctx);
        d.relations = GZ.analyzeRelations(items.concat([{ label: '大运', gan: d.gan, zhi: d.zhi }]), { onlyWith: 4 });
      }
      dy.getLiuNian(10).forEach(function (ln) {
        var lgz = ln.getGanZhi();
        var g = lgz.charAt(0), z = lgz.charAt(1);
        var arr = items.slice();
        if (gz) arr.push({ label: '大运', gan: d.gan, zhi: d.zhi });
        arr.push({ label: '流年', gan: g, zhi: z });
        d.liuNian.push({
          year: ln.getYear(), age: ln.getAge(), gz: lgz, gan: g, zhi: z,
          ssGan: GZ.shiShen(dayGan, g), ssZhi: GZ.shiShen(dayGan, GZ.HIDE[z][0]),
          hide: hidePart(dayGan, z),
          dishi: GZ.diShi(dayGan, z), zizuo: GZ.diShi(g, z), nayin: GZ.naYin(lgz), xunkong: GZ.xunKong(lgz).join(''),
          shensha: GZ.shenSha(g, z, 5, ctx),
          taisui: taiSuiRel(ctx.yearZhi, z),
          relations: GZ.analyzeRelations(arr, { onlyWith: arr.length - 1 })
        });
      });
      if (idx === 0) {
        dy.getXiaoYun(10).forEach(function (xy) {
          var xgz = xy.getGanZhi();
          d.xiaoYun.push({ year: xy.getYear(), age: xy.getAge(), gz: xgz, ssGan: GZ.shiShen(dayGan, xgz.charAt(0)) });
        });
      }
      res.daYun.push(d);
    });
    // 交运年份尾数
    var first = res.daYun[1];
    if (first) {
      var t = first.startYear % 10;
      res.jiaoYun = '逢' + GZ.GAN[(t + 6) % 10] + '、' + GZ.GAN[(t + 1) % 10] + '年交运（公历年尾数 ' + t + '、' + ((t + 5) % 10) + '）';
    }
    return res;
  }

  /** 某年各节的交节时刻表 */
  function jieTimes(year) {
    var tbl = Lunar.fromYmd(year, 5, 1).getJieQiTable();
    var res = [];
    JIE_ORDER.forEach(function (name) {
      var s = (name === '小寒') ? tbl['XIAO_HAN'] : tbl[name];
      res.push({ name: name, solar: s });
    });
    res.push({ name: '立春', solar: tbl['LI_CHUN'] });
    return res;
  }

  /** 流月：以节分月 */
  function liuYue(year, dayGan, ctx) {
    var yg = GZ.JIAZI[((year - 4) % 60 + 60) % 60].charAt(0);
    var jt = jieTimes(year);
    var months = [];
    for (var i = 0; i < 12; i++) {
      var z = GZ.ZHI[(i + 2) % 12];
      var g = GZ.monthGanOfYear(yg, z);
      var gz = g + z;
      months.push({
        index: i, gz: gz, gan: g, zhi: z, jie: jt[i].name,
        start: jt[i].solar.toYmdHms(), end: jt[i + 1].solar.toYmdHms(),
        startYmd: jt[i].solar.toYmd(), endYmd: jt[i + 1].solar.toYmd(),
        ssGan: GZ.shiShen(dayGan, g), ssZhi: GZ.shiShen(dayGan, GZ.HIDE[z][0]),
        dishi: GZ.diShi(dayGan, z), nayin: GZ.naYin(gz),
        shensha: ctx ? GZ.shenSha(g, z, 6, ctx) : []
      });
    }
    return months;
  }

  /** 流日：从 startYmd 到 endYmd（不含） */
  function liuRi(startYmd, endYmd, dayGan) {
    var a = startYmd.split('-').map(Number), b = endYmd.split('-').map(Number);
    var s = Solar.fromYmd(a[0], a[1], a[2]), e = Solar.fromYmd(b[0], b[1], b[2]);
    var out = [];
    var guard = 0;
    while (s.toYmd() < e.toYmd() && guard++ < 40) {
      var l = s.getLunar();
      var gz = l.getDayInGanZhi();
      out.push({
        ymd: s.toYmd(), week: s.getWeekInChinese(), lunar: l.getMonthInChinese() + '月' + l.getDayInChinese(), gz: gz,
        ssGan: GZ.shiShen(dayGan, gz.charAt(0)), ssZhi: GZ.shiShen(dayGan, GZ.HIDE[gz.charAt(1)][0]),
        dishi: GZ.diShi(dayGan, gz.charAt(1)), jieqi: l.getJieQi()
      });
      s = s.next(1);
    }
    return out;
  }

  /* ---------------- 主函数 ---------------- */
  function compute(inp) {
    var gender = +inp.gender === 0 ? 0 : 1;
    var sect = +inp.sect === 2 ? 2 : 1;
    var yunSect = +inp.yunSect === 2 ? 2 : 1;
    var t = resolveTime(inp);
    var solar = t.solar;
    var lunar = solar.getLunar();
    var ec = lunar.getEightChar();
    ec.setSect(sect);
    var gzs = [ec.getYear(), ec.getMonth(), ec.getDay(), ec.getTime()];
    var dayGan = gzs[2].charAt(0);
    var ctx = {
      yearGan: gzs[0].charAt(0), yearZhi: gzs[0].charAt(1), monthZhi: gzs[1].charAt(1),
      dayGan: dayGan, dayZhi: gzs[2].charAt(1), dayGz: gzs[2], gender: gender,
      zhis: gzs.map(function (g) { return g.charAt(1); })
    };
    var pillars = gzs.map(function (gz, i) { return makePillar(LABELS[i], gz, dayGan, i, ctx, i === 2); });
    var items = pillars.map(function (p) { return { label: p.label, gan: p.gan, zhi: p.zhi }; });
    var relations = GZ.analyzeRelations(items);
    var wx = wuxingAnalysis(pillars, dayGan, ctx.monthZhi);
    var ge = geJu(pillars, dayGan);

    // 节气信息
    var prevJie = lunar.getPrevJie(false), nextJie = lunar.getNextJie(false);
    var bt = solarToDate(solar).getTime();
    var pj = solarToDate(prevJie.getSolar()).getTime(), nj = solarToDate(nextJie.getSolar()).getTime();
    var daysAfter = (bt - pj) / 86400000, daysBefore = (nj - bt) / 86400000;
    var sl = GZ.siLing(ctx.monthZhi, daysAfter);
    var prevQi = lunar.getPrevJieQi(false);

    function dh(x) { var d = Math.floor(x); var h = Math.floor((x - d) * 24); return d + '天' + h + '小时'; }

    var extra = {
      taiYuan: { gz: ec.getTaiYuan(), nayin: ec.getTaiYuanNaYin() },
      taiXi: { gz: ec.getTaiXi(), nayin: ec.getTaiXiNaYin() },
      mingGong: { gz: ec.getMingGong(), nayin: ec.getMingGongNaYin() },
      shenGong: { gz: ec.getShenGong(), nayin: ec.getShenGongNaYin() }
    };

    var yun = buildYun(ec, gender, yunSect, dayGan, ctx, pillars);

    return {
      input: inp,
      name: inp.name || '',
      gender: gender, sect: sect, yunSect: yunSect,
      inputSolar: t.inputSolar.toYmdHms(),
      solar: solar.toYmdHms(),
      adjNotes: t.adj.notes, trueSolar: t.adj.trueSolar,
      lunarText: lunar.getYearInChinese() + '年' + lunar.getMonthInChinese() + '月' + lunar.getDayInChinese() + ' ' + lunar.getTimeZhi() + '时',
      week: solar.getWeekInChinese(),
      shengxiao: lunar.getYearShengXiaoExact ? lunar.getYearShengXiaoExact() : lunar.getYearShengXiao(),
      xingzuo: solar.getXingZuo(),
      pillars: pillars, dayGan: dayGan, dayWx: GZ.ganWx(dayGan), ctx: ctx,
      relations: relations, wx: wx, geju: ge, extra: extra, yun: yun,
      jieqi: {
        prevJie: prevJie.getName(), prevJieTime: prevJie.getSolar().toYmdHms(),
        nextJie: nextJie.getName(), nextJieTime: nextJie.getSolar().toYmdHms(),
        after: dh(daysAfter), before: dh(daysBefore),
        prevQi: prevQi.getName(), prevQiTime: prevQi.getSolar().toYmdHms(),
        siling: sl.gan, silingTable: sl.table, daysAfter: daysAfter
      },
      wuhou: lunar.getHou() + ' ' + lunar.getWuHou()
    };
  }

  /* ---------------- 合婚 ---------------- */
  /* 分值是本软件设计的权重（古书没有打分），释义见 explain.js 的“合婚总分怎么算”。 */
  function heHun(a, b) {
    var items = [];
    var score = 60;
    var nameA = a.name || '甲方', nameB = b.name || '乙方';
    function add(cat, txt, delta, rel, calc) { items.push({ cat: cat, text: txt, delta: delta, rel: rel || null, calc: calc || '' }); score += delta; }
    function relKey(scope, type, x, y) { return 'rel|' + scope + '|' + type + '|' + x + '|' + y; }
    var ya = a.pillars[0], yb = b.pillars[0];
    var da = a.pillars[2], db = b.pillars[2];
    // 生肖（年支）
    var rz = GZ.zhiPairRel(ya.zhi, yb.zhi);
    var types = rz.map(function (r) { return r.type; });
    var yCalc = nameA + '年柱 ' + ya.gz + '（属' + GZ.SHENGXIAO[GZ.zi(ya.zhi)] + '），' + nameB + '年柱 ' + yb.gz + '（属' + GZ.SHENGXIAO[GZ.zi(yb.zhi)] + '）';
    var scored = 0;
    if (types.indexOf('合') >= 0) { add('生肖', '年支' + ya.zhi + yb.zhi + '六合，生肖相合', 8, relKey('地支', '合', ya.zhi, yb.zhi), yCalc); scored++; }
    if (types.indexOf('半合') >= 0) { add('生肖', '年支' + ya.zhi + yb.zhi + '半合，生肖相投', 6, relKey('地支', '半合', ya.zhi, yb.zhi), yCalc); scored++; }
    else if (types.indexOf('拱合') >= 0) { add('生肖', '年支' + ya.zhi + yb.zhi + '拱合，生肖相投', 6, relKey('地支', '拱合', ya.zhi, yb.zhi), yCalc); scored++; }
    if (types.indexOf('冲') >= 0) { add('生肖', '年支' + ya.zhi + yb.zhi + '相冲，性格易对立', -8, relKey('地支', '冲', ya.zhi, yb.zhi), yCalc); scored++; }
    if (types.indexOf('害') >= 0) { add('生肖', '年支' + ya.zhi + yb.zhi + '相害，易生嫌隙', -6, relKey('地支', '害', ya.zhi, yb.zhi), yCalc); scored++; }
    if (types.indexOf('刑') >= 0) { add('生肖', '年支' + ya.zhi + yb.zhi + '相刑', -5, relKey('地支', '刑', ya.zhi, yb.zhi), yCalc); scored++; }
    if (types.indexOf('破') >= 0) { add('生肖', '年支' + ya.zhi + yb.zhi + '相破', -3, relKey('地支', '破', ya.zhi, yb.zhi), yCalc); scored++; }
    if (!scored) add('生肖', '年支' + ya.zhi + yb.zhi + '无明显刑冲合害', 0, null, yCalc);
    // 年命纳音
    var na = GZ.naYinWx(ya.gz), nb = GZ.naYinWx(yb.gz);
    var r = GZ.wxRel(na, nb);
    var nyTxt = '年命纳音 ' + ya.nayin + '（' + na + '）与 ' + yb.nayin + '（' + nb + '）';
    var nyCalc = nameA + '年柱 ' + ya.gz + ' 纳音 ' + ya.nayin + '，五行 ' + na + '；' + nameB + '年柱 ' + yb.gz + ' 纳音 ' + yb.nayin + '，五行 ' + nb + '。两者关系：' + { '同': '同类', '生': '相生', '被生': '相生', '克': '相克', '被克': '相克' }[r] + '。';
    if (r === '同') add('纳音', nyTxt + '比和', 4, null, nyCalc);
    else if (r === '生' || r === '被生') add('纳音', nyTxt + '相生', 6, null, nyCalc);
    else add('纳音', nyTxt + '相克', -4, null, nyCalc);
    // 日干
    var dgCalc = nameA + '日干 ' + da.gan + '（' + GZ.ganWx(da.gan) + '），' + nameB + '日干 ' + db.gan + '（' + GZ.ganWx(db.gan) + '）';
    var rg = GZ.ganPairRel(da.gan, db.gan);
    if (rg.some(function (x) { return x.type === '合'; })) add('日柱', '日干' + da.gan + db.gan + '相合，情投意合', 10, relKey('天干', '合', da.gan, db.gan), dgCalc);
    if (rg.some(function (x) { return x.type === '冲'; })) add('日柱', '日干' + da.gan + db.gan + '相冲', -6, relKey('天干', '冲', da.gan, db.gan), dgCalc);
    var rdg = GZ.wxRel(GZ.ganWx(da.gan), GZ.ganWx(db.gan));
    if (!rg.length) {
      if (rdg === '生' || rdg === '被生') add('日柱', '日干' + da.gan + db.gan + '五行相生', 5, null, dgCalc);
      else if (rdg === '同') add('日柱', '日干' + da.gan + db.gan + '五行比和', 2, null, dgCalc);
      else add('日柱', '日干' + da.gan + db.gan + '五行相克', -2, null, dgCalc);
    }
    // 日支（夫妻宫）
    var dzCalc = nameA + '日支 ' + da.zhi + '（藏' + GZ.HIDE[da.zhi].join('') + '），' + nameB + '日支 ' + db.zhi + '（藏' + GZ.HIDE[db.zhi].join('') + '）';
    var rdz = GZ.zhiPairRel(da.zhi, db.zhi).map(function (x) { return x.type; });
    if (rdz.indexOf('合') >= 0) add('夫妻宫', '日支' + da.zhi + db.zhi + '六合，夫妻宫和谐', 8, relKey('地支', '合', da.zhi, db.zhi), dzCalc);
    else if (rdz.indexOf('半合') >= 0) add('夫妻宫', '日支' + da.zhi + db.zhi + '半合，夫妻宫和谐', 8, relKey('地支', '半合', da.zhi, db.zhi), dzCalc);
    if (rdz.indexOf('冲') >= 0) add('夫妻宫', '日支' + da.zhi + db.zhi + '相冲，夫妻宫不稳', -8, relKey('地支', '冲', da.zhi, db.zhi), dzCalc);
    if (rdz.indexOf('刑') >= 0) add('夫妻宫', '日支' + da.zhi + db.zhi + '相刑', -4, relKey('地支', '刑', da.zhi, db.zhi), dzCalc);
    else if (rdz.indexOf('害') >= 0) add('夫妻宫', '日支' + da.zhi + db.zhi + '相害', -4, relKey('地支', '害', da.zhi, db.zhi), dzCalc);
    // 五行互补
    var aXi = a.wx.xi.map(function (x) { return x.wx; }), bXi = b.wx.xi.map(function (x) { return x.wx; });
    function top2(w) { return GZ.WX.slice().sort(function (p, q) { return w.score[q] - w.score[p]; }).slice(0, 2); }
    var bTop = top2(b.wx), aTop = top2(a.wx);
    var m1 = aXi.filter(function (w) { return bTop.indexOf(w) >= 0; });
    var m2 = bXi.filter(function (w) { return aTop.indexOf(w) >= 0; });
    var wxCalc = nameA + '喜 ' + aXi.join('、') + '，最旺 ' + aTop.join('、') + '；' + nameB + '喜 ' + bXi.join('、') + '，最旺 ' + bTop.join('、') + '。';
    if (m1.length) add('五行', nameB + '命局旺' + m1.join('、') + '，正为' + nameA + '所喜', 6, null, wxCalc);
    if (m2.length) add('五行', nameA + '命局旺' + m2.join('、') + '，正为' + nameB + '所喜', 6, null, wxCalc);
    if (!m1.length && !m2.length) add('五行', '双方五行喜忌互补不明显', 0, null, wxCalc);
    // 配偶星（只展示，不计分）
    function spouseStar(p) {
      var want = p.gender === 1 ? ['正财', '偏财'] : ['正官', '七杀'];
      var c = 0;
      p.pillars.forEach(function (x, i) {
        if (i !== 2 && want.indexOf(x.shishen) >= 0) c++;
        x.hide.forEach(function (h) { if (want.indexOf(h.shishen) >= 0) c += 0.5; });
      });
      return c;
    }
    var sa = spouseStar(a), sb = spouseStar(b);
    items.push({ cat: '配偶星', text: nameA + '配偶星力量 ' + sa + '，' + nameB + ' ' + sb + '（男以财为妻，女以官为夫）', delta: 0, rel: null, calc: '天干每见一个算 1，地支藏干每见一个算 0.5，日干本身不算。' });
    var raw = score;
    score = Math.max(30, Math.min(99, score));
    var grade = score >= 85 ? '上等婚配' : score >= 72 ? '中上婚配' : score >= 60 ? '中等婚配' : score >= 48 ? '中下婚配' : '需多包容';
    return { score: score, raw: raw, grade: grade, items: items, nameA: nameA, nameB: nameB, cross: crossRel(a, b), gua: guaPair(a, b), spouse: [spouseInfo(a), spouseInfo(b)] };
  }

  /** 双方四柱交叉：一方的柱与另一方的柱之间的关系（半合、拱合、暗合、破从略，日柱对日柱除外） */
  function crossRel(a, b) {
    var rows = [];
    a.pillars.forEach(function (pa) {
      var cells = [];
      b.pillars.forEach(function (pb) {
        var list = [];
        GZ.ganPairRel(pa.gan, pb.gan).forEach(function (r) { list.push({ text: r.text, type: r.type, key: 'rel|天干|' + r.type + '|' + pa.gan + '|' + pb.gan }); });
        GZ.zhiPairRel(pa.zhi, pb.zhi).forEach(function (r) {
          if (['半合', '拱合', '暗合', '破'].indexOf(r.type) >= 0 && !(pa.label === '日柱' && pb.label === '日柱')) return;
          list.push({ text: r.text, type: r.type, key: 'rel|地支|' + r.type + '|' + pa.zhi + '|' + pb.zhi });
        });
        cells.push(list);
      });
      rows.push({ label: pa.label, gz: pa.gz, cells: cells });
    });
    return { head: b.pillars.map(function (p) { return { label: p.label, gz: p.gz }; }), rows: rows };
  }

  /** 夫妻宫 + 配偶星简述 */
  function spouseInfo(p) {
    var want = p.gender === 1 ? ['正财', '偏财'] : ['正官', '七杀'];
    var dz = p.pillars[2].zhi;
    var hide = p.pillars[2].hide.map(function (h) { return h.gan + h.shishen; });
    var inGong = p.pillars[2].hide.filter(function (h) { return want.indexOf(h.shishen) >= 0; }).length > 0;
    var stars = [];
    p.pillars.forEach(function (x, i) {
      if (i !== 2 && want.indexOf(x.shishen) >= 0) stars.push(x.label + '干 ' + x.gan + ' ' + x.shishen);
      x.hide.forEach(function (h) { if (want.indexOf(h.shishen) >= 0) stars.push(x.label + '支藏 ' + h.gan + ' ' + h.shishen); });
    });
    var conflict = p.relations.filter(function (r) { return r.scope === '地支' && r.who.indexOf('日柱') >= 0 && ['冲', '刑', '害', '合'].indexOf(r.type) >= 0; }).map(function (r) { return r.text; });
    return { name: p.name, dz: dz, hide: hide, inGong: inGong, stars: stars, want: want, conflict: conflict };
  }

  /* 八宅命卦（三元九星）：出生年按立春划分 */
  var GUA = { 1: '坎', 2: '坤', 3: '震', 4: '巽', 6: '乾', 7: '兑', 8: '艮', 9: '离' };
  var GUA_EAST = ['坎', '离', '震', '巽'];
  var YOUNIAN = {
    '乾': { '坎': '六煞', '艮': '天医', '震': '五鬼', '巽': '祸害', '离': '绝命', '坤': '延年', '兑': '生气', '乾': '伏位' },
    '坎': { '艮': '五鬼', '震': '天医', '巽': '生气', '离': '延年', '坤': '绝命', '兑': '祸害', '乾': '六煞', '坎': '伏位' },
    '艮': { '震': '六煞', '巽': '绝命', '离': '祸害', '坤': '生气', '兑': '延年', '乾': '天医', '坎': '五鬼', '艮': '伏位' },
    '震': { '巽': '延年', '离': '生气', '坤': '祸害', '兑': '绝命', '乾': '五鬼', '坎': '天医', '艮': '六煞', '震': '伏位' },
    '巽': { '离': '天医', '坤': '五鬼', '兑': '六煞', '乾': '祸害', '坎': '生气', '艮': '绝命', '震': '延年', '巽': '伏位' },
    '离': { '坤': '六煞', '兑': '五鬼', '乾': '绝命', '坎': '延年', '艮': '祸害', '震': '生气', '巽': '天医', '离': '伏位' },
    '坤': { '兑': '天医', '乾': '延年', '坎': '绝命', '艮': '生气', '震': '祸害', '巽': '五鬼', '离': '六煞', '坤': '伏位' },
    '兑': { '乾': '生气', '坎': '祸害', '艮': '延年', '震': '绝命', '巽': '六煞', '离': '五鬼', '坤': '天医', '兑': '伏位' }
  };
  function mingGua(year, gender) {
    var n = ((year - 1864) % 9 + 9) % 9, v;
    if (gender === 1) { v = ((1 - n - 1) % 9 + 9) % 9 + 1; if (v === 5) v = 2; }
    else { v = (5 - 1 + n) % 9 + 1; if (v === 5) v = 8; }
    var name = GUA[v];
    return { num: v, name: name, group: GUA_EAST.indexOf(name) >= 0 ? '东四命' : '西四命' };
  }
  function pillarYear(p) { // 立春年：由年柱干支反推公历年
    var sy = +p.solar.slice(0, 4), gz = p.pillars[0].gz;
    for (var y = sy - 1; y <= sy + 1; y++) if (GZ.JIAZI[((y - 4) % 60 + 60) % 60] === gz) return y;
    return sy;
  }
  function guaPair(a, b) {
    var ga = mingGua(pillarYear(a), a.gender), gb = mingGua(pillarYear(b), b.gender);
    var yn = YOUNIAN[ga.name][gb.name];
    return { a: ga, b: gb, you: yn, good: ['生气', '天医', '延年', '伏位'].indexOf(yn) >= 0 };
  }

  /** 四柱反查公历时间 */
  function reverse(y, m, d, t, sect, baseYear) {
    try {
      return Solar.fromBaZi(y, m, d, t, sect || 2, baseYear || 1801).map(function (s) { return s.toYmdHms(); });
    } catch (e) { return []; }
  }

  return { compute: compute, liuYue: liuYue, liuRi: liuRi, heHun: heHun, reverse: reverse, resolveTime: resolveTime, taiSuiRel: taiSuiRel, LABELS: LABELS, mingGua: mingGua, YOUNIAN: YOUNIAN };
});
