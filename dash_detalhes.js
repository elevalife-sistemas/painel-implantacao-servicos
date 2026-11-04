/* Dashboard Executivo: clique nos cards abre janela com os detalhes */
(function(){
  "use strict";
  var GRID_IMP = "dashExecImplantacaoGrid", GRID_COB = "dashExecCoberturasGrid";

  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
  function parseData(v){
    if (!v) return null;
    if (v instanceof Date) return isNaN(v) ? null : v;
    var m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(+m[1], +m[2]-1, +m[3]);
    var d = new Date(v); return isNaN(d) ? null : d;
  }
  function fmtData(v){
    var d = parseData(v); if (!d) return v ? esc(v) : "-";
    return ("0"+d.getDate()).slice(-2)+"/"+("0"+(d.getMonth()+1)).slice(-2)+"/"+d.getFullYear();
  }
  function diasAtraso(v){
    var d = parseData(v); if (!d) return null;
    var h = new Date(); h = new Date(h.getFullYear(), h.getMonth(), h.getDate());
    var n = Math.round((h - d) / 86400000);
    return n > 0 ? n : 0;
  }
  function nomeResp(email){
    if (!email) return "-";
    try { if (typeof responsavelDisplayName === "function") return responsavelDisplayName(email) || email; } catch(e){}
    return email;
  }

  function itensReais(){
    return (typeof ITEMS !== "undefined" ? ITEMS : []).filter(function(it){ return it.cliente; });
  }
  function porCliente(){
    var m = {};
    itensReais().forEach(function(it){ (m[it.cliente] = m[it.cliente] || []).push(it); });
    Object.keys(m).forEach(function(c){ m[c].sort(function(a,b){ return a.num - b.num; }); });
    return m;
  }
  function cobLista(){
    return (typeof coberturaHistoricoData !== "undefined" ? (coberturaHistoricoData || []) : []).filter(function(f){
      return !(f.__id && String(f.__id).indexOf("aval-") === 0) && f.PrecisaSubstituicao !== "Nao";
    });
  }

  function linhaEtapa(it, comAtraso){
    var r = [esc(it.cliente), esc((it.num != null ? it.num + ". " : "") + (it.title || "")), esc(it.areaResp || "-"), esc(nomeResp(it.emailResponsavel)), fmtData(it.dataPrevista)];
    if (comAtraso){ var d = diasAtraso(it.dataPrevista); r.push(d == null ? "-" : d + (d === 1 ? " dia" : " dias")); }
    return r;
  }

  function montar(tipo){
    var mc = porCliente(), clientes = Object.keys(mc), r;
    function concluida(c){ return mc[c].every(function(it){ return it.status === "Concluido"; }); }
    if (tipo === "imp-ativas"){
      return { titulo: "Implantações ativas", cols: ["Cliente","Etapa atual","Área","Responsável","Prazo da etapa","Progresso"],
        rows: clientes.filter(function(c){ return !concluida(c); }).map(function(c){
          var its = mc[c];
          var at = its.filter(function(it){ return it.status === "Em andamento" || it.status === "Atrasado"; })[0] || its.filter(function(it){ return it.status === "A fazer"; })[0] || its[0];
          var feitas = its.filter(function(it){ return it.status === "Concluido"; }).length;
          return [esc(c), esc((at.num != null ? at.num + ". " : "") + (at.title || "")) + (at.status === "Atrasado" ? ' <span style="color:#b42318;font-weight:600">(atrasada)</span>' : ""), esc(at.areaResp || "-"), esc(nomeResp(at.emailResponsavel)), fmtData(at.dataPrevista), feitas + "/" + its.length + " etapas"];
        }) };
    }
    if (tipo === "imp-andamento"){
      return { titulo: "Etapas em andamento", cols: ["Cliente","Etapa","Área","Responsável","Prazo"],
        rows: itensReais().filter(function(it){ return it.status === "Em andamento"; }).sort(function(a,b){ return String(a.cliente).localeCompare(String(b.cliente)) || a.num - b.num; }).map(function(it){ return linhaEtapa(it,false); }) };
    }
    if (tipo === "imp-atrasadas"){
      var lst = itensReais().filter(function(it){ return it.status === "Atrasado"; });
      lst.sort(function(a,b){ return (diasAtraso(b.dataPrevista)||0) - (diasAtraso(a.dataPrevista)||0); });
      return { titulo: "Etapas atrasadas", cols: ["Cliente","Etapa","Área","Responsável","Prazo","Atraso"], rows: lst.map(function(it){ return linhaEtapa(it,true); }),
        resumo: true };
    }
    if (tipo === "imp-concluidas"){
      return { titulo: "Implantações concluídas", cols: ["Cliente","Total de etapas"],
        rows: clientes.filter(concluida).map(function(c){ return [esc(c), mc[c].length]; }) };
    }
    var cob = cobLista();
    function linhaCob(f){
      return [esc(f.Cliente || f.Area || "-"), esc(f.Cargo || "-"), esc(f.Motivo || "-"), esc(f.StatusSolicitacao || "Registrada"), esc(nomeResp(f.EmailResponsavel)), fmtData(f.PrazoConclusao)];
    }
    var colsCob = ["Cliente / Área","Cargo","Motivo","Status","Responsável","Prazo"];
    function st(f){ return f.StatusSolicitacao || "Registrada"; }
    if (tipo === "cob-abertas") return { titulo: "Solicitações abertas", cols: colsCob, rows: cob.filter(function(f){ return st(f) !== "Concluída"; }).map(linhaCob) };
    if (tipo === "cob-triagem") return { titulo: "Em triagem / Psel", cols: colsCob, rows: cob.filter(function(f){ return st(f) === "Em Triagem" || st(f) === "Psel Aberto"; }).map(linhaCob) };
    if (tipo === "cob-atrasadas") return { titulo: "Solicitações atrasadas", cols: colsCob, rows: cob.filter(function(f){ return st(f) === "Atrasado"; }).map(linhaCob) };
    if (tipo === "cob-concluidas") return { titulo: "Solicitações concluídas", cols: colsCob, rows: cob.filter(function(f){ return st(f) === "Concluída"; }).map(linhaCob) };
    return null;
  }

  function fechar(){ var m = document.getElementById("dashDetModal"); if (m) m.parentNode.removeChild(m); document.removeEventListener("keydown", onKey); }
  function onKey(e){ if (e.key === "Escape") fechar(); }

  function abrir(tipo){
    var cobTipo = tipo.indexOf("cob-") === 0;
    if (cobTipo && typeof coberturaHistoricoLoaded !== "undefined" && !coberturaHistoricoLoaded && typeof loadCoberturaHistorico === "function"){
      loadCoberturaHistorico().then(function(){ abrir(tipo); }); return;
    }
    var d = montar(tipo); if (!d) return;
    fechar();
    var th = d.cols.map(function(c){ return '<th style="text-align:left;padding:8px 10px;background:#f4f5f7;font-size:12px;text-transform:uppercase;letter-spacing:.3px;color:#555;position:sticky;top:0">' + esc(c) + '</th>'; }).join("");
    var body = d.rows.length ? d.rows.map(function(r){
      return '<tr>' + r.map(function(c){ return '<td style="padding:8px 10px;border-top:1px solid #eceef1;font-size:13px;vertical-align:top">' + c + '</td>'; }).join("") + '</tr>';
    }).join("") : '<tr><td colspan="' + d.cols.length + '" style="padding:24px;text-align:center;color:#777">Nenhum item nesta categoria.</td></tr>';
    var resumo = "";
    if (d.resumo && d.rows.length){
      var porResp = {};
      d.rows.forEach(function(r){ var k = r[3]; porResp[k] = (porResp[k] || 0) + 1; });
      resumo = '<div style="margin:0 0 10px;font-size:12px;color:#555">Por responsável: ' + Object.keys(porResp).sort(function(a,b){ return porResp[b]-porResp[a]; }).map(function(k){
        return '<span style="display:inline-block;margin:2px 6px 2px 0;padding:3px 8px;border-radius:12px;background:#f4f5f7">' + k + ' — ' + porResp[k] + '</span>'; }).join("") + '</div>';
    }
    var ov = document.createElement("div");
    ov.id = "dashDetModal";
    ov.setAttribute("style", "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px");
    ov.innerHTML = '<div role="dialog" aria-modal="true" style="background:#fff;border-radius:14px;max-width:1040px;width:100%;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.3)">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #eceef1">' +
      '<div><div style="font-size:18px;font-weight:700;color:#7a1f3d">' + esc(d.titulo) + '</div><div style="font-size:12px;color:#777" id="dashDetCount">' + d.rows.length + ' ' + (d.rows.length === 1 ? "item" : "itens") + '</div></div>' +
      '<button type="button" id="dashDetClose" style="border:0;background:#f4f5f7;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:14px">Fechar</button></div>' +
      '<div style="padding:14px 20px 4px"><input id="dashDetBusca" type="text" placeholder="Filtrar por cliente, etapa ou responsável" style="width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #d5d9de;border-radius:8px;font-size:13px">' + '</div>' +
      '<div style="padding:10px 20px 20px;overflow:auto">' + resumo + '<table style="width:100%;border-collapse:collapse"><thead><tr>' + th + '</tr></thead><tbody id="dashDetBody">' + body + '</tbody></table></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener("click", function(e){ if (e.target === ov) fechar(); });
    document.getElementById("dashDetClose").addEventListener("click", fechar);
    document.getElementById("dashDetBusca").addEventListener("input", function(){
      var q = this.value.toLowerCase(), n = 0;
      [].forEach.call(document.querySelectorAll("#dashDetBody tr"), function(tr){
        var ok = !q || tr.textContent.toLowerCase().indexOf(q) > -1; tr.style.display = ok ? "" : "none"; if (ok) n++;
      });
      document.getElementById("dashDetCount").textContent = n + (n === 1 ? " item" : " itens");
    });
    document.addEventListener("keydown", onKey);
  }

  var TIPOS_IMP = ["imp-ativas","imp-andamento","imp-atrasadas","imp-concluidas"];
  var TIPOS_COB = ["cob-abertas","cob-triagem","cob-atrasadas","cob-concluidas"];
  function ligar(){
    [[GRID_IMP, TIPOS_IMP],[GRID_COB, TIPOS_COB]].forEach(function(p){
      var g = document.getElementById(p[0]); if (!g) return;
      [].forEach.call(g.querySelectorAll(".kpi-card"), function(card, i){
        if (!p[1][i] || card.getAttribute("data-det")) return;
        card.setAttribute("data-det", p[1][i]);
        card.style.cursor = "pointer"; card.setAttribute("role", "button"); card.setAttribute("tabindex", "0");
        card.title = "Clique para ver os detalhes";
        card.addEventListener("click", function(){ abrir(card.getAttribute("data-det")); });
        card.addEventListener("keydown", function(e){ if (e.key === "Enter" || e.key === " "){ e.preventDefault(); abrir(card.getAttribute("data-det")); } });
        var sub = card.querySelector(".kpi-sub");
        if (sub) sub.insertAdjacentHTML("beforeend", ' <span style="color:#7a1f3d;font-weight:600">· ver detalhes ›</span>');
      });
    });
  }

  var st = document.createElement("style");
  st.textContent = '#' + GRID_IMP + ' .kpi-card[data-det],#' + GRID_COB + ' .kpi-card[data-det]{transition:box-shadow .15s,transform .15s}#' + GRID_IMP + ' .kpi-card[data-det]:hover,#' + GRID_COB + ' .kpi-card[data-det]:hover{box-shadow:0 6px 18px rgba(122,31,61,.18);transform:translateY(-2px)}';
  document.head.appendChild(st);

  /* religa após cada renderização do dashboard (os cards são recriados) */
  setInterval(ligar, 800);
  window.dashExecAbrirDetalhes = abrir;
})();
