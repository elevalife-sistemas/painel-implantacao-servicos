/* Visao Geral (Implantacao): clique nos cards abre explicacao do indicador + lista das etapas */
(function(){
  "use strict";
  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
  function pd(v){ if (!v) return null; var m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1], +m[2]-1, +m[3]) : (isNaN(new Date(v)) ? null : new Date(v)); }
  function fmt(v){ var d = pd(v); if (!d) return "-"; return ("0"+d.getDate()).slice(-2)+"/"+("0"+(d.getMonth()+1)).slice(-2)+"/"+d.getFullYear(); }
  function hoje(){ var h = new Date(); return new Date(h.getFullYear(), h.getMonth(), h.getDate()); }
  function atrasoDias(it){
    var p = pd(it.dataPrevista); if (!p) return null;
    if (it.status === "Concluido" && it.dataReal){ var r = pd(it.dataReal); return Math.round((r - p) / 86400000); }
    if (it.status === "Atrasado") return Math.max(0, Math.round((hoje() - p) / 86400000));
    return null;
  }
  function itens(){ try { return itemsForClients(selectedClients) || []; } catch (e){ return (typeof ITEMS !== "undefined" ? ITEMS : []); } }
  function por(st){ return itens().filter(function(it){ return it.status === st; }).sort(function(a,b){ return String(a.cliente).localeCompare(String(b.cliente)) || a.num - b.num; }); }

  var COLS_PADRAO = [["Cliente", function(it){ return it.cliente; }], ["Etapa", function(it){ return it.num + ". " + it.title; }], ["Responsavel", function(it){ return it.areaResp || "-"; }], ["Prazo", function(it){ return fmt(it.dataPrevista); }]];
  var COLS_ATRASO = COLS_PADRAO.concat([["Atraso (dias)", function(it){ var d = atrasoDias(it); return d == null ? "-" : d; }]]);
  var COLS_CONC = [["Cliente", COLS_PADRAO[0][1]], ["Etapa", COLS_PADRAO[1][1]], ["Responsavel", COLS_PADRAO[2][1]], ["Prazo", COLS_PADRAO[3][1]], ["Concluida em", function(it){ return fmt(it.dataReal); }]];

  var INFO = {
    "kpi-concluidas": { t: "Etapas concluidas", o: "Quantas etapas do checklist de implantacao ja foram finalizadas, sobre o total de etapas dos clientes selecionados no filtro.",
      c: "Conta as etapas com status Concluido e divide pelo total de etapas dos clientes selecionados. A barra mostra esse percentual.",
      a: "Use para saber o quanto da implantacao ja avancou. O filtro de cliente no topo muda a conta.", lista: function(){ return { rows: por("Concluido"), cols: COLS_CONC }; } },
    "kpi-andamento": { t: "Em andamento", o: "Etapas que ja foram iniciadas e estao dentro do prazo.",
      c: "Conta as etapas com status Em andamento. O texto abaixo do numero mostra a primeira delas.",
      a: "Acompanhe se cada responsavel esta cumprindo a etapa. Quando o prazo vence, a etapa passa para Atrasada.", lista: function(){ return { rows: por("Em andamento"), cols: COLS_PADRAO }; } },
    "kpi-atrasadas": { t: "Atrasadas", o: "Etapas cujo prazo previsto ja passou e que ainda nao foram concluidas.",
      c: "Conta as etapas com status Atrasado. Os dias de atraso vao do prazo previsto ate hoje.",
      a: "Cobre o responsavel pela etapa. Os prazos das etapas seguintes so comecam a contar quando a etapa anterior e concluida.", lista: function(){ return { rows: por("Atrasado"), cols: COLS_ATRASO }; } },
    "kpi-proxima": { t: "Proxima acao", o: "A proxima etapa pronta para ser iniciada (status A fazer), na ordem do checklist.",
      c: "Pega a primeira etapa com status A fazer, pelo numero da etapa. Nao mostra etapas ja em andamento ou atrasadas, que tem paineis proprios.",
      a: "E a etapa que o responsavel indicado deve iniciar agora.", lista: function(){ return { rows: por("A fazer").sort(function(a,b){ return a.num - b.num; }), cols: COLS_PADRAO }; } },
    "action-andamento-title": { t: "Em andamento agora", o: "A etapa que esta em andamento neste momento (a primeira da lista, quando ha varias).",
      c: "Mostra o numero da etapa, o responsavel e quantas outras etapas tambem estao em andamento.",
      a: "Veja abaixo todas as etapas em andamento dos clientes selecionados.", lista: function(){ return { rows: por("Em andamento"), cols: COLS_PADRAO }; } },
    "action-atrasada-title": { t: "Atencao: etapa atrasada", o: "A etapa atrasada que precisa de atencao (a primeira da lista, quando ha varias).",
      c: "Mostra o numero da etapa, o responsavel e os dias de atraso contados do prazo previsto ate hoje, alem de quantas outras estao atrasadas.",
      a: "Priorize a cobranca dessas etapas. A lista abaixo traz todas as atrasadas.", lista: function(){ return { rows: por("Atrasado"), cols: COLS_ATRASO }; } },
    "kpi-diasatraso": { t: "Total de dias de atraso", o: "Soma dos dias de atraso acumulados em todas as etapas dos clientes selecionados.",
      c: "Para etapas concluidas, e a diferenca entre a data real e a data prevista, quando positiva. Para etapas atrasadas, conta do prazo previsto ate hoje. A area mais afetada e a que tem maior atraso medio por etapa.",
      a: "Mostra o tamanho do problema de prazo. Para achar a causa, veja a area mais afetada e a tabela de Gargalos.", lista: function(){ return { rows: itens().filter(function(it){ var d = atrasoDias(it); return d != null && d > 0; }).sort(function(a,b){ return atrasoDias(b) - atrasoDias(a); }), cols: COLS_ATRASO }; } },
    "kpi-noprazo": { t: "Etapas no prazo", o: "Percentual das etapas avaliadas que foram (ou estao sendo) cumpridas dentro do prazo.",
      c: "Avalia as etapas concluidas que tem data prevista e data real, mais as atrasadas. Conta como no prazo as concluidas com data real igual ou anterior a prevista.",
      a: "Quanto menor o percentual, mais prazos estao sendo perdidos. Combine com o tempo medio de conclusao.", lista: function(){ return { rows: itens().filter(function(it){ return it.status === "Concluido" && it.dataReal && it.dataPrevista; }).sort(function(a,b){ return atrasoDias(b) - atrasoDias(a); }), cols: COLS_ATRASO.slice(0,4).concat([["Concluida em", function(it){ return fmt(it.dataReal); }], ["Dif. (dias)", function(it){ var d = atrasoDias(it); return d == null ? "-" : d; }]]) }; } },
    "kpi-tempomedio": { t: "Tempo medio de conclusao", o: "Em media, quantos dias as etapas concluidas passaram do prazo previsto (mais significa entrega depois do prazo).",
      c: "Media da diferenca entre data real e data prevista nas etapas concluidas que tem as duas datas. Sinal de mais: entregou depois do prazo. Sinal de menos: entregou antes.",
      a: "Use para calibrar os prazos de cada etapa e identificar responsaveis que costumam atrasar.", lista: function(){ return { rows: itens().filter(function(it){ return it.status === "Concluido" && it.dataReal && it.dataPrevista; }).sort(function(a,b){ return atrasoDias(b) - atrasoDias(a); }), cols: COLS_ATRASO.slice(0,4).concat([["Concluida em", function(it){ return fmt(it.dataReal); }], ["Dif. (dias)", function(it){ var d = atrasoDias(it); return d == null ? "-" : d; }]]) }; } }
  };

  function fechar(){ var m = document.getElementById("visaoInfoModal"); if (m) m.remove(); }
  function abrir(key, infDireto, valorTxt){
    var inf = infDireto || INFO[key]; if (!inf) return; fechar();
    var L = inf.lista ? inf.lista() : { rows: [], cols: [] }, rows = L.rows || [], cols = L.cols, MAX = 80;
    var tab = !inf.lista ? (valorTxt ? '<p style="margin:0;padding:10px 12px;background:#f7f2f4;border-radius:8px;font-size:13.5px"><b>Valor atual:</b> ' + esc(valorTxt) + '</p>' : "") : rows.length ? '<div style="overflow:auto;max-height:42vh;margin-top:6px"><table style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr>' +
      cols.map(function(c){ return '<th style="text-align:left;padding:6px 8px;border-bottom:2px solid #eee;position:sticky;top:0;background:#fff">' + esc(c[0]) + '</th>'; }).join("") + '</tr></thead><tbody>' +
      rows.slice(0, MAX).map(function(it){ return '<tr>' + cols.map(function(c){ return '<td style="padding:6px 8px;border-bottom:1px solid #f2f2f2">' + esc(c[1](it)) + '</td>'; }).join("") + '</tr>'; }).join("") +
      '</tbody></table></div>' + (rows.length > MAX ? '<p style="font-size:12px;color:#777">Mostrando ' + MAX + ' de ' + rows.length + ' etapas.</p>' : "") : '<p style="color:#777;font-size:13px">Nenhuma etapa nesta situacao para o filtro atual.</p>';
    var m = document.createElement("div"); m.id = "visaoInfoModal";
    m.setAttribute("style", "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px");
    m.innerHTML = '<div role="dialog" aria-modal="true" style="background:#fff;border-radius:14px;max-width:760px;width:100%;max-height:88vh;overflow:auto;padding:20px 22px;box-shadow:0 20px 50px rgba(0,0,0,.3)">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px"><h3 style="margin:0;font-size:18px;color:#7a1f3d">' + esc(inf.t) + '</h3><button type="button" id="visaoInfoClose" style="border:0;background:#7a1f3d;color:#fff;border-radius:8px;padding:6px 12px;cursor:pointer;font-weight:600">Fechar</button></div>' +
      '<p style="margin:12px 0 4px;font-size:12px;font-weight:700;color:#7a1f3d;text-transform:uppercase">O que e</p><p style="margin:0;font-size:13.5px">' + esc(inf.o) + '</p>' +
      '<p style="margin:12px 0 4px;font-size:12px;font-weight:700;color:#7a1f3d;text-transform:uppercase">Como e calculado</p><p style="margin:0;font-size:13.5px">' + esc(inf.c) + '</p>' +
      '<p style="margin:12px 0 4px;font-size:12px;font-weight:700;color:#7a1f3d;text-transform:uppercase">Como usar</p><p style="margin:0;font-size:13.5px">' + esc(inf.a) + '</p>' +
      (inf.lista ? '<p style="margin:14px 0 0;font-size:12px;font-weight:700;color:#7a1f3d;text-transform:uppercase">Etapas (' + rows.length + ') - conforme o filtro de cliente</p>' : '<div style="margin-top:14px">') + tab + (inf.lista ? '' : '</div>') + '</div>';
    m.addEventListener("click", function(e){ if (e.target === m) fechar(); });
    document.body.appendChild(m);
    document.getElementById("visaoInfoClose").addEventListener("click", fechar);
  }
  document.addEventListener("keydown", function(e){ if (e.key === "Escape") fechar(); });

  function cardDe(id){ var el = document.getElementById(id); return el ? (el.closest(".kpi-card") || el.closest(".action-card")) : null; }
  function preparar(){
    Object.keys(INFO).forEach(function(id){
      var c = cardDe(id); if (!c || c.getAttribute("data-info")) return;
      c.setAttribute("data-info", id); c.style.cursor = "pointer"; c.setAttribute("tabindex", "0"); c.setAttribute("role", "button");
      c.setAttribute("title", "Clique para ver a explicacao e as etapas");
      c.addEventListener("click", function(){ abrir(id); });
      c.addEventListener("keydown", function(e){ if (e.key === "Enter" || e.key === " "){ e.preventDefault(); abrir(id); } });
    });
  }
  preparar(); setInterval(preparar, 2000);

  /* Demais telas (R&S e Coberturas): cards recriados a cada atualizacao, entao usa delegacao de eventos */
  function norm(s){ return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
  var GEN = [
    { k: "vagas abertas", t: "Vagas abertas", o: "Vagas do Recrutamento e Selecao que ainda estao em andamento, ou seja, nao foram preenchidas, recusadas nem canceladas.", c: "Conta as vagas cadastradas no R&S com situacao ativa.", a: "Abra a tela Vagas para acompanhar cada uma. Vagas que dependem de aprovacao so podem ser publicadas depois dela." },
    { k: "aguardando aprovacao", t: "Aguardando aprovacao", o: "Vagas que exigem aprovacao (por exemplo, da Diretoria) e ainda nao foram aprovadas.", c: "Conta as vagas com aprovacao pendente. Toda vaga do grupo Estrategico exige aprovacao da Diretoria.", a: "Quem aprova deve decidir na tela Vagas. A vaga so pode ser publicada apos a aprovacao." },
    { k: "sla vencido", t: "SLA vencido", o: "Vagas cujo prazo para preenchimento ja passou.", c: "O prazo depende do grupo do cargo: 20 dias uteis (Operacional e Tecnico), 30 (Administrativa) ou 40 (Estrategico). Conta somente dias uteis de Mogi das Cruzes (SP), sem fins de semana nem feriados, a partir do inicio do SLA. Vagas preenchidas, recusadas ou canceladas nao entram.", a: "Priorize essas vagas. O semaforo na lista mostra amarelo quando faltam 5 dias uteis ou menos e vermelho quando vence." },
    { k: "posicoes em selecao", t: "Posicoes em selecao", o: "Quantidade de posicoes (cadeiras a preencher) das vagas que estao em processo seletivo.", c: "Soma as posicoes das vagas em selecao. Uma vaga pode ter varias posicoes.", a: "Use para dimensionar a carga de trabalho do time de R&S." },
    { k: "tempo medio p/ preencher", t: "Tempo medio para preencher", o: "Em media, quantos dias uma solicitacao leva para ser concluida (vaga preenchida).", c: "Media dos dias entre a abertura e a conclusao, considerando apenas as solicitacoes concluidas que tem as duas datas.", a: "Compare com o SLA do grupo do cargo para ver se o processo seletivo esta dentro do esperado." },
    { k: "abertas no momento", t: "Abertas no momento", o: "Solicitacoes de cobertura, substituicao ou requisicao de pessoal que ainda nao foram concluidas.", c: "Conta as solicitacoes que nao estao concluidas. O texto abaixo mostra o total de solicitacoes.", a: "Acompanhe no Kanban de Solicitacoes quais estao paradas ou proximas do prazo." },
    { k: "via banco de talentos", t: "Via banco de talentos", o: "Percentual das solicitacoes concluidas que foram preenchidas com candidato do Banco de Talentos.", c: "Concluidas via banco de talentos dividido pelo total de concluidas.", a: "Quanto maior, mais o banco esta evitando abrir um novo processo seletivo." },
    { k: "via psel", t: "Via Psel", o: "Percentual das solicitacoes concluidas que foram preenchidas por um processo seletivo (Psel).", c: "Concluidas via Psel dividido pelo total de concluidas.", a: "Compare com o percentual via banco de talentos para entender de onde vem as contratacoes." }
  ];
  var st = document.createElement("style");
  st.textContent = ".rs-kpi,#coberturaKpiGrid .kpi-card{cursor:pointer}.rs-kpi:hover,#coberturaKpiGrid .kpi-card:hover{box-shadow:0 4px 14px rgba(122,31,61,.18)}";
  document.head.appendChild(st);
  document.addEventListener("click", function(e){
    var card = e.target.closest && e.target.closest(".rs-kpi, #coberturaKpiGrid .kpi-card"); if (!card) return;
    var txt = norm(card.textContent);
    for (var i = 0; i < GEN.length; i++){
      if (txt.indexOf(GEN[i].k) >= 0){ abrir(null, GEN[i], card.textContent.trim().replace(/\s+/g, " ")); return; }
    }
    abrir(null, { t: "Indicador", o: "Indicador calculado com as informacoes exibidas nesta tela.", c: "Calculado automaticamente a partir dos registros atuais.", a: "Use o filtro e as listas da tela para ver os detalhes." }, card.textContent.trim().replace(/\s+/g, " "));
  });
  var _tt = setInterval(function(){ document.querySelectorAll(".rs-kpi,#coberturaKpiGrid .kpi-card").forEach(function(c){ if (!c.title) c.title = "Clique para ver a explicacao"; }); }, 2000);
})();
