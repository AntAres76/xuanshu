/* 运行：node tests/run.js */
'use strict';
var assert = require('assert');
var GZ = require('../js/ganzhi.js');
var TU = require('../js/timeutil.js');
var Bazi = require('../js/bazi.js');
var Qimen = require('../js/qimen.js');

var n = 0, fail = 0;
function t(name, fn) {
  n++;
  try { fn(); console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + e.message); }
}

console.log('干支基础');
t('十神', function () {
  assert.strictEqual(GZ.shiShen('甲', '庚'), '七杀');
  assert.strictEqual(GZ.shiShen('甲', '辛'), '正官');
  assert.strictEqual(GZ.shiShen('甲', '丙'), '食神');
  assert.strictEqual(GZ.shiShen('甲', '丁'), '伤官');
  assert.strictEqual(GZ.shiShen('甲', '戊'), '偏财');
  assert.strictEqual(GZ.shiShen('甲', '壬'), '偏印');
  assert.strictEqual(GZ.shiShen('甲', '癸'), '正印');
  assert.strictEqual(GZ.shiShen('甲', '乙'), '劫财');
});
t('十二长生', function () {
  assert.strictEqual(GZ.diShi('甲', '亥'), '长生');
  assert.strictEqual(GZ.diShi('甲', '卯'), '帝旺');
  assert.strictEqual(GZ.diShi('乙', '午'), '长生');
  assert.strictEqual(GZ.diShi('乙', '寅'), '帝旺');
  assert.strictEqual(GZ.diShi('庚', '子'), '死');
  assert.strictEqual(GZ.diShi('丙', '戌'), '墓');
});
t('旬空与纳音', function () {
  assert.deepStrictEqual(GZ.xunKong('甲子'), ['戌', '亥']);
  assert.deepStrictEqual(GZ.xunKong('癸亥'), ['子', '丑']);
  assert.strictEqual(GZ.naYin('甲子'), '海中金');
  assert.strictEqual(GZ.naYin('壬戌'), '大海水');
});
t('五虎遁 / 五鼠遁', function () {
  assert.strictEqual(GZ.monthGanOfYear('甲', '寅'), '丙');
  assert.strictEqual(GZ.monthGanOfYear('戊', '丑'), '乙');
  assert.strictEqual(GZ.hourGanOfDay('甲', '子'), '甲');
  assert.strictEqual(GZ.hourGanOfDay('戊', '亥'), '癸');
});
t('刑冲合会', function () {
  var r = GZ.analyzeRelations([{ label: 'A', gan: '甲', zhi: '寅' }, { label: 'B', gan: '己', zhi: '午' }, { label: 'C', gan: '庚', zhi: '戌' }]);
  var txt = r.map(function (x) { return x.text; });
  assert(txt.indexOf('甲己合化土') >= 0);
  assert(txt.indexOf('甲庚相冲') >= 0);
  assert(txt.some(function (s) { return s.indexOf('寅午戌三合火局') === 0; }));
});
t('神煞', function () {
  var ctx = { yearGan: '甲', yearZhi: '子', monthZhi: '寅', dayGan: '甲', dayZhi: '子', dayGz: '甲子', gender: 1, zhis: ['子', '寅', '子', '丑'] };
  var ss = GZ.shenSha('乙', '丑', 3, ctx);
  assert(ss.indexOf('天乙贵人') >= 0, ss.join());
  assert(GZ.shenSha('丙', '寅', 1, ctx).indexOf('驿马') >= 0);
  assert(GZ.shenSha('丁', '卯', 3, ctx).indexOf('羊刃') >= 0);
});
t('均时差范围', function () {
  var e1 = TU.equationOfTime(TU.mk(2024, 11, 3)), e2 = TU.equationOfTime(TU.mk(2024, 2, 12));
  assert(e1 > 15 && e1 < 17.5, e1);
  assert(e2 < -13 && e2 > -15.5, e2);
});

