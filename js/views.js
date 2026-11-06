/*
 * 分析页面的渲染（只拼 HTML，不碰 DOM，可在 Node 中测试）。
 * 排版原则：先说状态（白话），名词放在小标签里；每条结论都能点开依据。
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('./ganzhi.js'), require('./ziwei.js'), require('./analysis.js'), require('./explain-ziwei.js'), require('./explain.js'));
  } else root.AV = factory(root.GZ, root.Ziwei, root.AN, root.ZX, root.XP);
})(this, function (GZ, Ziwei, AN, ZX, XP) {
  'use strict';
  var WXC = { '木': 'mu', '火': 'huo', '土': 'tu', '金': 'jin', '水': 'shui' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function col(ch) { return '<span class="c-' + (WXC[GZ.charWx(ch)] || '') + '">' + ch + '</span>'; }
  function gzHtml(g) { return g ? col(g.charAt(0)) + col(g.charAt(1)) : ''; }
  function xpt(key, html, cls) { return '<button type="button" class="xpt' + (cls ? ' ' + cls : '') + '" data-xp="' + esc(key) + '">' + html + '</button>'; }
  function why(key, label) { return key ? '<button type="button" class="xpw" data-xp="' + esc(key) + '">' + (label || '依据') + '</button>' : ''; }
  function toneCls(t) { return t === '吉' ? 'good' : t === '凶' ? 'bad' : 'mid'; }
  function toneWord(t) { return t === '吉' ? '有利' : t === '凶' ? '不利' : '看情况'; }

  /** 五格信号条 */
  function meter(sig, word) {
    var s = '<span class="sig" data-s="' + sig + '" title="' + esc(word || AN.SIGNAL[sig]) + '" aria-label="' + esc(word || AN.SIGNAL[sig]) + '">';
    for (var i = -2; i <= 2; i++) s += '<i class="' + (i === sig ? 'on' : '') + '"></i>';
    return s + '</span>';
  }
  function sigTag(sig) { return '<span class="sigw s' + (sig + 2) + '">' + AN.SIGNAL[sig] + '</span>'; }

  /** 分页条 */
  function subtabs(items, cur, attr) {
    return '<nav class="subtabs" role="tablist">' + items.map(function (x) {
      return '<button type="button" role="tab" ' + attr + '="' + x[0] + '" aria-selected="' + (x[0] === cur) + '">' + x[1] + '</button>';
    }).join('') + '</nav>';
  }

  /** 结论清单 */
  function lines(arr) {
    return '<ul class="concl">' + arr.map(function (l) {
      return '<li><span class="ch">' + l.h + '</span><span class="ct">' + l.t + '</span>' + (l.key ? why(l.key) : '') + '</li>';
    }).join('') + '</ul>';
  }

  /** 领域卡片（点开看依据、落点、时间） */
  function domainCards(domains, name) {
    return '<div class="dgrid">' + AN.DOMAINS.map(function (d) {
      var x = domains[d.k];
      return '<details class="dcard s' + (x.signal + 2) + '"><summary><div class="dh"><b>' + x.t + '</b>' + sigTag(x.signal) + '</div>' + meter(x.signal, x.word) + '<p>' + x.verdict + '</p><span class="more">看依据</span></summary>' +
        '<div class="dbody"><h5>因为</h5><ul>' + x.because.map(function (b) {
          return '<li class="' + (b.tone ? toneCls(b.tone) : '') + '">' + b.t + ' ' + why(b.key) + '</li>';
        }).join('') + '</ul>' +
        (x.where && x.where.length ? '<h5>应在</h5><ul>' + x.where.map(function (w) { return '<li>' + w + '</li>'; }).join('') + '</ul>' : '') +
        (x.when && (x.when.open || x.when.hard) ? '<h5>什么时候明显</h5><ul>' + (x.when.open ? '<li class="good">比较顺的时段：' + x.when.open.t + '</li>' : '') + (x.when.hard ? '<li class="bad">要留意的时段：' + x.when.hard.t + '</li>' : '') + '</ul>' : '') +
        '</div></details>';
    }).join('') + '</div>';
  }

  /* ========== 五行流通图 ========== */
  function flowWheel(flow, A) {
    var C = 160, R = 104, pos = {};
    flow.nodes.forEach(function (n, i) {
      var a = (-90 + i * 72) * Math.PI / 180;
      pos[n.lei] = [C + R * Math.cos(a), C + R * Math.sin(a)];
    });
    function rad(n) { return 16 + Math.sqrt(n.pct) * 3.2; }
    var by = {}; flow.nodes.forEach(function (n) { by[n.lei] = n; });
    function seg(a, b, cls, arrow) {
      var A0 = pos[a], B0 = pos[b], dx = B0[0] - A0[0], dy = B0[1] - A0[1], L = Math.sqrt(dx * dx + dy * dy);
      var ra = rad(by[a]) + 3, rb = rad(by[b]) + 7;
      var x1 = A0[0] + dx / L * ra, y1 = A0[1] + dy / L * ra, x2 = B0[0] - dx / L * rb, y2 = B0[1] - dy / L * rb;
      return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" class="' + cls + '"' + (arrow ? ' marker-end="url(#' + arrow + ')"' : '') + '/>';
    }
    var s = '<svg class="fwheel" viewBox="0 0 320 320" role="img" aria-label="五行与十神的流通图"><defs>' +
      '<marker id="ag" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 8 4 0 8z" fill="var(--good)"/></marker>' +
      '<marker id="ad" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 8 4 0 8z" fill="var(--ink-3)"/></marker>' +
      '<marker id="ab" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 8 4 0 8z" fill="var(--bad)"/></marker></defs>';
    flow.kes.forEach(function (k) { if (k.active) s += seg(k.from, k.to, 'fl-ke', 'ab'); });
    flow.gens.forEach(function (g) { s += seg(g.from, g.to, g.open ? 'fl-gen' : 'fl-off', g.open ? 'ag' : 'ad'); });
    flow.nodes.forEach(function (n) {
      var p = pos[n.lei], r = rad(n);
      s += '<g class="fnode ' + (n.role === '忌' ? 'ji' : n.role === '闲' ? 'xian' : 'xi') + '"><circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + r.toFixed(1) + '" style="fill:var(--' + WXC[n.wx] + ')"/>' +
        '<text x="' + p[0].toFixed(1) + '" y="' + (p[1] - 2).toFixed(1) + '" text-anchor="middle" class="ft1">' + n.wx + '</text>' +
        '<text x="' + p[0].toFixed(1) + '" y="' + (p[1] + 12).toFixed(1) + '" text-anchor="middle" class="ft2">' + Math.round(n.pct) + '%</text></g>';
      var ly = p[1] < C - 20 ? p[1] - r - 7 : p[1] + r + 14;
      s += '<text x="' + p[0].toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="middle" class="ft3">' + n.name + ' · ' + n.role + '</text>';
    });
    return s + '</svg>';
  }
  function flowCard(an) {
    var f = an.flow, h = '<div class="card"><h2>力量怎么流动<span class="sub">' + why('an|流通', '怎么看这张图') + '</span></h2><div class="flow-wrap"><div>' + flowWheel(f, an.A) + '<div class="legend"><span><b class="lg g"></b>绿箭头：相生，力量流得过去</span><span><b class="lg o"></b>虚线：这里断了</span><span><b class="lg r"></b>红箭头：相克，正在起冲突</span></div></div><div class="flow-txt">';
    f.nodes.slice().sort(function (a, b) { return b.pct - a.pct; }).forEach(function (n) {
      h += '<div class="fr"><span class="fn c-' + WXC[n.wx] + '">' + n.wx + '</span><div><b>' + n.theme + '</b> <small>' + n.name + ' ' + Math.round(n.pct) + '% · ' + AN.roleWord(n.role) + '</small><p>' + AN.LEI_STATE[n.lei] + '。</p></div></div>';
    });
    h += '</div></div>';
    if (f.conflicts.length) {
      h += '<h3>这张盘里的冲突</h3>';
      f.conflicts.forEach(function (k) {
        h += '<div class="link-card mid"><div class="lt"><b>' + k.mean + '</b><span class="tag">' + k.name + '</span></div><p>' + (k.bridge ? '缓冲它的是“' + AN.LEI_THEME[k.by] + '”（' + k.bridgeName + '，' + k.bridgeWx + '），这方面做得越好，冲突越轻。' : '缺少“' + AN.LEI_THEME[k.by] + '”（' + k.bridgeName + '，' + k.bridgeWx + '）来缓冲，所以比较直接；运岁走到' + k.bridgeWx + '时最能化解。') + '</p></div>';
      });
    }
    return h + '</div>';
  }

  /* ========== 十神互动 ========== */
  function chain(c) {
    return '<div class="chain">' + c.map(function (x, i) { return i % 2 === 0 ? '<span class="cn">' + esc(x) + '</span>' : '<span class="cv">' + esc(x) + ' →</span>'; }).join('') + '</div>';
  }
  function comboCard(c) {
    return '<div class="link-card ' + toneCls(c.tone) + '"><div class="lt"><b>' + c.plain + '</b><span class="tag">' + c.name + '</span><span class="tone">' + toneWord(c.tone) + '</span>' + why('anc|' + c.key) + '</div>' +
      (c.state ? '<p class="state">' + c.state + '</p>' : '') +
      (c.effect ? '<p class="sub">' + c.effect + '</p>' : '') +
      '<div class="meta">' + chain(c.chain) + '<div class="at"><b>应在</b> ' + c.where + '</div>' + (c.tip ? '<div class="at"><b>怎么用</b> ' + c.tip + '</div>' : '') + '</div></div>';
  }
  function relCard(l) {
    return '<div class="link-card ' + toneCls(l.tone) + '"><div class="lt"><b>' + esc(l.text) + '</b><span class="tag">' + l.word + '</span><span class="tone">' + toneWord(l.tone) + '</span>' + why(l.key, '原理') + '</div>' +
      (l.state ? '<p class="state">' + l.state + '</p>' : '') +
      (l.effect ? '<p class="sub">' + l.effect + '</p>' : '') +
      '<div class="meta"><div class="at"><b>应在</b> ' + l.where + '</div><div class="at"><b>牵动</b> ' + l.ss + '</div></div></div>';
  }
  function linksView(an) {
    var h = flowCard(an);
    h += '<div class="card"><h2>这些因素之间怎么互相作用<span class="sub">从最有影响的看起</span></h2>';
    var order = { '凶': 0, '吉': 1, '平': 2 };
    var cs = an.combos.slice().sort(function (a, b) { return order[a.tone] - order[b.tone]; });
    h += cs.length ? cs.map(comboCard).join('') : '<p class="hint">没有明显的十神组合。</p>';
    h += '</div>';
    var rl = an.rel.links.filter(function (l) { return ['破', '暗合', '拱合'].indexOf(l.type) < 0; }), minor = an.rel.links.filter(function (l) { return ['破', '暗合', '拱合'].indexOf(l.type) >= 0; });
    h += '<div class="card"><h2>哪些位置被连在一起<span class="sub">干支之间的合、冲、刑、害</span></h2>' + (rl.length ? rl.map(relCard).join('') : '<p class="hint">原局没有明显的合冲刑害，各位置比较独立。</p>');
    if (an.rel.notes.length) h += an.rel.notes.map(function (n) { return '<div class="link-card mid"><div class="lt"><b>' + n.title + '</b></div><p>' + n.text + '</p></div>'; }).join('');
    if (minor.length) h += '<details class="more-rel"><summary>较轻的关系（' + minor.length + '）</summary>' + minor.map(relCard).join('') + '</details>';
    h += '</div>';
    h += '<div class="card"><h2>每个字有没有底气<span class="sub">' + why('an|通根', '什么是通根、透干') + '</span></h2><div class="tbl-wrap"><table class="simple"><thead><tr><th>柱</th><th>天干</th><th>根基</th><th>上下关系</th></tr></thead><tbody>' +
      an.structure.rows.map(function (r) {
        return '<tr><td>' + r.label + ' ' + gzHtml(r.gz) + '</td><td>' + r.gan + ' ' + r.ss + (r.role ? '<small class="hint">（' + AN.roleWord(r.role) + '）</small>' : '') + '</td><td>' + r.state + (r.roots.length ? '<br><small class="hint">' + r.roots.map(function (x) { return x.pillar.charAt(0) + '支' + x.zhi + '藏' + x.gan; }).join('、') + '</small>' : '') + '</td><td>' + r.upDown + '</td></tr>';
      }).join('') + '</tbody></table></div><p class="note">有根的字说话算数，无根的字容易虚浮：看着有，用的时候靠不住。</p></div>';
    return h;
  }

  /* ========== 每个位置是什么意思 ========== */
  function pillarsPlain(an) {
    return '<div class="pcards">' + an.pillars.map(function (p) {
      return '<div class="pcard s' + (p.signal + 2) + '"><div class="ph"><b>' + p.label + '</b> ' + gzHtml(p.gz) + '<span>' + p.short + '</span></div>' +
        '<p class="pv">' + p.verdict + '</p>' +
        (p.outer ? '<p><span class="kw">外在</span>' + p.outer + ' ' + xpt('ss|' + p.gan.ss, p.gan.ss) + '</p>' : '<p><span class="kw">外在</span>这里是你自己（日主）。</p>') +
        '<p><span class="kw">内里</span>' + p.inner + ' ' + xpt('ss|' + p.zhi.ss, p.zhi.ss) + '</p>' +
        '<p><span class="kw">气势</span>' + p.stageTxt + ' ' + xpt('cs|' + p.stage, p.stage) + '</p>' +
        (p.links.length ? '<p><span class="kw">牵连</span>' + p.links.map(function (l) { return xpt(l.key, esc(l.text)); }).join('，') + '</p>' : '') +
        '</div>';
    }).join('') + '</div>';
  }

  /* ========== 干支关系图 ========== */
  var ARC_COLOR = { '合': 'good', '半合': 'good', '三合': 'good', '三会': 'good', '拱合': 'good', '暗合': 'good', '冲': 'bad', '刑': 'warn', '三刑': 'warn', '害': 'warn2', '破': 'mute' };
  var ARC_WORD = { '合': '合', '半合': '半合', '三合': '三合', '三会': '三会', '拱合': '拱', '暗合': '暗合', '冲': '冲', '刑': '刑', '三刑': '三刑', '害': '害', '破': '破' };
  /**
   * cols: [{label, gan, zhi, ssG, ssZ, dyn}]；rels: analyzeRelations 的结果
   */
  function arcGraph(cols, rels, relKey) {
    var n = cols.length, W = Math.max(380, 96 * n), step = W / n, gap = 74;
    var idx = {}; cols.forEach(function (c, i) { idx[c.label] = i; });
    function X(i) { return step * (i + 0.5); }
    // 先算好每条弧的高度，再决定画布大小，弧线就不会被裁掉
    var lane = { up: {}, down: {} }, arcs = [], maxUp = 0, maxDown = 0;
    rels.forEach(function (r) {
      if (['破', '暗合', '拱合'].indexOf(r.type) >= 0) return;
      var ids = r.who.map(function (l) { return idx[l]; }).filter(function (x) { return x != null; }).sort(function (a, b) { return a - b; });
      if (ids.length < 2) return;
      var up = r.scope === '天干', side = up ? 'up' : 'down', key = relKey(r);
      for (var q = 0; q < ids.length - 1; q++) {
        var a = ids[q], b = ids[q + 1], kk = a + '-' + b;
        lane[side][kk] = (lane[side][kk] || 0) + 1;
        var h = 18 + (b - a) * 12 + (lane[side][kk] - 1) * 13;
        if (up) maxUp = Math.max(maxUp, h); else maxDown = Math.max(maxDown, h);
        arcs.push({ a: a, b: b, up: up, h: h, l: lane[side][kk], type: r.type, key: key });
      }
    });
    var top = Math.round(maxUp * 0.78) + 44, H = top + gap + Math.round(maxDown * 0.78) + 34;
    var s = '<div class="arc-wrap"><svg class="arcs" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="干支关系图" style="min-width:' + (n <= 4 ? 280 : Math.min(W, 300 + (n - 4) * 80)) + 'px">';
    cols.forEach(function (c, i) { if (c.dyn) s += '<rect x="' + (X(i) - step / 2 + 2).toFixed(1) + '" y="' + (top - 26) + '" width="' + (step - 4).toFixed(1) + '" height="' + (gap + 52) + '" class="dynbg" rx="6"/>'; });
    arcs.forEach(function (A) {
      var y0 = A.up ? top - 24 : top + gap + 14, x1 = X(A.a) + (A.l - 1) * 3, x2 = X(A.b) - (A.l - 1) * 3, mid = (x1 + x2) / 2;
      var cy = A.up ? y0 - A.h * 1.5 : y0 + A.h * 1.5, ly = A.up ? y0 - A.h * 0.75 + 3 : y0 + A.h * 0.75 + 4;
      var d = 'M' + x1.toFixed(1) + ' ' + y0 + ' Q' + mid.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + x2.toFixed(1) + ' ' + y0;
      s += '<g class="arc a-' + (ARC_COLOR[A.type] || 'mute') + '" data-xp="' + esc(A.key) + '"><path d="' + d + '"/><path class="hit" d="' + d + '"/><rect x="' + (mid - 13).toFixed(1) + '" y="' + (ly - 10).toFixed(1) + '" width="26" height="14" rx="3"/><text x="' + mid.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="middle">' + (ARC_WORD[A.type] || A.type) + '</text></g>';
    });
    cols.forEach(function (c, i) {
      var x = X(i).toFixed(1);
      s += '<text x="' + x + '" y="' + (top + gap / 2 - 8) + '" text-anchor="middle" class="al">' + c.label + '</text>';
      s += '<text x="' + x + '" y="' + top + '" text-anchor="middle" class="ag" style="fill:var(--' + WXC[GZ.ganWx(c.gan)] + ')">' + c.gan + '</text>';
      s += '<text x="' + x + '" y="' + (top + gap) + '" text-anchor="middle" class="ag" style="fill:var(--' + WXC[GZ.zhiWx(c.zhi)] + ')">' + c.zhi + '</text>';
    });
    s += '</svg></div><div class="legend"><span class="lk g">绿：合，牵绊与结缘</span><span class="lk r">红：冲，变动与对立</span><span class="lk o">橙：刑，反复摩擦</span><span class="lk p">紫：害，暗中隔阂</span><span>上方连天干，下方连地支。点线条看原理。</span></div>';
    return s;
  }

  /* ========== 时段分析（八字） ========== */
  function periodPanel(P, open) {
    var h = '<details class="pp s' + (P.signal + 2) + '"' + (open ? ' open' : '') + '><summary><b>' + P.label + ' ' + gzHtml(P.gz) + '</b>' + sigTag(P.signal) + '<span class="pt">偏向' + P.theme + '</span></summary><div class="pbody">';
    h += '<p class="state">' + P.feel + '</p>';
    if (P.flags.length) h += '<div class="pflags">' + P.flags.map(function (f) { return '<div class="link-card ' + toneCls(f.tone) + ' slim"><b>' + esc(f.name) + '</b>' + (f.key ? ' ' + why(f.key, '原理') : '') + '<p>' + f.text + '</p></div>'; }).join('') + '</div>';
    var ts = P.triggers.filter(function (t) { return t.type !== '破'; });
    if (ts.length) h += '<h5>可能发生在哪</h5><ul class="tlist">' + ts.map(function (t) {
      return '<li class="' + toneCls(t.tone) + '"><span class="ev">' + t.event + '。</span> ' + xpt(t.key, esc(t.text)) + '</li>';
    }).join('') + '</ul>';
    else h += '<p class="hint">这段时间和原局之间没有明显的合冲刑害，事情相对平稳。</p>';
    if (P.hits.length) h += '<h5>影响到哪些方面</h5><div class="chips">' + P.hits.map(function (x) { return '<span class="chip ' + (x.v > 0 ? 'good' : 'bad') + '">' + x.t + (x.v > 0 ? ' 偏顺' : ' 留意') + '</span>'; }).join('') + '</div>';
    return h + '</div></details>';
  }

  /* ========== 八字总览 ========== */
  function baziOverview(an, res, jump) {
    var h = '<div class="card hero"><h2>一眼看懂这张盘</h2>' + lines(an.lines) + '</div>';
    h += '<div class="card"><h2>七个方面<span class="sub">点开看依据、应在哪里、什么时候明显</span></h2>' + domainCards(an.domains) + '<p class="note">格子是软件的综合判断，不是古书的评分。' + why('an|信号', '怎么算的') + '</p></div>';
    var cs = an.combos.slice().sort(function (a, b) { var o = { '凶': 0, '吉': 1, '平': 2 }; return o[a.tone] - o[b.tone]; }).slice(0, 3);
    if (cs.length) h += '<div class="card"><h2>最值得注意的相互作用<span class="sub"><button type="button" class="xpw noq" data-go-sub="links">看全部</button></span></h2>' + cs.map(comboCard).join('') + '</div>';
    h += jump ? '<div class="card">' + jump + '</div>' : '';
    return h;
  }

  /* ========== 紫微 ========== */
  function zwPathCards(zn) {
    return '<div class="hpath">' + zn.paths.map(function (p) {
      return '<div class="hp h-' + p.hua + '"><div class="hh"><i class="hua h-' + p.hua + '">' + p.hua + '</i><b>' + p.star + '</b> → ' + p.palace + '</div><p>' + p.mean + '</p>' + why('zwh|' + p.hua, '化' + p.hua + '是什么') + '</div>';
    }).join('') + '</div>';
  }
  function zwOverview(zn, jump) {
    var h = '<div class="card hero"><h2>一眼看懂这张盘</h2>' + lines(zn.lines) + '</div>';
    h += '<div class="card"><h2>七个方面<span class="sub">点开看依据、应在哪里、什么时候明显</span></h2>' + domainCards(zn.domains) + '</div>';
    h += '<div class="card"><h2>一生的得失落在哪<span class="sub">生年四化</span></h2>' + zwPathCards(zn) + (zn.luJi ? '<p class="desc"><b>这几件事之间的关系：</b>' + zn.luJi + '</p>' : '') + '</div>';
    var ps = zn.r.patterns;
    if (ps.length) {
      var o = { '吉': 0, '平': 1, '凶': 2 };
      h += '<div class="card"><h2>符合的传统格局<span class="sub">古书的结构名称，不等于命运判决</span></h2>' + ps.slice().sort(function (a, b) { return o[a.level] - o[b.level]; }).map(function (p) {
        var I = ZX.G[p.key];
        return '<div class="link-card ' + toneCls(p.level) + '"><div class="lt"><b>' + (I ? I[1] : p.name) + '</b><span class="tag">' + esc(p.name) + '</span>' + why('zwg|' + p.key) + '</div><p class="sub">' + esc(p.why) + '</p></div>';
      }).join('') + '</div>';
    }
    h += jump ? '<div class="card">' + jump + '</div>' : '';
    return h;
  }
  /** 飞化矩阵：行=从哪宫飞出，列=飞入哪宫 */
  function feiMatrix(zn) {
    var r = zn.r, order = []; for (var i = 0; i < 12; i++) order.push(r.palaces[Ziwei.md(r.ming - i)]);
    var m = {}; zn.net.forEach(function (n) { var k = n.from + '>' + n.to; (m[k] = m[k] || []).push(n); });
    var h = '<div class="tbl-wrap"><table class="fm"><thead><tr><th class="c0">飞出＼入</th>' + order.map(function (p) { return '<th>' + p.name.replace('宫', '') + '</th>'; }).join('') + '</tr></thead><tbody>';
    order.forEach(function (p) {
      h += '<tr><th class="c0">' + p.name.replace('宫', '') + '<small>' + p.gan + '</small></th>' + order.map(function (q) {
        var a = m[p.name + '>' + q.name] || [];
        return '<td class="' + (p === q ? 'self' : '') + '">' + a.map(function (x) { return '<i class="hua h-' + x.hua + '" title="' + x.star + '化' + x.hua + '">' + x.hua + '</i>'; }).join('') + '</td>';
      }).join('') + '</tr>';
    });
    return h + '</tbody></table></div>';
  }
  function zwLinks(zn) {
    var r = zn.r, h = '';
    h += '<div class="card"><h2>哪件事在牵动哪件事<span class="sub">' + why('zw|飞化', '什么是飞化') + '</span></h2><p class="desc">每个宫的天干都会让四颗星变化，变化落到另一个宫，就是一件事对另一件事的影响。下面只列命、财、官、夫妻、福德、田宅、疾厄这几个常用宫。</p>';
    h += '<h3>容易带来好处</h3><div class="flist">' + (zn.luFlows.map(function (f) { return '<div class="fitem good"><b>' + f.from + ' → ' + f.to + '</b><p>' + f.text + '</p></div>'; }).join('') || '<p class="hint">没有。</p>') + '</div>';
    h += '<h3>容易带来负担</h3><div class="flist">' + (zn.jiFlows.map(function (f) { return '<div class="fitem bad"><b>' + f.from + ' → ' + f.to + '</b><p>' + f.text + '</p></div>'; }).join('') || '<p class="hint">没有。</p>') + '</div>';
    if (zn.selfHua.length) h += '<h3>力量自己流失的地方</h3><div class="chips">' + zn.selfHua.map(function (n) { return '<span class="chip ' + (n.hua === '忌' ? 'bad' : '') + '">' + n.from + '：' + n.star + '自化' + n.hua + '</span>'; }).join('') + '</div><p class="note">自化常被解读为这方面的好处或问题不容易留住，会自己消解。</p>';
    h += '</div>';
    h += '<div class="card"><h2>完整的飞化矩阵<span class="sub">行是飞出的宫，列是飞入的宫</span></h2>' + feiMatrix(zn) + '<p class="note">飞化是后世钦天四化一系发展的方法，《全书》没有系统记载，可作参考。</p></div>';
    h += '<div class="card"><h2>每个宫受到的助力和压力<span class="sub">' + why('zw|三方四正', '三方四正') + '</span></h2><div class="tbl-wrap"><table class="simple"><thead><tr><th>宫</th><th>管什么</th><th>状况</th><th>星曜</th></tr></thead><tbody>';
    for (var i = 0; i < 12; i++) {
      var P = r.palaces[Ziwei.md(r.ming - i)], sig = AN.zSig(AN.pScoreSF(r, P.b));
      h += '<tr><td>' + xpt('zwp|' + P.name, P.name) + '</td><td>' + AN.P_THEME[P.name] + '</td><td>' + sigTag(sig) + '</td><td>' + (P.major.map(function (s) { return s.name + (s.hua ? '化' + s.hua : ''); }).join('、') || '空宫') + '</td></tr>';
    }
    h += '</tbody></table></div></div>';
    if (zn.jia.length) h += '<div class="card"><h2>被前后两宫夹住<span class="sub">' + why('zw|夹宫', '什么是夹') + '</span></h2><div class="chips">' + zn.jia.map(function (j) { return '<span class="chip ' + (j.tone === '吉' ? 'good' : 'bad') + '">' + j.palace + ' 被' + j.name.replace('夹', '') + '相夹</span>'; }).join('') + '</div><p class="note">“吉星夹”像有人左右护着，“煞星夹”像左右都有压力，夹在中间的宫会受影响。</p></div>';
    return h;
  }
  function zwRunPanel(X, open) {
    var h = '<details class="pp s' + (X.signal + 2) + '"' + (open ? ' open' : '') + '><summary><b>' + X.level + '</b>' + (X.gz ? ' ' + gzHtml(X.gz) : '') + sigTag(X.signal) + '<span class="pt">重心在“' + X.focus + '”</span></summary><div class="pbody">';
    h += '<p class="state">这段时间的重心在“' + X.focus + '”。<small class="hint">（' + X.level + '命宫是' + X.layer.join('，也是') + '）</small></p>';
    h += '<h5>四颗星的变化，落在哪些事上</h5><ul class="tlist">' + X.huaPlain.map(function (x) {
      return '<li class="' + (x.hua === '忌' ? 'bad' : 'good') + '"><i class="hua h-' + x.hua + '">' + x.hua + '</i> ' + x.t + ' <small class="hint">' + x.star + ' → ' + x.palace + '</small></li>';
    }).join('') + '</ul>';
    if (X.notes.length) h += '<h5>和其他层的叠加</h5><ul class="tlist">' + X.notes.map(function (n) { return '<li class="' + toneCls(n.tone) + '">' + n.t + '</li>'; }).join('') + '</ul>';
    if (X.hits.length) h += '<h5>影响到哪些方面</h5><div class="chips">' + X.hits.map(function (x) { return '<span class="chip ' + (x.v > 0 ? 'good' : 'bad') + '">' + x.t + (x.v > 0 ? ' 偏顺' : ' 留意') + '</span>'; }).join('') + '</div>';
    return h + '</div></details>';
  }

  /* ========== 合参 ========== */
  function jointSide(j) {
    var res = j.bn.A.res, r = j.zn.r, seat = r.palaces[r.ming].major.map(function (s) { return s.name; }).join('、') || '无主星';
    return '<div class="jside"><div><small>八字</small><div class="mini-pan">' + res.pillars.map(function (p) { return '<div>' + col(p.gan) + '<br>' + col(p.zhi) + '<small>' + p.label.charAt(0) + '</small></div>'; }).join('') + '</div><p>' + res.dayGan + res.dayWx + '日主 · ' + res.wx.level + ' · ' + res.geju.name + '</p></div><div class="jx">合参</div><div><small>紫微</small><div class="jseat">' + seat + '</div><p>命宫 ' + r.mingGz + ' · ' + r.juName + ' · ' + j.zn.sys + '</p></div></div>';
  }
  function jointOverview(j) {
    var h = '<div class="card hero"><h2>两套方法合起来看</h2>' + jointSide(j) + lines(j.lines) + '<p class="note">八字看的是生辰干支的力量结构，紫微看的是星曜落在人生各方面的状况。两边一致的结论更值得重视，不一致时往往是好坏并存。' + why('an|合参', '怎么合参的') + '</p></div>';
    h += '<div class="card"><h2>性格底色<span class="sub">两边各自看到的你</span></h2><div class="traits">' +
      '<div><h5>两边都指向</h5><div class="chips">' + (j.traits.shared.map(function (t) { return '<span class="chip solid">' + t + '</span>'; }).join('') || '<span class="hint">没有完全重合的词</span>') + '</div><p class="hint">这是比较稳定的部分，别人对你的印象也多半如此。</p></div>' +
      '<div><h5>八字更强调</h5><div class="chips">' + j.traits.onlyA.map(function (t) { return '<span class="chip">' + t + '</span>'; }).join('') + '</div><p class="hint">偏内在的结构和做事的方式。</p></div>' +
      '<div><h5>紫微更强调</h5><div class="chips">' + j.traits.onlyB.map(function (t) { return '<span class="chip">' + t + '</span>'; }).join('') + '</div><p class="hint">偏外在的气质和人生主题。</p></div></div></div>';
    h += jointDomains(j);
    return h;
  }
  function jointDomains(j) {
    var h = '<div class="card"><h2>逐项对照<span class="sub">点开看两边的依据</span></h2><div class="jrows">';
    j.rows.forEach(function (x) {
      h += '<details class="jrow st-' + x.state + '"><summary><div class="jt"><b>' + x.t + '</b><span class="jstate">' + x.state + '</span></div><div class="jm"><span>八字</span>' + meter(x.bz.signal, x.bz.word) + '<span>紫微</span>' + meter(x.zw.signal, x.zw.word) + '</div><p>' + x.text + '</p></summary><div class="jbody"><div><h5>八字说：' + x.bz.verdict + '</h5><ul>' + x.bz.because.map(function (b) { return '<li class="' + (b.tone ? toneCls(b.tone) : '') + '">' + b.t + '</li>'; }).join('') + '</ul></div><div><h5>紫微说：' + x.zw.verdict + '</h5><ul>' + x.zw.because.map(function (b) { return '<li class="' + (b.tone ? toneCls(b.tone) : '') + '">' + b.t + '</li>'; }).join('') + '</ul></div></div></details>';
    });
    return h + '</div></div>';
  }
  /** 大运与大限并排 */
  function jointTracks(j, nowY) {
    var bn = j.bn, zn = j.zn, res = bn.A.res, r = zn.r, maxAge = 90, W = 100 / maxAge;
    var nowAge = Ziwei.nominalAge(r, nowY);
    function bar(from, to, sig, label, sub, key) {
      if (from > maxAge) return '';
      var f = Math.max(from, 0), t = Math.min(to + 1, maxAge);
      return '<div class="tb s' + (sig + 2) + '" style="left:' + (f * W).toFixed(2) + '%;width:' + ((t - f) * W).toFixed(2) + '%" title="' + esc(label + ' ' + from + '–' + to + ' 岁') + '"><b>' + label + '</b><small>' + sub + '</small></div>';
    }
    var nowMark = nowAge >= 0 && nowAge <= maxAge ? '<div class="tn" style="left:' + (nowAge * W).toFixed(2) + '%" title="现在"></div>' : '';
    var h = '<div class="tracks"><div class="tk"><span>八字大运</span><div class="tr">';
    bn.timeline.forEach(function (t) { h += bar(t.from, t.to, t.signal, t.gz, t.from + '岁'); });
    h += nowMark + '</div></div><div class="tk"><span>紫微大限</span><div class="tr">';
    r.daxian.forEach(function (d) {
      var X = AN.zwRun(r, '大限', d.b, d.gan, []);
      h += bar(d.from, d.to, X.signal, d.palace.replace('宫', ''), d.from + '岁');
    });
    h += nowMark + '</div></div></div>';
    return h;
  }
  function jointTime(j, sel, nowY) {
    var h = '<div class="card"><h2>人生阶段对照<span class="sub">颜色越绿越顺，越红压力越大</span></h2><div class="tracks-wrap">' + jointTracks(j, nowY) + '</div><p class="note">八字的大运和紫微的大限长度相同，但起点和算法不同。两条线同时变绿或变红的阶段，判断更有分量。</p></div>';
    var ys = AN.jointTimeline(j.bn, j.zn, nowY - 1, nowY + 13);
    var cur = ys.filter(function (y) { return y.year === sel; })[0] || ys[1];
    h += '<div class="card"><h2>逐年共振<span class="sub">点一年看两边怎么说</span></h2><div class="ygrid">' + ys.map(function (y) {
      return '<button type="button" class="yc lv-' + y.level + '" data-jy="' + y.year + '" aria-pressed="' + (y.year === cur.year) + '"><span class="yy">' + y.year + (y.year === nowY ? '<em>今</em>' : '') + '</span><span class="yg">' + gzHtml(y.gz) + '</span><span class="yr"><i class="d s' + (y.bz.signal + 2) + '"></i><i class="d s' + (y.zw.signal + 2) + '"></i></span>' + (y.resonance.length ? '<span class="yf">' + y.resonance.slice(0, 2).map(function (x) { return x.t.replace('学业才华', '才华').replace('家庭六亲', '家庭').replace('人际贵人', '人际'); }).join('·') + '</span>' : '<span class="yf">&nbsp;</span>') + '</button>';
    }).join('') + '</div><p class="legend"><span>两个圆点：左八字，右紫微。</span><span>绿底：两边都顺。红底：两边都紧。黄底：两边相反。</span></p>';
    h += jointYearDetail(cur);
    return h + '</div>';
  }
  function jointYearDetail(y) {
    var h = '<div class="jy-detail"><h3>' + y.year + ' 年 ' + gzHtml(y.gz) + (y.bz.age ? ' · ' + y.bz.age + ' 岁' : '') + '</h3><p class="desc">' + y.stemBridge + '</p>';
    if (y.resonance.length) h += '<div class="link-card ' + (y.level === 'bad' ? 'bad' : 'good') + ' slim"><b>两边同时指向：</b>' + y.resonance.map(function (x) { return x.t + (x.dir === '吉' ? '（偏顺）' : '（要留意）'); }).join('、') + '</div>';
    else if (y.opp) h += '<div class="link-card mid slim">两边方向相反，这一年好坏并存，要看具体的事。</div>';
    h += '<div class="jy2"><div><h5>八字这边</h5>' + periodPanel(y.bz, true) + '</div><div><h5>紫微这边</h5>' + zwRunPanel(y.zw, true) + (y.zw.xiao ? '<p class="note">小限在' + y.zw.xiao + '，这个方面今年也比较活跃。</p>' : '') + '</div></div>';
    return h + '</div>';
  }
  /** 当下 */
  function qimenCard(q, Q, an, title) {
    if (!q) return '';
    function row(label, n) {
      if (!n) return '';
      var P = q.palaces[n], di = Q.DOOR_INFO[P.door], si = Q.STAR_INFO[P.stars[0]], gi = Q.GOD_INFO[P.god];
      var goodN = (di[0] === '吉' ? 1 : di[0] === '凶' ? -1 : 0) + (si[0].indexOf('吉') >= 0 ? 1 : -1) + (gi[0] === '吉' ? 1 : -1);
      var role = an ? AN.roleWord(an.A.xi.indexOf(P.info.wx) >= 0 ? (an.A.xi[0] === P.info.wx ? '用' : '喜') : an.A.ji.indexOf(P.info.wx) >= 0 ? '忌' : '闲') : '';
      return '<div class="link-card ' + (goodN > 0 ? 'good' : goodN < 0 ? 'bad' : 'mid') + ' slim"><div class="lt"><b>' + label + '落' + P.info.name + '宫（' + P.info.dir + '）</b><span class="tag">' + P.door + ' · ' + P.stars[0] + ' · ' + P.god + '</span></div><p>' + di[2] + '</p><p class="sub">这一宫五行属' + P.info.wx + (role ? '，对你的八字是' + role : '') + '。</p>' +
        (P.patterns.filter(function (x) { return x.name !== '旬空' && x.name !== '驿马'; }).slice(0, 2).map(function (x) { return '<p class="sub">' + esc(x.name) + '：' + esc(x.desc) + '</p>'; }).join('')) + '</div>';
    }
    return '<div class="card"><h2>' + (title || '此时此刻：奇门') + '<span class="sub">' + q.solar + ' · ' + q.juText + '</span></h2><p class="desc">奇门不看一辈子，只看此刻办一件事的时机：你和这件事分别落在哪一宫，那里的门、星、神是什么状况。</p>' + row('你的年命', q.markers['年命']) + row('今日之事（日干）', q.markers['日干']) + row('此刻之事（时干）', q.markers['时干']) + '</div>';
  }
  function reportHtml(S) {
    return '<div class="card report"><h2>文字报告<span class="sub"><button type="button" class="btn sm" id="reportCopy">复制全文</button></span></h2>' + S.map(function (x) {
      return '<h3>' + x.h + '</h3>' + x.ps.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
    }).join('') + '</div>';
  }
  function reportText(S) { return S.map(function (x) { return x.h + '\n' + x.ps.join('\n'); }).join('\n\n'); }

  /* ========== 释义页 ========== */
  var P = XP.h.P, H = XP.h.H, Q = XP.h.Q, L = XP.h.L, NOTE = XP.h.NOTE, CALC = XP.h.CALC, TBL = XP.h.TBL, UL = XP.h.ul;
  var AN_T = {
    '流通': function (ctx) {
      var h = P('把五行换成“相对你而言的五类力量”后，它们按固定方向相生：<b>印生身 → 身生食伤 → 食伤生财 → 财生官杀 → 官杀生印</b>。');
      h += P('好的盘不一定某个字很强，而是力量能一路转下去。转得动，事情就有出路；在哪里断了，哪方面就不顺畅。');
      h += Q('dt', '何处起根源，流向可方住，机括此中求，知来亦知去。', '源流论');
      h += H('图怎么看');
      h += UL(['圆越大，这类力量越强。', '“用、喜”是你需要的，“忌”是过多或不需要的，“闲”是影响不大的。', '绿箭头表示相生通畅；虚线表示其中一方太弱，流不过去；红箭头表示两股都强的力量在相克。']);
      h += NOTE('比例来自本软件的估算（' + L('term|五行力量', '怎么算') + '），只看大势，差几个百分点没有意义。');
      return { title: '力量怎么流动', tag: '整体分析', html: h };
    },
    '通关': function () {
      var h = P('两股力量相克时，如果中间有一个字，既被前者生、又能生后者，冲突就被转化了，这叫<b>通关</b>。');
      h += CALC('比如官杀克日主太重：<br>官杀 → 生 → 印 → 生 → 日主<br>压力先变成学习和资历，再变成自己的力量。');
      h += Q('dt', '两意本相通，中间有关隔，此关若通也，到处欢相得。', '通隔论');
      h += P('所以看一张盘的冲突，不只看“谁克谁”，还要看中间有没有桥。没有桥时，等运岁把这个字带来，就是化解的时候。');
      return { title: '通关：冲突怎么化解', tag: '整体分析', html: h };
    },
    '枢纽': function () {
      var h = P('如果某一柱同时和多个位置有合冲刑害，它就是全盘最敏感的地方：运岁只要碰到它，就会连带牵动其他位置。');
      h += Q('dt', '合有宜不宜，合多不为奇。', '战合论');
      h += P('所以关注这个位置对应的人和事，往往能最早感觉到变化。');
      return { title: '最敏感的位置', tag: '整体分析', html: h };
    },
    '通根': function () {
      var h = P('<b>通根：</b>天干在地支里找到同五行的藏干，好比树有根。有根的字力量真实，无根的字容易虚浮。');
      h += P('<b>透干：</b>地支藏的字也出现在天干上，等于把内在的东西摆到了台面上，它就更容易发挥。');
      h += P('<b>盖头、截脚：</b>同一柱里，天干克地支叫盖头，地支克天干叫截脚。这一柱内部有矛盾，表面和内里不一致。');
      h += Q('dt', '月令提纲，譬之宅也，人元用事之神，宅之向也，不可以不卜。', '月令论');
      h += NOTE('“盖头”“截脚”是后世命理常用的说法，这里按干支五行生克判断，是简化算法。');
      return { title: '通根、透干、上下关系', tag: '整体分析', html: h };
    },
    '信号': function () {
      var h = P('每个方面的格子都是软件把多条规则加总后的结果，分五档：压力较大、需留意、平稳、偏有利、有利。');
      h += H('八字这边');
      h += UL(['相关的十神是不是你需要的（喜用为正、忌神为负）。', '十神组合的吉凶，比如“杀印相生”加分、“财多身弱”减分。', '相关位置有没有被冲、刑、害。']);
      h += H('紫微这边');
      h += UL(['对应宫位星曜的亮度。', '吉星加分，煞星减分。', '生年四化和飞入的四化。', '对宫和三合宫按比例计入。']);
      h += NOTE('<b>这些权重是本软件的约定，古书没有这样打分。</b>它的作用是把很多条信息压缩成一眼能看的方向。真正有用的是点开后的“依据”。');
      return { title: '格子是怎么算出来的', tag: '整体分析', html: h };
    },
    '星系': function () {
      var h = P('十四主星按固定距离排布，所以有些星永远成组出现在三方四正。传统上据此把命盘分成几类：');
      h += TBL(['星系', '包含', '常见状态'], [['紫府廉武相', '紫微、天府、廉贞、武曲、天相', '重权责、实务和地位，适合在结构中担当'], ['杀破狼', '七杀、破军、贪狼', '变动大，有冲劲，常见多次转折'], ['机月同梁', '天机、太阴、天同、天梁', '稳定、细致，适合专业、文职和幕后'], ['巨日', '巨门、太阳', '靠口才、专业和名声立足']]);
      h += Q('qs1', '七杀破军宜出外，机月同梁作吏人。', '斗数骨髓赋');
      h += Q('qs1', '第一先看福德，再三细考迁移，分对宫之体用，定三合之源流。', '斗数骨髓赋');
      h += NOTE('这种分类是后世归纳的简便说法。本软件以命宫主星（空宫时看对宫）决定类型。');
      return { title: '星系：人生路径的大类', tag: '整体分析', html: h };
    },
    '合参': function () {
      var h = P('八字和紫微用的是同一个生辰，但逻辑不同：');
      h += TBL(['', '八字', '紫微'], [['看什么', '干支五行的力量结构', '星曜落在人生各方面的状况'], ['擅长', '强弱、喜忌、运势走向', '具体方面的状态和事件场景'], ['时间', '大运、流年（按节气）', '大限、流年（按农历）']]);
      h += H('本软件怎么合');
      h += UL(['七个方面各自独立判断，不互相参考，然后比较方向。', '方向相同算“一致”，一正一负算“分歧”，其余算“接近”。', '逐年对照时，两边都指向同一个方面才算“共振”。']);
      h += H('一条真实存在的连接');
      h += P('同一年的天干是同一个字：它在八字里是某个十神，在紫微里决定当年的四化。比如丁年：八字里按日主定十神，紫微里则令太阴化禄、巨门化忌。逐年对照里会把这一条写出来。');
      h += NOTE('古籍并没有八字与紫微“合参”的统一方法。<b>这是本软件的做法：</b>用相互独立的两套判断做交叉验证，一致的更可信，不一致的说明好坏并存，都不代表一定发生。');
      return { title: '合参是怎么做的', tag: '整体分析', html: h };
    }
  };
  XP.register('an', function (p, ctx) { return AN_T[p[1]] ? AN_T[p[1]](ctx) : { title: p[1], tag: '', html: P('暂无释义。') }; });
  var ANC_Q = {
    '官杀混杂': ['yh', '官星要纯，不要杂。', '论官杀混杂要制伏'],
    '伤官见官': ['yh', '伤官见官，为祸百端。', '论伤官'],
    '杀印相生': ['yh', '身旺有气为偏官，身弱无制为七杀。', '论七杀'],
    '食神制杀': ['yh', '七杀却宜制伏，亦不要制之太过；盖物极则反为祸矣！', '论七杀'],
    '官印相生': ['yh', '有官无印，即非真官；有印无官，反成其福。', '论印绶'],
    '财破印': ['yh', '盖印绶畏财，主人括囊。', '论印绶'],
    '比劫夺财': ['yh', '财者，人之所欲，方令弟兄见之，多有争竞。', '论劫财'],
    '枭神夺食': ['yh', '恒不喜见官星，忌倒食，恐伤其食神。', '论食神'],
    '财多身弱': ['yh', '故财要得时，不要财多。', '论正财'],
    '杀重身轻': ['dt', '抑强扶弱者常理，用强舍弱者元机。', '众寡论'],
    '合身': ['dt', '出门要向天涯游，何似裙钗恣意留。', '绊神论，比喻被牵绊'],
    '疑从势': ['dt', '抑强扶弱者常理，用强舍弱者元机。', '众寡论'],
    '疑专旺': ['dt', '旺之极者不可损，衰之极者不可益。', '衰旺论原注大意']
  };
  XP.register('anc', function (p, ctx) {
    var key = p[1], q = AN.COMBO_PLAIN[key] || [], res = ctx && ctx.bazi, c = null;
    if (res) { var an = AN.bazi(res); c = an.combos.filter(function (x) { return x.key === key; })[0]; }
    var h = P('<b>' + (c ? c.plain : (q[0] || key)) + '</b>');
    if (q[1]) h += H('通常是什么状态') + P(q[1]);
    if (c) {
      h += H('在你这张盘上') + CALC(c.chain.join(' ') + '<br>应在：' + c.where);
      if (c.effect) h += P(c.effect);
    }
    if (q[2]) h += H('怎么用') + P(q[2]);
    var cq = ANC_Q[key];
    if (cq && key !== '疑专旺') h += Q(cq[0], cq[1], cq[2]);
    if (key === '疑专旺') h += NOTE('《滴天髓·衰旺论》原注讲到极旺不可损、极衰不可益的道理，所以这类盘不能用普通的扶抑法。');
    h += P(L('term|十神', '十神是怎么来的') + ' · ' + L('term|喜用', '喜用怎么定'));
    h += NOTE('组合是否生效，还要看两字是否贴近、有没有被合冲。软件只检查基本条件，所以标注了“贴身”或“较远”。');
    return { title: c ? c.name : key, tag: '十神组合', html: h };
  });
  if (ZX.T && !ZX.T['夹宫']) {
    ZX.T['夹宫'] = function () {
      var h = P('一个宫的前后两宫如果各有一颗成对的星，这一宫就被“夹”了：吉星相夹像有人两边护着，煞星相夹像两边都有压力。');
      h += TBL(['类型', '成对的星', '倾向'], [['昌曲夹', '文昌、文曲', '吉'], ['左右夹', '左辅、右弼', '吉'], ['魁钺夹', '天魁、天钺', '吉'], ['日月夹', '太阳、太阴', '吉'], ['羊陀夹', '擎羊、陀罗', '凶'], ['火铃夹', '火星、铃星', '凶'], ['空劫夹', '地空、地劫', '凶']]);
      h += Q('qs1', '夹贵夹禄少人知，夹权夹科世所宜。夹日夹月谁能遇，夹昌夹曲主贵兮。', '斗数骨髓赋');
      return { title: '夹宫', tag: '紫微', html: h };
    };
  }

  return {
    esc: esc, col: col, gzHtml: gzHtml, xpt: xpt, why: why, meter: meter, sigTag: sigTag, subtabs: subtabs, lines: lines, domainCards: domainCards,
    flowCard: flowCard, linksView: linksView, pillarsPlain: pillarsPlain, arcGraph: arcGraph, periodPanel: periodPanel, baziOverview: baziOverview,
    zwOverview: zwOverview, zwLinks: zwLinks, zwRunPanel: zwRunPanel, jointOverview: jointOverview, jointDomains: jointDomains, jointTime: jointTime, jointYearDetail: jointYearDetail, qimenCard: qimenCard, reportHtml: reportHtml, reportText: reportText
  };
});
