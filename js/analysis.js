/*
 * 整体分析引擎：把排盘里的单个因素串起来。
 * 八字：五行/十神的流通与阻隔、十神组合、干支关系的后果、宫位落点、领域判断、运岁引动。
 * 紫微：星系、四化路径、宫干飞化网、夹宫、宫位评分、运限叠宫。
 * 合参：两套系统逐领域对照、性格底色、逐年共振。
 *
 * 全部是规则推算，可离线运行，每条结论都带依据。
 * 评分（signal：-2～+2）是本软件的启发式约定，不是古法。
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('./ganzhi.js'), require('./ziwei.js'), require('./explain-ziwei.js'));
  } else root.AN = factory(root.GZ, root.Ziwei, root.ZX);
})(this, function (GZ, Ziwei, ZX) {
  'use strict';

  /* ---------- 通用 ---------- */
  var DOMAINS = [
    { k: 'career', t: '事业' }, { k: 'wealth', t: '财运' }, { k: 'love', t: '感情' }, { k: 'health', t: '身心' },
    { k: 'study', t: '学业才华' }, { k: 'family', t: '家庭六亲' }, { k: 'social', t: '人际贵人' }
  ];
  var SIGNAL = { 2: '有利', 1: '偏有利', 0: '平稳', '-1': '需留意', '-2': '压力较大' };
  function clampSig(x) { return Math.max(-2, Math.min(2, Math.round(x))) || 0; }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  function pct(n) { return Math.round(n); }

  var LEI_OF = { '比肩': '比劫', '劫财': '比劫', '食神': '食伤', '伤官': '食伤', '偏财': '财才', '正财': '财才', '七杀': '官杀', '正官': '官杀', '偏印': '印枭', '正印': '印枭' };
  var LEI_NAME = { '比劫': '比劫', '食伤': '食伤', '财才': '财星', '官杀': '官杀', '印枭': '印星' };
  var LEI_THEME = { '比劫': '自我与同辈', '食伤': '才华与表达', '财才': '钱财与务实', '官杀': '规范与压力', '印枭': '学习与庇护' };
  var LEI_TO_ME = { '比劫': '帮扶日主', '印枭': '生扶日主', '食伤': '泄耗日主', '财才': '消耗日主', '官杀': '克制日主' };
  var RING = ['印枭', '比劫', '食伤', '财才', '官杀']; // 相生顺序
  var GEN_NAME = { '印枭': '印生身', '比劫': '身生食伤', '食伤': '食伤生财', '财才': '财生官杀', '官杀': '官杀生印' };
  var KE_NAME = { '印枭': '印制食伤', '比劫': '比劫夺财', '食伤': '食伤制官杀', '财才': '财破印', '官杀': '官杀制身' };
  var KE_MEAN = {
    '印枭': '学习、依赖的力量压住表达和创造',
    '比劫': '同辈竞争分走钱财和机会',
    '食伤': '个性和才华冲撞规则与权威',
    '财才': '现实和钱财的事冲掉学习与内心依托',
    '官杀': '外部压力和责任直接压向自己'
  };
  var PILLAR = {
    '年柱': { mean: '祖上、原生环境与早年（约 1–16 岁）', short: '祖上与早年', d: 'family' },
    '月柱': { mean: '父母、成长环境、事业大环境与青年（约 17–32 岁）', short: '环境与青年', d: 'career' },
    '日柱': { mean: '自己（日干）、伴侣（日支）与中年（约 33–48 岁）', short: '自己与伴侣', d: 'love' },
    '时柱': { mean: '子女、下属、长期计划与晚年（约 49 岁后）', short: '子女与晚年', d: 'family' }
  };
  var TYPE_WORD = {
    '合': '牵绊、结缘、合作', '半合': '聚气、方向一致', '拱合': '虚拱、等待补足', '暗合': '暗中往来',
    '三合': '成局、气聚一处', '三会': '成局、力量专一', '冲': '变动、分离、方向调整', '刑': '摩擦、压力、规矩上的麻烦',
    '三刑': '集中的压力', '害': '暗损、误会、嫌隙', '破': '小破损、不圆满'
  };

  /* ---------- 白话：结论先说状态，名词只作标签 ---------- */
  var LEVEL_PLAIN = {
    '身旺': '你的底气很足：精力旺、主意大，能扛事，但容易过于自我，需要一个出口把力气用出去。',
    '偏强': '你的底气偏足：能扛事，不太依赖别人，更需要把力气用在具体目标上。',
    '中和': '你的力量比较平衡：可进可退，顺境逆境的落差不会太大。',
    '偏弱': '你的底气偏少：容易累，事情一多就吃力，需要靠山、帮手和节奏。',
    '身弱': '你的底气明显不足：很容易被环境和别人的要求带着走，先照顾好自己比什么都重要。'
  };
  var LEI_STATE = {
    '比劫': '主见强，习惯靠自己，也容易和同辈比较、竞争',
    '印枭': '爱学习、爱思考，安全感和依赖的需求比较重',
    '食伤': '表达欲和创造力强，不喜欢被框住',
    '财才': '务实，把很多精力放在钱和现实事务上',
    '官杀': '责任感和压力都重，常被规则和别人的期待推着走'
  };
  var XI_NEED = {
    '比劫': '同伴和帮手，让自己有底气',
    '印枭': '学习、老师、靠山和休息，给自己充电',
    '食伤': '表达和创作，把想法做出来',
    '财才': '具体的目标和现实回报，把力气花在经营上',
    '官杀': '规则、责任和有挑战的目标，有事情逼着你反而能发挥'
  };
  var COMBO_PLAIN = {
    '官印相生': ['压力能转成资历和名分', '你扛下来的责任，往往能换来头衔、资格或别人的信任。', '适合走有晋升路径的路：考证、积累资历、找靠谱的组织。'],
    '杀印相生': ['高压环境里反而能成事', '压力大的时候你能沉住气，靠学习和经验把难题化开，常在别人退缩时顶上。', '不必害怕难度高的环境，但要给自己留学习和恢复的时间。'],
    '食神制杀': ['用本事化解压力和对手', '碰到强势的人或难题，你倾向于用技术、作品或幽默化解，而不是硬碰硬。', '把专长练深，它就是你的护身符。'],
    '伤官配印': ['才华被学识收住', '脑子活、有想法，又肯学习、讲分寸，说出来的话和做出来的东西更有分量。', '适合把创意和专业结合，如研究、教育、专业写作。'],
    '食伤生财': ['靠才华和产出赚钱', '钱通常跟着你做的东西来：作品、产品、服务、内容。做得越好，钱越顺。', '把能力变成可以交付的东西，不要只靠固定工资。'],
    '财生官杀': ['钱和责任绑在一起', '收入越高，担子越重；或者为了地位要持续投入。', '量力接事，身体和精力是这条路的本钱。'],
    '财破印': ['现实的事打断学习和内心依托', '常因为赚钱、家计而中断进修，或者和长辈在钱上有分歧；好的一面是能让人从空想转向务实。', '给学习和休息留固定时间，别全被现实挤占。'],
    '伤官见官': ['个性和规则容易相撞', '遇到不合理的事忍不住要说，容易和上司、制度起摩擦；女命传统上还看作对伴侣较挑剔。', '选自由度高的环境，或者把批评变成解决方案。'],
    '枭神夺食': ['想太多，压住了表达和享受', '事情还没做就想了很多可能性，容易犹豫、半途而废，也不太容易真正放松。', '先做出来再优化；规律吃饭睡觉对你很重要。'],
    '比劫夺财': ['钱容易被同辈和合伙分走', '朋友、兄弟、合伙人容易分走利益，人情开销大，也可能因竞争压缩收益。', '合作前把账算清，不轻易担保、借钱。'],
    '官杀混杂': ['多头管理，标准不一', '同时面对几套要求，常常不知道该听谁的；女命传统上还看作感情选择多、难决定。', '定一条主线，把其他要求往后排。'],
    '羊刃驾杀': ['刚对刚，魄力大风险也大', '敢担大责、敢下重手，能处理别人不敢碰的事，但情绪和行动都容易过猛。', '适合高强度岗位，也要有能让你停下来的人或规则。'],
    '身杀两停': ['自己强，压力也强，扛得住', '越难的局面越能发挥，别人眼里的压力对你是动力。', '可以主动挑大梁，找值得投入的硬目标。'],
    '财多身弱': ['机会多，精力跟不上', '看上去处处有机会，但常常忙不过来，钱也容易过手就走，人容易累。', '少而精：先把精力和帮手补上，再谈扩张。'],
    '杀重身轻': ['压力超过当前的承受力', '常觉得被事情和别人的要求推着走，容易紧绷、疲惫。', '找老师、靠山和休息时间，不要同时硬扛太多。'],
    '食伤泄身': ['输出太多，容易透支', '想法和表达欲很强，停不下来，忙完容易觉得空。', '给自己设充电时间，做事有节奏。'],
    '印重': ['想得多，做得少', '爱学习、爱思考，依赖感和安全需求强，行动常常慢一拍。', '给每个想法定一个落地的日子。'],
    '比劫成群': ['自我很强，竞争也多', '主见强，不太愿意听别人的，同辈之间比较多，钱也容易花在人情上。', '需要规则或明确的目标来约束这股劲。'],
    '食伤吐秀': ['多余的力气有出口', '你把精力花在表达和创造上时最舒服，状态也最好。', '长期保持一个能输出的爱好或工作。'],
    '缺印枭': ['没有天然的靠山和老师', '遇事多靠自己摸索，长辈和学历带来的助力不明显，但也更自由。', '需要时主动去找老师和平台。'],
    '缺食伤': ['表达和产出要靠练', '想法不一定说得出来、做得出来，才华不会自动显露。', '找一个固定的输出方式，慢慢练。'],
    '缺财才': ['对钱不太敏感', '不会一门心思想钱，收入常靠其他方面带动。', '留意运岁中财星到来的时段，提前做好理财习惯。'],
    '缺官杀': ['很少有人管得住你', '自主性高，不太受规则约束，也缺少外部推力，容易松散。', '自己给自己立规矩和截止日期。'],
    '合身': ['你容易被某件事牵住', '这件事常常是你生活的重心，投入多，也不容易放下。', '留意它占了你多少精力。'],
    '疑从势': ['力量极弱，可能要顺势而为', '这类盘传统上不硬扛，顺着最旺的力量走反而好。', '这种结构需要人工判断，下面的喜忌可能要反过来看。'],
    '疑专旺': ['力量极强，可能要顺其所长', '这类盘传统上不宜压制，顺着自己的长处发挥反而好。', '这种结构需要人工判断，下面的喜忌可能要反过来看。']
  };
  /* 两柱之间的关系在生活里的表现 */
  var PAIR_STATE = {
    '年柱-月柱': ['家庭和成长环境连得很紧，长辈和父母关系密切，早年受家庭影响深。', '早年家庭环境有变动，容易搬家、转学，或长辈和父母观念不合。', '家里在规矩或观念上有摩擦，童年压力相对多一些。'],
    '年柱-日柱': ['和老家、长辈关系紧，伴侣也容易和家人融合。', '自己的选择和家族期望不太一致，容易离开老家发展。', '和长辈在观念上容易反复摩擦。'],
    '年柱-时柱': ['家族传统和子女一代有延续，老根和晚年有联系。', '老家和子女、晚年的方向不同，常见定居地变化。', '上下两代之间观念较难调和。'],
    '月柱-日柱': ['工作和家庭、父母和自己联系紧密，容易在熟人圈里发展，或因工作结缘。', '工作和家庭容易难两全，和父母观念有距离，青年到中年转折较明显。', '工作上的压力容易带回家，自己和周围常有较劲。'],
    '月柱-时柱': ['现在做的事和长期计划是连贯的，子女可能延续你的方向。', '工作和子女、长期计划之间有拉扯，中晚年可能转换方向。', '工作或下属方面的摩擦持续得比较久。'],
    '日柱-时柱': ['和子女关系亲近，家庭内部黏度高。', '和子女、晚辈容易有距离，中晚年的居住或生活方式可能变动。', '家里和子女、伴侣之间容易有小摩擦。']
  };
  /* 运岁作用到某一柱时，可能发生什么 */
  var PILLAR_EVENT = {
    '年柱': { '冲': '和长辈、老家或外部大环境相关的变动，比如搬迁、家里的事、单位大调整', '合': '长辈、老关系或外部的人主动靠近，可能带来合作，也可能是牵绊', '刑': '和长辈或外部关系有摩擦，文书手续上容易出小麻烦', '聚': '和外部、老关系相关的事慢慢成形' },
    '月柱': { '冲': '工作或环境明显变动：换岗、换公司、换城市，父母方面也可能有事', '合': '工作上有合作或贵人机会，也容易被工作绑住', '刑': '工作中有人际摩擦或规章压力，容易觉得处处受限', '聚': '工作上的事慢慢成形，方向更明确' },
    '日柱': { '冲': '亲密关系或家庭状态有变化：分歧、两地分居、搬家；自己也容易累', '合': '感情上有结缘、定下来的机会，也可能被感情牵绊', '刑': '和伴侣容易有误会或较劲，自己情绪偏紧', '聚': '感情和家庭的事慢慢有进展' },
    '时柱': { '冲': '子女、下属或长期计划方面有变动，计划可能要重新调整', '合': '子女、下属方面有好消息，或长期计划有进展', '刑': '在子女、下属或长期项目上有小摩擦', '聚': '长期计划慢慢成形' }
  };
  function eventGroup(type) { return type === '冲' ? '冲' : type === '合' ? '合' : ['刑', '害', '破', '三刑'].indexOf(type) >= 0 ? '刑' : '聚'; }
  function pairKey(a, b) { var o = ['年柱', '月柱', '日柱', '时柱']; return o.indexOf(a) <= o.indexOf(b) ? a + '-' + b : b + '-' + a; }
  function ssFeel(ss, role) {
    var S = GZ.SS_STATE[ss];
    if (role === '忌') return S.bad;
    if (role === '闲') return S.core + '比较活跃';
    return S.good;
  }

  /* ---------- 八字上下文 ---------- */
  function ctxOf(res) {
    var w = res.wx, dg = res.dayGan;
    var A = { res: res, w: w, dg: dg, me: res.dayWx, strong: w.ratio >= 50, weak: w.ratio < 40, mid: w.ratio >= 40 && w.ratio < 50 };
    var total = 0; RING.forEach(function (l) { total += w.lei[l]; });
    A.total = total || 1;
    A.share = {}; RING.forEach(function (l) { A.share[l] = w.lei[l] / A.total * 100; });
    A.xi = w.xi.map(function (x) { return x.wx; }); A.ji = w.ji.map(function (x) { return x.wx; });
    A.slots = [];
    res.pillars.forEach(function (p, i) {
      if (i !== 2) A.slots.push({ kind: '干', i: i, pillar: p.label, at: p.label.charAt(0) + '干', ch: p.gan, ss: GZ.shiShen(dg, p.gan), wx: p.ganWx });
      A.slots.push({ kind: '支', i: i, pillar: p.label, at: p.label.charAt(0) + '支', ch: p.zhi, ss: p.hide[0].shishen, wx: p.hide[0].wx });
    });
    A.all = {};
    res.pillars.forEach(function (p, i) { p.hide.forEach(function (h) { (A.all[LEI_OF[h.shishen]] = A.all[LEI_OF[h.shishen]] || []).push({ at: p.label.charAt(0) + '支藏', ch: h.gan, ss: h.shishen, i: i }); }); if (i !== 2) { var s = GZ.shiShen(dg, p.gan); (A.all[LEI_OF[s]] = A.all[LEI_OF[s]] || []).push({ at: p.label.charAt(0) + '干', ch: p.gan, ss: s, i: i }); } });
    return A;
  }
  function roleOf(A, wx) {
    var i = A.xi.indexOf(wx);
    if (i === 0) return '用'; if (i > 0) return '喜';
    if (A.ji.indexOf(wx) >= 0) return '忌';
    return '闲';
  }
  function valOf(A, wx) { return { '用': 1, '喜': 0.7, '闲': 0, '忌': -1 }[roleOf(A, wx)]; }
  function leiWx(A, l) { return GZ.WX.filter(function (w) { return GZ.wxToShenLei(A.dg, w) === l; })[0]; }
  function leiRole(A, l) { return roleOf(A, leiWx(A, l)); }
  function leiVal(A, l) { return valOf(A, leiWx(A, l)); }
  function ssVal(A, ss) { return leiVal(A, LEI_OF[ss]); }
  function roleWord(r) { return { '用': '用神', '喜': '喜神', '忌': '忌神', '闲': '闲神' }[r]; }
  function findSS(A, names, opt) {
    return A.slots.filter(function (s) { return names.indexOf(s.ss) >= 0 && (!opt || !opt.stem || s.kind === '干'); });
  }
  function closest(a, b) { // 两组位置里最近的一对
    var best = null, d = 99;
    a.forEach(function (x) { b.forEach(function (y) { if (x === y) return; var k = Math.abs(x.i - y.i); if (k < d) { d = k; best = [x, y]; } }); });
    return best ? { a: best[0], b: best[1], dist: d } : null;
  }
  function slotTxt(s) { return s.at + ' ' + s.ch + ' ' + s.ss; }
  function pillarsOf(arr) { return uniq(arr.map(function (s) { return s.pillar; })); }
  function whereTxt(arr) {
    return pillarsOf(arr).map(function (p) { return p + '（' + PILLAR[p].short + '）'; }).join('、');
  }

  /* ---------- 流通 ---------- */
  function flowOf(A) {
    var nodes = RING.map(function (l) {
      var s = A.share[l];
      return { lei: l, name: LEI_NAME[l], wx: leiWx(A, l), pct: Math.round(s * 10) / 10, role: leiRole(A, l), theme: LEI_THEME[l], toMe: LEI_TO_ME[l], status: s < 6 ? '弱' : s >= 35 ? '过旺' : s >= 22 ? '强' : '中' };
    });
    var by = {}; nodes.forEach(function (n) { by[n.lei] = n; });
    var gens = [], kes = [];
    RING.forEach(function (l, i) {
      var nx = RING[(i + 1) % 5], k2 = RING[(i + 2) % 5];
      gens.push({ from: l, to: nx, name: GEN_NAME[l], open: by[l].pct >= 8 && by[nx].pct >= 8, weak: Math.min(by[l].pct, by[nx].pct) });
      var hot = Math.min(by[l].pct, by[k2].pct);
      kes.push({ from: l, to: k2, by: nx, name: KE_NAME[l], mean: KE_MEAN[l], hot: hot, active: hot >= 14, bridge: by[nx].pct >= 8, bridgeName: LEI_NAME[nx], bridgeWx: by[nx].wx });
    });
    var sorted = nodes.slice().sort(function (a, b) { return b.pct - a.pct; });
    var main = sorted[0];
    // 从最旺处沿相生方向走，走到断点为止
    var start = RING.indexOf(main.lei), path = [main], breakAt = null;
    for (var i = 1; i < 5; i++) {
      var n = by[RING[(start + i) % 5]];
      if (n.pct < 6) { breakAt = n; break; }
      path.push(n);
    }
    var weakNodes = nodes.filter(function (n) { return n.pct < 6; });
    var balance = main.pct >= 45 || weakNodes.length >= 2 ? '偏枯' : main.pct <= 30 ? '流通均衡' : '有主有从';
    var active = kes.filter(function (k) { return k.active; }).sort(function (a, b) { return b.hot - a.hot; });
    return { nodes: nodes, gens: gens, kes: kes, main: main, second: sorted[1], path: path, breakAt: breakAt, weakNodes: weakNodes, balance: balance, conflicts: active, conflict: active[0] || null };
  }

  /* ---------- 通根透干、干支上下 ---------- */
  function structureOf(A) {
    var res = A.res, rows = [];
    res.pillars.forEach(function (p, i) {
      var roots = [];
      res.pillars.forEach(function (q, j) {
        q.hide.forEach(function (h) { if (h.wx === p.ganWx) roots.push({ pillar: q.label, zhi: q.zhi, kind: h.kind, gan: h.gan, near: Math.abs(i - j) <= 1 }); });
      });
      var best = roots.filter(function (r) { return r.kind === '本气'; }).length ? '本气' : roots.filter(function (r) { return r.kind === '中气'; }).length ? '中气' : roots.length ? '余气' : '';
      var state = !roots.length ? '无根（虚浮）' : best === '本气' ? '根深' : best === '中气' ? '有根' : '根浅';
      var r = GZ.wxRel(p.ganWx, p.zhiWx);
      var upDown = { '同': '干支同气，上下一致', '生': '干生支（盖头生），力量往下走', '被生': '支生干，下面托着上面', '克': '干克支（盖头），表面压住内里', '被克': '支克干（截脚），根基不稳' }[r];
      var tou = p.hide.filter(function (h) { return res.pillars.some(function (q, j) { return j !== 2 ? q.gan === h.gan : q.gan === h.gan; }); }).map(function (h) { return h.gan; });
      rows.push({ label: p.label, gz: p.gz, gan: p.gan, zhi: p.zhi, ss: i === 2 ? '日主' : GZ.shiShen(A.dg, p.gan), role: i === 2 ? '' : roleOf(A, p.ganWx), roots: roots, state: state, upDown: upDown, upRel: r, tou: uniq(tou) });
    });
    var mz = res.ctx.monthZhi, mTou = GZ.HIDE[mz].filter(function (g) { return [res.pillars[0].gan, res.pillars[1].gan, res.pillars[3].gan].indexOf(g) >= 0; });
    return { rows: rows, monthTou: mTou };
  }

  /* ---------- 十神组合 ---------- */
  function combosOf(A) {
    var out = [], w = A.w, S = A.share, res = A.res;
    function add(key, name, tone, chain, effect, where, dms, extra) { out.push({ key: key, name: name, tone: tone, chain: chain, effect: effect, where: where, domains: dms, extra: extra || '' }); }
    var off = findSS(A, ['正官']), sha = findSS(A, ['七杀']), zy = findSS(A, ['正印']), py = findSS(A, ['偏印']), yin = zy.concat(py);
    var shi = findSS(A, ['食神']), shang = findSS(A, ['伤官']), cai = findSS(A, ['正财', '偏财']), bj = findSS(A, ['比肩', '劫财']);
    var shaS = findSS(A, ['七杀'], { stem: 1 }), offS = findSS(A, ['正官'], { stem: 1 }), shangS = findSS(A, ['伤官'], { stem: 1 });
    var c;
    function near(c0) { return c0.dist <= 1 ? '贴身，作用直接' : c0.dist === 2 ? '隔一柱，作用打折' : '相隔较远，作用较弱'; }
    if ((c = closest(off, yin))) add('官印相生', '官印相生', A.strong ? '平' : '吉', [slotTxt(c.a), '生', slotTxt(c.b), '生', '日主 ' + A.dg], '规则和压力经由“印”转成资历和保护：有约束，也有名分。' + (A.strong ? '但日主已经偏强，印再生身就过了，好处打折。' : '日主不算强，这条链很受用。'), whereTxt([c.a, c.b]) + '，' + near(c), ['career', 'study']);
    if ((c = closest(sha, yin))) add('杀印相生', '杀印相生', A.strong ? '平' : '吉', [slotTxt(c.a), '生', slotTxt(c.b), '生', '日主 ' + A.dg], '七杀的压力被印化解，变成扛事的能力，常见于在高压环境中成事的结构。', whereTxt([c.a, c.b]) + '，' + near(c), ['career']);
    if ((c = closest(shi, sha))) add('食神制杀', '食神制杀', leiVal(A, '官杀') > 0 ? '平' : '吉', [slotTxt(c.a), '制', slotTxt(c.b)], '用才华和技术化解压力或对手。' + (leiVal(A, '官杀') > 0 ? '但官杀本身是你需要的，制得太过反而损失机会。' : '官杀不是你需要的，这样制住正好。'), whereTxt([c.a, c.b]) + '，' + near(c), ['career', 'study']);
    if ((c = closest(shang, yin))) add('伤官配印', '伤官配印', A.weak ? '吉' : '平', [slotTxt(c.a), '被制', slotTxt(c.b)], '才华被学识和规矩收束，锋芒有处可放。', whereTxt([c.a, c.b]) + '，' + near(c), ['study', 'career']);
    if ((c = closest(shi.concat(shang), cai))) add('食伤生财', c.a.ss + '生财', A.weak ? '平' : '吉', [slotTxt(c.a), '生', slotTxt(c.b)], '靠才华、产品或表达赚钱。' + (A.weak ? '但日主偏弱，创造和求财都在耗你，要注意节奏。' : '日主担得住，这是很顺的财路。'), whereTxt([c.a, c.b]) + '，' + near(c), ['wealth', 'study']);
    if ((c = closest(cai, off.concat(sha)))) add('财生官杀', '财生官杀', A.weak ? '凶' : '吉', [slotTxt(c.a), '生', slotTxt(c.b), '克', '日主 ' + A.dg], A.weak ? '钱财的事和外部压力连成一线一起压向你，收入和责任常常绑定，容易累。' : '财源支撑地位，事业和收入能相互带动。', whereTxt([c.a, c.b]) + '，' + near(c), ['career', 'wealth']);
    if ((c = closest(cai, yin)) && c.dist <= 1) { var yv = ssVal(A, c.b.ss); add('财破印', '财星破印', yv > 0 ? '凶' : yv < 0 ? '吉' : '平', [slotTxt(c.a), '克', slotTxt(c.b)], yv > 0 ? '印是你需要的，却被钱财的事冲掉：现实压力容易打断学习、内心的依托或长辈的支持。' : yv < 0 ? '印过重反成负担，财星把它破开，让人从依赖转向务实。' : '钱财和学习之间有拉扯。', whereTxt([c.a, c.b]), ['study', 'wealth']); }
    if ((c = closest(shang, off))) {
      var hasFix = yin.length > 0, hasCai = cai.length > 0;
      if (c.a.kind === '干' || c.b.kind === '干' || c.dist <= 1) add('伤官见官', '伤官见官', hasFix || hasCai ? '平' : '凶', [slotTxt(c.a), '克', slotTxt(c.b)], '个性和规则正面相撞，容易与上司、制度或伴侣（女命）有张力。' + (hasFix ? '盘中有印，可以收住伤官。' : hasCai ? '盘中有财，可以把伤官引去生财，缓和冲突。' : '盘中没有印和财来缓冲，这股张力比较直接。'), whereTxt([c.a, c.b]) + '，' + near(c), ['career', 'love']);
    }
    if ((c = closest(py, shi)) && c.dist <= 1) add('枭神夺食', '枭神夺食', cai.length ? '平' : '凶', [slotTxt(c.a), '克', slotTxt(c.b)], '想太多压住了享受和表达，也象征“饭碗”受阻。' + (cai.length ? '盘中有财星可以制枭。' : ''), whereTxt([c.a, c.b]), ['study', 'health']);
    var bjStem = findSS(A, ['比肩', '劫财'], { stem: 1 });
    if (cai.length && (bjStem.length || S['比劫'] >= 30) && (c = closest(bj, cai))) {
      var guard = off.length + sha.length > 0;
      add('比劫夺财', '比劫夺财', A.weak ? '平' : guard ? '平' : '凶', [slotTxt(c.a), '夺', slotTxt(c.b)], '同辈竞争、合伙或人情开销分走钱财。' + (A.weak ? '不过日主偏弱时比劫也是帮手。' : guard ? '盘中有官杀可以制比劫，起到保护。' : '盘中没有官杀护财，要留意合伙和借贷。'), whereTxt([c.a, c.b]), ['wealth', 'social']);
    }
    if (offS.length && shaS.length) add('官杀混杂', '官杀混杂', '平', [slotTxt(offS[0]), '并见', slotTxt(shaS[0])], '两套规则或多方压力同时存在，常见多头管理、感情（女命）选择多。', whereTxt([offS[0], shaS[0]]), ['career', 'love'], '官星要纯，不要杂。');
    if (res.pillars.some(function (p) { return p.shensha.indexOf('羊刃') >= 0; }) && shaS.length) {
      var rp = res.pillars.filter(function (p) { return p.shensha.indexOf('羊刃') >= 0; })[0];
      add('羊刃驾杀', '羊刃驾杀', A.weak ? '平' : '吉', [rp.label.charAt(0) + '支 ' + rp.zhi + ' 羊刃', '对', slotTxt(shaS[0])], '刚对刚，形成很强的掌控与决断力，也意味着高压力、高风险。', whereTxt([shaS[0]]) + '、' + rp.label, ['career']);
    }
    if (A.strong && S['官杀'] >= 22 && sha.length) add('身杀两停', '身杀两停', '吉', ['日主 ' + A.dg + ' 身强', '敌', '七杀'], '自己强、压力也强，能扛事，适合竞争和负责大局。', whereTxt(sha), ['career']);
    var maxL = RING.slice().sort(function (a, b) { return S[b] - S[a]; })[0];
    if (A.weak && maxL === '财才') add('财多身弱', '财多身弱', '凶', [LEI_NAME['财才'] + ' ' + pct(S['财才']) + '%', '耗', '日主（生扶 ' + w.ratio + '%）'], '机会和欲望很多，但精力扛不住。关键不是更努力赚钱，而是先补实力和帮手。', '全盘结构', ['wealth', 'health']);
    if (A.weak && maxL === '官杀') add('杀重身轻', '官杀过重', '凶', [LEI_NAME['官杀'] + ' ' + pct(S['官杀']) + '%', '克', '日主（生扶 ' + w.ratio + '%）'], '外部压力和责任偏重，容易疲惫，需要印星化解或比劫分担。', '全盘结构', ['career', 'health']);
    if (A.weak && maxL === '食伤') add('食伤泄身', '食伤泄气过重', '平', [LEI_NAME['食伤'] + ' ' + pct(S['食伤']) + '%', '泄', '日主（生扶 ' + w.ratio + '%）'], '想法和产出很多，但容易透支。先把自己养好，才能持续输出。', '全盘结构', ['health', 'study']);
    if (S['印枭'] >= 45) add('印重', '印星过重', '平', [LEI_NAME['印枭'] + ' ' + pct(S['印枭']) + '%', '裹住', '日主'], '想得多、做得少，依赖感强，需要财星破开或食伤把想法落地。', '全盘结构', ['study', 'career']);
    if (S['比劫'] >= 45) add('比劫成群', '比劫过重', '平', [LEI_NAME['比劫'] + ' ' + pct(S['比劫']) + '%'], '自我意识强，同辈多，也容易竞争和破费，需要官杀来管或食伤来泄。', '全盘结构', ['social', 'wealth']);
    if (A.strong && findSS(A, ['食神', '伤官'], { stem: 1 }).length) add('食伤吐秀', '食伤吐秀', '吉', ['日主偏强', '泄', slotTxt(findSS(A, ['食神', '伤官'], { stem: 1 })[0])], '多余的力量有出口，表达和才华能发挥出来，是最舒服的流通方式之一。', whereTxt(findSS(A, ['食神', '伤官'], { stem: 1 })), ['study', 'wealth']);
    // 缺位
    RING.forEach(function (l) {
      if (l !== '比劫' && !(A.all[l] && A.all[l].length)) {
        var m = { '印枭': ['无印', '不太依赖学历和长辈荫蔽，多靠自己摸索；需要时要主动找老师和平台。', ['study', 'family']], '食伤': ['无食伤', '表达和产出的渠道不天然，才华要刻意训练才出得来。', ['study']], '财才': ['无财', '对钱不算敏感，财来自其他方面的带动；可关注运岁中财星到来的时候。', ['wealth']], '官杀': ['无官杀', '不太受规则约束，也较少外部推力；自主性高，需要自己立规矩。', ['career']] }[l];
        add('缺' + l, m[0] + '（四柱全不见）', '平', [LEI_NAME[l] + ' 不现'], m[1], '全盘结构', m[2]);
      }
    });
    // 日干被合
    res.pillars.forEach(function (p, i) {
      if (i === 2) return;
      if (GZ.ganPairRel(A.dg, p.gan).some(function (r) { return r.type === '合'; })) {
        var ss = GZ.shiShen(A.dg, p.gan);
        add('合身', p.label.charAt(0) + '干合日主', '平', ['日主 ' + A.dg, '合', p.label.charAt(0) + '干 ' + p.gan + ' ' + ss], '你容易被“' + ss + '”代表的事吸引、牵住（' + LEI_THEME[LEI_OF[ss]] + '），是生活重心的线索。', p.label + '（' + PILLAR[p.label].short + '）', [PILLAR[p.label].d, LEI_OF[ss] === '财才' ? 'wealth' : LEI_OF[ss] === '官杀' ? 'career' : 'social']);
      }
    });
    if (w.ratio < 15) add('疑从势', '生扶极弱，可能是从格', '平', ['生扶仅 ' + w.ratio + '%'], '传统上“极弱不扶”，这类盘可能应顺从旺势。如果成立，<b>本页的喜忌判断可能要反过来看</b>，需要人工判断。', '全盘结构', ['career']);
    if (w.ratio > 80) add('疑专旺', '生扶极强，可能是专旺', '平', ['生扶 ' + w.ratio + '%'], '传统上“极强不抑”，这类盘可能应顺其旺势。如果成立，<b>本页的喜忌判断可能要反过来看</b>，需要人工判断。', '全盘结构', ['career']);
    out.forEach(function (c) {
      var q = COMBO_PLAIN[c.key] || COMBO_PLAIN[c.key.replace(/（.*/, '')] || [];
      c.plain = q[0] || c.name; c.state = q[1] || ''; c.tip = q[2] || '';
      if (c.key === '合身') c.plain = '你容易被“' + c.chain[2].split(' ').pop() + '”这件事牵住';
      // 只有带本盘具体判断的才保留第二句，否则和状态重复
      if (c.state && ['官印相生', '食神制杀', '食伤生财', '财生官杀', '财破印', '伤官见官', '枭神夺食', '比劫夺财', '疑从势', '疑专旺', '合身'].indexOf(c.key) < 0) c.effect = '';
    });
    return out;
  }

  /* ---------- 干支关系的后果 ---------- */
  var HUA = { '甲己': '土', '乙庚': '金', '丙辛': '水', '丁壬': '木', '戊癸': '火' };
  function relLinks(A) {
    var res = A.res, out = [], byLabel = {}; res.pillars.forEach(function (p) { byLabel[p.label] = p; });
    function who(r) { return r.who.map(function (l) { return byLabel[l]; }); }
    function mainOf(p, scope) { return scope === '天干' ? (p.label === '日柱' ? { ss: '日主', wx: p.ganWx } : { ss: GZ.shiShen(A.dg, p.gan), wx: p.ganWx }) : { ss: p.hide[0].shishen, wx: p.hide[0].wx }; }
    function posTxt(l) { return l + '（' + PILLAR[l].short + '）'; }
    res.relations.forEach(function (r) {
      var ps = who(r), type = r.type, tone = '平', effect = '', d = uniq(r.who.map(function (l) { return PILLAR[l].d; }));
      var mains = ps.map(function (p) { return mainOf(p, r.scope); });
      var vals = mains.map(function (m) { return m.ss === '日主' ? 0.5 : valOf(A, m.wx); });
      var ssTxt = ps.map(function (p, i) { return (r.scope === '天干' ? p.gan : p.zhi) + ' ' + mains[i].ss + (mains[i].ss !== '日主' ? '（' + roleWord(roleOf(A, mains[i].wx)) + '）' : ''); }).join('、');
      var hasDay = r.who.indexOf('日柱') >= 0, hasMonth = r.who.indexOf('月柱') >= 0;
      if (type === '合' && r.scope === '天干') {
        var k = HUA[r.chars[0] + r.chars[1]] ? r.chars[0] + r.chars[1] : r.chars[1] + r.chars[0], hua = HUA[k];
        var near = Math.abs(ps[0].label === ps[1].label ? 0 : res.pillars.indexOf(ps[0]) - res.pillars.indexOf(ps[1])) <= 1;
        var mo = GZ.zhiWx(res.ctx.monthZhi), sup = mo === hua || GZ.wxRel(mo, hua) === '生';
        var rival = res.pillars.filter(function (p) { return p.gan === r.chars[0] || p.gan === r.chars[1]; }).length > 2;
        var canHua = near && sup && !rival && !hasDay;
        if (canHua) { effect = '两干贴近，月令（' + mo + '）又支持' + hua + '，有合化的条件：两个字的原有作用会转向' + hua + '（' + LEI_NAME[GZ.wxToShenLei(A.dg, hua)] + '）。'; tone = valOf(A, hua) > 0 ? '吉' : valOf(A, hua) < 0 ? '凶' : '平'; }
        else {
          var bad = vals.filter(function (v) { return v < 0; }).length, good = vals.filter(function (v) { return v > 0.4; }).length;
          effect = '合而不化：' + (!near ? '两干不相邻，合力较松。' : !sup ? '月令不支持' + hua + '。' : rival ? '有多个相同天干争合。' : '日干不轻易化。') + '两字互相牵制，都不能全力发挥。' + (good && !bad ? '被绊的是你需要的力量，等于打了折扣。' : bad && !good ? '被绊的是对你不利的力量，反而减轻压力。' : '');
          tone = good && !bad ? '凶' : bad && !good ? '吉' : '平';
        }
      } else if (type === '合') {
        var g1 = vals.filter(function (v) { return v > 0.4; }).length, b1 = vals.filter(function (v) { return v < 0; }).length;
        effect = '两支绑在一起。' + (g1 && !b1 ? '被绑的是你需要的力量，它们容易顾着彼此，不能全力帮你。' : b1 && !g1 ? '被绑的是对你不利的力量，反而减少了麻烦。' : '好坏并存，主要表现为两个位置的人事联系紧密。');
        tone = g1 && !b1 ? '平' : b1 && !g1 ? '吉' : '平';
      } else if (type === '冲') {
        var ku = '辰戌丑未'.indexOf(r.chars[0]) >= 0;
        var gv = vals.filter(function (v) { return v > 0.4; }).length, bv = vals.filter(function (v) { return v < 0; }).length;
        effect = (r.scope === '地支' && ku ? '土对土相冲，传统上叫“开库”，库里藏的东西（' + ps.map(function (p) { return p.hide.map(function (h) { return h.shishen; }).join('、'); }).join('；') + '）容易被引出来。' : '两股力量正面顶上，双方都受损。') +
          (gv && !bv ? '受损的是你需要的力量，所以偏不利。' : bv && !gv ? '被冲掉的是对你不利的力量，反而是好事。' : '好坏都有被冲动。');
        tone = gv && !bv ? '凶' : bv && !gv ? '吉' : '平';
      } else if (type === '刑' || type === '三刑') {
        effect = '不是一次性的冲撞，而是反复的摩擦和压力。' + (hasDay ? '牵涉日柱，常表现在亲密关系或自我要求上。' : hasMonth ? '牵涉月令，常表现在工作环境和规则上。' : '');
        tone = '凶';
      } else if (type === '害') {
        effect = '各自的合神被对方冲掉，常表现为“本来可以合作，却被第三方或误会拆开”。';
        tone = '凶';
      } else if (type === '破') { effect = '力量很轻，通常只是小的不顺。'; tone = '平'; }
      else if (type === '暗合') { effect = '表面看不出来的联系，常指私下往来或不便明说的牵绊。'; tone = '平'; }
      else if (type === '三合' || type === '三会' || type === '半合' || type === '拱合') {
        var ju = (r.text.match(/([木火土金水])局/) || [])[1];
        if (ju) {
          var lei = GZ.wxToShenLei(A.dg, ju), jv = valOf(A, ju), full = type === '三合' || type === '三会';
          var inMonth = hasMonth;
          effect = (full ? '三支成局，' : type === '半合' ? '半合成势，' : '虚拱待补，') + ju + '气明显增强，也就是“' + LEI_NAME[lei] + '”（' + LEI_THEME[lei] + '）变重。' + (inMonth ? '有月令参与，力量更实。' : '') + (jv > 0 ? '这正是你需要的。' : jv < 0 ? '这恰是你不需要的，会加重失衡。' : '');
          if (type === '拱合' || type === '半合') {
            var miss = [['申', '子', '辰'], ['亥', '卯', '未'], ['寅', '午', '戌'], ['巳', '酉', '丑']].filter(function (g) { return g.indexOf(r.chars[0]) >= 0 && g.indexOf(r.chars[1]) >= 0; })[0].filter(function (z) { return r.chars.indexOf(z) < 0; })[0];
            effect += '运岁逢“' + miss + '”就会成局，是值得留意的时间点。';
          }
          tone = jv > 0 ? '吉' : jv < 0 ? '凶' : '平';
          d = uniq(d.concat(lei === '财才' ? ['wealth'] : lei === '官杀' ? ['career'] : lei === '印枭' ? ['study'] : lei === '食伤' ? ['study'] : ['social']));
        }
      }
      var state = '';
      if (r.scope === '天干') {
        state = '“' + mains.map(function (m) { return m.ss === '日主' ? '你自己' : LEI_THEME[LEI_OF[m.ss]]; }).join('”和“') + '”这两方面' + (type === '合' ? '互相牵住，常常要一起考虑，谁也不能完全放开。' : '方向相反，在台面上容易起冲突，常要二选一。');
      } else if (r.who.length === 2) {
        var ps2 = PAIR_STATE[pairKey(r.who[0], r.who[1])];
        if (ps2) state = type === '冲' ? ps2[1] : ['合', '半合', '暗合', '拱合'].indexOf(type) >= 0 ? ps2[0] : (type === '害' ? '表面不明显，但暗中有隔阂：' : '') + ps2[2];
      } else if (type === '三刑') state = '三个位置之间压力连成一串，这几方面的摩擦容易同时出现。';
      else state = r.who.map(function (l) { return PILLAR[l].short; }).join('、') + '这几方面都被这股力量带着走，人生主题比较集中。';
      out.push({
        state: state,
        text: r.text, type: type, scope: r.scope, who: r.who, chars: r.chars, tone: tone, ss: ssTxt, effect: effect,
        where: r.who.map(posTxt).join(' ↔ '), word: TYPE_WORD[type] || '', domains: d,
        key: 'rel|' + r.scope + '|' + type + '|' + r.chars.join('|') + '|' + r.who.join(',')
      });
    });
    // 关系之间的相互作用
    var notes = [];
    var chong = out.filter(function (l) { return l.type === '冲' && l.scope === '地支'; }), he = out.filter(function (l) { return (l.type === '合' || l.type === '半合') && l.scope === '地支'; });
    chong.forEach(function (c) {
      he.forEach(function (h) {
        var shared = c.who.filter(function (x) { return h.who.indexOf(x) >= 0; })[0];
        if (shared && h.who.join() !== c.who.join()) notes.push({ title: '合与冲相遇', text: shared + '同时参与“' + c.text + '”和“' + h.text + '”。传统上有“贪合忘冲”和“冲开合局”两种看法，取决于哪边更贴近、更有力。实际常表现为这个位置在拉扯中变动。', who: uniq(c.who.concat(h.who)) });
      });
    });
    var degree = {}; res.pillars.forEach(function (p) { degree[p.label] = 0; });
    out.forEach(function (l) { l.who.forEach(function (x) { degree[x]++; }); });
    var hub = Object.keys(degree).sort(function (a, b) { return degree[b] - degree[a]; })[0];
    var gc = {}; res.pillars.forEach(function (p, i) { gc[p.gan] = (gc[p.gan] || 0) + 1; });
    res.pillars.forEach(function (p) {
      if (GZ.xunKong(res.ctx.dayGz).indexOf(p.zhi) >= 0 && p.label !== '日柱') {
        var hit = out.filter(function (l) { return l.who.indexOf(p.label) >= 0 && l.scope === '地支' && ['冲', '合'].indexOf(l.type) >= 0; })[0];
        notes.push({ title: p.label + '逢空亡', text: p.zhi + '落在日柱旬空，' + PILLAR[p.label].short + '方面有“虚”的感觉' + (hit ? '，但它同时有“' + hit.text + '”，古书有“冲空则实、合空则实”之说，力量会被唤醒一部分。' : '。'), who: [p.label] });
      }
    });
    var degs = Object.keys(degree).map(function (k) { return degree[k]; }).sort(function (a, b) { return b - a; });
    return { links: out, notes: notes, degree: degree, hub: degree[hub] >= 3 || (degree[hub] >= 2 && degs[0] > degs[1]) ? hub : null };
  }

  /* ---------- 宫位落点 ---------- */
  function pillarRead(A, rel) {
    return A.res.pillars.map(function (p, i) {
      var gs = i === 2 ? null : { ss: GZ.shiShen(A.dg, p.gan), role: roleOf(A, p.ganWx) };
      var zs = { ss: p.hide[0].shishen, role: roleOf(A, p.hide[0].wx) };
      var score = (gs ? valOf(A, p.ganWx) * 0.5 : 0) + valOf(A, p.hide[0].wx) * 0.5;
      var ls = rel.links.filter(function (l) { return l.who.indexOf(p.label) >= 0 && ['破', '暗合'].indexOf(l.type) < 0; });
      ls.forEach(function (l) { score += l.tone === '吉' ? 0.2 : l.tone === '凶' ? -0.25 : 0; });
      var verdict = score >= 0.5 ? '这个位置对你助力较多' : score <= -0.5 ? '这个位置压力或消耗较多' : '这个位置有助力也有消耗';
      var txt = (gs ? '天干' + p.gan + '是' + gs.ss + '（' + roleWord(gs.role) + '），' : '天干是日主本身，') + '地支' + p.zhi + '以' + zs.ss + '为主（' + roleWord(zs.role) + '）。';
      var showG = gs ? GZ.SS_STATE[gs.ss].pos[i] : '';
      var showZ = GZ.SS_STATE[zs.ss].pos[i];
      var stage = GZ.CS_STATE[p.dishi];
      return { label: p.label, gz: p.gz, mean: PILLAR[p.label].mean, short: PILLAR[p.label].short, gan: gs, zhi: zs, score: score, signal: clampSig(score * 2), verdict: verdict, text: txt, links: ls,
        outer: showG, inner: showZ, stage: p.dishi, stageTxt: stage, ganCh: p.gan, zhiCh: p.zhi };
    });
  }

  /* ---------- 运岁 ---------- */
  var LEI_DOMAIN = { '官杀': { career: 1 }, '印枭': { study: 1, career: 0.4 }, '财才': { wealth: 1 }, '食伤': { study: 0.6, wealth: 0.5 }, '比劫': { social: 1 } };
  function spouseLei(res) { return res.gender === 1 ? '财才' : '官杀'; }
  /**
   * 分析一个时段。parents：上层时段 [{label, gz}]
   * 返回主题、引动（作用在哪一柱、意味着什么）、对各领域的影响。
   */
  function period(A, gz, label, parents) {
    var res = A.res, g = gz.charAt(0), z = gz.charAt(1);
    parents = parents || [];
    var ssG = GZ.shiShen(A.dg, g), ssZ = GZ.shiShen(A.dg, GZ.HIDE[z][0]);
    var gw = GZ.ganWx(g), zw = GZ.HIDE[z] ? GZ.ganWx(GZ.HIDE[z][0]) : GZ.zhiWx(z);
    var wG = { '大运': 0.4, '流年': 0.6, '流月': 0.5, '流日': 0.5, '小运': 0.4 }[label] || 0.5;
    var base = valOf(A, gw) * wG + valOf(A, zw) * (1 - wG);
    var delta = 0, triggers = [], flags = [], dm = {};
    function bump(k, v) { dm[k] = (dm[k] || 0) + v; }
    [[LEI_OF[ssG], valOf(A, gw), wG], [LEI_OF[ssZ], valOf(A, zw), 1 - wG]].forEach(function (x) {
      var map = LEI_DOMAIN[x[0]]; Object.keys(map).forEach(function (k) { bump(k, map[k] * x[1] * x[2] * 2); });
      if (x[0] === spouseLei(res)) bump('love', x[1] * x[2] * 1.6);
    });
    res.pillars.forEach(function (p, i) {
      var isDay = i === 2;
      GZ.ganPairRel(g, p.gan).forEach(function (r) {
        var tv = isDay ? 0.3 : valOf(A, p.ganWx);
        var d = r.type === '冲' ? -0.3 * tv - (isDay ? 0.15 : 0) : -0.12 * tv;
        delta += d;
        var tone = d > 0.05 ? '吉' : d < -0.05 ? '凶' : '平';
        triggers.push({ scope: '天干', type: r.type, text: r.text, on: p.label, char: p.gan, tone: tone, means: (isDay ? '直接作用在你自己身上' : '牵动' + p.label.charAt(0) + '干 ' + GZ.shiShen(A.dg, p.gan)) + '，' + TYPE_WORD[r.type] + '。', key: 'rel|天干|' + r.type + '|' + g + '|' + p.gan });
        bump(PILLAR[p.label].d, d * 1.2);
      });
      GZ.zhiPairRel(z, p.zhi).forEach(function (r) {
        if (['拱合', '暗合'].indexOf(r.type) >= 0) return;
        var mainWx = p.hide[0].wx, tv = valOf(A, mainWx), w = i === 2 || i === 1 ? 1.3 : 1, d = 0;
        if (r.type === '冲') d = (-0.28 * tv - 0.08) * w;
        else if (r.type === '合') d = -0.1 * tv * w + 0.05;
        else if (r.type === '半合') d = 0.05;
        else if (r.type === '刑') d = -0.18 * w;
        else if (r.type === '害') d = -0.14 * w;
        else if (r.type === '破') d = -0.05;
        delta += d;
        var tone = d > 0.05 ? '吉' : d < -0.05 ? '凶' : '平';
        var place = p.label === '日柱' ? '日支（夫妻宫）' : p.label === '月柱' ? '月支（月令）' : p.label.charAt(0) + '支';
        triggers.push({ scope: '地支', type: r.type, text: r.text, on: p.label, char: p.zhi, tone: tone, means: '牵动' + place + ' ' + p.hide[0].shishen + '（' + PILLAR[p.label].short + '），' + TYPE_WORD[r.type] + '。', key: 'rel|地支|' + r.type + '|' + z + '|' + p.zhi });
        bump(PILLAR[p.label].d, d * 1.4);
        if (r.type === '冲' && i === 2) bump('health', -0.3);
      });
      // 天克地冲、伏吟
      if (gz === p.gz) flags.push({ name: '伏吟' + p.label.charAt(0) + '柱', text: '与' + p.label + '干支相同，这个位置的事容易重复出现、停滞或被放大。', tone: '平', on: p.label });
      var keG = GZ.wxRel(GZ.ganWx(g), p.ganWx) === '克' && GZ.isYang(g) === GZ.isYang(p.gan);
      var chongZ = GZ.zhiPairRel(z, p.zhi).some(function (r) { return r.type === '冲'; });
      if (keG && chongZ) { flags.push({ name: '天克地冲' + p.label.charAt(0) + '柱', text: '天干相克、地支相冲同时作用于' + p.label + '（' + PILLAR[p.label].short + '），是最明显的变动信号之一。', tone: '凶', on: p.label }); delta -= i === 2 || i === 1 ? 0.3 : 0.15; }
    });
    // 成局与上层时段
    var items = res.pillars.map(function (p) { return { label: p.label, gan: p.gan, zhi: p.zhi }; }).concat(parents.map(function (x) { return { label: x.label, gan: x.gz.charAt(0), zhi: x.gz.charAt(1) }; }));
    items.push({ label: label, gan: g, zhi: z });
    GZ.analyzeRelations(items, { onlyWith: items.length - 1 }).forEach(function (r) {
      if (['三合', '三会', '三刑'].indexOf(r.type) < 0) return;
      var ju = (r.text.match(/([木火土金水])局/) || [])[1];
      if (ju) {
        var v = valOf(A, ju), lei = GZ.wxToShenLei(A.dg, ju); delta += v * 0.45;
        flags.push({ name: r.text.replace(/局.*/, '局'), text: '和' + r.who.filter(function (x) { return x !== label; }).join('、') + '合成' + ju + '局，“' + LEI_NAME[lei] + '”（' + LEI_THEME[lei] + '）会突然变重。' + (v > 0 ? '这是你需要的。' : v < 0 ? '这是你不需要的。' : ''), tone: v > 0 ? '吉' : v < 0 ? '凶' : '平', key: 'rel|地支|' + r.type + '|' + r.chars.join('|') });
        var map = LEI_DOMAIN[lei]; Object.keys(map).forEach(function (k) { bump(k, map[k] * v); });
      } else { delta -= 0.25; flags.push({ name: r.text.replace(/（.*/, ''), text: '和' + r.who.filter(function (x) { return x !== label; }).join('、') + '凑成三刑，这段时间摩擦和压力集中。', tone: '凶', key: 'rel|地支|三刑|' + r.chars.join('|') }); }
    });
    parents.forEach(function (x) {
      var pg = x.gz.charAt(0), pz = x.gz.charAt(1);
      if (x.gz === gz) { flags.push({ name: '与' + x.label + '并临', text: '和' + x.label + '干支相同，同一种力量被加倍，好坏都更明显。', tone: base >= 0 ? '吉' : '凶' }); delta += base * 0.3; }
      else if (GZ.zhiPairRel(z, pz).some(function (r) { return r.type === '冲'; })) {
        var ke = GZ.ganPairRel(g, pg).some(function (r) { return r.type === '冲'; });
        flags.push({ name: (ke ? '天克地冲' : '冲') + x.label, text: '和' + x.label + '（' + x.gz + '）' + (ke ? '干支都相冲' : '地支相冲') + '，大环境和眼前的事方向相反，这段时间多变动。', tone: '凶' }); delta -= ke ? 0.3 : 0.15;
      } else if (GZ.zhiPairRel(z, pz).some(function (r) { return r.type === '合'; }) || GZ.ganPairRel(g, pg).some(function (r) { return r.type === '合'; })) {
        flags.push({ name: '合' + x.label, text: '和' + x.label + '（' + x.gz + '）相合，这段时间的事和大环境比较合拍。', tone: '吉' }); delta += 0.1;
      }
    });
    var signal = clampSig(base * 1.2 + delta * 1.4);
    triggers.forEach(function (t) {
      var ev = PILLAR_EVENT[t.on] && PILLAR_EVENT[t.on][eventGroup(t.type)];
      if (t.scope === '天干' && t.on === '日柱') ev = t.type === '合' ? '有人或有事主动找上你，容易被牵住' : '你自己的状态和方向受到直接挑战';
      t.event = ev || t.means;
    });
    var feelTxt = '外面的事（' + ssG + '）：' + ssFeel(ssG, roleOf(A, gw)) + '。自己的状态（' + ssZ + '）：' + ssFeel(ssZ, roleOf(A, zw)) + '。';
    var themes = uniq([LEI_OF[ssG], LEI_OF[ssZ]]).map(function (l) { return LEI_THEME[l]; }).join('、');
    var hits = DOMAINS.map(function (d) { return { k: d.k, t: d.t, v: dm[d.k] || 0 }; }).filter(function (x) { return Math.abs(x.v) >= 0.35; }).sort(function (a, b) { return Math.abs(b.v) - Math.abs(a.v); });
    var places = uniq(triggers.filter(function (t) { return ['冲', '刑', '害', '合'].indexOf(t.type) >= 0; }).map(function (t) { return t.on; }));
    return {
      label: label, gz: gz, gan: g, zhi: z, ssG: ssG, ssZ: ssZ, roleG: roleOf(A, gw), roleZ: roleOf(A, zw), signal: signal, word: SIGNAL[signal],
      theme: themes, feel: feelTxt, triggers: triggers, flags: flags, domains: dm, hits: hits, places: places,
      headline: label + ' ' + gz + '：天干' + g + '是' + ssG + '（' + roleWord(roleOf(A, gw)) + '），地支' + z + '以' + ssZ + '为主（' + roleWord(roleOf(A, zw)) + '）。主题偏向' + themes + '。'
    };
  }
  function dayunChain(res, y) {
    var dy = null, ln = null, di = -1, li = -1;
    res.yun.daYun.forEach(function (d, i) { d.liuNian.forEach(function (x, j) { if (x.year === y) { dy = d; ln = x; di = i; li = j; } }); });
    return { dy: dy, ln: ln, di: di, li: li };
  }
  function baziYear(A, y) {
    var ch = dayunChain(A.res, y);
    var gz = ch.ln ? ch.ln.gz : Ziwei.yearGz(y);
    var parents = ch.dy && ch.dy.gz ? [{ label: '大运', gz: ch.dy.gz }] : [];
    var P = period(A, gz, '流年', parents); P.year = y; P.dy = ch.dy; P.age = ch.ln ? ch.ln.age : null;
    return P;
  }
  function baziTimeline(A) {
    return A.res.yun.daYun.filter(function (d) { return d.gz; }).map(function (d) {
      var P = period(A, d.gz, '大运', []);
      P.from = d.startAge; P.to = d.endAge; P.startYear = d.startYear; P.endYear = d.endYear; P.index = d.index;
      return P;
    });
  }

  /* ---------- 领域判断（八字） ---------- */
  function windowsOf(A, tl, key, nowY) {
    var future = tl.filter(function (t) { return t.endYear >= nowY; });
    var open = future.filter(function (t) { return (t.domains[key] || 0) >= 0.5; })[0];
    var hard = future.filter(function (t) { return (t.domains[key] || 0) <= -0.5; })[0];
    return { open: open ? { t: open.from + '–' + open.to + ' 岁（' + open.gz + '运，' + open.startYear + ' 起）', gz: open.gz } : null, hard: hard ? { t: hard.from + '–' + hard.to + ' 岁（' + hard.gz + '运，' + hard.startYear + ' 起）', gz: hard.gz } : null };
  }
  function presenceTxt(A, l) {
    var arr = A.all[l] || [];
    var stems = arr.filter(function (x) { return /干$/.test(x.at); });
    if (!arr.length) return { n: 0, txt: '四柱全不见' };
    if (stems.length) return { n: 2, txt: '透出天干（' + stems.map(function (x) { return x.at + ' ' + x.ch; }).join('、') + '）' };
    return { n: 1, txt: '只藏在地支里（' + uniq(arr.map(function (x) { return x.at.charAt(0) + '支'; })).join('、') + '）' };
  }
  function baziDomains(A, combos, rel, tl, nowY) {
    var res = A.res, out = {};
    function make(k, title) { return { k: k, t: title, score: 0, because: [], where: [], tips: [], verdict: '' }; }
    function comboInto(d) {
      combos.filter(function (c) { return c.domains.indexOf(d.k) >= 0; }).forEach(function (c) {
        d.score += c.tone === '吉' ? 0.6 : c.tone === '凶' ? -0.7 : 0;
        d.because.push({ t: '<b>' + c.plain + '</b>：' + (c.state || c.effect), key: 'anc|' + c.key, tone: c.tone });
      });
    }
    function relInto(d, labels, onlyTypes) {
      rel.links.filter(function (l) { return l.who.some(function (x) { return labels.indexOf(x) >= 0; }) && (!onlyTypes || onlyTypes.indexOf(l.type) >= 0) && ['破', '暗合', '拱合'].indexOf(l.type) < 0 && l.scope === '地支'; }).forEach(function (l) {
        d.score += l.tone === '吉' ? 0.25 : l.tone === '凶' ? -0.35 : 0;
        d.because.push({ t: '<b>' + l.text + '</b>（' + l.who.join('、') + '）：' + (l.state || l.effect), key: l.key, tone: l.tone });
      });
    }
    function finish(d, headGood, headMid, headBad) {
      d.signal = clampSig(d.score);
      d.word = SIGNAL[d.signal];
      d.verdict = d.signal >= 1 ? headGood : d.signal <= -1 ? headBad : headMid;
      d.when = windowsOf(A, tl, d.k, nowY);
      out[d.k] = d;
    }
    // 事业
    var d = make('career', '事业');
    var gq = presenceTxt(A, '官杀'), gy = presenceTxt(A, '印枭'), gr = leiRole(A, '官杀');
    d.because.push({ t: '官杀（职位、规范、压力）' + gq.txt + '，是你的' + roleWord(gr) + '。', key: 'ss|正官' });
    d.because.push({ t: '印星（平台、资历）' + gy.txt + '，是你的' + roleWord(leiRole(A, '印枭')) + '。', key: 'ss|正印' });
    d.score += leiVal(A, '官杀') * (gq.n ? 0.6 : 0.15) + leiVal(A, '印枭') * (gy.n ? 0.25 : 0);
    var geWord = { '正官': '规则清楚的组织和管理岗位', '七杀': '高压、竞争、需要决断的领域', '正财': '稳定经营、财务或实务类工作', '偏财': '商业、销售、资源整合类工作', '食神': '技术、内容、教育或服务类工作', '伤官': '创意、专业技艺、独立执业', '正印': '教育、研究、文化、体制内平台', '偏印': '偏门专业、研究、技术或玄学艺术', '建禄': '靠本事自立，适合专业或自主经营', '羊刃': '竞争激烈、需要魄力的行业', '月劫': '合伙、团队、业务开拓' };
    var gk = res.geju.name.replace('格', '');
    d.because.push({ t: '月令取' + res.geju.name + '，传统上较适合：' + (geWord[gk] || '结合实际环境判断') + '。', key: 'ge|' + res.geju.name });
    comboInto(d); relInto(d, ['月柱'], ['冲', '刑', '害', '合', '三合', '三会']);
    d.where.push('月柱（环境与青年）' + res.pillars[1].gz + '，时柱（长期成果）' + res.pillars[3].gz);
    finish(d, '事业结构比较顺，可以主动争取。', '事业有机会也有消耗，关键在选对环境。', '外部压力或阻力较多，宜先巩固实力和靠山。');
    // 财运
    d = make('wealth', '财运');
    var gc = presenceTxt(A, '财才'), cr = leiRole(A, '财才');
    d.because.push({ t: '财星' + gc.txt + '，是你的' + roleWord(cr) + '。', key: 'ss|正财' });
    d.score += leiVal(A, '财才') * (gc.n ? 0.6 : 0.2);
    d.because.push({ t: A.strong ? '日主偏强，担得住财。' : A.weak ? '日主偏弱，财多了反而累。' : '日主中和，财来了基本能担。', key: 'term|旺衰' });
    d.score += A.strong ? 0.3 : A.weak ? -0.25 : 0;
    var kuHit = res.pillars.filter(function (p) { return '辰戌丑未'.indexOf(p.zhi) >= 0 && p.hide.some(function (h) { return LEI_OF[h.shishen] === '财才'; }); });
    if (kuHit.length) { d.because.push({ t: kuHit.map(function (p) { return p.label.charAt(0) + '支 ' + p.zhi; }).join('、') + ' 藏财，传统上叫“财库”，有积累的条件。', key: 'term|藏干' }); d.score += 0.2; }
    comboInto(d);
    var caiSlots = findSS(A, ['正财', '偏财']);
    d.where.push(caiSlots.length ? '财落在 ' + whereTxt(caiSlots) : '原局无明显财位，靠运岁带动');
    finish(d, '财路比较顺，能担也能留。', '财有来路，但要留意节奏和分配。', '求财较吃力，或来得快去得快，宜先稳住基本盘。');
    // 感情
    d = make('love', '感情');
    var sl = spouseLei(res), gsp = presenceTxt(A, sl), dz = res.pillars[2];
    d.because.push({ t: '日支（夫妻宫）' + dz.zhi + ' 以' + dz.hide[0].shishen + '为主，是你的' + roleWord(roleOf(A, dz.hide[0].wx)) + '。传统上喜用坐夫妻宫，主伴侣是助力。', key: 'ss|' + dz.hide[0].shishen });
    d.score += valOf(A, dz.hide[0].wx) * 0.5;
    d.because.push({ t: (res.gender === 1 ? '男命看财星' : '女命看官杀') + '：配偶星' + gsp.txt + '，是你的' + roleWord(leiRole(A, sl)) + '。', key: 'hh|配偶星' });
    d.score += leiVal(A, sl) * (gsp.n ? 0.35 : 0);
    var inGong = dz.hide.some(function (h) { return LEI_OF[h.shishen] === sl; });
    if (inGong) { d.because.push({ t: '配偶星就坐在夫妻宫里，感情和家庭比较受重视。', key: 'hh|配偶星' }); d.score += 0.2; }
    comboInto(d); relInto(d, ['日柱'], ['冲', '刑', '害', '合', '半合']);
    if (GZ.xunKong(res.ctx.dayGz).length) { /* 日柱不论自身空亡 */ }
    var flowers = res.pillars.filter(function (p) { return p.shensha.some(function (n) { return ['桃花', '红鸾', '天喜', '红艳'].indexOf(n) >= 0; }); });
    if (flowers.length) d.because.push({ t: flowers.map(function (p) { return p.label + '见' + p.shensha.filter(function (n) { return ['桃花', '红鸾', '天喜', '红艳'].indexOf(n) >= 0; }).join('、'); }).join('；') + '，异性缘或情感活跃。', key: 'sha|桃花' });
    d.where.push('日支（夫妻宫）' + dz.zhi + '，中年阶段影响最直接');
    finish(d, '感情结构较稳，伴侣容易成为助力。', '感情平稳中有需要磨合的地方。', '亲密关系容易成为压力来源，需要多沟通，也可以等合适的时机。');
    // 身心
    d = make('health', '身心');
    var f = flowOf(A);
    d.because.push({ t: '五行格局：' + f.balance + '。' + (f.balance === '偏枯' ? '力量集中在少数五行，容易一处过劳、一处不足。' : f.balance === '流通均衡' ? '各部分都能运转，负担比较分散。' : '有主线但不至于失衡。'), key: 'an|流通' });
    d.score += f.balance === '偏枯' ? -0.8 : f.balance === '流通均衡' ? 0.6 : 0;
    var over = f.nodes.filter(function (n) { return n.pct >= 35; })[0], lack = f.weakNodes[0];
    if (over) { var oi = GZ.WX_INFO[over.wx]; d.because.push({ t: over.wx + '过旺，传统上对应' + oi.organ + '这一系，容易因过度而疲劳。', key: 'term|开运' }); }
    if (lack) { var li = GZ.WX_INFO[lack.wx]; d.because.push({ t: lack.wx + '偏弱，传统上对应' + li.organ + '这一系，平时可以多留意。', key: 'term|开运' }); }
    comboInto(d);
    d.where.push('这只是传统的五行类比，不是医学判断');
    finish(d, '整体比较平衡，保持节奏即可。', '有些方面容易累，注意劳逸。', '结构偏失衡，压力容易累积，更要留意休息和情绪。身体不适请看医生。');
    // 学业才华
    d = make('study', '学业才华');
    var gsh = presenceTxt(A, '食伤');
    d.because.push({ t: '印星（学习、吸收）' + gy.txt + '；食伤（表达、产出）' + gsh.txt + '。', key: 'term|十神' });
    d.score += (gy.n ? 0.3 : 0) + (gsh.n ? 0.3 : 0) + leiVal(A, '印枭') * 0.2 + leiVal(A, '食伤') * 0.2;
    var wen = []; res.pillars.forEach(function (p) { p.shensha.forEach(function (n) { if (['文昌贵人', '学堂', '华盖', '太极贵人'].indexOf(n) >= 0) wen.push(p.label.charAt(0) + '柱' + n); }); });
    if (wen.length) { d.because.push({ t: '见 ' + uniq(wen).join('、') + '，传统上利学习、钻研。', key: 'sha|文昌贵人' }); d.score += 0.3; }
    comboInto(d);
    d.where.push(gy.n && gsh.n ? '吸收和产出都有，可以学以致用' : gy.n ? '偏吸收，要注意把想法做出来' : gsh.n ? '偏产出，要注意打好基础' : '要靠后天刻意训练');
    finish(d, '学习和表达条件都不错，是可以发挥的长处。', '有一定条件，需要选对方向持续投入。', '学习或表达容易受干扰，换个环境或方法可能更有效。');
    // 家庭六亲
    d = make('family', '家庭六亲');
    var fa = findSS(A, ['偏财']), mo = findSS(A, ['正印']), bro = findSS(A, ['比肩', '劫财']), kid = findSS(A, res.gender === 1 ? ['七杀', '正官'] : ['食神', '伤官']);
    d.because.push({ t: '父（偏财）' + (fa.length ? '在 ' + fa.map(function (s) { return s.at; }).join('、') : '未现于干支主气') + '；母（正印）' + (mo.length ? '在 ' + mo.map(function (s) { return s.at; }).join('、') : '未现于干支主气') + '。', key: 'ss|正印' });
    d.because.push({ t: '兄弟同辈（比劫）' + (bro.length ? '在 ' + bro.map(function (s) { return s.at; }).join('、') : '不显') + '；子女（' + (res.gender === 1 ? '官杀' : '食伤') + '）' + (kid.length ? '在 ' + kid.map(function (s) { return s.at; }).join('、') : '不显') + '。', key: 'ss|比肩' });
    d.score += valOf(A, res.pillars[0].hide[0].wx) * 0.3 + valOf(A, res.pillars[1].hide[0].wx) * 0.3 + valOf(A, res.pillars[3].hide[0].wx) * 0.3;
    relInto(d, ['年柱', '时柱'], ['冲', '刑', '害', '合']);
    d.where.push('年、月柱看长辈与原生家庭，时柱看子女');
    finish(d, '家庭这条线助力较多。', '家庭有支持也有需要操心的地方。', '家庭关系可能需要多花心力，保持适当距离也是办法。');
    // 人际
    d = make('social', '人际贵人');
    var gui = []; res.pillars.forEach(function (p) { p.shensha.forEach(function (n) { if (['天乙贵人', '天德贵人', '月德贵人', '福星贵人', '国印贵人'].indexOf(n) >= 0) gui.push(p.label.charAt(0) + '柱' + n); }); });
    if (gui.length) { d.because.push({ t: '见 ' + uniq(gui).join('、') + '，传统上主有贵人缘。', key: 'sha|天乙贵人' }); d.score += Math.min(0.9, uniq(gui).length * 0.3); }
    else d.because.push({ t: '原局未见常用贵人神煞，人脉更多靠自己经营。', key: 'sha|天乙贵人' });
    d.because.push({ t: '比劫（同辈、合作者）是你的' + roleWord(leiRole(A, '比劫')) + '：' + (leiVal(A, '比劫') > 0 ? '同辈更像帮手。' : leiVal(A, '比劫') < 0 ? '同辈之间竞争多于帮助，合作要说清楚。' : '合作看具体的人。'), key: 'ss|比肩' });
    d.score += leiVal(A, '比劫') * 0.4;
    comboInto(d);
    var mover = res.pillars.filter(function (p) { return p.shensha.indexOf('驿马') >= 0; });
    if (mover.length) d.because.push({ t: mover.map(function (p) { return p.label; }).join('、') + '见驿马，人脉和机会常来自走动、异地。', key: 'sha|驿马' });
    d.where.push('年柱看外部关系，月柱看同事同学');
    finish(d, '人际上容易得到帮助。', '人际平稳，好关系要靠经营。', '人际上容易有竞争或误会，选对合作者很重要。');
    return out;
  }

  /* ---------- 八字总分析 ---------- */
  function bazi(res, nowY) {
    nowY = nowY || new Date().getFullYear();
    var A = ctxOf(res);
    var flow = flowOf(A), structure = structureOf(A), combos = combosOf(A), rel = relLinks(A), pillars = pillarRead(A, rel), timeline = baziTimeline(A);
    var domains = baziDomains(A, combos, rel, timeline, nowY);
    var cur = timeline.filter(function (t) { return nowY >= t.startYear && nowY <= t.endYear; })[0] || null;
    var thisYear = baziYear(A, nowY);
    var lines = [];
    lines.push({ h: '你的底气', t: LEVEL_PLAIN[res.wx.level] + ' <small>（' + res.dayGan + res.dayWx + '日主，生扶 ' + res.wx.ratio + '%，判为' + res.wx.level + '）</small>', key: 'term|旺衰' });
    var m = flow.main;
    lines.push({ h: '最强的力量', t: '盘里最强的是<b>“' + m.theme + '”</b>：' + LEI_STATE[m.lei] + '。 <small>（' + m.name + ' ' + m.wx + '，' + m.pct + '%）</small>', key: 'an|流通' });
    if (flow.conflict) {
      var c = flow.conflict;
      lines.push({ h: '主要矛盾', t: '<b>' + c.mean + '</b>。' + (c.bridge ? '好在“' + LEI_THEME[c.by] + '”有一定力量，能在中间缓冲。' : '中间缺少“' + LEI_THEME[c.by] + '”来缓冲，这股张力比较直接；走到' + c.bridgeWx + '的运岁时最能化解。') + ' <small>（' + c.name + '）</small>', key: 'an|通关' });
    } else if (flow.breakAt) {
      lines.push({ h: '薄弱环节', t: '<b>“' + flow.breakAt.theme + '”</b>这方面的渠道不天然，力量走到这里就断了，需要后天刻意补。 <small>（' + flow.breakAt.name + ' ' + flow.breakAt.wx + ' 偏弱）</small>', key: 'an|流通' });
    } else lines.push({ h: '整体流动', t: '五个方面都有一定力量，没有特别尖锐的冲突，比较容易转得开。', key: 'an|流通' });
    if (rel.hub) lines.push({ h: '最敏感的位置', t: '<b>' + PILLAR[rel.hub].short + '</b>这一块牵连最多，运岁一动，这方面最先有感觉。 <small>（' + rel.hub + '，' + rel.degree[rel.hub] + ' 组干支关系）</small>', key: 'an|枢纽' });
    var xi = res.wx.xi[0];
    lines.push({ h: '你最需要', t: '<b>' + XI_NEED[xi.lei] + '</b>。 <small>（喜用：' + xi.wx + '，' + LEI_NAME[xi.lei] + '）</small>', key: 'term|喜用' });
    if (cur) lines.push({ h: '现在', t: '这十年的主题偏向<b>' + cur.theme + '</b>，整体' + cur.word + '；' + nowY + ' 年偏向' + thisYear.theme + '，' + thisYear.word + '。 <small>（' + cur.gz + '大运，' + cur.from + '–' + cur.to + ' 岁；' + thisYear.gz + '流年）</small>', key: 'term|大运' });
    return { A: A, flow: flow, structure: structure, combos: combos, rel: rel, pillars: pillars, timeline: timeline, domains: domains, lines: lines, current: cur, thisYear: thisYear, nowY: nowY };
  }

  /* ========================= 紫微 ========================= */
  var P_THEME = { '命宫': '自己', '兄弟': '手足与现金周转', '夫妻': '伴侣', '子女': '子女与合作', '财帛': '钱财', '疾厄': '身体', '迁移': '外出与社会形象', '交友': '朋友同事', '官禄': '事业', '田宅': '家宅与积蓄', '福德': '心态与享受', '父母': '长辈与文书' };
  var P_DOMAIN = { '命宫': 'health', '兄弟': 'social', '夫妻': 'love', '子女': 'family', '财帛': 'wealth', '疾厄': 'health', '迁移': 'social', '交友': 'social', '官禄': 'career', '田宅': 'wealth', '福德': 'health', '父母': 'family' };
  var BV = { '庙': 1, '旺': 0.75, '得': 0.5, '利': 0.25, '平': 0, '不': -0.5, '陷': -0.75, '': 0 };
  var AUX_GOOD = ['文昌', '文曲', '左辅', '右弼', '天魁', '天钺', '禄存'];
  var SYS_OF = { '紫微': '紫府廉武相', '天府': '紫府廉武相', '廉贞': '紫府廉武相', '武曲': '紫府廉武相', '天相': '紫府廉武相', '七杀': '杀破狼', '破军': '杀破狼', '贪狼': '杀破狼', '天机': '机月同梁', '太阴': '机月同梁', '天同': '机月同梁', '天梁': '机月同梁', '巨门': '巨日', '太阳': '巨日' };
  var SYS_TXT = {
    '紫府廉武相': '偏向权责和管理：重地位与实务，适合在结构中担当。',
    '杀破狼': '偏向开创和变动：人生转折明显，适合竞争、创业或需要冲劲的领域。',
    '机月同梁': '偏向稳定和策划：思考细，适合文职、专业和幕后。',
    '巨日': '偏向口才和传播：靠表达、专业和名声立足。'
  };
  function pName(r, n) { return r.palaces.filter(function (x) { return x.name === n; })[0]; }
  function pScore(r, b) {
    var P = r.palaces[Ziwei.md(b)], s = 0;
    if (P.major.length) { var t = 0; P.major.forEach(function (x) { t += BV[x.bright] || 0; }); s += t / P.major.length; } else s -= 0.25;
    P.aux.forEach(function (x) { if (AUX_GOOD.indexOf(x.name) >= 0) s += 0.4; });
    P.sha.forEach(function (x) { s += ['庙', '旺'].indexOf(x.bright) >= 0 ? -0.25 : -0.5; });
    P.major.concat(P.aux).forEach(function (x) { s += { '禄': 1, '权': 0.6, '科': 0.5, '忌': -1 }[x.hua] || 0; });
    return s;
  }
  function pScoreSF(r, b) { return pScore(r, b) + 0.5 * pScore(r, b + 6) + 0.25 * (pScore(r, b + 4) + pScore(r, b - 4)); }
  function zSig(v) { return v >= 2.3 ? 2 : v >= 1.1 ? 1 : v > -0.1 ? 0 : v > -1 ? -1 : -2; }
  function zRunSig(v) { return v >= 1.6 ? 2 : v >= 0.85 ? 1 : v > 0.05 ? 0 : v > -0.7 ? -1 : -2; }
  function pDesc(r, b) {
    var P = r.palaces[Ziwei.md(b)];
    var main = P.major.map(function (s) { return s.name + (s.bright ? '（' + s.bright + '）' : '') + (s.hua ? '化' + s.hua : ''); }).join('、') || '空宫';
    var other = P.aux.concat(P.sha).map(function (s) { return s.name + (s.hua ? '化' + s.hua : ''); }).join('、');
    return main + (other ? '，见 ' + other : '');
  }
  function feiNet(r) {
    var net = [];
    r.palaces.forEach(function (P) {
      Ziwei.feiHua(r, P.b).forEach(function (f) { net.push({ from: P.name, fromB: P.b, to: f.palace, toB: f.b, star: f.star, hua: f.hua, self: f.self, gan: P.gan }); });
    });
    return net;
  }
  function jiaOf(r) {
    var pairs = [['擎羊', '陀罗', '羊陀夹', '凶'], ['火星', '铃星', '火铃夹', '凶'], ['地空', '地劫', '空劫夹', '凶'], ['文昌', '文曲', '昌曲夹', '吉'], ['左辅', '右弼', '左右夹', '吉'], ['天魁', '天钺', '魁钺夹', '吉'], ['太阳', '太阴', '日月夹', '吉']];
    var out = [];
    r.palaces.forEach(function (P) {
      var L = r.palaces[Ziwei.md(P.b - 1)], R = r.palaces[Ziwei.md(P.b + 1)];
      function has(Q, n) { return Q.major.concat(Q.aux, Q.sha).some(function (s) { return s.name === n; }); }
      pairs.forEach(function (x) { if ((has(L, x[0]) && has(R, x[1])) || (has(L, x[1]) && has(R, x[0]))) out.push({ palace: P.name, b: P.b, name: x[2], tone: x[3] }); });
    });
    return out;
  }
  function huaPlain(hua, palace) {
    var t = P_THEME[palace];
    return { '禄': '“' + t + '”方面比较顺，好处常落在这里。', '权': '“' + t + '”方面你更有主动权，也更忙、更想掌控。', '科': '“' + t + '”方面比较体面，容易得到好评或贵人相助。', '忌': '“' + t + '”方面容易操心、放不下，也是这段时间最费力的地方。' }[hua];
  }
  function huaPaths(r) {
    return r.sihua.map(function (h) {
      var opp = r.palaces[Ziwei.md(h.b + 6)], theme = P_THEME[h.palace];
      var mean = huaPlain(h.hua, h.palace);
      if (h.hua === '忌') mean += '对面的“' + P_THEME[opp.name] + '”（' + opp.name + '）也容易被牵连。';
      return { star: h.star, hua: h.hua, palace: h.palace, b: h.b, opp: opp.name, mean: mean };
    });
  }
  function ziwei(r, nowY) {
    nowY = nowY || new Date().getFullYear();
    var ming = r.palaces[r.ming], shen = r.palaces[r.shen];
    var sf = Ziwei.sanFang(r.ming), count = {};
    sf.forEach(function (b) { r.palaces[b].major.forEach(function (s) { count[SYS_OF[s.name]] = (count[SYS_OF[s.name]] || 0) + 1; }); });
    var seat = ming.major.length ? ming.major : r.palaces[Ziwei.md(r.ming + 6)].major;
    var sys = SYS_OF[seat[0].name];
    var goodN = 0, badN = 0;
    sf.forEach(function (b) { var P = r.palaces[b]; P.aux.forEach(function (x) { if (AUX_GOOD.indexOf(x.name) >= 0) goodN++; }); badN += P.sha.length; P.major.concat(P.aux).forEach(function (x) { if (x.hua === '禄' || x.hua === '权' || x.hua === '科') goodN++; if (x.hua === '忌') badN++; }); });
    var paths = huaPaths(r), net = feiNet(r), jia = jiaOf(r);
    var lu = r.sihua.filter(function (x) { return x.hua === '禄'; })[0], ji = r.sihua.filter(function (x) { return x.hua === '忌'; })[0];
    var luJi = '';
    if (lu && ji) {
      if (lu.b === ji.b) luJi = '生年化禄和化忌都在' + lu.palace + '：这个方面得失都大，既是机会也是负担。';
      else if (Ziwei.md(lu.b + 6) === ji.b) luJi = '生年化忌（' + ji.palace + '）正冲化禄（' + lu.palace + '）：这两个方面此消彼长，顾此容易失彼。';
      else if (Ziwei.sanFang(lu.b).indexOf(ji.b) >= 0) luJi = '生年化禄（' + lu.palace + '）和化忌（' + ji.palace + '）在三合位，彼此牵连。';
    }
    var selfHua = net.filter(function (n) { return n.self; });
    var keyPalaces = ['命宫', '官禄', '财帛', '夫妻', '福德', '田宅', '疾厄'];
    function flows(kind) {
      return net.filter(function (n) { return n.hua === kind && !n.self && keyPalaces.indexOf(n.from) >= 0; }).map(function (n) {
        var opp = r.palaces[Ziwei.md(n.toB + 6)];
        return { from: n.from, to: n.to, star: n.star, hua: kind, text: kind === '忌' ? P_THEME[n.from] + '（' + n.from + '）的事，容易让' + P_THEME[n.to] + '（' + n.to + '）操心，并冲到' + opp.name + '。' : P_THEME[n.from] + '（' + n.from + '）的事，容易给' + P_THEME[n.to] + '（' + n.to + '）带来好处。' };
      });
    }
    // 领域
    function palaceLine(n) { var P = pName(r, n); return '<b>' + n + '</b>（' + P.gan + P.zhi + '）：' + pDesc(r, P.b) + '。'; }
    function starRead(n) {
      var P = pName(r, n), seatS = P.major.length ? P.major : r.palaces[Ziwei.md(P.b + 6)].major;
      return seatS.map(function (s) { return ZX.S[s.name] ? ZX.S[s.name].p[P.idx] : ''; }).filter(Boolean).join(' ');
    }
    function incoming(n, kind) {
      return net.filter(function (x) { return x.to === n && x.hua === kind && !x.self; }).map(function (x) { return x.from; });
    }
    function make(k, title, primary, extras, weights, goodTxt, midTxt, badTxt) {
      var P = pName(r, primary), v = pScoreSF(r, P.b), d = { k: k, t: title, because: [], where: [], tips: [] };
      extras.forEach(function (n, i) { v += pScore(r, pName(r, n).b) * (weights[i] || 0); });
      d.because.push({ t: palaceLine(primary) + ' ' + starRead(primary), key: 'zwp|' + primary });
      extras.forEach(function (n) { d.because.push({ t: palaceLine(n), key: 'zwp|' + n }); });
      var inJi = incoming(primary, '忌'), inLu = incoming(primary, '禄');
      if (inLu.length) d.because.push({ t: inLu.join('、') + ' 的宫干化禄飞入这里：这些方面会带来好处。', key: 'zw|飞化', tone: '吉' });
      if (inJi.length) { d.because.push({ t: inJi.join('、') + ' 的宫干化忌飞入这里：这些方面容易带来负担。', key: 'zw|飞化', tone: '凶' }); v -= 0.2 * Math.min(2, inJi.length); }
      r.sihua.forEach(function (h) { if (h.palace === primary) d.because.push({ t: '生年' + h.star + '化' + h.hua + '就在这一宫。', key: 'zwh|' + h.hua, tone: h.hua === '忌' ? '凶' : '吉' }); if (h.hua === '忌' && Ziwei.md(h.b + 6) === P.b) d.because.push({ t: '生年化忌（' + h.star + '）在对宫' + h.palace + '，冲到这里。', key: 'zwh|忌', tone: '凶' }); });
      jia.filter(function (j) { return j.palace === primary; }).forEach(function (j) { d.because.push({ t: '被' + j.name + '（前后两宫）。', key: 'zw|夹宫', tone: j.tone }); v += j.tone === '吉' ? 0.3 : -0.3; });
      var opp = r.palaces[Ziwei.md(P.b + 6)], tri = [r.palaces[Ziwei.md(P.b + 4)], r.palaces[Ziwei.md(P.b - 4)]];
      d.where.push('本宫 ' + primary + '，对宫 ' + opp.name + '，三合 ' + tri.map(function (x) { return x.name; }).join('、'));
      if (P.daxian) d.where.push('大限走到这一宫：' + P.daxian[0] + '–' + P.daxian[1] + ' 岁');
      d.signal = zSig(v); d.word = SIGNAL[d.signal];
      d.verdict = d.signal >= 1 ? goodTxt : d.signal <= -1 ? badTxt : midTxt;
      // 时间窗：大限四化
      var nowAge = Ziwei.nominalAge(r, nowY), open = null, hard = null;
      r.daxian.forEach(function (dx) {
        if (dx.to < nowAge) return;
        var hs = Ziwei.SIHUA[dx.gan].map(function (s, i) { return { hua: Ziwei.HUA[i], b: r.where[s], star: s }; });
        var hitLu = hs.some(function (h) { return h.hua === '禄' && h.b === P.b; }), hitJi = hs.some(function (h) { return h.hua === '忌' && (h.b === P.b || Ziwei.md(h.b + 6) === P.b); });
        if (hitLu && !open) open = { t: dx.from + '–' + dx.to + ' 岁（' + dx.gan + dx.zhi + '限，大限化禄入' + primary + '）' };
        if (hitJi && !hard) hard = { t: dx.from + '–' + dx.to + ' 岁（' + dx.gan + dx.zhi + '限，大限化忌入或冲' + primary + '）' };
      });
      d.when = { open: open, hard: hard };
      return d;
    }
    var domains = {
      career: make('career', '事业', '官禄', ['迁移'], [0.2], '事业宫条件不错，可以主动发展。', '事业有条件也有变数，看选择和大限。', '事业路上阻力或变动较多，宜稳扎稳打。'),
      wealth: make('wealth', '财运', '财帛', ['田宅', '福德'], [0.35, 0.15], '财帛和财库的条件较好。', '财运平稳，靠经营和规划。', '钱财容易有波动，宜保守理财。'),
      love: make('love', '感情', '夫妻', ['福德'], [0.2], '感情宫条件好，伴侣容易成为助力。', '感情平稳中有需要磨合的地方。', '亲密关系容易有波折，多沟通也可晚些定。'),
      health: make('health', '身心', '疾厄', ['福德'], [0.25], '身心方面比较稳。', '有些方面容易累，注意劳逸。', '压力容易累积，要多留意休息和情绪。身体不适请看医生。'),
      study: make('study', '学业才华', '父母', ['官禄'], [0.3], '文书、学习方面条件较好。', '学习条件一般，靠方法和持续投入。', '学习、文书上容易受干扰。'),
      family: make('family', '家庭六亲', '田宅', ['父母', '子女', '兄弟'], [0.2, 0.2, 0.2], '家庭这条线助力较多。', '家庭有支持也有需要操心的地方。', '家庭关系要多花心力。'),
      social: make('social', '人际贵人', '交友', ['迁移'], [0.3], '人缘好，容易得到帮助。', '人际平稳，好关系要靠经营。', '人际上容易有误会，慎选合作者。')
    };
    // 学业：昌曲、化科再调整
    var ke = r.sihua.filter(function (x) { return x.hua === '科'; })[0], chang = r.palaces[r.where['文昌']], qu = r.palaces[r.where['文曲']];
    var goodPlaces = ['命宫', '官禄', '父母', '迁移', '财帛'];
    var bonus = (goodPlaces.indexOf(chang.name) >= 0 ? 0.5 : 0) + (goodPlaces.indexOf(qu.name) >= 0 ? 0.5 : 0) + (ke && goodPlaces.indexOf(ke.palace) >= 0 ? 0.5 : 0);
    domains.study.because.push({ t: '文昌在' + chang.name + '、文曲在' + qu.name + (ke ? '，化科在' + ke.palace : '') + '。' + (bonus ? '其中有落在命、官、父母等相关宫位的，对学习、考试有帮助。' : ''), key: 'zws|文昌' });
    domains.study.signal = clampSig(domains.study.signal + (bonus >= 1 ? 1 : 0)); domains.study.word = SIGNAL[domains.study.signal];
    var mingScore = pScoreSF(r, r.ming);
    var names = ming.major.map(function (s) { return s.name; }).join('、');
    var lines = [];
    var seatI = ZX.S[seat[0].name];
    lines.push({ h: '你的底色', t: '<b>' + seatI.good + '</b> 要留意的是：' + seatI.warn + ' <small>（命宫 ' + ming.gan + ming.zhi + '，' + (names ? '主星 ' + names : '无主星，借对宫 ' + seat.map(function (s) { return s.name; }).join('、')) + '）</small>', key: 'zws|' + seat[0].name });
    lines.push({ h: '人生路径', t: '<b>' + SYS_TXT[sys] + '</b> <small>（' + sys + '星系）</small>', key: 'an|星系' });
    lines.push({ h: '资源与压力', t: (mingScore >= 1.2 ? '<b>底子比较厚</b>：身边的助力多于阻力。' : mingScore <= -0.3 ? '<b>压力成分偏多</b>：很多事要靠后天经营。' : '<b>好坏参半</b>：有助力，也有需要应付的阻力。') + ' <small>（三方四正：吉 ' + goodN + '，煞忌 ' + badN + '）</small>', key: 'zw|三方四正' });
    lines.push({ h: '后天重心', t: (shen.name === '命宫' ? '<b>人生重心很集中</b>，想做的事比较一贯。' : '随着年龄增长，重心会转向<b>“' + P_THEME[shen.name] + '”</b>。') + ' <small>（身宫在' + shen.name + '）</small>', key: 'zw|命宫身宫' });
    var hl = r.sihua.filter(function (x) { return x.hua === '禄'; })[0], hj = r.sihua.filter(function (x) { return x.hua === '忌'; })[0];
    if (hl && hj) lines.push({ h: '得与失', t: '一生比较顺的是<b>“' + P_THEME[hl.palace] + '”</b>，最放不下的是<b>“' + P_THEME[hj.palace] + '”</b>。' + (luJi ? luJi : '') + ' <small>（' + hl.star + '化禄入' + hl.palace + '，' + hj.star + '化忌入' + hj.palace + '）</small>', key: 'zwh|禄' });
    var age = Ziwei.nominalAge(r, nowY), dx0 = Ziwei.daxianOfAge(r, age);
    if (dx0) lines.push({ h: '现在', t: '这十年的重心在<b>“' + P_THEME[dx0.palace] + '”</b>。 <small>（虚岁 ' + age + '，' + dx0.gan + dx0.zhi + '大限，落本命' + dx0.palace + '）</small>', key: 'zw|大限' });
    return { r: r, sys: sys, sysTxt: SYS_TXT[sys], counts: count, goodN: goodN, badN: badN, paths: paths, net: net, jia: jia, luJi: luJi, selfHua: selfHua, jiFlows: flows('忌'), luFlows: flows('禄'), domains: domains, lines: lines, nowY: nowY };
  }

  /** 紫微运限：level 为 大限/流年/流月/流日，parents 为上层 {level, anchor, stem} */
  function zwRun(r, level, anchor, stem, parents) {
    parents = parents || [];
    var P = r.palaces[Ziwei.md(anchor)], ov = Ziwei.overlay(r, anchor, stem), notes = [], dm = {};
    function bump(k, v) { dm[k] = (dm[k] || 0) + v; }
    var layer = parents.map(function (q) { return q.level + '的' + Ziwei.overlay(r, q.anchor, q.stem).names[P.b]; });
    layer.push('本命' + P.name);
    var v = pScoreSF(r, P.b) * 0.5;
    var sf = Ziwei.sanFang(P.b);
    ov.hua.forEach(function (h) {
      var opp = r.palaces[Ziwei.md(h.b + 6)], e = { '禄': 0.5, '权': 0.3, '科': 0.25, '忌': -0.6 }[h.hua];
      if (sf.indexOf(h.b) >= 0) v += e;
      bump(P_DOMAIN[h.palace], e * 1.2);
      if (h.hua === '忌') bump(P_DOMAIN[opp.name], -0.35);
      r.sihua.forEach(function (b) {
        if (b.b === h.b && b.hua === '忌' && h.hua === '忌') { notes.push({ t: h.palace + '：' + level + '化忌叠生年化忌（双忌），这里是这段时间最要留意的地方。', tone: '凶', p: h.palace }); v -= 0.4; bump(P_DOMAIN[h.palace], -0.4); }
        if (b.b === h.b && b.hua === '禄' && h.hua === '禄') { notes.push({ t: h.palace + '：' + level + '化禄叠生年化禄（双禄），这里顺利加倍。', tone: '吉', p: h.palace }); v += 0.3; bump(P_DOMAIN[h.palace], 0.3); }
        if (b.b === h.b && b.hua === '禄' && h.hua === '忌') notes.push({ t: h.palace + '：' + level + '化忌遇到生年化禄，好处里带着麻烦。', tone: '平', p: h.palace });
        if (b.b === h.b && b.hua === '忌' && h.hua === '禄') notes.push({ t: h.palace + '：' + level + '化禄遇到生年化忌，原有的难题有缓解机会。', tone: '吉', p: h.palace });
        if (Ziwei.md(b.b + 6) === h.b && b.hua === '禄' && h.hua === '忌') notes.push({ t: level + '化忌入' + h.palace + '，正冲生年化禄所在的' + b.palace + '。', tone: '凶', p: b.palace });
      });
      parents.forEach(function (q) {
        Ziwei.overlay(r, q.anchor, q.stem).hua.forEach(function (ph) {
          if (ph.b === h.b && ph.hua === '忌' && h.hua === '忌') { notes.push({ t: h.palace + '：' + q.level + '化忌和' + level + '化忌重叠，这里压力集中。', tone: '凶', p: h.palace }); v -= 0.3; bump(P_DOMAIN[h.palace], -0.3); }
          if (ph.b === h.b && ph.hua === '禄' && h.hua === '禄') notes.push({ t: h.palace + '：' + q.level + '化禄和' + level + '化禄重叠，这里顺利集中。', tone: '吉', p: h.palace });
        });
      });
    });
    bump(P_DOMAIN[P.name], pScore(r, P.b) * 0.4);
    if (level === '流年' && P.b === r.ming) notes.push({ t: '太岁走到本命命宫，这一年吉凶都更紧。', tone: '平', p: '命宫', key: 'zw|流年' });
    parents.forEach(function (q) {
      if (Ziwei.md(q.anchor + 6) === P.b) notes.push({ t: level + '命宫正对' + q.level + '命宫（' + r.palaces[Ziwei.md(q.anchor)].name + '），和这段大环境方向相反，多变动。', tone: '凶', p: P.name }), v -= 0.25;
      if (q.anchor === P.b) notes.push({ t: level + '命宫和' + q.level + '命宫重叠，同一个方面被集中放大。', tone: '平', p: P.name });
    });
    if (level === '流年' || level === '流月' || level === '流日') {
      P.sha.forEach(function (s) { if (['擎羊', '陀罗', '火星', '铃星'].indexOf(s.name) >= 0) v -= 0.1; });
    }
    var signal = zRunSig(v);
    var hits = DOMAINS.map(function (d) { return { k: d.k, t: d.t, v: dm[d.k] || 0 }; }).filter(function (x) { return Math.abs(x.v) >= 0.3; }).sort(function (a, b) { return Math.abs(b.v) - Math.abs(a.v); });
    return {
      level: level, anchor: P.b, stem: stem, palace: P.name, zhi: P.zhi, layer: layer, hua: ov.hua, notes: notes, domains: dm, hits: hits, signal: signal, word: SIGNAL[signal], names: ov.names,
      headline: level + '命宫落' + layer.join('，也是') + '，重心在“' + P_THEME[P.name] + '”。星曜：' + pDesc(r, P.b) + '。',
      huaTxt: ov.hua.map(function (h) { return h.star + '化' + h.hua + '入' + h.palace; }).join('，'),
      huaPlain: ov.hua.map(function (h) { return { hua: h.hua, star: h.star, palace: h.palace, t: huaPlain(h.hua, h.palace) }; }),
      focus: P_THEME[P.name]
    };
  }
  function zwYear(r, y) {
    var age = Ziwei.nominalAge(r, y), d = Ziwei.daxianOfAge(r, age), gz = Ziwei.yearGz(y);
    var parents = d ? [{ level: '大限', anchor: d.b, stem: d.gan }] : [];
    var X = zwRun(r, '流年', GZ.zi(gz.charAt(1)), gz.charAt(0), parents);
    X.year = y; X.age = age; X.gz = gz; X.dx = d; X.xiaoB = Ziwei.xiaoxianBranch(r, Math.max(1, age)); X.xiao = r.palaces[X.xiaoB].name;
    return X;
  }

  /* ========================= 合参 ========================= */
  var SS_TRAIT = { '比肩': ['独立', '坚持'], '劫财': ['竞争', '行动'], '食神': ['享受', '表达'], '伤官': ['表达', '创新'], '偏财': ['人情', '灵活'], '正财': ['务实', '稳健'], '七杀': ['开创', '果断'], '正官': ['规范', '责任'], '偏印': ['思辨', '独立'], '正印': ['温厚', '学习'] };
  var STAR_TRAIT = { '紫微': ['主导', '稳健'], '天机': ['思辨', '灵活'], '太阳': ['表达', '责任'], '武曲': ['果断', '务实'], '天同': ['享受', '温厚'], '廉贞': ['竞争', '人情'], '天府': ['稳健', '务实'], '太阴': ['温厚', '思辨'], '贪狼': ['享受', '人情'], '巨门': ['思辨', '表达'], '天相': ['责任', '规范'], '天梁': ['责任', '学习'], '七杀': ['开创', '果断'], '破军': ['开创', '创新'] };
  function traitsBazi(an) {
    var res = an.A.res, c = {};
    function add(ss, w) { (SS_TRAIT[ss] || []).forEach(function (t) { c[t] = (c[t] || 0) + w; }); }
    add(res.pillars[1].hide[0].shishen, 2);
    add(res.pillars[2].hide[0].shishen, 1.5);
    [0, 1, 3].forEach(function (i) { add(GZ.shiShen(res.dayGan, res.pillars[i].gan), 1); });
    var geSS = res.geju.name.replace('格', '');
    add(geSS, 1);
    return c;
  }
  function traitsZw(zn) {
    var r = zn.r, c = {};
    function add(n, w) { (STAR_TRAIT[n] || []).forEach(function (t) { c[t] = (c[t] || 0) + w; }); }
    var ming = r.palaces[r.ming], seat = ming.major.length ? ming.major : r.palaces[Ziwei.md(r.ming + 6)].major;
    seat.forEach(function (s) { add(s.name, 2.5); });
    r.palaces[Ziwei.md(r.ming + 4)].major.forEach(function (s) { add(s.name, 0.8); });
    r.palaces[Ziwei.md(r.ming - 4)].major.forEach(function (s) { add(s.name, 0.8); });
    r.palaces[r.shen].major.forEach(function (s) { add(s.name, 0.8); });
    return c;
  }
  function top(c, n) { return Object.keys(c).sort(function (a, b) { return c[b] - c[a]; }).slice(0, n); }
  function joint(bzRes, zwRes, nowY) {
    nowY = nowY || new Date().getFullYear();
    var bn = bazi(bzRes, nowY), zn = ziwei(zwRes, nowY);
    var rows = DOMAINS.map(function (d) {
      var a = bn.domains[d.k], b = zn.domains[d.k];
      var diff = Math.abs(a.signal - b.signal), same = (a.signal > 0 && b.signal > 0) || (a.signal < 0 && b.signal < 0) || (a.signal === 0 && b.signal === 0);
      var opp = (a.signal > 0 && b.signal < 0) || (a.signal < 0 && b.signal > 0);
      var state = same ? '一致' : opp ? '分歧' : '接近';
      var avg = (a.signal + b.signal) / 2;
      var text;
      if (same && avg > 0) text = '两套系统都看好，这是比较可靠的优势，可以多投入。';
      else if (same && avg < 0) text = '两套系统都提示有压力，这是最值得提前准备的方面。';
      else if (same) text = '两套系统都认为平稳，没有特别突出的助力或阻力。';
      else if (opp) text = (a.signal > b.signal ? '八字结构看好，紫微的宫位条件却偏弱：底子有，但实际展开时容易受阻。' : '紫微的宫位条件好，八字结构却有压力：机会常有，但接住它要花力气。') + '分歧也是信息，说明这件事好坏并存，看具体时段。';
      else text = (avg > 0 ? '整体偏好，' : avg < 0 ? '整体偏紧，' : '') + '一边明显、一边平稳，以明显的一边作提醒，不必过度解读。';
      return { k: d.k, t: d.t, bz: a, zw: b, state: state, avg: avg, text: text, signal: clampSig(avg) };
    });
    var ta = traitsBazi(bn), tb = traitsZw(zn), topA = top(ta, 5), topB = top(tb, 5);
    var shared = topA.filter(function (t) { return topB.indexOf(t) >= 0; });
    var onlyA = topA.filter(function (t) { return shared.indexOf(t) < 0; }), onlyB = topB.filter(function (t) { return shared.indexOf(t) < 0; });
    var good = rows.filter(function (x) { return x.state !== '分歧' && x.avg >= 0.5; }).sort(function (a, b) { return b.avg - a.avg; });
    var bad = rows.filter(function (x) { return x.state !== '分歧' && x.avg <= -0.5; }).sort(function (a, b) { return a.avg - b.avg; });
    var split = rows.filter(function (x) { return x.state === '分歧'; });
    var agree = rows.filter(function (x) { return x.state === '一致'; }).length;
    var lines = [];
    lines.push({ h: '吻合度', t: '七个方面中，<b>' + agree + ' 个</b>两套系统判断一致，' + split.length + ' 个有分歧。' + (agree >= 4 ? '这张盘两边说法比较统一。' : '两边各有侧重，更要分方面看。') });
    if (good.length) lines.push({ h: '优势', t: '两边都偏好的是 <b>' + good.slice(0, 3).map(function (x) { return x.t; }).join('、') + '</b>，可以当作主要发力点。' });
    if (bad.length) lines.push({ h: '留意', t: '两边都偏紧的是 <b>' + bad.slice(0, 3).map(function (x) { return x.t; }).join('、') + '</b>，值得提前准备。' });
    if (split.length) lines.push({ h: '分歧', t: '<b>' + split.map(function (x) { return x.t; }).join('、') + '</b> 两边说法不同，通常是好坏并存，要看具体时段。' });
    if (shared.length) lines.push({ h: '底色', t: '性格上两边都指向 <b>' + shared.join('、') + '</b>。' });
    return { bn: bn, zn: zn, rows: rows, traits: { a: topA, b: topB, shared: shared, onlyA: onlyA, onlyB: onlyB }, lines: lines, agree: agree };
  }
  /** 某一年的两边对照 */
  function jointYear(bn, zn, y) {
    var by = baziYear(bn.A, y), zy = zwYear(zn.r, y);
    var res = [];
    DOMAINS.forEach(function (d) {
      var a = by.domains[d.k] || 0, b = zy.domains[d.k] || 0;
      if (Math.abs(a) >= 0.3 && Math.abs(b) >= 0.3 && a * b > 0) res.push({ k: d.k, t: d.t, dir: a > 0 ? '吉' : '凶', a: a, b: b });
    });
    var sameSig = (by.signal > 0 && zy.signal > 0) || (by.signal < 0 && zy.signal < 0);
    var opp = (by.signal > 0 && zy.signal < 0) || (by.signal < 0 && zy.signal > 0);
    var stem = by.gan, ss = GZ.shiShen(bn.A.dg, stem), four = Ziwei.SIHUA[stem];
    return {
      year: y, gz: by.gz, bz: by, zw: zy, resonance: res, sameSig: sameSig, opp: opp, level: sameSig ? (by.signal + zy.signal > 0 ? 'good' : 'bad') : opp ? 'mixed' : 'calm',
      stemBridge: y + ' 年天干“' + stem + '”：在八字里是' + ss + '（' + roleWord(by.roleG) + '）；在紫微里令' + four[0] + '化禄、' + four[1] + '化权、' + four[2] + '化科、' + four[3] + '化忌。'
    };
  }
  function jointTimeline(bn, zn, from, to) { var a = []; for (var y = from; y <= to; y++) a.push(jointYear(bn, zn, y)); return a; }

  /* ---------- 文字报告 ---------- */
  function strip(s) { return String(s).replace(/<[^>]+>/g, ''); }
  function report(j, nowY) {
    nowY = nowY || j.bn.nowY;
    var bn = j.bn, zn = j.zn, S = [];
    function sec(h, arr) { S.push({ h: h, ps: arr.filter(Boolean).map(strip) }); }
    sec('一、综合结论', j.lines.map(function (l) { return l.t; }));
    sec('二、八字：整体结构', bn.lines.map(function (l) { return l.t; }));
    if (bn.combos.length) sec('三、八字：因素之间的作用', bn.combos.map(function (c) { return c.plain + '（' + c.name + '）：' + (c.state ? c.state + ' ' : '') + c.effect + (c.where ? ' 应在：' + c.where + '。' : '') + (c.tip ? ' 建议：' + c.tip : ''); }));
    if (bn.rel.links.length) sec('四、八字：干支关系的后果', bn.rel.links.filter(function (l) { return ['破', '暗合'].indexOf(l.type) < 0; }).map(function (l) { return l.text + '（' + l.where + '）：' + (l.state ? l.state + ' ' : '') + l.effect; }));
    sec('五、紫微：整体结构', zn.lines.map(function (l) { return l.t; }));
    sec('六、紫微：四化与宫位联动', zn.paths.map(function (p) { return p.star + '化' + p.hua + '入' + p.palace + '：' + p.mean; }).concat(zn.jiFlows.slice(0, 5).map(function (f) { return f.text; })));
    sec('七、分领域对照', j.rows.map(function (x) { return x.t + '（八字：' + x.bz.word + '；紫微：' + x.zw.word + '；' + x.state + '）' + x.text + ' 八字：' + x.bz.verdict + ' 紫微：' + x.zw.verdict; }));
    var yrs = jointTimeline(bn, zn, nowY, nowY + 9);
    sec('八、未来十年', yrs.map(function (y) {
      return y.year + ' ' + y.gz + '（八字' + y.bz.word + '，紫微' + y.zw.word + '）' + (y.resonance.length ? '两边同时指向：' + y.resonance.map(function (x) { return x.t + (x.dir === '吉' ? '（正向）' : '（需留意）'); }).join('、') + '。' : '') + (y.bz.flags[0] ? ' ' + y.bz.flags[0].text : '');
    }));
    sec('说明', ['以上由软件按传统规则自动推算，每条都能在软件中查到依据。评分是软件的约定，不是古法；旺衰和喜用属于估算，特殊格局可能判断相反。这些内容是传统文化参考，不能替代医疗、法律、财务或人生决定上的专业意见。']);
    return S;
  }

  return {
    DOMAINS: DOMAINS, SIGNAL: SIGNAL, P_THEME: P_THEME, LEI_STATE: LEI_STATE, COMBO_PLAIN: COMBO_PLAIN, huaPlain: huaPlain, LEI_THEME: LEI_THEME, LEI_NAME: LEI_NAME, PILLAR: PILLAR, roleWord: roleWord,
    bazi: bazi, ctxOf: ctxOf, period: period, baziYear: baziYear, ziwei: ziwei, zwRun: zwRun, zwYear: zwYear, pScore: pScore, pScoreSF: pScoreSF, zSig: zSig,
    joint: joint, jointYear: jointYear, jointTimeline: jointTimeline, report: report, strip: strip
  };
});