console.log('八字');
var r = Bazi.compute({ y: 1990, m: 5, d: 15, h: 14, mi: 30, gender: 1 });
t('四柱', function () { assert.strictEqual(r.pillars.map(function (p) { return p.gz; }).join(' '), '庚午 辛巳 庚辰 癸未'); });
t('胎元命宫', function () { assert.strictEqual(r.extra.taiYuan.gz, '壬申'); assert.strictEqual(r.extra.mingGong.gz, '辛巳'); });
t('大运顺排与起运', function () {
  assert.strictEqual(r.yun.forward, true);
  assert.strictEqual(r.yun.daYun[1].gz, '壬午');
  assert.strictEqual(r.yun.daYun[2].gz, '癸未');
  assert.strictEqual(r.yun.startSolar, '1997-08-04');
});
t('女命逆排', function () {
  var f = Bazi.compute({ y: 1990, m: 5, d: 15, h: 14, mi: 30, gender: 0 });
  assert.strictEqual(f.yun.forward, false);
  assert.strictEqual(f.yun.daYun[1].gz, '庚辰');
});
t('流年太岁', function () {
  var all = []; r.yun.daYun.forEach(function (d) { all = all.concat(d.liuNian); });
  var y2002 = all.filter(function (x) { return x.year === 2002; })[0];
  assert.strictEqual(y2002.gz, '壬午');
  assert(y2002.taisui.indexOf('值太岁（本命年）') >= 0);
  var y2020 = all.filter(function (x) { return x.year === 2020; })[0];
  assert(y2020.taisui.indexOf('冲太岁') >= 0);
});
t('流月以节换月', function () {
  var ly = Bazi.liuYue(2026, '庚');
  assert.strictEqual(ly[0].gz, '庚寅');
  assert.strictEqual(ly[0].startYmd, '2026-02-04');
  assert.strictEqual(ly[11].gz, '辛丑');
});
t('子时换日', function () {
  var a = Bazi.compute({ y: 2024, m: 1, d: 1, h: 23, mi: 30, gender: 1, sect: 1 });
  var b = Bazi.compute({ y: 2024, m: 1, d: 1, h: 23, mi: 30, gender: 1, sect: 2 });
  assert.strictEqual(a.pillars[2].gz, '乙丑');
  assert.strictEqual(b.pillars[2].gz, '甲子');
  assert.strictEqual(a.pillars[3].gz, '丙子');
});
t('农历闰月输入', function () {
  var x = Bazi.compute({ calendar: 'lunar', y: 2023, m: 2, d: 10, leap: true, h: 8, mi: 0, gender: 1 });
  assert.strictEqual(x.inputSolar.slice(0, 10), '2023-03-31');
});
t('真太阳时（成都）', function () {
  var x = Bazi.compute({ y: 2023, m: 3, d: 31, h: 8, mi: 0, gender: 1, trueSolar: true, longitude: 104.07, tz: 8 });
  assert.strictEqual(x.solar.slice(0, 16), '2023-03-31 06:51');
});
t('四柱反查', function () {
  var l = Bazi.reverse('庚午', '辛巳', '庚辰', '癸未', 2, 1900);
  assert(l.indexOf('1990-05-15 14:00:00') >= 0, l.join());
});
t('合婚评分', function () {
  var b = Bazi.compute({ y: 1992, m: 8, d: 8, h: 8, mi: 0, gender: 0 });
  var h = Bazi.heHun(r, b);
  assert(h.score >= 30 && h.score <= 99 && h.items.length > 3);
});

console.log('奇门');
var q = Qimen.compute({ y: 2026, m: 11, d: 5, h: 14, mi: 20 });
t('定局（霜降上元阴五局）', function () {
  assert.strictEqual(q.term, '霜降'); assert.strictEqual(q.yuan, '上元'); assert.strictEqual(q.juText, '阴遁五局');
});
t('地盘', function () {
  var e = {}; for (var i = 1; i <= 9; i++) e[i] = q.palaces[i].earth[0];
  assert.deepStrictEqual(e, { 1: '壬', 2: '辛', 3: '庚', 4: '己', 5: '戊', 6: '乙', 7: '丙', 8: '丁', 9: '癸' });
});
t('值符值使与天盘', function () {
  assert.strictEqual(q.xunShou, '甲寅'); assert.strictEqual(q.zhiFu, '天英'); assert.strictEqual(q.zhiShi, '景门');
  assert.deepStrictEqual(q.palaces[4].stars, ['天英']); assert.deepStrictEqual(q.palaces[4].heaven, ['癸']);
  assert.deepStrictEqual(q.palaces[9].stars, ['天芮', '天禽']); assert.deepStrictEqual(q.palaces[9].heaven, ['辛', '戊']);
  assert.strictEqual(q.palaces[4].door, '景门');
});
t('八神阴遁逆布', function () {
  assert.strictEqual(q.palaces[4].god, '值符'); assert.strictEqual(q.palaces[3].god, '螣蛇'); assert.strictEqual(q.palaces[8].god, '太阴');
  assert.strictEqual(q.palaces[9].god, '九天');
});
t('空亡驿马', function () { assert.strictEqual(q.hourKong, '子丑'); assert.strictEqual(q.maPalace, 4); });
t('五不遇时', function () { assert(q.patterns.some(function (p) { return p.name === '五不遇时'; })); });
t('拆补法按交节时刻', function () {
  assert.strictEqual(Qimen.compute({ y: 2026, m: 10, d: 23, h: 17, mi: 0 }).term, '寒露');
  assert.strictEqual(Qimen.compute({ y: 2026, m: 10, d: 23, h: 17, mi: 40 }).term, '霜降');
});
t('六甲时伏吟', function () {
  // 2026-11-05 为癸未日，2026-11-06 甲申日，其 00:30 为甲子时
  var x = Qimen.compute({ y: 2026, m: 11, d: 6, h: 0, mi: 30 });
  assert.strictEqual(x.gz.hour, '甲子');
  assert(x.patterns.some(function (p) { return p.name === '星伏吟'; }));
});
t('置闰法在十二年内出现置闰且局数有效', function () {
  var runs = 0;
  for (var y = 2014; y <= 2026; y++) {
    [[6, 20], [12, 20]].forEach(function (md) {
      var z = Qimen.compute({ y: y, m: md[0], d: md[1], h: 12, mi: 0, method: 'zhirun' });
      assert(z.ju >= 1 && z.ju <= 9);
      if (/置闰/.test(z.status)) runs++;
    });
  }
  assert(runs >= 2, '置闰次数 ' + runs);
});

