/* filtros_menus.js v1 - filtros das telas de Coberturas e de Recrutamento e Selecao (ElevaLife)
 * Telas: Solicitacoes (Kanban), Banco de Talentos (Coberturas), Historico, Vagas, Admissoes.
 * Nao altera os dados: so reduz o que e exibido. Carregar depois dos demais scripts do painel. */
(function () {
  'use strict';
  if (window.__FM_LOADED) return;
  window.__FM_LOADED = true;

  var doc = document;
  var STATE = {};            // estado dos filtros por barra (sobrevive a re-render)
  var inBoard = false;       // true so durante buildCoberturasBoard

  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(t) { return String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dateKeyISO(v) {
    if (!v) return '';
    var d = new Date(v);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function dateKeyBR(v) {
    var m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(String(v || ''));
    return m ? m[3] + '-' + m[2] + '-' + m[1] : '';
  }
  function uniq(list, max) {
    var seen = {}, out = [];
    list.forEach(function (v) {
      v = String(v == null ? '' : v).trim();
      if (v && !seen[v]) { seen[v] = 1; out.push(v); }
    });
    out.sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
    return (max && out.length > max) ? [] : out;
  }
  function css() {
    if ($('#fm-style')) return;
    var st = doc.createElement('style');
    st.id = 'fm-style';
    st.textContent =
      '.fm-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;padding:12px 14px;margin:0 0 14px;background:#fff;border:1px solid var(--border,#ddd);border-radius:12px;position:relative;z-index:5}' +
      '.fm-f{display:flex;flex-direction:column;gap:4px;min-width:150px}' +
      '.fm-f>span{font-size:11px;font-weight:600;color:var(--text2,#777);text-transform:uppercase;letter-spacing:.3px}' +
      '.fm-in{font-size:14px;padding:8px 12px;border-radius:8px;border:1px solid var(--border,#ddd);background:#fff;color:var(--text,#222);font-family:inherit;box-sizing:border-box}' +
      '.fm-q{min-width:230px}' +
      '.fm-ms{position:relative}' +
      '.fm-btn{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:14px;padding:8px 12px;border-radius:8px;border:1px solid var(--border,#ddd);background:#fff;color:var(--text,#222);min-width:170px;cursor:pointer;text-align:left;font-family:inherit}' +
      '.fm-btn:hover{border-color:var(--grena,#7a1f2b)}' +
      '.fm-btn.on{border-color:var(--grena,#7a1f2b);background:#fbf3f4}' +
      '.fm-car{color:var(--text2,#777);font-size:10px;flex-shrink:0}' +
      '.fm-panel{position:absolute;top:calc(100% + 6px);left:0;z-index:60;background:#fff;border:1px solid var(--border,#ddd);border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.16);min-width:250px;max-width:380px;max-height:320px;overflow:auto;padding:10px}' +
      '.fm-panel.hidden{display:none}' +
      '.fm-act{display:flex;gap:8px;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--border,#ddd)}' +
      '.fm-act button,.fm-clear{font-size:12px;font-weight:600;padding:7px 10px;border-radius:7px;border:1px solid var(--border,#ddd);background:#fff;color:var(--grena,#7a1f2b);cursor:pointer;font-family:inherit}' +
      '.fm-act button:hover,.fm-clear:hover{background:#fbf3f4}' +
      '.fm-opt{display:flex;gap:8px;align-items:center;padding:5px 4px;font-size:13px;cursor:pointer;color:var(--text,#222)}' +
      '.fm-opt input{margin:0}' +
      '.fm-count{margin-left:auto;font-size:12px;color:var(--text2,#777);align-self:center}' +
      '.fm-empty td{padding:16px;text-align:center;color:#777;font-size:13px}' +
      '@media(max-width:640px){.fm-f,.fm-q,.fm-btn{min-width:100%}.fm-count{margin-left:0;width:100%}}';
    doc.head.appendChild(st);
  }

  /* ---------- barra de filtros ---------- */
  // cfg: {id, fields:[{key,label,max}], dateLabel, getOptions(key)->[], onChange(), counts()->{shown,total}, noun}
  function Bar(cfg) {
    var st = STATE[cfg.id] || (STATE[cfg.id] = { q: '', multi: {}, de: '', ate: '' });
    var self = this;
    this.cfg = cfg;
    this.st = st;
    var el = doc.createElement('div');
    el.className = 'fm-bar';
    el.setAttribute('data-fm', cfg.id);
    var h = '<label class="fm-f"><span>Buscar</span><input type="search" class="fm-in fm-q" placeholder="Digite nome, cliente, cargo..." value="' + esc(st.q) + '"></label>';
    cfg.fields.forEach(function (f) {
      h += '<div class="fm-f" data-key="' + f.key + '"><span>' + esc(f.label) + '</span><div class="fm-ms"><button type="button" class="fm-btn"><span class="fm-lbl">Todos</span><span class="fm-car">&#9660;</span></button><div class="fm-panel hidden"><div class="fm-act"><button type="button" data-a="clear">Limpar</button></div><div class="fm-list"></div></div></div></div>';
    });
    if (cfg.dateLabel) {
      h += '<label class="fm-f"><span>' + esc(cfg.dateLabel) + ' - de</span><input type="date" class="fm-in fm-de" value="' + esc(st.de) + '"></label>' +
           '<label class="fm-f"><span>' + esc(cfg.dateLabel) + ' - até</span><input type="date" class="fm-in fm-ate" value="' + esc(st.ate) + '"></label>';
    }
    h += '<button type="button" class="fm-clear">Limpar filtros</button><span class="fm-count"></span>';
    el.innerHTML = h;
    this.el = el;

    var q = $('.fm-q', el), timer = null;
    q.addEventListener('input', function () {
      st.q = q.value;
      clearTimeout(timer);
      timer = setTimeout(function () { self.changed(); }, 180);
    });
    var de = $('.fm-de', el), ate = $('.fm-ate', el);
    if (de) de.addEventListener('change', function () { st.de = de.value; self.changed(); });
    if (ate) ate.addEventListener('change', function () { st.ate = ate.value; self.changed(); });
    $$('.fm-f[data-key]', el).forEach(function (box) {
      var key = box.getAttribute('data-key');
      var btn = $('.fm-btn', box), panel = $('.fm-panel', box), list = $('.fm-list', box);
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = panel.classList.contains('hidden');
        $$('.fm-panel').forEach(function (p) { p.classList.add('hidden'); });
        if (open) { self.fillList(key, list); panel.classList.remove('hidden'); }
      });
      panel.addEventListener('click', function (e) { e.stopPropagation(); });
      $('[data-a="clear"]', panel).addEventListener('click', function () {
        st.multi[key] = {};
        self.fillList(key, list);
        self.changed();
      });
      list.addEventListener('change', function (e) {
        var cb = e.target;
        if (!cb || cb.type !== 'checkbox') return;
        var set = st.multi[key] || (st.multi[key] = {});
        if (cb.checked) set[cb.value] = 1; else delete set[cb.value];
        self.changed();
      });
    });
    $('.fm-clear', el).addEventListener('click', function () {
      st.q = ''; st.multi = {}; st.de = ''; st.ate = '';
      q.value = ''; if (de) de.value = ''; if (ate) ate.value = '';
      self.changed();
    });
    this.refreshLabels();
  }
  Bar.prototype.fillList = function (key, list) {
    var f = this.cfg.fields.filter(function (x) { return x.key === key; })[0];
    var set = this.st.multi[key] || {};
    var opts = this.cfg.getOptions(key, f.max) || [];
    Object.keys(set).forEach(function (v) { if (opts.indexOf(v) < 0) opts.push(v); });
    list.innerHTML = opts.length ? opts.map(function (v) {
      return '<label class="fm-opt"><input type="checkbox" value="' + esc(v) + '"' + (set[v] ? ' checked' : '') + '><span>' + esc(v) + '</span></label>';
    }).join('') : '<div style="font-size:13px;color:#777;padding:4px">Sem opções.</div>';
  };
  Bar.prototype.refreshLabels = function () {
    var self = this;
    this.cfg.fields.forEach(function (f) {
      var box = $('.fm-f[data-key="' + f.key + '"]', self.el);
      if (!box) return;
      var vals = Object.keys(self.st.multi[f.key] || {});
      var lbl = $('.fm-lbl', box);
      lbl.textContent = !vals.length ? 'Todos' : (vals.length === 1 ? vals[0] : vals.length + ' selecionados');
      $('.fm-btn', box).classList.toggle('on', vals.length > 0);
    });
  };
  Bar.prototype.active = function () {
    var st = this.st;
    if (norm(st.q) || st.de || st.ate) return true;
    return Object.keys(st.multi).some(function (k) { return Object.keys(st.multi[k]).length > 0; });
  };
  // get(key)->valor; text()->texto para busca livre; date->yyyy-mm-dd
  Bar.prototype.test = function (get, text, date) {
    var st = this.st, i, k;
    var terms = norm(st.q).split(/\s+/).filter(Boolean);
    if (terms.length) {
      var t = norm(text());
      for (i = 0; i < terms.length; i++) if (t.indexOf(terms[i]) < 0) return false;
    }
    var keys = Object.keys(st.multi);
    for (i = 0; i < keys.length; i++) {
      k = keys[i];
      var set = st.multi[k];
      if (!Object.keys(set).length) continue;
      var v = String(get(k) == null ? '' : get(k)).trim();
      if (!set[v]) return false;
    }
    if (st.de || st.ate) {
      if (!date) return false;
      if (st.de && date < st.de) return false;
      if (st.ate && date > st.ate) return false;
    }
    return true;
  };
  Bar.prototype.changed = function () {
    this.refreshLabels();
    try { this.cfg.onChange(); } catch (e) { if (window.console) console.error('[filtros]', e); }
    this.updateCount();
  };
  Bar.prototype.updateCount = function () {
    var c = this.cfg.counts ? this.cfg.counts() : null;
    var span = $('.fm-count', this.el);
    if (!span) return;
    span.textContent = c ? (this.active() ? c.shown + ' de ' + c.total + ' ' + (this.cfg.noun || 'registros') : c.total + ' ' + (this.cfg.noun || 'registros')) : '';
  };

  doc.addEventListener('click', function () { $$('.fm-panel').forEach(function (p) { p.classList.add('hidden'); }); });

  /* ---------- Coberturas: dados (Solicitacoes + Historico) ---------- */
  function isAval(f) { return f && f.__id && String(f.__id).indexOf('aval-') === 0; }
  function cobData() { try { return (typeof coberturaHistoricoData !== 'undefined' && coberturaHistoricoData) || []; } catch (e) { return []; } }
  function cobGet(f, key) {
    switch (key) {
      case 'cliente': return f.Cliente;
      case 'area': return f.Area;
      case 'etapa': return f.StatusSolicitacao || 'Registrada';
      case 'status': return f.Status;
      case 'motivo': return f.MotivoSubstituicao;
      case 'contrato': return f.TipoContrato;
      case 'resp': return f.EmailResponsavel;
      case 'solic': return f.Solicitante;
      case 'nivel': return f.NivelProfissional;
    }
    return '';
  }
  function cobText(f) {
    return [f.Cliente, f.Cargo, f.Title, f.Area, f.Solicitante, f.ProfissionalTitular, f.EmailResponsavel, f.MotivoSubstituicao, f.TipoContrato, f.StatusSolicitacao, f.Status].join(' ');
  }
  function cobTest(bar, f) { return bar.test(function (k) { return cobGet(f, k); }, function () { return cobText(f); }, dateKeyISO(f.Created)); }
  function cobOptions(key, max, onlyReal) {
    return uniq(cobData().filter(function (f) { return !onlyReal || !isAval(f); }).map(function (f) { return cobGet(f, key); }), max);
  }

  var solBar = null, histBar = null, bancoBar = null;

  function solCounts() {
    var base = cobData().filter(function (f) { return !isAval(f) && origVisivel(f); });
    var shown = solBar ? base.filter(function (f) { return cobTest(solBar, f); }).length : base.length;
    return { shown: shown, total: base.length };
  }
  var origVisivel = function () { return true; };

  function ensureSolBar() {
    var view = $('#coberturaViewSolicitacoes');
    if (!view) return;
    if ($('.fm-bar[data-fm="sol"]', view)) return;
    solBar = new Bar({
      id: 'sol', noun: 'solicitações', dateLabel: 'Abertura',
      fields: [{ key: 'cliente', label: 'Cliente' }, { key: 'area', label: 'Área' }, { key: 'etapa', label: 'Etapa' }, { key: 'motivo', label: 'Motivo / tipo' }, { key: 'resp', label: 'Responsável' }],
      getOptions: function (k) {
        return uniq(cobData().filter(function (f) { return !isAval(f) && origVisivel(f); }).map(function (f) { return cobGet(f, k); }), 0);
      },
      onChange: function () { if (typeof buildCoberturasBoard === 'function') buildCoberturasBoard(); },
      counts: solCounts
    });
    var anchor = $('#coberturaKpiGrid', view);
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(solBar.el, anchor); else view.insertBefore(solBar.el, view.firstChild);
    solBar.updateCount();
  }

  function histCounts() {
    var all = cobData();
    return { shown: histBar ? all.filter(function (f) { return cobTest(histBar, f); }).length : all.length, total: all.length };
  }
  function ensureHistBar() {
    var view = $('#coberturaViewHistorico');
    if (!view) return;
    if ($('.fm-bar[data-fm="hist"]', view)) return;
    histBar = new Bar({
      id: 'hist', noun: 'registros', dateLabel: 'Abertura',
      fields: [{ key: 'cliente', label: 'Cliente (múltiplos)' }, { key: 'motivo', label: 'Motivo / tipo' }, { key: 'contrato', label: 'Contrato' }, { key: 'resp', label: 'Responsável' }, { key: 'solic', label: 'Solicitante' }],
      getOptions: function (k) { return cobOptions(k, 0, false); },
      onChange: function () { if (typeof histPage !== 'undefined') histPage = 1; if (typeof renderCoberturaHistorico === 'function') renderCoberturaHistorico(); },
      counts: histCounts
    });
    var existing = $('#histFiltroArea', view);
    var row = existing ? existing.parentNode : null;
    var wrap = $('#histTableWrap', view);
    if (row && row.parentNode) row.parentNode.insertBefore(histBar.el, row.nextSibling);
    else if (wrap && wrap.parentNode) wrap.parentNode.insertBefore(histBar.el, wrap);
    else view.insertBefore(histBar.el, view.firstChild);
    histBar.updateCount();
  }

  function bancoGet(p, key) {
    switch (key) {
      case 'cargo': return p.qualificacao;
      case 'disp': return p.disponibilidade;
      case 'situacao': return p.stage;
    }
    return '';
  }
  function bancoTest(p) { return bancoBar.test(function (k) { return bancoGet(p, k); }, function () { return [p.nome, p.qualificacao, p.area, p.curriculoResumo, p.parecerTecnico, p.disponibilidade].join(' '); }, ''); }
  function bancoPool() { try { return (typeof TALENT_POOL !== 'undefined' && TALENT_POOL) || []; } catch (e) { return []; } }
  function ensureBancoBar() {
    var view = $('#coberturaViewBanco');
    if (!view) return;
    if ($('.fm-bar[data-fm="banco"]', view)) return;
    bancoBar = new Bar({
      id: 'banco', noun: 'candidatos',
      fields: [{ key: 'cargo', label: 'Cargo / qualificação', max: 150 }, { key: 'disp', label: 'Disponibilidade' }, { key: 'situacao', label: 'Situação' }],
      getOptions: function (k, max) { return uniq(bancoPool().map(function (p) { return bancoGet(p, k); }), max); },
      onChange: function () { if (typeof bancoPage !== 'undefined') bancoPage = 1; if (typeof renderCoberturas === 'function') renderCoberturas(); },
      counts: function () { var all = bancoPool(); return { shown: bancoBar ? all.filter(bancoTest).length : all.length, total: all.length }; }
    });
    var chips = $('#coberturaAreaChips', view);
    if (chips && chips.parentNode) chips.parentNode.insertBefore(bancoBar.el, chips); else view.insertBefore(bancoBar.el, view.firstChild);
    bancoBar.updateCount();
  }

  /* ---------- R&S: tabelas (Vagas e Admissoes) filtradas por cabecalho ---------- */
  var COLS = [
    { k: 'cliente', re: /^(cliente|empresa)/, label: 'Cliente' },
    { k: 'area', re: /^area/, label: 'Área' },
    { k: 'status', re: /^status/, label: 'Status' },
    { k: 'motivo', re: /^(motivo|tipo)/, label: 'Motivo / tipo' },
    { k: 'aprov', re: /^aprova/, label: 'Aprovação' },
    { k: 'cargo', re: /^cargo/, label: 'Cargo', max: 150 },
    { k: 'solic', re: /^solicitante/, label: 'Solicitante' }
  ];
  var DATE_RE = /^(data|inicio|abertura|prazo)/;

  function enhanceTable(tb, prefix, idx) {
    if (tb.__fm) return;
    var heads = $$('thead th', tb).map(function (th) { return norm(th.textContent); });
    if (!heads.length) return;
    var rows = $$('tbody tr', tb);
    if (!rows.length) return;
    var colIdx = {}, fields = [], dateCol = -1, dateLabel = '';
    COLS.forEach(function (c) {
      for (var i = 0; i < heads.length; i++) {
        if (c.re.test(heads[i])) { colIdx[c.k] = i; fields.push({ key: c.k, label: c.label, max: c.max }); return; }
      }
    });
    for (var i = 0; i < heads.length; i++) if (DATE_RE.test(heads[i])) { dateCol = i; dateLabel = $$('thead th', tb)[i].textContent.trim(); break; }
    var cellText = function (tr, col) { var td = tr.children[col]; return td ? td.textContent.replace(/\s+/g, ' ').trim() : ''; };
    var sig = prefix + idx + '|' + heads.join(',');
    var live = fields.filter(function (f) {
      var vals = uniq(rows.map(function (tr) { return cellText(tr, colIdx[f.key]); }), f.max || 100);
      return vals.length > 1;
    });
    var bar = new Bar({
      id: sig, noun: 'registros', dateLabel: dateLabel || null,
      fields: live,
      getOptions: function (k, max) { return uniq($$('tbody tr', tb).filter(function (tr) { return !tr.classList.contains('fm-empty'); }).map(function (tr) { return cellText(tr, colIdx[k]); }), max || 100); },
      onChange: apply,
      counts: function () {
        var all = $$('tbody tr', tb).filter(function (tr) { return !tr.classList.contains('fm-empty'); });
        return { shown: all.filter(function (tr) { return tr.style.display !== 'none'; }).length, total: all.length };
      }
    });
    function apply() {
      var trs = $$('tbody tr', tb).filter(function (tr) { return !tr.classList.contains('fm-empty'); });
      var shown = 0;
      trs.forEach(function (tr) {
        var ok = bar.test(
          function (k) { return cellText(tr, colIdx[k]); },
          function () { return tr.textContent; },
          dateCol >= 0 ? dateKeyBR(cellText(tr, dateCol)) : ''
        );
        tr.style.display = ok ? '' : 'none';
        if (ok) shown++;
      });
      var empty = $('tbody tr.fm-empty', tb);
      if (!shown && trs.length) {
        if (!empty) {
          empty = doc.createElement('tr');
          empty.className = 'fm-empty';
          empty.innerHTML = '<td colspan="' + heads.length + '">Nenhum registro com os filtros atuais.</td>';
          $('tbody', tb).appendChild(empty);
        }
      } else if (empty) { empty.parentNode.removeChild(empty); }
    }
    tb.__fm = bar;
    tb.parentNode.insertBefore(bar.el, tb);
    apply();
    bar.updateCount();
  }
  function ensureTables() {
    ['rsLista', 'adLista'].forEach(function (id) {
      var host = doc.getElementById(id);
      if (!host) return;
      $$('table.rs-tbl', host).forEach(function (tb, i) { enhanceTable(tb, id, i); });
    });
  }

  /* ---------- ganchos nas funcoes existentes ---------- */
  function hook() {
    if (typeof window.cobVisivelParaMim === 'function' && !window.cobVisivelParaMim.__fm) {
      var ov = window.cobVisivelParaMim;
      origVisivel = function (f) { return ov(f); };
      var w1 = function (f) {
        var ok = ov.apply(this, arguments);
        if (!ok) return false;
        if (inBoard && solBar && solBar.active()) return cobTest(solBar, f);
        return true;
      };
      w1.__fm = true;
      window.cobVisivelParaMim = w1;
    }
    if (typeof window.buildCoberturasBoard === 'function' && !window.buildCoberturasBoard.__fm) {
      var ob = window.buildCoberturasBoard;
      var w2 = function () {
        inBoard = true;
        try { return ob.apply(this, arguments); } finally { inBoard = false; ensureSolBar(); if (solBar) solBar.updateCount(); }
      };
      w2.__fm = true;
      window.buildCoberturasBoard = w2;
    }
    if (typeof window.renderCoberturaHistorico === 'function' && !window.renderCoberturaHistorico.__fm) {
      var oh = window.renderCoberturaHistorico;
      var w3 = function () {
        ensureHistBar();
        if (!histBar || !histBar.active()) { var r0 = oh.apply(this, arguments); if (histBar) histBar.updateCount(); return r0; }
        var full = coberturaHistoricoData;
        try {
          coberturaHistoricoData = full.filter(function (f) { return cobTest(histBar, f); });
          return oh.apply(this, arguments);
        } finally { coberturaHistoricoData = full; histBar.updateCount(); }
      };
      w3.__fm = true;
      window.renderCoberturaHistorico = w3;
    }
    if (typeof window.renderCoberturas === 'function' && !window.renderCoberturas.__fm) {
      var orc = window.renderCoberturas;
      var w4 = function () {
        ensureBancoBar();
        if (!bancoBar || !bancoBar.active() || !Array.isArray(TALENT_POOL)) { var r1 = orc.apply(this, arguments); if (bancoBar) bancoBar.updateCount(); return r1; }
        var full = TALENT_POOL;
        try {
          TALENT_POOL = full.filter(bancoTest);
          return orc.apply(this, arguments);
        } finally { TALENT_POOL = full; bancoBar.updateCount(); }
      };
      w4.__fm = true;
      window.renderCoberturas = w4;
    }
  }

  function tick() {
    try {
      hook();
      ensureSolBar(); ensureHistBar(); ensureBancoBar(); ensureTables();
    } catch (e) { if (window.console) console.error('[filtros]', e); }
  }

  function init() {
    css();
    tick();
    setInterval(tick, 700);
    var mo = new MutationObserver(function () { clearTimeout(init.t); init.t = setTimeout(ensureTables, 40); });
    mo.observe(doc.body, { childList: true, subtree: true });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})();
