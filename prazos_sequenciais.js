/* Regra de prazos sequenciais (Kanban de Implantacao)
   - Etapa 1: prazo definido na abertura (como antes).
   - Etapas 2 em diante: SEM prazo ate a etapa anterior ser concluida; ao concluir, o prazo passa a
     contar a partir da data de conclusao da anterior (dias uteis, duracao por etapa em DUR). */
(function(){
  "use strict";
  /* duracao (dias uteis) de cada etapa, contada a partir da conclusao da etapa anterior */
  var DUR = {2:1,3:1,4:4,5:2,6:1,7:8,8:1,9:1,10:1,11:1,12:1,13:1,14:3,15:2,16:1,17:1,18:1,19:1,20:5,21:7,22:23,23:1,24:1};
  var FLAG = "prazosSequenciaisAplicado_v1";

  function dur(n){ return DUR[n] || 1; }
  function pad(n){ return n < 10 ? "0" + n : "" + n; }
  function fmtIso(d){ return d.getFullYear() + "-" + pad(d.getMonth()+1) + "-" + pad(d.getDate()); }
  function fmtBR(s){ var p = String(s).slice(0,10).split("-"); return p[2] + "/" + p[1] + "/" + p[0]; }
  function concluidaOk(it){ return it && it.status === "Concluido" && it.dataReal; }
  function prazoApos(prev, num){
    var base = new Date(String(prev.dataReal).slice(0,10) + "T12:00:00");
    return fmtIso(addBusinessDays(base, dur(num)));
  }
  function hojeStr(){ return fmtIso(new Date()); }
  function gruposPorCliente(){
    var g = {};
    (typeof ITEMS !== "undefined" ? ITEMS : []).forEach(function(it){
      if (!it.cliente) return;
      if (typeof TEMPLATE_CLIENT_LABEL !== "undefined" && it.cliente === TEMPLATE_CLIENT_LABEL) return;
      (g[it.cliente] = g[it.cliente] || []).push(it);
    });
    Object.keys(g).forEach(function(c){ g[c].sort(function(a,b){ return a.num - b.num; }); });
    return g;
  }
  function anterior(grp, it){
    for (var i = 0; i < grp.length; i++){ if (Number(grp[i].num) === Number(it.num) - 1) return grp[i]; }
    return null;
  }
  async function patch(it, body){
    await graphFetch(GRAPH_BASE + "/items/" + it.id + "/fields", { method: "PATCH", body: JSON.stringify(body) });
  }

  /* 1) Nova implantacao: so a etapa 1 recebe prazo */
  if (typeof computeAutoPrazos === "function"){
    var _origPrazos = computeAutoPrazos;
    window.computeAutoPrazos = computeAutoPrazos = function(){
      var d = _origPrazos.apply(this, arguments), out = {};
      out[1] = d[1];
      return out;
    };
  }

  /* 2) Preenche o prazo das etapas cujo antecessor ja foi concluido e que ainda estao sem prazo */
  var reconciliando = false;
  async function reconciliar(somenteCliente){
    if (reconciliando || typeof ITEMS === "undefined") return 0;
    reconciliando = true;
    var n = 0, hoje = hojeStr();
    try {
      var g = gruposPorCliente();
      var clientes = somenteCliente ? [somenteCliente] : Object.keys(g);
      for (var c = 0; c < clientes.length; c++){
        var grp = g[clientes[c]] || [];
        for (var i = 0; i < grp.length; i++){
          var it = grp[i];
          if (Number(it.num) <= 1 || it.status === "Concluido") continue;
          if (it.dataPrevista || it.prazoAlteradoPor) continue;
          var prev = anterior(grp, it);
          if (!concluidaOk(prev)) continue;
          var ds = prazoApos(prev, it.num);
          var body = { field_10: ds + "T12:00:00Z", AvisoProximaEtapaEnviado: false };
          if (it.status === "Atrasado" && ds >= hoje) body.field_12 = "A fazer";
          try {
            await patch(it, body);
            it.dataPrevista = body.field_10;
            if (body.field_12) it.status = body.field_12;
            n++;
          } catch (e){ console.error("Prazo sequencial: falha na etapa " + it.num + " - " + e.message); }
        }
      }
    } finally { reconciliando = false; }
    if (n){
      if (typeof renderAll === "function") renderAll();
      if (typeof showToast === "function") showToast(n + (n === 1 ? " prazo definido" : " prazos definidos") + " a partir da conclusao da etapa anterior.");
    }
    return n;
  }

  /* chamada quando uma etapa e concluida (substitui o antigo recalculo do DP apos o R&S) */
  window.cascadeDpAfterRS = async function(item){
    try {
      if (!item || item.status !== "Concluido" || !item.dataReal) return;
      await reconciliar(item.cliente);
    } catch (e){ console.error("Prazo sequencial: " + e.message); }
  };

  /* apos cada carga dos itens (cobre conclusoes automaticas feitas por outros caminhos) */
  if (typeof loadItems === "function"){
    var _origLoad = loadItems;
    window.loadItems = loadItems = async function(){
      var r = await _origLoad.apply(this, arguments);
      setTimeout(function(){ reconciliar().catch(function(){}); }, 1500);
      return r;
    };
  }

  /* 3) Migracao unica das implantacoes em andamento (botao para gestores) */
  function planejar(){
    var g = gruposPorCliente(), plano = [], hoje = hojeStr();
    Object.keys(g).forEach(function(c){
      var grp = g[c];
      grp.forEach(function(it){
        if (Number(it.num) <= 1 || it.status === "Concluido") return;
        var prev = anterior(grp, it);
        if (prev && prev.status === "Concluido" && !prev.dataReal) return;
        if (concluidaOk(prev)){
          if (it.prazoAlteradoPor) return;
          var ds = prazoApos(prev, it.num);
          if (String(it.dataPrevista || "").slice(0,10) === ds) return;
          var b = { field_10: ds + "T12:00:00Z", AvisoProximaEtapaEnviado: false };
          if (it.status === "Atrasado" && ds >= hoje) b.field_12 = "A fazer";
          plano.push({ it: it, body: b, tipo: "definir" });
        } else {
          if (!it.dataPrevista && it.status !== "Atrasado") return;
          var b2 = { field_10: null };
          if (it.status === "Atrasado"){
            var pend = prev && (prev.status === "Em andamento" || prev.status === "Atrasado");
            b2.field_12 = pend ? "A fazer" : "A definir";
          }
          plano.push({ it: it, body: b2, tipo: "limpar" });
        }
      });
    });
    return plano;
  }

  async function aplicarMigracao(){
    if (typeof IS_GESTOR !== "undefined" && !IS_GESTOR){ alert("Apenas gestores podem aplicar esta regra."); return; }
    var plano = planejar();
    var limpar = plano.filter(function(p){ return p.tipo === "limpar"; }).length;
    var definir = plano.length - limpar;
    var atras = plano.filter(function(p){ return p.body.field_12; }).length;
    if (!plano.length){ alert("Nada a ajustar: as implantacoes ja seguem a regra de prazos sequenciais."); localStorage.setItem(FLAG, "1"); esconderBotao(); return; }
    var msg = "Aplicar a regra de prazos sequenciais nas implantacoes em andamento?\n\n" +
      "- " + limpar + " etapa(s) ficarao sem prazo ate a anterior ser concluida\n" +
      "- " + definir + " etapa(s) terao o prazo recalculado a partir da conclusao da anterior\n" +
      "- " + atras + " etapa(s) deixarao de constar como Atrasado\n\nEsta acao grava no SharePoint. Continuar?";
    if (!confirm(msg)) return;
    var btn = document.getElementById("prazosSeqBtn"); if (btn){ btn.disabled = true; btn.textContent = "Aplicando..."; }
    var ok = 0, falha = 0, i = 0, conc = 4;
    async function worker(){
      while (i < plano.length){
        var p = plano[i++];
        try {
          await patch(p.it, p.body);
          p.it.dataPrevista = p.body.field_10 || null;
          if (p.body.field_12) p.it.status = p.body.field_12;
          ok++;
        } catch (e){ falha++; console.error("Falha na etapa " + p.it.num + " de " + p.it.cliente + ": " + e.message); }
        if (btn) btn.textContent = "Aplicando... " + (ok + falha) + "/" + plano.length;
      }
    }
    var ws = []; for (var k = 0; k < conc; k++) ws.push(worker());
    await Promise.all(ws);
    if (typeof renderAll === "function") renderAll();
    if (!falha){ localStorage.setItem(FLAG, "1"); esconderBotao(); }
    else if (btn){ btn.disabled = false; btn.textContent = "Tentar novamente (" + falha + " falhas)"; }
    if (typeof showToast === "function") showToast("Regra de prazos aplicada: " + ok + " etapa(s) ajustada(s)" + (falha ? ", " + falha + " com falha." : "."), !!falha);
  }

  function esconderBotao(){ var b = document.getElementById("prazosSeqBtn"); if (b && b.parentNode) b.parentNode.removeChild(b); }
  function mostrarBotao(){
    if (localStorage.getItem(FLAG) || document.getElementById("prazosSeqBtn")) return;
    if (typeof IS_GESTOR === "undefined" || !IS_GESTOR || typeof ITEMS === "undefined" || !ITEMS.length) return;
    var b = document.createElement("button");
    b.id = "prazosSeqBtn"; b.type = "button";
    b.textContent = "Aplicar regra de prazos sequenciais";
    b.setAttribute("style", "position:fixed;right:16px;bottom:16px;z-index:9000;background:#7a1f3d;color:#fff;border:0;border-radius:10px;padding:10px 16px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.25)");
    b.addEventListener("click", aplicarMigracao);
    document.body.appendChild(b);
  }
  setInterval(mostrarBotao, 3000);

  window.prazosSequenciais = { DUR: DUR, planejar: planejar, aplicar: aplicarMigracao, reconciliar: reconciliar };
})();