t('九星旺衰按《烟波钓叟歌》', function () {
  // 水星天蓬：旺于正二（寅卯，水生木），休于四五（巳午，水克火），相在亥子，废于申酉（金生水），囚于辰戌丑未（土克水）
  function st(m, d) {
    var x = Qimen.compute({ y: 2026, m: m, d: d, h: 12, mi: 0 });
    for (var i = 1; i <= 9; i++) { var P = x.palaces[i]; if (P.stars && P.stars.indexOf('天蓬') >= 0) return P.starStates[P.stars.indexOf('天蓬')]; }
  }
  assert.strictEqual(st(3, 1), '旺');   // 寅月
  assert.strictEqual(st(6, 1), '休');   // 巳月
  assert.strictEqual(st(9, 1), '废');   // 申月
  assert.strictEqual(st(12, 1), '相');  // 亥月
  assert.strictEqual(st(4, 20), '囚');  // 辰月
});

console.log('紫微斗数');
var Ziwei = require('../js/ziwei.js');
// 基准值取自开源库 iztro 的公开测试用例（astro.test.ts）
var z1 = Ziwei.compute({ y: 2000, m: 8, d: 16, h: 4, mi: 0, gender: 0 });
t('命身宫、五行局、命主身主（2000-08-16 寅时 女）', function () {
  assert.strictEqual(GZ.ZHI[z1.ming], '午'); assert.strictEqual(GZ.ZHI[z1.shen], '戌');
  assert.strictEqual(z1.juName, '木三局'); assert.strictEqual(z1.mingzhu, '破军'); assert.strictEqual(z1.shenzhu, '文昌');
  assert.strictEqual(z1.yearGz, '庚辰');
});
t('运限（2023-08-19）', function () {
  var age = Ziwei.nominalAge(z1, 2023); assert.strictEqual(age, 24);
  var d = Ziwei.daxianOfAge(z1, age); assert.strictEqual(d.gan + d.zhi, '庚辰');
  assert.strictEqual(GZ.ZHI[Ziwei.xiaoxianBranch(z1, age)], '亥');
  var ms = Ziwei.liuYue(z1, 2023); assert.strictEqual(GZ.ZHI[ms[6].b], '巳'); assert.strictEqual(ms[6].gz, '庚申');
  assert.deepStrictEqual(Ziwei.SIHUA['癸'], ['破军', '巨门', '太阴', '贪狼']);
  assert.deepStrictEqual(Ziwei.SIHUA['庚'], ['太阳', '武曲', '太阴', '天同']);
  var dov = Ziwei.overlay(z1, d.b, d.gan); assert.strictEqual(dov.names[GZ.zi('辰')], '命宫');
});
t('1991-03-07 午时 女：2025 运限', function () {
  var z = Ziwei.compute({ y: 1991, m: 3, d: 7, h: 12, mi: 0, gender: 0 });
  var d = Ziwei.daxianOfAge(z, Ziwei.nominalAge(z, 2025)); assert.strictEqual(d.gan + d.zhi, '戊戌');
  assert.strictEqual(Ziwei.yearGz(2025), '乙巳');
  assert.strictEqual(Ziwei.liuYue(z, 2025)[1].gz, '己卯');
});
t('1980-02-14 子时 男（腊月廿八）', function () {
  var z = Ziwei.compute({ y: 1980, m: 2, d: 14, h: 0, mi: 30, gender: 1 });
  assert.strictEqual(z.yearGz, '己未'); assert.strictEqual(GZ.ZHI[z.ming], '丑'); assert.strictEqual(GZ.ZHI[z.shen], '丑');
  assert.strictEqual(z.juName, '水二局'); assert.strictEqual(z.mingzhu, '巨门'); assert.strictEqual(z.shenzhu, '天相');
  assert.deepStrictEqual(z.palaces[2].daxian, [112, 121]);  // 寅宫
});
t('起紫微：五局初一与算例', function () {
  function zw(j, d) { return GZ.ZHI[Ziwei.ziweiPos(j, d).pos]; }
  assert.strictEqual(zw(6, 1), '酉'); assert.strictEqual(zw(2, 1), '丑'); assert.strictEqual(zw(3, 1), '辰'); assert.strictEqual(zw(4, 1), '亥'); assert.strictEqual(zw(5, 1), '午');
  // iztro 注释举例：27 日木三局在戌；13 日火六局在亥；6 日土五局在未
  assert.strictEqual(zw(3, 27), '戌'); assert.strictEqual(zw(6, 13), '亥'); assert.strictEqual(zw(5, 6), '未');
});
t('《全书》卷二水二局图逐日核对', function () {
  var tb = { '巳': [8, 9], '午': [10, 11], '未': [12, 13], '申': [14, 15], '辰': [6, 7, 30], '酉': [16, 17], '卯': [4, 5, 28, 29], '戌': [18, 19], '寅': [2, 3, 26, 27], '丑': [1, 24, 25], '子': [22, 23], '亥': [20, 21] };
  Object.keys(tb).forEach(function (zh) { tb[zh].forEach(function (d) { assert.strictEqual(GZ.ZHI[Ziwei.ziweiPos(2, d).pos], zh, d + ' 日应在 ' + zh); }); });
});
t('星曜结构不变量（1200 张随机盘）', function () {
  var seed = 7; function rnd(n) { seed = (seed * 9301 + 49297) % 233280; return Math.floor(seed / 233280 * n); }
  for (var i = 0; i < 1200; i++) {
    var z = Ziwei.compute({ y: 1930 + rnd(120), m: 1 + rnd(12), d: 1 + rnd(28), h: rnd(24), mi: 0, gender: rnd(2) });
    var c = 0; z.palaces.forEach(function (p) { c += p.major.length; });
    assert.strictEqual(c, 14);
    assert.strictEqual(Ziwei.md(z.where['紫微'] + z.where['天府']), 4);          // 寅申轴对称
    assert.strictEqual(Ziwei.md(z.where['七杀'] - z.where['贪狼']), 4);          // 杀破狼三合
    assert.strictEqual(Ziwei.md(z.where['破军'] - z.where['七杀']), 4);
    assert.strictEqual(Ziwei.md(z.where['擎羊'] - z.where['禄存']), 1);
    assert.strictEqual(Ziwei.md(z.where['陀罗'] - z.where['禄存']), 11);
    assert.strictEqual(Ziwei.md(z.where['天喜'] - z.where['红鸾']), 6);
    assert.strictEqual(z.palaces[z.ming].name, '命宫');
    assert.strictEqual(z.palaces[Ziwei.md(z.ming - 2)].name, '夫妻');
    assert.strictEqual(z.palaces[Ziwei.md(z.ming + 6)].name, '迁移');
    assert(z.sihua.length === 4);
    assert(z.ju >= 2 && z.ju <= 6);
  }
});

console.log('释义');
var XP = require('../js/explain.js'); var ZX = require('../js/explain-ziwei.js');
t('所有地支、天干关系都有释义', function () {
  var seen = 0;
  GZ.ZHI.forEach(function (a) { GZ.ZHI.forEach(function (b) {
    GZ.zhiPairRel(a, b).forEach(function (x) {
      var pg = XP.page('rel|地支|' + x.type + '|' + a + '|' + b, {});
      assert(pg.html.length > 80 && pg.title !== '暂无释义', x.text); seen++;
    });
  }); });
  GZ.GAN.forEach(function (a) { GZ.GAN.forEach(function (b) {
    GZ.ganPairRel(a, b).forEach(function (x) { var pg = XP.page('rel|天干|' + x.type + '|' + a + '|' + b, {}); assert(pg.html.length > 80, x.text); seen++; });
  }); });
  assert(seen > 60);
});
t('所有神煞、十神、十二长生都有释义', function () {
  Object.keys(GZ.SHENSHA_INFO).forEach(function (k) { assert(XP.SHA_KEYS[k], k); assert(XP.page('sha|' + k, {}).html.length > 50); });
  Object.keys(GZ.SHISHEN_INFO).forEach(function (k) { assert(XP.page('ss|' + k, { bazi: r }).html.indexOf('在你这张盘上') > 0, k); });
  GZ.DISHI.forEach(function (k) { assert(XP.page('cs|' + k, { bazi: r }).html.length > 80, k); });
});
t('带命盘上下文的页面都不报错', function () {
  XP.setYongShen(Qimen.YONGSHEN);
  Object.keys(XP.TERMS).forEach(function (k) { var pg = XP.page('term|' + k, { bazi: r }); assert(pg.title !== '暂无释义', k); });
  r.relations.forEach(function (x) { assert(XP.page('rel|' + x.scope + '|' + x.type + '|' + x.chars.join('|') + '|' + x.who.join(','), { bazi: r }).html.indexOf('牵动') > 0, x.text); });
  ['生肖', '纳音', '日柱', '夫妻宫', '五行', '配偶星', '命卦'].forEach(function (k) { assert(XP.page('hh|' + k, {}).html.length > 60); });
  assert(XP.page('hhall|', {}).html.indexOf('基准 60') > 0);
  ['总览', '定局法', '旺衰', '暗干', '用神'].forEach(function (k) { assert(XP.page('qm|' + k, { qimen: q, QimenInfo: Qimen }).title !== '暂无释义', k); });
  q.patterns.forEach(function (p) { assert(XP.page('qmp|' + p.name, {}).html.length > 40); });
});
t('紫微释义齐全', function () {
  var zc = { ziwei: z1 };
  Ziwei.MAJORS.forEach(function (k) { assert.strictEqual(ZX.S[k].p.length, 12, k); assert(XP.page('zws|' + k, zc).html.indexOf('在你这张盘上') > 0, k); });
  Ziwei.AUX.concat(Ziwei.SHA).forEach(function (k) { assert(ZX.A[k], k); assert(XP.page('zws|' + k, zc).html.length > 80, k); });
  z1.palaces.forEach(function (p) { p.misc.forEach(function (s) { assert(ZX.MISC[s.name], '杂曜 ' + s.name); }); assert(ZX.PALACE[p.name]); assert(ZX.palaceReading(z1, p.b).length > 0); });
  Object.keys(ZX.T).forEach(function (k) { assert(XP.page('zw|' + k, zc).title !== '暂无释义', k); });
  ['禄', '权', '科', '忌'].forEach(function (k) { assert(XP.page('zwh|' + k, zc).html.length > 100); });
});
t('紫微格局都有释义（5000 张盘）', function () {
  var seed = 11, seen = {}; function rnd(k) { seed = (seed * 9301 + 49297) % 233280; return Math.floor(seed / 233280 * k); }
  for (var i = 0; i < 5000; i++) {
    var z = Ziwei.compute({ y: 1920 + rnd(130), m: 1 + rnd(12), d: 1 + rnd(28), h: rnd(24), mi: 0, gender: rnd(2) });
    z.patterns.forEach(function (p) { seen[p.key] = 1; assert(ZX.G[p.key], '缺格局释义：' + p.key); });
  }
  assert(Object.keys(seen).length > 40, '命中格局 ' + Object.keys(seen).length);
});

console.log('离线');
t('sw.js 覆盖全部文件且版本最新（改代码后请运行 node tools/build_sw.js）', function () {
  var fs = require('fs'), path = require('path'), B = require('../tools/build_sw.js');
  var root = path.join(__dirname, '..'), files = B.fileList();
  assert.strictEqual(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), B.source(files, B.versionOf(files)), 'sw.js 过期');
  var html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  (html.match(/(?:src|href)="[^"#]+"/g) || []).map(function (x) { return x.replace(/^(?:src|href)="|"$/g, ''); }).forEach(function (u) {
    if (/^https?:/.test(u)) { assert(!/\.(js|css|woff2?|ttf|png|jpg|svg)(\?|$)/.test(u), '依赖外部资源：' + u); return; }
    assert(files.indexOf(u) >= 0, '未离线缓存：' + u);
  });
  var mf = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  mf.icons.forEach(function (i) { assert(files.indexOf(i.src) >= 0, i.src); });
});

console.log('\n' + (n - fail) + '/' + n + ' 通过');
process.exit(fail ? 1 : 0);
