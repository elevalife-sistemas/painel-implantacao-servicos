(function(){
var RS_URL = "https://elevalife-ats.vercel.app/api/ats";
var PUB_URL = "https://elevalife-ats.vercel.app/vagas.html";
var RS_TESTERS = ["cristiano@elevalife.com.br","gisleiny@elevalife.com.br"];
var NIVEIS = {"Operacional":20,"Técnico":20,"Administrativa":30,"Estratégico":40};
var NIVEIS_DIRETORIA = ["Estratégico"];
var MOTIVOS = ["Aumento de Quadro","Substituição Definitiva","Substituição Temporária","Cobertura de Férias/Afastamento"];
var ETAPAS_FALLBACK = ["Inscrito","Triagem","Entrevista RH","Entrevista Gestor","Aprovado","Carta Oferta","Contratado","Reprovado","Banco de Talentos"];
var vagas = [];

function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function usuario(){ try { return (account && (account.username || account.name)) || ""; } catch(e){ return ""; } }
function toast(m, err){ if (typeof showToast === "function") showToast(m, !!err); else alert(m); }

async function api(method, params, body){
  var url = RS_URL;
  if (params){ var q = []; Object.keys(params).forEach(function(k){ q.push(encodeURIComponent(k) + "=" + encodeURIComponent(params[k])); }); url += "?" + q.join("&"); }
  var opt = { method: method, headers: { "x-painel-secret": RECRUTAHUB_API_SECRET } };
  if (method === "POST"){ opt.headers["Content-Type"] = "application/json"; body = body || {}; body.usuario = usuario(); opt.body = JSON.stringify(body); }
  var r = await fetch(url, opt);
  var j = await r.json().catch(function(){ return {}; });
  if (!r.ok) throw new Error(j.error || j.erro || ("HTTP " + r.status));
  if (params && params.r === 'talentos') window.__rsTotal = (j && j.total != null) ? j.total : null; return j.data;
}

var FERIADOS_FIXOS = ["01-01","04-21","05-01","09-01","09-07","10-12","11-02","11-15","11-20","12-08","12-25"]; // nacionais + Mogi das Cruzes (01/09 aniversario; 08/12 N. Sra. da Conceicao)
var _feriCache = {};
function pascoa(y){ var a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mes=Math.floor((h+l-7*m+114)/31),dia=((h+l-7*m+114)%31)+1; return new Date(y,mes-1,dia); }
function pad2(n){ return ("0"+n).slice(-2); }
function feriadosAno(y){ if (_feriCache[y]) return _feriCache[y]; var set = {}; FERIADOS_FIXOS.forEach(function(k){ set[y+"-"+k] = 1; }); var sx = pascoa(y); sx.setDate(sx.getDate()-2); set[sx.getFullYear()+"-"+pad2(sx.getMonth()+1)+"-"+pad2(sx.getDate())] = 1; _feriCache[y] = set; return set; }
function ehUtil(x){ var w = x.getDay(); if (w === 0 || w === 6) return false; return !feriadosAno(x.getFullYear())[x.getFullYear()+"-"+pad2(x.getMonth()+1)+"-"+pad2(x.getDate())]; }
function addDU(d, n){ var x = new Date(d.getTime()); var c = 0; while (c < n){ x.setDate(x.getDate()+1); if (ehUtil(x)) c++; } return x; }
function duEntre(a, b){ var s = a < b ? 1 : -1; var x = new Date(Math.min(a,b)); var y = new Date(Math.max(a,b)); var c = 0; x.setHours(0,0,0,0); y.setHours(0,0,0,0); while (x < y){ x.setDate(x.getDate()+1); if (ehUtil(x)) c++; } return s*c; }
function sla(v){
  if (!v.sla_inicio || !v.sla_dias || v.status === "Preenchida" || v.status === "Recusada" || v.status === "Cancelada") return null;
  var ini = new Date(v.sla_inicio + "T00:00:00"); var fim = addDU(ini, Number(v.sla_dias));
  var rest = duEntre(new Date(), fim);
  return { fim: fim, rest: rest, cls: rest < 0 ? "rs-red" : (rest <= 5 ? "rs-amber" : "rs-green"), txt: rest < 0 ? ("Vencido há " + (-rest) + " d.u.") : (rest === 0 ? "Vence hoje" : ("Faltam " + rest + " d.u.")) };
}
function fmtData(d){ return d.toLocaleDateString("pt-BR"); }

function css(){
  var s = document.createElement("style");
  s.textContent = ".rs-tbl{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--border);border-radius:10px;overflow:hidden;font-size:13px}.rs-tbl th{background:var(--grena-bg);color:var(--grena);text-align:left;padding:9px 10px;font-weight:700}.rs-tbl td{padding:9px 10px;border-top:1px solid var(--border)}.rs-pill{display:inline-block;padding:2px 9px;border-radius:99px;font-size:12px;font-weight:600}.rs-green{background:var(--green-bg);color:var(--green-tx)}.rs-amber{background:var(--amber-bg);color:var(--amber-tx)}.rs-red{background:var(--red-bg);color:var(--red-tx)}.rs-blue{background:var(--blue-bg);color:var(--blue-tx)}.rs-gray{background:#eceef1;color:#555}.rs-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:14px 0 18px}.rs-kpi{background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px}.rs-kpi b{display:block;font-size:26px;color:var(--grena)}.rs-ov{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:30px 12px}.rs-box{background:#fff;border-radius:12px;max-width:1100px;width:100%;padding:20px;box-shadow:0 10px 40px rgba(0,0,0,.3)}.rs-box h3{margin:0 0 12px;color:var(--grena)}.rs-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 14px}.rs-grid label{font-size:12px;font-weight:600;display:block}.rs-grid input,.rs-grid select,.rs-grid textarea,.rs-in{width:100%;box-sizing:border-box;padding:8px;border:1px solid var(--border);border-radius:7px;font-size:13px;font-family:inherit}.rs-full{grid-column:1/-1}.rs-act{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}.rs-btn{background:var(--grena);color:#fff;border:none;padding:8px 14px;border-radius:8px;font-weight:600;cursor:pointer;font-size:13px}.rs-btn.o{background:#fff;color:var(--grena);border:1px solid var(--grena)}.rs-btn.r{background:#b02a2a}.rs-kb{display:flex;gap:10px;overflow-x:auto;padding-bottom:8px}.rs-col{min-width:170px;flex:1;background:#f4f5f7;border-radius:9px;padding:8px}.rs-col h5{margin:0 0 8px;font-size:12px;color:var(--grena)}.rs-card{background:#fff;border:1px solid var(--border);border-radius:8px;padding:8px;margin-bottom:8px;font-size:12px}.rs-card select{width:100%;margin-top:6px;font-size:11px}.rs-sec{margin:16px 0 6px;font-weight:700;color:var(--grena)}.rs-apr{display:flex;gap:10px;align-items:center;padding:8px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;font-size:13px}@media(max-width:800px){.rs-kpis{grid-template-columns:repeat(2,1fr)}.rs-grid{grid-template-columns:1fr}}";
  document.head.appendChild(s);
}

function montar(){
  if (document.getElementById("rsTab") && document.getElementById("panel-rs")) return;
  ["rsTab","rsLabel","panel-rs"].forEach(function(i){ var e = document.getElementById(i); if (e) e.remove(); });
  var tabs = document.querySelector(".sidebar nav.tabs");
  var ancora = tabs && tabs.querySelector('a.tab[href*="elevalife-ats"]');
  if (tabs && !ancora){ var gl = tabs.querySelectorAll(".tab-group-label"); for (var gi = 0; gi < gl.length; gi++){ if (/suporte/i.test(gl[gi].textContent) && gl[gi].id !== "rsLabel"){ ancora = gl[gi]; break; } } }
  if (!tabs || !ancora) return;
  var lab = document.createElement("p"); lab.className = "tab-group-label"; lab.id = "rsLabel"; lab.textContent = "Recrutamento e Seleção"; lab.style.display = "none";
  var tab = document.createElement("div"); tab.className = "tab tab-sub"; tab.id = "rsTab"; tab.setAttribute("data-tab","rs"); tab.style.display = "none";
  tab.innerHTML = '<span class="tab-icon">&#128203;</span>Vagas';
  tabs.insertBefore(lab, ancora); tabs.insertBefore(tab, ancora);
  var painel = document.createElement("div"); painel.className = "panel"; painel.id = "panel-rs";
  painel.innerHTML = '<div class="kanban-header"><h2 class="kanban-client-name">Recrutamento e Seleção</h2><button type="button" class="btn-new" id="rsNovaBtn" style="margin-left:auto">+ Nova vaga</button></div><div class="rs-kpis" id="rsKpis"></div><div id="rsLista"></div>';
  var ref = document.getElementById("panel-ajuda");
  ref.parentNode.insertBefore(painel, ref);
  tab.addEventListener("click", function(){ document.querySelectorAll(".tab").forEach(function(x){ x.classList.remove("active"); }); document.querySelectorAll(".panel").forEach(function(x){ x.classList.remove("active"); }); tab.classList.add("active"); painel.classList.add("active"); var cb = document.getElementById("clientbarWrap"); if (cb) cb.style.display = "none"; carregar(); });
  document.getElementById("rsNovaBtn").addEventListener("click", function(){ formVaga(); });
  lab.style.display = ""; tab.style.display = "";
}

var reqs = [];
var reqErro = "";
async function carregarRequisicoes(){
  reqs = []; reqErro = "";
  try {
    if (typeof graphFetch !== "function" || typeof COBERTURAS_GRAPH_BASE === "undefined") { reqErro = "Login Microsoft necessario para listar as requisicoes."; return; }
    var d = await graphFetch(COBERTURAS_GRAPH_BASE + "/items?expand=fields&$top=999");
    reqs = (d.value || []).map(function(it){ var f = it.fields || {}; f.__id = String(it.id); f.__created = it.createdDateTime || null; return f; });
  } catch(e){ reqErro = "Nao foi possivel ler as requisicoes: " + e.message; }
}
function reqPendentes(){
  var usados = {}; vagas.forEach(function(v){ if (v.origem_id) usados[String(v.origem_id)] = true; });
  return reqs.filter(function(f){
    var st = String(f.Status || "").toLowerCase();
    return (f.Cargo || "") && st.indexOf("cancel") < 0 && st.indexOf("conclu") < 0 && !usados[f.__id];
  }).sort(function(a, b){ return new Date(b.__created || 0) - new Date(a.__created || 0); });
}
async function carregar(){
  var el = document.getElementById("rsLista"); el.innerHTML = "<p>Carregando...</p>";
  try { vagas = await api("GET", { r: "vagas" }); await carregarRequisicoes(); render(); }
  catch(e){ el.innerHTML = '<p style="color:#b02a2a">Erro ao carregar: ' + esc(e.message) + '</p>'; }
}

function render(){
  var abertas = 0, aguard = 0, venc = 0, pos = 0;
  vagas.forEach(function(v){ if (v.status === "Aberta") abertas++; if (v.status === "Aguardando aprovação") aguard++; var s = sla(v); if (s && s.rest < 0) venc++; if (v.status !== "Recusada") pos += (v.posicoes.total - v.posicoes.preenchidas); });
  document.getElementById("rsKpis").innerHTML = [["Vagas abertas",abertas],["Aguardando aprovação",aguard],["SLA vencido",venc],["Posições em seleção",pos]].map(function(k){ return '<div class="rs-kpi"><b>' + k[1] + '</b>' + k[0] + '</div>'; }).join("");
  var el = document.getElementById("rsLista");
  var pend = reqPendentes();
  var h = '<div class="rs-sec" style="margin-top:0">Requisições de pessoal dos coordenadores aguardando abertura de vaga (' + pend.length + ')</div>';
  if (reqErro) h += '<p style="font-size:13px;color:#b02a2a">' + esc(reqErro) + '</p>';
  else if (!pend.length) h += '<p style="font-size:13px;color:#777">Nenhuma requisição pendente. As requisições feitas em Solicitações aparecem aqui.</p>';
  else {
    h += '<table class="rs-tbl" style="margin-bottom:18px"><thead><tr><th>Data</th><th>Cliente</th><th>Cargo</th><th>Motivo</th><th>Solicitante</th><th>Salário</th><th></th></tr></thead><tbody>';
    pend.forEach(function(f){
      var dt = f.__created ? new Date(f.__created).toLocaleDateString("pt-BR") : "";
      var sal = (f.ValorRemuneracao !== undefined && f.ValorRemuneracao !== null && f.ValorRemuneracao !== "") ? "R$ " + Number(f.ValorRemuneracao).toLocaleString("pt-BR", {minimumFractionDigits: 2}) : "-";
      h += '<tr><td>' + dt + '</td><td>' + esc(f.Cliente) + '</td><td><b>' + esc(f.Cargo) + '</b></td><td>' + esc(f.Motivo) + '</td><td>' + esc(f.Solicitante) + '</td><td>' + sal + '</td><td><button class="rs-btn" data-req="' + esc(f.__id) + '">Abrir vaga</button></td></tr>';
    });
    h += '</tbody></table>';
  }
  h += '<div class="rs-sec">Vagas</div>';
  if (!vagas.length) h += '<p>Nenhuma vaga cadastrada ainda. Abra uma a partir de uma requisição acima ou clique em "+ Nova vaga".</p>';
  else {
    h += '<table class="rs-tbl"><thead><tr><th>Código</th><th>Cargo</th><th>Área</th><th>Motivo</th><th>Posições</th><th>Aprovação</th><th>Status</th><th>SLA</th><th></th></tr></thead><tbody>';
    vagas.forEach(function(v){
      var s = sla(v);
      var ac = v.aprovacao_status === "Aprovada" ? "rs-green" : (v.aprovacao_status === "Recusada" ? "rs-red" : "rs-amber");
      h += '<tr><td>' + esc(v.codigo) + '</td><td><b>' + esc(v.cargo) + '</b>' + (v.sigilosa ? ' <span class="rs-pill rs-red">sigilosa</span>' : '') + (v.origem === "requisicao-pessoal" ? ' <span class="rs-pill rs-gray">requisição</span>' : '') + '</td><td>' + esc(v.area) + '</td><td>' + esc(v.motivo) + '</td><td>' + v.posicoes.preenchidas + '/' + v.posicoes.total + '</td><td><span class="rs-pill ' + ac + '">' + esc(v.aprovacao_status) + '</span></td><td>' + esc(v.status) + '</td><td>' + (s ? '<span class="rs-pill ' + s.cls + '" title="Prazo: ' + fmtData(s.fim) + '">' + s.txt + '</span>' : '-') + '</td><td><button class="rs-btn o" data-id="' + esc(v.id) + '">Abrir</button></td></tr>';
    });
    h += '</tbody></table>';
  }
  el.innerHTML = h;
  el.querySelectorAll("button[data-id]").forEach(function(b){ b.addEventListener("click", function(){ detalhe(b.getAttribute("data-id")); }); });
  el.querySelectorAll("button[data-req]").forEach(function(b){ b.addEventListener("click", function(){
    var f = reqs.filter(function(x){ return x.__id === b.getAttribute("data-req"); })[0];
    if (f) formVaga(deRequisicao(f));
  }); });
}

function mapMotivo(m){
  var s = String(m || "").toLowerCase();
  if (s.indexOf("aument") >= 0) return "Aumento de Quadro";
  if (s.indexOf("ferias") >= 0 || s.indexOf("férias") >= 0 || s.indexOf("afast") >= 0 || s.indexOf("cobertura") >= 0) return "Cobertura de Férias/Afastamento";
  if (s.indexOf("tempor") >= 0) return "Substituição Temporária";
  return "Substituição Definitiva";
}
function nivelSlaPorCargo(c){
  var s = String(c || "").toLowerCase();
  if (/coordena|ger[eê]n|especialista|diretor|supervis/.test(s)) return "Estratégico";
  if (/enfermag|enfermeir|fisioter|ergonom|m[eé]dic/.test(s)) return "Técnico";
  if (/orientador|\boaf|quick massage|massagem|instrutor|ativ.*f[ií]s|educador f[ií]sico/.test(s)) return "Operacional";
  return "Administrativa";
}
function deRequisicao(f){
  var sig = f.PselSigiloso === true || String(f.PselSigiloso || f.Sigiloso || "").toLowerCase() === "sim";
  return { cargo: f.Cargo || "", area: f.Area || "", motivo: mapMotivo(f.Motivo), motivo_original: f.Motivo || "", colaborador_substituido: f.ColaboradorSubstituido || f.ProfissionalTitular || "", cliente: f.Cliente || "", carga_horaria: f.CargaHorariaSemanal || "", salario: (f.ValorRemuneracao !== undefined && f.ValorRemuneracao !== null && f.ValorRemuneracao !== "") ? f.ValorRemuneracao : "", tipo_valor: f.TipoValor || "", tipo_contrato: f.TipoContrato || "", beneficios: f.Beneficios || "", requisitos_obrig: f.RequisitosObrigatorios || "", requisitos_dif: f.RequisitosDiferenciais || "", jornada: f.EscalaTurno || "", solicitante: f.Solicitante || f.Coordenador || "", gestor_nome: f.Coordenador || f.Solicitante || "", gestor_email: f.EmailResponsavel || "", sigilosa: sig, origem: "requisicao-pessoal", origem_id: f.__id };
}

function overlay(html){
  var ov = document.createElement("div"); ov.className = "rs-ov";
  ov.innerHTML = '<div class="rs-box">' + html + '</div>';
  ov.addEventListener("mousedown", function(e){ if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov); return ov;
}

function tabelaRemun(){ return (typeof REMUNERACAO_TABLE !== "undefined" && REMUNERACAO_TABLE) ? REMUNERACAO_TABLE : []; }
function formVaga(pre){
  pre = pre || {};
  var nv = Object.keys(NIVEIS).map(function(n){ return '<option>' + esc(n) + '</option>'; }).join("");
  var mt = MOTIVOS.map(function(n){ return '<option' + (n === pre.motivo ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join("");
  var cargos = []; tabelaRemun().forEach(function(r){ if (cargos.indexOf(r.funcao) < 0) cargos.push(r.funcao); });
  var dl = cargos.map(function(c){ return '<option value="' + esc(c) + '">'; }).join("");
  var tc = ["CLT","Autonomo","PJ"]; var tcEl = document.getElementById("coberturaTipoContrato");
  if (tcEl){ var o = [].map.call(tcEl.options, function(x){ return x.value; }).filter(Boolean); if (o.length) tc = o; }
  if (pre.tipo_contrato && tc.indexOf(pre.tipo_contrato) < 0) tc.push(pre.tipo_contrato);
  var tco = '<option value="">Selecione...</option>' + tc.map(function(x){ return '<option' + (x === pre.tipo_contrato ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join("");
  var tvo = ["","Liquido","Bruto"].map(function(x){ return '<option value="' + x + '"' + (x === pre.tipo_valor ? ' selected' : '') + '>' + (x || "Selecione...") + '</option>'; }).join("");
  var aviso = pre.origem === "requisicao-pessoal" ? '<p style="font-size:13px;background:var(--amber-bg);color:var(--amber-tx);padding:8px 10px;border-radius:8px;margin:0 0 10px">Formulário preenchido a partir da requisição de pessoal' + (pre.solicitante ? ' de <b>' + esc(pre.solicitante) + '</b>' : '') + (pre.motivo_original ? ' (motivo informado: ' + esc(pre.motivo_original) + ')' : '') + '. Confira e ajuste se necessário.</p>' : '';
  var ov = overlay('<h3>' + (pre.origem === "requisicao-pessoal" ? 'Abrir vaga a partir da requisição' : 'Nova vaga') + ' (homologação)</h3>' + aviso + '<div class="rs-grid">' +
    '<div><label>Cargo *</label><input id="f_cargo" list="rsCargoList" value="' + esc(pre.cargo) + '"><datalist id="rsCargoList">' + dl + '</datalist></div><div><label>Área</label><input id="f_area" value="' + esc(pre.area) + '"></div>' +
    '<div><label>Perfil do profissional (nível na tabela)</label><select id="f_perfil"></select></div><div><label>Carga horária semanal (h)</label><input id="f_carga" type="number" min="1" max="60" value="' + esc(pre.carga_horaria) + '"></div>' +
    '<div><label>Salário / remuneração (R$)</label><input id="f_sal" type="number" min="0" step="0.01" value="' + esc(pre.salario) + '"><small id="f_leg" style="color:#777"></small></div><div><label>Líquido ou bruto</label><select id="f_tval">' + tvo + '</select></div>' +
    '<div><label>Tipo de contrato</label><select id="f_tcont">' + tco + '</select></div><div><label>Nº de posições</label><input id="f_pos" type="number" min="1" max="50" value="1"></div>' +
    '<div><label>Motivo *</label><select id="f_motivo">' + mt + '</select></div><div><label>Colaborador substituído / detalhe do motivo</label><input id="f_colab" value="' + esc(pre.colaborador_substituido) + '"></div>' +
    '<div><label>Solicitante / gestor</label><input id="f_gestor" value="' + esc(pre.gestor_nome) + '"></div><div><label>E-mail do responsável</label><input id="f_gemail" value="' + esc(pre.gestor_email) + '"></div>' +
    '<div><label>Cliente</label><input id="f_cliente" value="' + esc(pre.cliente) + '"></div><div><label>Local de trabalho</label><input id="f_local"></div>' +
    '<div><label>Escala / turno</label><input id="f_jornada" value="' + esc(pre.jornada) + '"></div><div><label>Modelo de trabalho</label><select id="f_modelo"><option>Presencial</option><option>Híbrido</option><option>Remoto</option></select></div>' +
    '<div class="rs-full"><label>Requisitos obrigatórios</label><textarea id="f_robrig" rows="2">' + esc(pre.requisitos_obrig) + '</textarea></div>' +
    '<div class="rs-full"><label>Requisitos diferenciais</label><textarea id="f_rdif" rows="2">' + esc(pre.requisitos_dif) + '</textarea></div>' +
    '<div class="rs-full"><label>Benefícios</label><textarea id="f_ben" rows="2">' + esc(pre.beneficios) + '</textarea></div>' +
    '<div><label>Equipamentos</label><input id="f_equip"></div><div><label>EPIs / uniforme</label><input id="f_epis"></div>' +
    '<div><label>Grupo do cargo (define o SLA)</label><select id="f_nivel">' + nv + '</select></div><div><label>SLA (dias úteis)</label><input id="f_sla" type="number" min="1"></div>' +
    '<div><label><input type="checkbox" id="f_dir" style="width:auto"> Exige aprovação da Diretoria</label></div><div><label><input type="checkbox" id="f_sig" style="width:auto"' + (pre.sigilosa ? ' checked' : '') + '> Vaga sigilosa</label></div>' +
    '</div><div class="rs-act"><button class="rs-btn o" id="f_cancel">Cancelar</button><button class="rs-btn" id="f_ok">Criar vaga</button></div>');
  var q = function(i){ return ov.querySelector("#" + i); };
  function nivelSla(){ nivelSla0(); if (typeof checaTeto === "function") checaTeto(); }
  function nivelSla0(){ q("f_sla").value = NIVEIS[q("f_nivel").value]; q("f_dir").checked = NIVEIS_DIRETORIA.indexOf(q("f_nivel").value) >= 0; }
  q("f_nivel").value = nivelSlaPorCargo(pre.cargo); q("f_nivel").addEventListener("change", nivelSla); nivelSla();
  var salEditado = (pre.salario !== undefined && pre.salario !== null && pre.salario !== "");
  q("f_sal").addEventListener("input", function(){ salEditado = true; checaTeto(); });
  function perfis(){
    var c = q("f_cargo").value.trim(); var sel = q("f_perfil"); var atual = sel.value;
    var lst = tabelaRemun().filter(function(r){ return r.funcao === c; }).map(function(r){ return r.nivel; });
    sel.innerHTML = lst.length ? lst.map(function(n){ return '<option>' + esc(n) + '</option>'; }).join("") : '<option value="">(cargo fora da tabela)</option>';
    if (atual && lst.indexOf(atual) >= 0) sel.value = atual;
  }
  var tetoAtual = null;
  function checaTeto(){
    var el = q("f_teto");
    if (!el) { el = document.createElement("div"); el.id = "f_teto"; el.style.cssText = "color:#b45309;font-size:12px;font-weight:600;margin-top:4px"; q("f_leg").parentNode.appendChild(el); }
    var s = Number(String(q("f_sal").value).replace(",", "."));
    var acima = tetoAtual !== null && s > 0 && s > tetoAtual + 0.005;
    if (acima) {
      q("f_dir").checked = true; q("f_dir").disabled = true;
      el.textContent = "Salário acima do teto máximo do cargo (Step IV do maior nível, carga horária máxima: " + tetoAtual.toLocaleString("pt-BR", {style: "currency", currency: "BRL"}) + "): exige aprovação da Diretoria.";
    } else {
      q("f_dir").disabled = false; el.textContent = "";
      q("f_dir").checked = NIVEIS_DIRETORIA.indexOf(q("f_nivel").value) >= 0;
    }
  }
  function salAuto(){
    var c = q("f_cargo").value.trim(), n = q("f_perfil").value, leg = q("f_leg");
    if (typeof remuneracaoInicialPara !== "function") { leg.textContent = ""; tetoAtual = null; checaTeto(); return; }
    var cheio = remuneracaoInicialPara(c, n);
    if (cheio === null || cheio === undefined) { leg.textContent = ""; tetoAtual = null; checaTeto(); return; }
    var base = (typeof baseHorasParaCargo === "function") ? baseHorasParaCargo(c) : 44;
    var carga = Number(q("f_carga").value);
    var prop = (carga && carga > 0) ? cheio * (carga / base) : cheio;
    leg.textContent = "Tabela de remuneração: " + cheio.toLocaleString("pt-BR", {style: "currency", currency: "BRL"}) + " (carga cheia " + base + "h)" + (carga ? " - proporcional a " + carga + "h: " + prop.toLocaleString("pt-BR", {style: "currency", currency: "BRL"}) : "");
    var fator = (carga && carga > 0) ? carga / base : 1; var mx = null; REMUNERACAO_TABLE.forEach(function(r){ if (r.funcao === c) { var v = Math.max(r.stepI, r.stepII, r.stepIII, r.stepIV); if (mx === null || v > mx) mx = v; } }); tetoAtual = (mx === null) ? null : mx; if (!salEditado) q("f_sal").value = prop.toFixed(2); checaTeto();
  }
  q("f_cargo").addEventListener("input", function(){ perfis(); salAuto(); q("f_nivel").value = nivelSlaPorCargo(q("f_cargo").value); nivelSla(); });
  q("f_perfil").addEventListener("change", salAuto); q("f_carga").addEventListener("input", salAuto);
  perfis(); salAuto();
  q("f_cancel").addEventListener("click", function(){ ov.remove(); });
  q("f_ok").addEventListener("click", async function(){
    if (!q("f_cargo").value.trim()) { toast("Informe o cargo.", true); return; }
    var d = { cargo: q("f_cargo").value.trim(), area: q("f_area").value, motivo: q("f_motivo").value, subtipo_motivo: pre.motivo_original || null, colaborador_substituido: q("f_colab").value, gestor_nome: q("f_gestor").value, gestor_email: q("f_gemail").value, solicitante: pre.solicitante || q("f_gestor").value, cliente: q("f_cliente").value, local_trabalho: q("f_local").value, salario: q("f_sal").value ? Number(q("f_sal").value) : null, tipo_valor: q("f_tval").value || null, tipo_contrato: q("f_tcont").value || null, carga_horaria: q("f_carga").value ? Number(q("f_carga").value) : null, modelo_trabalho: q("f_modelo").value, jornada: q("f_jornada").value, requisitos_obrig: q("f_robrig").value, requisitos_dif: q("f_rdif").value, beneficios: q("f_ben").value, equipamentos: q("f_equip").value, epis: q("f_epis").value, sla_dias: Number(q("f_sla").value) || null, exige_diretoria: q("f_dir").checked, sigilosa: q("f_sig").checked, origem: pre.origem || "painel-hml", origem_id: pre.origem_id || null, num_posicoes: Number(q("f_pos").value) || 1 };
    q("f_ok").disabled = true;
    try { await api("POST", null, { acao: "criar_vaga", dados: d }); ov.remove(); toast("Vaga criada. Aguardando aprovação."); carregar(); }
    catch(e){ toast("Erro: " + e.message, true); q("f_ok").disabled = false; }
  });
}

async function detalhe(id, antigo){
  var data;
  try { data = await api("GET", { r: "vaga", id: id }); } catch(e){ toast("Erro: " + e.message, true); return; }
  var tri = {};
  try { (await api("GET", { r: "triagens", vaga_id: id }) || []).forEach(function(x){ tri[x.candidato_id] = x; }); } catch(e){}
  function triCard(c){
    var t = tri[c.candidato_id], h = '<div style="margin:4px 0;font-size:11px">';
    if (t) h += '<span class="rs-pill ' + (t.score >= 70 ? "rs-green" : (t.score >= 45 ? "rs-amber" : "rs-red")) + '">IA ' + Math.round(t.score) + '</span> <a href="#" data-tv="' + esc(c.candidato_id) + '">ver análise</a> · ';
    h += '<a href="#" data-ia="' + esc(c.candidato_id) + '">' + (t ? "refazer IA" : "Triar com IA") + '</a>';
    if (["Aprovado", "Carta Oferta", "Contratado"].indexOf(c.etapa) >= 0) h += ' · <a href="#" data-of="' + esc(c.candidato_id) + '">Carta-oferta</a>';
    return h + '</div>';
  }
  if (antigo) antigo.remove();
  var v = data.vaga, etapas = data.etapas || ETAPAS_FALLBACK, s = sla(v);
  var ordem = ["gestor","coordenador","diretoria"], rot = { gestor: "Gestor", coordenador: "Coordenador (confirma necessidade)", diretoria: "Diretoria" };
  var aprs = data.aprovacoes.slice().sort(function(a,b){ return ordem.indexOf(a.etapa) - ordem.indexOf(b.etapa); });
  var ant = true, aprH = "";
  aprs.forEach(function(a){
    var cls = a.decisao === "Aprovada" ? "rs-green" : (a.decisao === "Recusada" ? "rs-red" : "rs-amber");
    var pode = a.decisao === "Pendente" && ant && v.status === "Aguardando aprovação";
    aprH += '<div class="rs-apr"><b style="min-width:230px">' + rot[a.etapa] + '</b><span class="rs-pill ' + cls + '">' + a.decisao + '</span><span style="flex:1">' + (a.aprovador ? esc(a.aprovador) : '') + (a.comentario ? ' - ' + esc(a.comentario) : '') + '</span>' + (pode ? '<button class="rs-btn" data-d="Aprovada" data-a="' + a.id + '">Aprovar</button><button class="rs-btn r" data-d="Recusada" data-a="' + a.id + '">Recusar</button>' : '') + '</div>';
    if (a.decisao !== "Aprovada") ant = false;
  });
  var posH = data.posicoes.map(function(p){ return '<span class="rs-pill ' + (p.status === "Preenchida" ? "rs-green" : "rs-blue") + '" style="margin-right:6px">Posição ' + p.numero + ': ' + esc(p.status) + '</span>'; }).join("");
  var kb = etapas.map(function(e){
    var cards = data.pipeline.filter(function(c){ return c.etapa === e; }).map(function(c){
      var op = etapas.map(function(x){ return '<option' + (x === c.etapa ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join("");
      return '<div class="rs-card"><b>' + esc(c.nome) + '</b>' + (c.numero ? ' <span style="color:#777">#' + esc(c.numero) + '</span>' : '') + (c.fonte === "publico" ? '<a href="#" data-p="' + esc(c.candidato_id) + '" style="font-size:11px;margin-left:6px">perfil</a>' : '') + triCard(c) + '<select data-c="' + esc(c.candidato_id) + '">' + op + '</select></div>';
    }).join("");
    return '<div class="rs-col"><h5>' + esc(e) + ' (' + data.pipeline.filter(function(c){ return c.etapa === e; }).length + ')</h5>' + cards + '</div>';
  }).join("");
  var campos = [["Área",v.area],["Motivo",v.motivo + (v.colaborador_substituido ? " - " + v.colaborador_substituido : "")],["Solicitante / gestor",v.gestor_nome],["Cliente",v.cliente],["Local",v.local_trabalho],["Salário",v.salario != null ? "R$ " + Number(v.salario).toLocaleString("pt-BR",{minimumFractionDigits:2}) + (v.tipo_valor ? " (" + v.tipo_valor + ")" : "") : ""],["Tipo de contrato",v.tipo_contrato],["Carga horária",v.carga_horaria ? v.carga_horaria + "h/semana" : ""],["Escala / turno",v.jornada],["Modelo",v.modelo_trabalho],["Requisitos obrigatórios",v.requisitos_obrig],["Requisitos diferenciais",v.requisitos_dif],["Benefícios",v.beneficios],["Equipamentos",v.equipamentos],["EPIs",v.epis],["Origem",v.origem === "requisicao-pessoal" ? "Requisição de pessoal" : ""]];
  var cH = campos.filter(function(c){ return c[1]; }).map(function(c){ return '<div><label style="font-size:12px;color:#777">' + c[0] + '</label><div>' + esc(c[1]) + '</div></div>'; }).join("");
  var pubH = '<div class="rs-sec">Publicação na página de vagas</div>' + (v.status === "Aberta" ? '<div style="font-size:13px"><label style="display:inline-flex;gap:6px;align-items:center;margin-right:16px"><input type="checkbox" id="rs_pub"' + (v.publicada ? ' checked' : '') + '> Publicar esta vaga na página pública</label><label style="display:inline-flex;gap:6px;align-items:center"><input type="checkbox" id="rs_cvobr"' + (v.curriculo_obrigatorio ? ' checked' : '') + '> Currículo obrigatório</label>' + (v.publicada && !v.sigilosa ? '<div style="margin-top:6px">Link: <a target="_blank" rel="noopener" href="' + PUB_URL + '?vaga=' + esc(v.id) + '">' + PUB_URL + '?vaga=' + esc(v.id) + '</a></div>' : '') + (v.sigilosa ? '<div style="color:#b45309;margin-top:6px">Vaga sigilosa: não aparece na página pública.</div>' : '') + '</div>' : '<p style="font-size:13px;color:#777">A publicação fica disponível depois da aprovação (vaga Aberta).</p>');
  var ov = overlay('<h3>' + esc(v.codigo) + ' - ' + esc(v.cargo) + ' <span class="rs-pill rs-blue">' + esc(v.status) + '</span> ' + (s ? '<span class="rs-pill ' + s.cls + '">SLA: ' + s.txt + ' (prazo ' + fmtData(s.fim) + ')</span>' : '') + '</h3><div class="rs-grid" style="grid-template-columns:repeat(3,1fr)">' + cH + '</div>' +
    '<div class="rs-sec">Aprovação</div>' + aprH + pubH + '<div class="rs-sec">Posições</div>' + posH +
    '<div class="rs-sec">Candidatos (pipeline)</div>' + (v.status === "Aguardando aprovação" || v.status === "Recusada" ? '<p style="font-size:13px;color:#777">Candidatos só podem ser vinculados após a aprovação da vaga.</p>' : '<div style="display:flex;gap:8px;margin-bottom:8px"><input class="rs-in" id="rs_busca" placeholder="Buscar candidato do banco por nome (mín. 2 letras)"><button class="rs-btn" id="rs_bbtn">Buscar</button></div><div id="rs_res" style="margin-bottom:8px"></div>') +
    '<div class="rs-kb">' + kb + '</div><div class="rs-act"><button class="rs-btn o" id="rs_fecha">Fechar</button></div>');
  ov.querySelector("#rs_fecha").addEventListener("click", function(){ ov.remove(); carregar(); });
  ["rs_pub","rs_cvobr"].forEach(function(i){ var el = ov.querySelector("#" + i); if (el) el.addEventListener("change", async function(){
    try { await api("POST", null, { acao: "publicar_vaga", id: id, publicada: ov.querySelector("#rs_pub").checked, curriculo_obrigatorio: ov.querySelector("#rs_cvobr").checked }); toast("Publicação atualizada."); detalhe(id, ov); }
    catch(e){ toast("Erro: " + e.message, true); }
  }); });
  function candPorId(i){ return data.pipeline.filter(function(x){ return x.candidato_id === i; })[0]; }
  ov.querySelectorAll("a[data-tv]").forEach(function(a){ a.addEventListener("click", function(ev){ ev.preventDefault(); var i = a.getAttribute("data-tv"); triDetalhe(candPorId(i), tri[i]); }); });
  ov.querySelectorAll("a[data-of]").forEach(function(a){ a.addEventListener("click", function(ev){ ev.preventDefault(); cartaOferta(v, candPorId(a.getAttribute("data-of"))); }); });
  ov.querySelectorAll("a[data-ia]").forEach(function(a){ a.addEventListener("click", async function(ev){
    ev.preventDefault(); if (a.getAttribute("data-busy")) return; a.setAttribute("data-busy", "1"); var old = a.textContent; a.textContent = "analisando...";
    try { await api("POST", null, { acao: "triar_candidato", vaga_id: id, candidato_id: a.getAttribute("data-ia") }); toast("Triagem concluída."); detalhe(id, ov); }
    catch(e){ a.textContent = old; a.removeAttribute("data-busy"); toast("Erro: " + e.message, true); }
  }); });
  ov.querySelectorAll("a[data-p]").forEach(function(a){ a.addEventListener("click", function(e){ e.preventDefault(); perfil(a.getAttribute("data-p")); }); });
  ov.querySelectorAll("button[data-a]").forEach(function(b){ b.addEventListener("click", async function(){
    var c = prompt(b.getAttribute("data-d") === "Recusada" ? "Motivo da recusa:" : "Comentário (opcional):") || "";
    try { await api("POST", null, { acao: "decidir", aprovacao_id: b.getAttribute("data-a"), decisao: b.getAttribute("data-d"), comentario: c }); toast("Decisão registrada."); detalhe(id, ov); }
    catch(e){ toast("Erro: " + e.message, true); }
  }); });
  ov.querySelectorAll("select[data-c]").forEach(function(sel){ sel.addEventListener("change", async function(){
    try { await api("POST", null, { acao: "mover_candidato", vaga_id: id, candidato_id: sel.getAttribute("data-c"), para_etapa: sel.value }); if (sel.value === "Contratado") await aoContratar(v, candPorId(sel.getAttribute("data-c"))); detalhe(id, ov); }
    catch(e){ toast("Erro: " + e.message, true); }
  }); });
  var bb = ov.querySelector("#rs_bbtn");
  if (bb) bb.addEventListener("click", async function(){
    var r = ov.querySelector("#rs_res"); r.innerHTML = "Buscando...";
    try {
      var lst = await api("GET", { r: "buscar-candidatos", q: ov.querySelector("#rs_busca").value });
      r.innerHTML = lst.length ? lst.map(function(c){ return '<div class="rs-apr"><span style="flex:1">' + esc(c.name) + ' <span style="color:#777">#' + esc(c.candidate_number) + '</span></span><button class="rs-btn" data-v="' + esc(c.id) + '">Vincular</button></div>'; }).join("") : "Nenhum resultado.";
      r.querySelectorAll("button[data-v]").forEach(function(b){ b.addEventListener("click", async function(){
        try { await api("POST", null, { acao: "vincular_candidato", vaga_id: id, candidato_id: b.getAttribute("data-v") }); detalhe(id, ov); }
        catch(e){ toast("Erro: " + e.message, true); }
      }); });
    } catch(e){ r.innerHTML = '<span style="color:#b02a2a">' + esc(e.message) + '</span>'; }
  });
}

css();
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar); else montar();
setInterval(montar, 1500);
console.log("rs_module carregado v4");

/* ===== Fase 2: perfil do candidato e Banco de Talentos ===== */
function fmtDT(s){ try { return new Date(s).toLocaleDateString("pt-BR"); } catch(e){ return ""; } }
function modalTxt(titulo, html){
  var ov = document.createElement("div"); ov.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px";
  ov.innerHTML = '<div style="background:#fff;border-radius:10px;max-width:560px;width:100%;max-height:90vh;overflow:auto;padding:18px;font:14px Arial,sans-serif;color:#222"><h3 style="margin:0 0 10px">' + esc(titulo) + '</h3>' + html + '<div style="text-align:right;margin-top:14px"><button class="rs-btn" data-x="1">Fechar</button></div></div>';
  document.body.appendChild(ov);
  ov.querySelector("[data-x]").addEventListener("click", function(){ ov.remove(); });
  return ov;
}
function lista(a){ return (a || []).map(function(x){ return "<li>" + esc(x) + "</li>"; }).join(""); }
function triDetalhe(c, t){
  modalTxt("Triagem por IA - " + c.nome,
    '<p><b>Nota ' + Math.round(t.score) + '/100</b> (técnica ' + (t.score_tecnico != null ? Math.round(t.score_tecnico) : "-") + ', comportamental ' + (t.score_comportamental != null ? Math.round(t.score_comportamental) : "-") + ') - <b>' + esc(t.recomendacao) + '</b></p>' +
    '<p>' + esc(t.resumo) + '</p><b>Pontos fortes</b><ul>' + lista(t.fortes) + '</ul><b>Lacunas / riscos</b><ul>' + lista(t.lacunas) + '</ul>' +
    '<p style="font-size:11px;color:#777">Apoio à decisão: a avaliação é sempre do RH. Base: ' + esc(t.fonte_dados || "-") + (t.por ? " - por " + esc(t.por) : "") + ".</p>");
}
function carregarDocx(){
  return new Promise(function(res, rej){
    if (window.docx && window.docx.Packer) return res(window.docx);
    var sc = document.createElement("script"); sc.src = "https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js";
    sc.onload = function(){ res(window.docx); }; sc.onerror = function(){ rej(new Error("Não foi possível carregar o gerador de Word.")); };
    document.head.appendChild(sc);
  });
}
function dataExt(iso){ if (!iso) return ""; var p = iso.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }); }
function cartaOferta(v, c){
  var d7 = new Date(); d7.setDate(d7.getDate() + 7); var val = d7.getFullYear() + "-" + ("0" + (d7.getMonth() + 1)).slice(-2) + "-" + ("0" + d7.getDate()).slice(-2);
  var inp = "width:100%;box-sizing:border-box;padding:6px;margin:2px 0 8px;border:1px solid #ccc;border-radius:6px";
  var f = function(id, rot, val2, tipo){ return '<label style="font-size:12px;color:#555">' + rot + '</label><input id="' + id + '" type="' + (tipo || "text") + '" value="' + esc(val2 == null ? "" : val2) + '" style="' + inp + '">'; };
  var ov = modalTxt("Carta-oferta - " + c.nome,
    f("of_cargo", "Cargo", v.cargo) + f("of_sal", "Remuneração mensal (R$)", v.salario, "number") + f("of_contrato", "Tipo de contrato", v.tipo_contrato || "CLT") +
    f("of_carga", "Carga horária (h/semana)", v.carga_horaria) + f("of_escala", "Escala / turno", v.jornada) + f("of_local", "Local de trabalho", v.local_trabalho) +
    '<label style="font-size:12px;color:#555">Benefícios</label><textarea id="of_benef" rows="3" style="' + inp + '">' + esc(v.beneficios || "") + '</textarea>' +
    f("of_inicio", "Data prevista de início", "", "date") + f("of_valid", "Proposta válida até", val, "date") + f("of_resp", "Assinatura (nome do RH)", "") +
    '<button class="rs-btn" id="of_go">Gerar Word (.docx)</button> ');
  ov.querySelector("#of_go").addEventListener("click", async function(){
    var g = function(i){ return ov.querySelector("#" + i).value.trim(); };
    if (!g("of_sal") || !g("of_inicio")) { toast("Informe a remuneração e a data de início.", true); return; }
    try {
      var D = await carregarDocx();
      var sal = "R$ " + Number(g("of_sal")).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + " mensais" + (v.tipo_valor ? " (" + String(v.tipo_valor).toLowerCase() + ")" : "");
      var P = function(t, o){ o = o || {}; return new D.Paragraph({ alignment: o.al, spacing: { after: o.after == null ? 160 : o.after }, children: [new D.TextRun({ text: t, bold: !!o.b, size: o.size || 22, color: o.cor, font: "Arial" })] }); };
      var linhas = [["Cargo", g("of_cargo")], ["Área", v.area || ""], ["Tipo de contrato", g("of_contrato")], ["Remuneração", sal], ["Carga horária", g("of_carga") ? g("of_carga") + " horas semanais" : ""], ["Escala / turno", g("of_escala")], ["Local de trabalho", g("of_local")], ["Benefícios", g("of_benef")], ["Data prevista de início", dataExt(g("of_inicio"))]].filter(function(x){ return x[1]; });
      var borda = { style: D.BorderStyle.SINGLE, size: 4, color: "BBBBBB" };
      var bordas = { top: borda, bottom: borda, left: borda, right: borda };
      var cel = function(t, w, b){ return new D.TableCell({ width: { size: w, type: D.WidthType.DXA }, borders: bordas, margins: { top: 80, bottom: 80, left: 120, right: 120 }, shading: b ? { type: D.ShadingType.CLEAR, fill: "F3E8EA" } : undefined, children: [P(t, { b: b, after: 0, size: 21 })] }); };
      var tab = new D.Table({ width: { size: 9026, type: D.WidthType.DXA }, columnWidths: [2800, 6226], rows: linhas.map(function(x){ return new D.TableRow({ children: [cel(x[0], 2800, true), cel(x[1], 6226, false)] }); }) });
      var hoje = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
      var doc = new D.Document({ sections: [{ properties: {}, children: [
        P("ElevaLife", { b: true, size: 32, cor: "7A1F2B", after: 60 }), P("CARTA-OFERTA", { b: true, size: 26, after: 300 }),
        P(hoje, { al: D.AlignmentType.RIGHT, after: 300 }),
        P("Prezado(a) " + c.nome + ",", { b: true }),
        P("É com satisfação que a ElevaLife formaliza o convite para você integrar o nosso time. Ao final do processo seletivo, você foi aprovado(a) para a posição abaixo, nas seguintes condições:", { al: D.AlignmentType.JUSTIFIED }),
        tab, P("", { after: 120 }),
        P("A efetivação está condicionada à entrega da documentação admissional e à aprovação nos exames exigidos. Esta proposta é válida até " + dataExt(g("of_valid")) + "; após essa data, será necessária nova confirmação.", { al: D.AlignmentType.JUSTIFIED }),
        P("Para aceitar, basta assinar abaixo e devolver este documento ao RH. Estamos à disposição para esclarecer qualquer dúvida.", { al: D.AlignmentType.JUSTIFIED, after: 400 }),
        P("Atenciosamente,", { after: 500 }),
        P("______________________________", { after: 40 }), P(g("of_resp") || "Recursos Humanos", { b: true, after: 0 }), P("ElevaLife", { after: 400 }),
        P("De acordo em ____/____/______", { after: 500 }), P("______________________________", { after: 40 }), P(c.nome, { b: true, after: 300 }),
        P("Minuta gerada pelo painel em ambiente de homologação - sujeita à validação do DP/Jurídico.", { size: 16, cor: "888888" })
      ] }] });
      var blob = await D.Packer.toBlob(doc);
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = ("Carta-oferta_" + c.nome + "_" + g("of_cargo")).replace(/[^A-Za-z0-9À-ÿ_-]+/g, "_") + ".docx";
      document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      toast("Carta-oferta gerada.");
    } catch(e){ toast("Erro: " + e.message, true); }
  });
}
async function perfil(id, aoFechar){
  var c;
  try { c = await api("GET", { r: "candidato", id: id }); } catch(e){ toast("Erro: " + e.message, true); return; }
  var ini = String(c.nome || "?").trim().split(/\s+/).slice(0, 2).map(function(p){ return p.charAt(0).toUpperCase(); }).join("");
  var txt = String(c.resumo || "");
  var etapaM = txt.match(/Etapa RecrutaHub:\s*([^|]+?)\s*(\||$)/); var etapa = etapaM ? etapaM[1] : "";
  var notaM = txt.match(/Pontua[^:]*:\s*([\d.,]+)/); var nota = notaM ? notaM[1] : "";
  var partes = txt.split(/\s*---\s*Acompanhamento\s*---\s*/);
  var obs = String(partes[0] || "").replace(/Etapa RecrutaHub:[^|]*\|?/, "").replace(/Pontua[^:]*:\s*[\d.,]+\s*\|?/, "").replace(/^[\s|]+|[\s|]+$/g, "");
  var acomp = []; var ac = String(partes[1] || "");
  if (ac) {
    var labs = ["Data da entrevista", "Responsável entrevista", "Prioridade", "Fonte de Recrutamento", "Cidade", "Estado"];
    var pos = labs.map(function(l){ return { l: l, i: ac.indexOf(l + ":") }; }).filter(function(x){ return x.i >= 0; }).sort(function(x, y){ return x.i - y.i; });
    pos.forEach(function(x, k){ var ini2 = x.i + x.l.length + 1; var fim = k + 1 < pos.length ? pos[k + 1].i : ac.length; var val = ac.slice(ini2, fim).trim(); if (x.l === "Data da entrevista") { var dm = val.match(/^(\d{4})-(\d{2})-(\d{2})T?(\d{2})?:?(\d{2})?/); if (dm) val = dm[3] + "/" + dm[2] + "/" + dm[1] + (dm[4] ? " às " + dm[4] + ":" + dm[5] : ""); } if (val) acomp.push([x.l, val]); });
  }
  var av = null; try { av = avalDe(c); } catch(e){}
  var emailOk = c.email && !/sem-email\.invalid$/.test(c.email) ? c.email : "";
  var origemTxt = c.origem === "recrutahub" ? "RecrutaHub (migrado)" : (c.origem === "publico" || !c.origem ? "Página pública" : c.origem);
  function item(l, v){ return v ? '<div class="rp-it"><span>' + l + '</span><b>' + esc(v) + '</b></div>' : ""; }
  function card(tit, corpo){ return corpo ? '<div class="rp-card"><h4>' + tit + '</h4>' + corpo + '</div>' : ""; }
  var pretensao = c.pretensao ? Number(c.pretensao).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "";
  var css = '<style>.rp-hd{display:flex;align-items:center;gap:14px;background:linear-gradient(135deg,#6e1423,#4d0e19);color:#fff;border-radius:12px;padding:16px 18px;margin-bottom:14px}.rp-av{width:54px;height:54px;border-radius:50%;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;flex:none}.rp-hd h3{margin:0;font-size:19px;color:#fff}.rp-sub{font-size:13px;opacity:.85;margin-top:2px}.rp-tags{margin-left:auto;display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.rp-tag{background:rgba(255,255,255,.16);border-radius:99px;padding:3px 10px;font-size:12px;font-weight:600}.rp-tag.ok{background:#e6f4ea;color:#1e7d38}.rp-tag.no{background:#fde8e8;color:#b02a2a}.rp-k{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}.rp-kc{background:#fbeef0;border-radius:10px;padding:10px 12px}.rp-kc span{display:block;font-size:11px;color:#6b6f76;text-transform:uppercase;letter-spacing:.4px}.rp-kc b{display:block;font-size:17px;color:#6e1423;margin-top:2px}.rp-g{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.rp-card{background:#fff;border:1px solid #e5e6e9;border-radius:10px;padding:12px 14px}.rp-card.full{grid-column:1/-1}.rp-card h4{margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#6e1423}.rp-it{display:flex;justify-content:space-between;gap:12px;padding:5px 0;border-bottom:1px solid #f0f1f3;font-size:13px}.rp-it:last-child{border-bottom:0}.rp-it span{color:#6b6f76}.rp-it b{font-weight:600;text-align:right;word-break:break-word}.rp-p{font-size:13px;line-height:1.5;color:#1f2124;margin:0;white-space:pre-wrap}@media(max-width:640px){.rp-k,.rp-g{grid-template-columns:1fr}.rp-hd{flex-wrap:wrap}.rp-tags{margin-left:0}}</style>';
  var tags = '<span class="rp-tag">' + esc(origemTxt) + '</span>' + (c.banco_talentos ? '<span class="rp-tag">Banco de talentos</span>' : '') + (av && av.decisao && !av.oculto ? '<span class="rp-tag ' + (av.decisao === "Aprovado" ? "ok" : "no") + '">' + esc(av.decisao) + (av.coordenador ? " — " + esc(av.coordenador) : "") + '</span>' : "");
  var h = css + '<div class="rp-hd"><div class="rp-av">' + esc(ini) + '</div><div><h3>' + esc(c.nome) + '</h3><div class="rp-sub">' + esc([c.cargo_interesse, c.area_interesse].filter(Boolean).join(" · ")) + '</div></div><div class="rp-tags">' + tags + '</div></div>' +
    '<div class="rp-k"><div class="rp-kc"><span>Pontuação</span><b>' + esc(nota || "-") + '</b></div><div class="rp-kc"><span>Etapa</span><b>' + esc(etapa || "-") + '</b></div><div class="rp-kc"><span>Entrada</span><b>' + esc(fmtDT(c.criado_em)) + '</b></div><div class="rp-kc"><span>Pretensão</span><b>' + esc(pretensao || "-") + '</b></div></div>' +
    '<div class="rp-g">' +
    card("Contato", item("E-mail", emailOk) + item("Telefone", c.telefone) + item("Cidade", [c.cidade, c.uf].filter(Boolean).join(" - ")) + item("LinkedIn", c.linkedin)) +
    card("Interesse", item("Cargo", c.cargo_interesse) + item("Área", c.area_interesse) + item("Pretensão salarial", pretensao)) +
    card("Acompanhamento", acomp.map(function(x){ return item(x[0], x[1]); }).join("")) +
    card("Consentimento (LGPD)", '<p class="rp-p">Ciência do aviso em ' + esc(fmtDT(c.consentimento_em)) + (c.consentimento_versao ? " (" + esc(c.consentimento_versao) + ")" : "") + (c.banco_talentos ? ". Autorizou o banco de talentos." : ". Não autorizou o banco de talentos.") + '</p>') +
    (obs ? '<div class="rp-card full"><h4>Observações</h4><p class="rp-p">' + esc(obs) + '</p></div>' : "") +
    '</div>' +
    '<div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">' + (c.tem_curriculo ? '<button class="rs-btn" id="rp_cv">Abrir currículo</button>' : '<span style="font-size:13px;color:#777">Sem currículo anexado.</span>') + '<button class="rs-btn" id="rp_del" style="color:#b02a2a">Excluir dados (LGPD)</button><button class="rs-btn" id="rp_x" style="margin-left:auto">Fechar</button></div>';
    var ov = overlay(h);
  ov.querySelector("#rp_x").addEventListener("click", function(){ ov.remove(); });
  var cv = ov.querySelector("#rp_cv");
  if (cv) cv.addEventListener("click", async function(){ try { var r = await fetch(RS_URL + "?r=curriculo-url&id=" + encodeURIComponent(id), { headers: { "x-painel-secret": RECRUTAHUB_API_SECRET } }); var j = await r.json(); if (!r.ok) throw new Error(j.error || "erro"); window.open(j.url, "_blank", "noopener"); } catch(e){ toast("Erro: " + e.message, true); } });
  ov.querySelector("#rp_del").addEventListener("click", async function(){
    if (!confirm("Excluir definitivamente os dados e o currículo de " + c.nome + "? Esta ação não pode ser desfeita.")) return;
    try { await api("POST", null, { acao: "excluir_candidato", id: id }); toast("Dados excluídos."); ov.remove(); if (aoFechar) aoFechar(); } catch(e){ toast("Erro: " + e.message, true); }
  });
}

async function vincularBanco(cand){
  var abertas = [];
  try { abertas = (await api("GET", { r: "vagas" })).filter(function(v){ return v.status === "Aberta"; }); } catch(e){ toast("Erro: " + e.message, true); return; }
  if (!abertas.length) { toast("Não há vagas Abertas para vincular.", true); return; }
  var ov = overlay('<h3>Vincular ' + esc(cand.nome) + ' a uma vaga</h3><select id="rv_v" style="width:100%">' + abertas.map(function(v){ return '<option value="' + esc(v.id) + '">' + esc(v.codigo + " - " + v.cargo) + '</option>'; }).join("") + '</select><div style="margin-top:14px;display:flex;gap:8px"><button class="rs-btn rs-primary" id="rv_ok">Vincular</button><button class="rs-btn" id="rv_x">Cancelar</button></div>');
  ov.querySelector("#rv_x").addEventListener("click", function(){ ov.remove(); });
  ov.querySelector("#rv_ok").addEventListener("click", async function(){
    try { await api("POST", null, { acao: "vincular_candidato", vaga_id: ov.querySelector("#rv_v").value, candidato_id: cand.id }); toast("Candidato vinculado à vaga."); ov.remove(); }
    catch(e){ toast("Erro: " + e.message, true); }
  });
}

var talentos = [];
async function buscarBanco(){
  var box = document.getElementById("rtLista"); if (!box) return;
  box.innerHTML = '<p style="color:#777">Buscando...</p>';
  var p = { r: "talentos", q: document.getElementById("rtQ").value.trim(), cargo: document.getElementById("rtCargo").value.trim(), cidade: document.getElementById("rtCidade").value.trim() };
  var f = document.getElementById("rtFonte").value; if (f) p.fonte = f;
  try { talentos = await api("GET", p); } catch(e){ box.innerHTML = '<span style="color:#b02a2a">' + esc(e.message) + '</span>'; return; }
  try { if (typeof loadTalentAvaliacoes === "function") await loadTalentAvaliacoes(true); } catch(e){}
  if (!talentos.length) { box.innerHTML = '<p style="color:#777">Nenhum candidato encontrado.</p>'; return; }
  box.innerHTML = '<div style="font-size:12px;color:#777;margin-bottom:6px">' + (window.__rsTotal != null ? (talentos.length + ' exibido(s) de ' + window.__rsTotal + ' candidato(s) no banco' + (window.__rsTotal > talentos.length ? ' (mostrando os mais recentes; refine a busca)' : '')) : (talentos.length + ' resultado(s)')) + '</div><table class="rs-tbl"><thead><tr><th>Nome</th><th>Cargo / área</th><th>Cidade</th><th>Contato</th><th>Origem</th><th>Entrada</th><th>Avaliação</th><th></th></tr></thead><tbody>' +
    talentos.map(function(c, i){ return '<tr><td><b>' + esc(c.nome) + '</b>' + (c.numero ? ' <span style="color:#777">#' + esc(c.numero) + '</span>' : '') + (c.etapa ? '<div style="font-size:11px;color:#777">' + esc(c.etapa) + '</div>' : '') + '</td><td>' + esc([c.cargo, c.area].filter(Boolean).join(" / ")) + '</td><td>' + esc(c.cidade || "") + '</td><td>' + esc([c.email, c.telefone].filter(Boolean).join(" · ")) + '</td><td>' + (c.fonte === "publico" ? ((c.origem_ids && c.origem_ids.length) ? '<span class="rs-pill rs-blue">RecrutaHub (migrado)</span>' : '<span class="rs-pill rs-green">P\u00e1gina p\u00fablica</span>') : '<span class="rs-pill rs-blue">RecrutaHub atual</span>') + '</td><td>' + fmtDT(c.criado_em) + '</td><td>' + avalCelula(c) + '</td><td style="white-space:nowrap">' + (c.fonte === "publico" ? '<button class="rs-btn" data-pf="' + i + '">Perfil</button> ' : '') + '<button class="rs-btn o" data-av="' + i + '">Avaliar</button> <button class="rs-btn" data-vc="' + i + '">Vincular</button></td></tr>'; }).join("") + '</tbody></table>';
  box.querySelectorAll("button[data-pf]").forEach(function(b){ b.addEventListener("click", function(){ perfil(talentos[Number(b.getAttribute("data-pf"))].id, buscarBanco); }); });
  box.querySelectorAll("button[data-av]").forEach(function(b){ b.addEventListener("click", function(){ avaliarCand(talentos[Number(b.getAttribute("data-av"))], buscarBanco); }); });
  box.querySelectorAll("button[data-vc]").forEach(function(b){ b.addEventListener("click", function(){ vincularBanco(talentos[Number(b.getAttribute("data-vc"))]); }); });
}

function montarBanco(){
  if (document.getElementById("rtTab") && document.getElementById("panel-rt")) return;
  ["rtTab","panel-rt"].forEach(function(i){ var e = document.getElementById(i); if (e) e.remove(); });
  var tabs = document.querySelector(".sidebar nav.tabs"), rs = document.getElementById("rsTab"), ref = document.getElementById("panel-ajuda");
  if (!tabs || !rs || !ref || rs.style.display === "none") return;
  var tab = document.createElement("div"); tab.className = "tab tab-sub"; tab.id = "rtTab"; tab.setAttribute("data-tab","rt");
  tab.innerHTML = '<span class="tab-icon">&#128269;</span>Talentos R&S';
  tabs.insertBefore(tab, rs.nextSibling);
  var painel = document.createElement("div"); painel.className = "panel"; painel.id = "panel-rt";
  painel.innerHTML = '<div class="kanban-header"><h2>Talentos R&S</h2></div><div style="padding:0 4px 10px;font-size:13px;color:#555">Candidatos da página pública que autorizaram o banco de talentos e candidatos do RecrutaHub atual.</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"><input id="rtQ" placeholder="Busca livre (nome, e-mail, palavra-chave)" style="flex:2;min-width:220px"><input id="rtCargo" placeholder="Cargo / área" style="flex:1;min-width:140px"><input id="rtCidade" placeholder="Cidade" style="flex:1;min-width:120px"><select id="rtFonte"><option value="">Todas as origens</option><option value="publico">Página pública</option><option value="recrutahub">RecrutaHub atual</option></select><button class="rs-btn rs-primary" id="rtBuscar">Buscar</button></div><div id="rtLista"></div>';
  ref.parentNode.insertBefore(painel, ref);
  tab.addEventListener("click", function(){ document.querySelectorAll(".tab").forEach(function(x){ x.classList.remove("active"); }); document.querySelectorAll(".panel").forEach(function(x){ x.classList.remove("active"); }); tab.classList.add("active"); painel.classList.add("active"); var cb = document.getElementById("clientbarWrap"); if (cb) cb.style.display = "none"; buscarBanco(); });
  document.getElementById("rtBuscar").addEventListener("click", buscarBanco);
  ["rtQ","rtCargo","rtCidade"].forEach(function(i){ document.getElementById(i).addEventListener("keydown", function(e){ if (e.key === "Enter") buscarBanco(); }); });
}
setInterval(montarBanco, 1500);

/* ===== Fase 4: admissão e onboarding ===== */
var RS_NOTIFICA_DP_REAL = true; /* producao: aviso vai ao DP */
var GRUPOS_ADM = [["documentos","Documentos admissionais"],["exame_epi","Exame admissional e EPIs"],["onboarding","Onboarding (1º dia, 30/60/90 dias)"]];
var DP_EMAIL_REAL = "gabrielepaes@elevalife.com.br"; /* e-mail real do DP; usado quando RS_NOTIFICA_DP_REAL = true (produção) */
function dpEmail(){ return DP_EMAIL_REAL; }
async function avisarDP(adm, v){
  try {
    if (typeof graphFetch !== "function") return false;
    var dest = RS_NOTIFICA_DP_REAL ? dpEmail() : usuario();
    if (!dest) return false;
    var html = "<p>Olá,</p><p>Um candidato foi marcado como <b>Contratado</b> no módulo de Recrutamento e Seleção" + (RS_NOTIFICA_DP_REAL ? "" : " (<b>HOMOLOGAÇÃO</b> - aviso enviado apenas a você; em produção seguirá ao DP)") + ":</p><ul><li><b>Candidato:</b> " + esc(adm.nome) + "</li><li><b>Cargo:</b> " + esc(adm.cargo) + "</li><li><b>Vaga:</b> " + esc(v.codigo) + (v.cliente ? " - " + esc(v.cliente) : "") + "</li></ul><p>A admissão foi aberta no painel com o checklist de documentos, exame/EPIs e onboarding.</p>";
    await graphFetch("https://graph.microsoft.com/v1.0/me/sendMail", { method: "POST", body: JSON.stringify({ message: { subject: "[Painel ElevaLife] Admissão aberta: " + adm.nome, body: { contentType: "HTML", content: html }, toRecipients: [{ emailAddress: { address: dest } }] }, saveToSentItems: true }) });
    return true;
  } catch(e){ console.warn("aviso DP", e); return false; }
}
async function aoContratar(v, c){
  try {
    var r = await api("POST", null, { acao: "iniciar_admissao", vaga_id: v.id, candidato_id: c.candidato_id, fonte: c.fonte, nome: c.nome, cargo: v.cargo });
    if (r && r.ja_existia) { toast("Admissão já estava aberta."); return; }
    var ok = await avisarDP(r, v);
    toast("Admissão aberta. " + (ok ? "DP avisado por e-mail." : "Não foi possível enviar o e-mail ao DP (entre com a conta Microsoft)."));
  } catch(e){ toast("Erro ao abrir admissão: " + e.message, true); }
}
function dataMais(iso, dias){ if (!iso || dias == null) return null; var p = iso.split("-"); var d = new Date(+p[0], +p[1] - 1, +p[2]); d.setDate(d.getDate() + dias); return d; }
function progresso(itens, g){ var l = itens.filter(function(i){ return !g || i.grupo === g; }); var f = l.filter(function(i){ return i.concluido; }).length; return { f: f, t: l.length }; }
var adms = [];
async function carregarAdm(){
  var box = document.getElementById("adLista"); if (!box) return;
  box.innerHTML = '<p style="color:#777">Carregando...</p>';
  try { adms = await api("GET", { r: "admissoes" }); } catch(e){ box.innerHTML = '<span style="color:#b02a2a">' + esc(e.message) + '</span>'; return; }
  if (!adms.length) { box.innerHTML = '<p style="color:#777">Nenhuma admissão aberta. Elas são abertas automaticamente quando um candidato é movido para "Contratado" na vaga.</p>'; return; }
  box.innerHTML = '<table class="rs-tbl"><thead><tr><th>Candidato</th><th>Cargo</th><th>Início</th><th>Documentos</th><th>Exame / EPIs</th><th>Onboarding</th><th>Status</th><th></th></tr></thead><tbody>' + adms.map(function(a){
    var p = function(g){ var x = progresso(a.itens || [], g); return '<span class="rs-pill ' + (x.t && x.f === x.t ? "rs-green" : "rs-amber") + '">' + x.f + '/' + x.t + '</span>'; };
    return '<tr><td><b>' + esc(a.nome) + '</b></td><td>' + esc(a.cargo) + '</td><td>' + (a.data_inicio ? fmtData(dataMais(a.data_inicio, 0)) : '<span style="color:#b45309">definir</span>') + '</td><td>' + p("documentos") + '</td><td>' + p("exame_epi") + '</td><td>' + p("onboarding") + '</td><td>' + esc(a.status) + '</td><td><button class="rs-btn o" data-ad="' + esc(a.id) + '">Abrir</button></td></tr>';
  }).join("") + '</tbody></table>';
  box.querySelectorAll("button[data-ad]").forEach(function(b){ b.addEventListener("click", function(){ detalheAdm(b.getAttribute("data-ad")); }); });
}
async function detalheAdm(id, antigo){
  var a;
  try { a = await api("GET", { r: "admissao", id: id }); } catch(e){ toast("Erro: " + e.message, true); return; }
  if (antigo) antigo.remove();
  var itens = (a.itens || []).sort(function(x, y){ return x.ordem - y.ordem; });
  var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  var h = '<h3>Admissão - ' + esc(a.nome) + ' <span class="rs-pill rs-blue">' + esc(a.status) + '</span></h3><div style="font-size:13px;margin-bottom:8px">' + esc(a.cargo) + ' &nbsp; Data de início: <input type="date" id="ad_ini" value="' + esc(a.data_inicio || "") + '" style="padding:5px;border:1px solid var(--border);border-radius:6px"> <span style="color:#777">Os prazos dos itens são calculados a partir desta data.</span></div>';
  GRUPOS_ADM.forEach(function(g){
    var p = progresso(itens, g[0]);
    h += '<div class="rs-sec">' + g[1] + ' (' + p.f + '/' + p.t + ')</div>';
    itens.filter(function(i){ return i.grupo === g[0]; }).forEach(function(i){
      var pz = dataMais(a.data_inicio, i.prazo_dias), atr = pz && !i.concluido && pz < hoje;
      h += '<div class="rs-apr"><label style="flex:1;display:flex;gap:8px;align-items:center;cursor:pointer"><input type="checkbox" data-it="' + esc(i.id) + '"' + (i.concluido ? " checked" : "") + '> <span' + (i.concluido ? ' style="text-decoration:line-through;color:#777"' : "") + '>' + esc(i.titulo) + '</span></label>' + (pz ? '<span class="rs-pill ' + (i.concluido ? "rs-green" : (atr ? "rs-red" : "rs-gray")) + '">' + (i.concluido ? "feito" : (atr ? "atrasado " : "até ")) + (i.concluido ? "" : fmtData(pz)) + '</span>' : '') + (i.concluido_por ? '<span style="font-size:11px;color:#777">' + esc(i.concluido_por) + '</span>' : '') + '</div>';
    });
  });
  var tot = progresso(itens);
  h += '<div class="rs-act"><span style="margin-right:auto;font-size:13px">Progresso geral: <b>' + tot.f + '/' + tot.t + '</b></span>' + (a.status !== "Concluída" ? '<button class="rs-btn" id="ad_fin">Concluir admissão</button>' : '') + '<button class="rs-btn o" id="ad_x">Fechar</button></div>';
  var ov = overlay(h);
  ov.querySelector("#ad_x").addEventListener("click", function(){ ov.remove(); carregarAdm(); });
  ov.querySelector("#ad_ini").addEventListener("change", async function(e){ try { await api("POST", null, { acao: "atualizar_admissao", id: id, data_inicio: e.target.value }); detalheAdm(id, ov); } catch(er){ toast("Erro: " + er.message, true); } });
  var fin = ov.querySelector("#ad_fin"); if (fin) fin.addEventListener("click", async function(){ try { await api("POST", null, { acao: "atualizar_admissao", id: id, status: "Concluída" }); detalheAdm(id, ov); } catch(er){ toast("Erro: " + er.message, true); } });
  ov.querySelectorAll("input[data-it]").forEach(function(cb){ cb.addEventListener("change", async function(){ try { await api("POST", null, { acao: "atualizar_item", id: cb.getAttribute("data-it"), concluido: cb.checked }); detalheAdm(id, ov); } catch(er){ toast("Erro: " + er.message, true); cb.checked = !cb.checked; } }); });
}
function montarAdm(){
  if (document.getElementById("adTab") && document.getElementById("panel-ad")) return;
  ["adTab","panel-ad"].forEach(function(i){ var e = document.getElementById(i); if (e) e.remove(); });
  var tabs = document.querySelector(".sidebar nav.tabs"), ref = document.getElementById("panel-ajuda"), prev = document.getElementById("rtTab") || document.getElementById("rsTab");
  if (!tabs || !prev || !ref || prev.style.display === "none") return;
  var tab = document.createElement("div"); tab.className = "tab tab-sub"; tab.id = "adTab"; tab.setAttribute("data-tab","ad");
  tab.innerHTML = '<span class="tab-icon">&#128221;</span>Admissões';
  tabs.insertBefore(tab, prev.nextSibling);
  var painel = document.createElement("div"); painel.className = "panel"; painel.id = "panel-ad";
  painel.innerHTML = '<div class="kanban-header"><h2>Admissões e onboarding</h2></div><div style="padding:0 4px 10px;font-size:13px;color:#555">Candidatos contratados: documentos admissionais, exame e EPIs, onboarding de 1º dia, 30, 60 e 90 dias.</div><div id="adLista"></div>';
  ref.parentNode.insertBefore(painel, ref);
  tab.addEventListener("click", function(){ document.querySelectorAll(".tab").forEach(function(x){ x.classList.remove("active"); }); document.querySelectorAll(".panel").forEach(function(x){ x.classList.remove("active"); }); tab.classList.add("active"); painel.classList.add("active"); var cb = document.getElementById("clientbarWrap"); if (cb) cb.style.display = "none"; carregarAdm(); });
}
setInterval(montarAdm, 1500);

/* ===== Fase 4: indicadores de R&S e unificação do Banco de Talentos ===== */
async function carregarIndOld(){
  var box = document.getElementById("inLista"); if (!box) return;
  box.innerHTML = '<p style="color:#777">Calculando...</p>';
  var vs, ads, pipes = [], tris = 0;
  try {
    vs = await api("GET", { r: "vagas" }); ads = await api("GET", { r: "admissoes" });
    var ativas = vs.filter(function(v){ return v.status === "Aberta" || v.status === "Preenchida"; });
    for (var i = 0; i < ativas.length; i++){ try { var d = await api("GET", { r: "vaga", id: ativas[i].id }); pipes.push({ v: ativas[i], p: d.pipeline || [], mov: d.movimentos || [] }); var t = await api("GET", { r: "triagens", vaga_id: ativas[i].id }); tris += (t || []).length; } catch(e){} }
  } catch(e){ box.innerHTML = '<span style="color:#b02a2a">' + esc(e.message) + '</span>'; return; }
  var por = function(st){ return vs.filter(function(v){ return v.status === st; }).length; };
  var comSla = vs.filter(function(v){ return sla(v); }), venc = comSla.filter(function(v){ return sla(v).rest < 0; }).length;
  var noPrazo = comSla.length ? Math.round(100 * (comSla.length - venc) / comSla.length) : null;
  var pos = 0, pre = 0; vs.forEach(function(v){ if (v.status !== "Recusada" && v.posicoes){ pos += v.posicoes.total; pre += v.posicoes.preenchidas; } });
  var etapas = ETAPAS_FALLBACK, cont = {}; etapas.forEach(function(e){ cont[e] = 0; });
  var totCand = 0; pipes.forEach(function(x){ x.p.forEach(function(c){ cont[c.etapa] = (cont[c.etapa] || 0) + 1; totCand++; }); });
  var adAnd = ads.filter(function(a){ return a.status !== "Concluída"; }).length, adFim = ads.length - adAnd;
  var itTot = 0, itOk = 0; ads.forEach(function(a){ (a.itens || []).forEach(function(i){ itTot++; if (i.concluido) itOk++; }); });
  var k = function(t, v){ return '<div class="rs-kpi"><b>' + v + '</b>' + t + '</div>'; };
  var max = Math.max.apply(null, etapas.map(function(e){ return cont[e] || 0; }).concat([1]));
  var funil = etapas.map(function(e){ var n = cont[e] || 0; return '<div style="display:flex;align-items:center;gap:8px;margin:4px 0;font-size:13px"><span style="width:140px">' + esc(e) + '</span><div style="flex:1;background:#f0f0f2;border-radius:6px"><div style="width:' + Math.round(100 * n / max) + '%;min-width:' + (n ? 4 : 0) + 'px;background:var(--grena);height:16px;border-radius:6px"></div></div><b style="width:30px;text-align:right">' + n + '</b></div>'; }).join("");
  box.innerHTML = '<div class="rs-sec" style="margin-top:0">Vagas e prazos</div><div class="rs-kpis">' + k("Vagas abertas", por("Aberta")) + k("Aguardando aprovação", por("Aguardando aprovação")) + k("Preenchidas", por("Preenchida")) + k("SLA no prazo", noPrazo === null ? "-" : noPrazo + "%") + '</div><div class="rs-kpis">' + k("SLA vencido", venc) + k("Posições preenchidas", pre + "/" + pos) + k("Candidatos no funil", totCand) + k("Triagens por IA", tris) + '</div>' +
    '<div class="rs-sec">Funil de candidatos (vagas abertas/preenchidas)</div>' + funil +
    '<div class="rs-sec">Admissão e onboarding</div><div class="rs-kpis">' + k("Admissões em andamento", adAnd) + k("Admissões concluídas", adFim) + k("Itens concluídos", itTot ? Math.round(100 * itOk / itTot) + "%" : "-") + k("Itens totais", itTot) + '</div>';
}
function montarInd(){
  if (document.getElementById("inTab") && document.getElementById("panel-in")) return;
  ["inTab","panel-in"].forEach(function(i){ var e = document.getElementById(i); if (e) e.remove(); });
  var tabs = document.querySelector(".sidebar nav.tabs"), ref = document.getElementById("panel-ajuda"), prev = document.getElementById("adTab");
  if (!tabs || !prev || !ref) return;
  var tab = document.createElement("div"); tab.className = "tab tab-sub"; tab.id = "inTab"; tab.setAttribute("data-tab","in");
  tab.innerHTML = '<span class="tab-icon">&#128202;</span>Indicadores R&S';
  tabs.insertBefore(tab, prev.nextSibling);
  var painel = document.createElement("div"); painel.className = "panel"; painel.id = "panel-in";
  painel.innerHTML = '<div class="kanban-header"><h2>Indicadores de Recrutamento e Seleção</h2></div><div id="inLista"></div>';
  ref.parentNode.insertBefore(painel, ref);
  tab.addEventListener("click", function(){ document.querySelectorAll(".tab").forEach(function(x){ x.classList.remove("active"); }); document.querySelectorAll(".panel").forEach(function(x){ x.classList.remove("active"); }); tab.classList.add("active"); painel.classList.add("active"); var cb = document.getElementById("clientbarWrap"); if (cb) cb.style.display = "none"; carregarInd(); });
}
setInterval(montarInd, 1500);
/* unificação: o Banco de Talentos novo (público + RecrutaHub) passa a ser o principal; o anterior fica identificado até migrar as avaliações */
function unificarBanco(){
  var novo = document.getElementById("rtTab");
  if (novo && novo.textContent.indexOf("Talentos R&S") >= 0){ novo.innerHTML = '<span class="tab-icon">&#128269;</span>Banco de Talentos'; var h = document.querySelector("#panel-rt h2"); if (h) h.textContent = "Banco de Talentos"; }
  document.querySelectorAll(".sidebar nav.tabs .tab").forEach(function(t){
    if (t.id !== "rtTab" && /^\s*\S*\s*Banco de Talentos\s*$/.test(t.textContent) && t.textContent.indexOf("anterior") < 0) t.style.display = "none";
  });
}
setInterval(unificarBanco, 1500);

/* ===== Fase 4: avaliação (aprovar/reprovar) migrada para o Banco de Talentos unificado ===== */
function avalDe(c){ try { if (typeof TALENT_AVALIACOES === "undefined") return null; var ids = [c.id].concat(c.origem_ids || []); for (var i = 0; i < ids.length; i++) { var a = TALENT_AVALIACOES[String(ids[i])]; if (a) return a; } return null; } catch(e){ return null; } }
function avalCelula(c){
  var a = avalDe(c); if (!a || !a.decisao || a.oculto) return '<span style="color:#999">-</span>';
  return '<span class="rs-pill ' + (a.decisao === "Aprovado" ? "rs-green" : "rs-red") + '">' + esc(a.decisao) + '</span>' + (a.coordenador ? '<div style="font-size:11px;color:#777">' + esc(a.coordenador) + '</div>' : '') + (a.decisao === "Reprovado" && a.motivoReprovacao ? '<div style="font-size:11px;color:#777">' + esc(a.motivoReprovacao) + '</div>' : '');
}
function avaliarCand(c, aoSalvar){
  if (typeof graphFetch !== "function" || typeof AVALIACOES_GRAPH_BASE === "undefined") { toast("Entre com a conta Microsoft para avaliar candidatos.", true); return; }
  var a = avalDe(c);
  var ov = overlay('<h3>Avaliar candidato - ' + esc(c.nome) + '</h3><div style="margin:8px 0;font-size:14px"><label style="margin-right:18px"><input type="radio" name="av_d" value="Aprovado"' + (a && a.decisao === "Aprovado" ? " checked" : "") + '> Aprovado</label><label><input type="radio" name="av_d" value="Reprovado"' + (a && a.decisao === "Reprovado" ? " checked" : "") + '> Reprovado</label></div><label style="font-size:12px;font-weight:600">Motivo (obrigatório se reprovado)</label><textarea id="av_m" rows="3" class="rs-in">' + esc(a && a.motivoReprovacao || "") + '</textarea><div class="rs-act"><button class="rs-btn o" id="av_x">Cancelar</button><button class="rs-btn" id="av_ok">Salvar avaliação</button></div>');
  ov.querySelector("#av_x").addEventListener("click", function(){ ov.remove(); });
  ov.querySelector("#av_ok").addEventListener("click", async function(){
    var sel = ov.querySelector('input[name="av_d"]:checked'); if (!sel) { toast("Selecione Aprovado ou Reprovado.", true); return; }
    var decisao = sel.value, motivo = ov.querySelector("#av_m").value.trim();
    if (decisao === "Reprovado" && !motivo) { toast("Informe o motivo da reprovação.", true); return; }
    try {
      var quem = (typeof CURRENT_USER_NAME !== "undefined" && CURRENT_USER_NAME) || (typeof CURRENT_USER_EMAIL !== "undefined" && CURRENT_USER_EMAIL) || usuario();
      var fields = { Title: c.nome, CandidatoId: String(c.id), Decisao: decisao, MotivoReprovacao: decisao === "Reprovado" ? motivo : "", Coordenador: quem, Data: new Date().toISOString() };
      if (a && a.itemId) { await graphFetch(AVALIACOES_GRAPH_BASE + "/items/" + a.itemId + "/fields", { method: "PATCH", body: JSON.stringify(fields) }); a.decisao = decisao; a.motivoReprovacao = fields.MotivoReprovacao; a.coordenador = quem; a.data = fields.Data; a.oculto = false; }
      else { var cr = await graphFetch(AVALIACOES_GRAPH_BASE + "/items", { method: "POST", body: JSON.stringify({ fields: (typeof cleanGraphFields === "function" ? cleanGraphFields(fields) : fields) }) }); TALENT_AVALIACOES[String(c.id)] = { itemId: cr.id, decisao: decisao, motivoReprovacao: fields.MotivoReprovacao, coordenador: quem, data: fields.Data, oculto: false }; }
      toast("Avaliação salva.");
      try { if (typeof notificarRSDecisaoCandidato === "function") await notificarRSDecisaoCandidato({ nome: c.nome, area: c.area || c.cargo || "" }, decisao, motivo); } catch(e){ console.warn("notificar R&S", e); }
      ov.remove(); if (aoSalvar) aoSalvar();
    } catch(e){ toast("Erro ao salvar avaliação: " + e.message, true); }
  });
}

/* ===== Gráficos profissionais (SVG) para os Indicadores de R&S ===== */
var CH = { grena: "#6B1426", teal: "#2D5F66", verde: "#2E8B57", ambar: "#E8A33D", verm: "#C8402F", cinza: "#9AA3A8", azul: "#3B6FB6" };
function chFmt(n){ return Number(n).toLocaleString("pt-BR"); }
function chCard(id, titulo, dica, corpo, legenda){
  return '<div class="ch-card" id="' + id + '"><div class="ch-head"><span class="ch-tit">' + esc(titulo) + '</span><span class="ch-info" title="' + esc(dica) + '">i</span><button type="button" class="ch-copy" data-ch="' + id + '">Copiar</button></div><div class="ch-body">' + corpo + '</div>' + (legenda ? '<div class="ch-leg">' + legenda + '</div>' : '') + '</div>';
}
function chLegenda(itens){ return itens.map(function(i){ return '<span class="ch-li"><i style="background:' + i.cor + '"></i>' + esc(i.nome) + ' (' + chFmt(i.v) + (i.pct != null ? ', ' + i.pct + '%' : '') + ')</span>'; }).join(""); }
function chDonut(itens, centroNum, centroTxt){
  var tot = itens.reduce(function(s, i){ return s + i.v; }, 0), R = 100, r = 66, cx = 120, cy = 120, a0 = -Math.PI / 2, g = '';
  if (!tot) g += '<circle cx="' + cx + '" cy="' + cy + '" r="' + ((R + r) / 2) + '" fill="none" stroke="#eceef1" stroke-width="' + (R - r) + '"/>';
  itens.filter(function(i){ return i.v > 0; }).forEach(function(i){
    var f = i.v / tot, a1 = a0 + f * 2 * Math.PI - (itens.length > 1 && f < 1 ? 0.012 : 0), lg = (a1 - a0) > Math.PI ? 1 : 0;
    if (f >= 0.9999) { g += '<circle cx="' + cx + '" cy="' + cy + '" r="' + ((R + r) / 2) + '" fill="none" stroke="' + i.cor + '" stroke-width="' + (R - r) + '"/>'; }
    else { var p = function(rad, a){ return (cx + rad * Math.cos(a)).toFixed(2) + ' ' + (cy + rad * Math.sin(a)).toFixed(2); };
      g += '<path d="M ' + p(R, a0) + ' A ' + R + ' ' + R + ' 0 ' + lg + ' 1 ' + p(R, a1) + ' L ' + p(r, a1) + ' A ' + r + ' ' + r + ' 0 ' + lg + ' 0 ' + p(r, a0) + ' Z" fill="' + i.cor + '"/>'; }
    if (f >= 0.06) { var am = a0 + f * Math.PI, rm = (R + r) / 2; g += '<text x="' + (cx + rm * Math.cos(am)).toFixed(1) + '" y="' + (cy + rm * Math.sin(am) + 4).toFixed(1) + '" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">' + Math.round(f * 100) + '%</text>'; }
    a0 += f * 2 * Math.PI;
  });
  g += '<text x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle" font-size="34" font-weight="800" fill="#2a2a2a">' + esc(centroNum) + '</text><text x="' + cx + '" y="' + (cy + 24) + '" text-anchor="middle" font-size="12" fill="#666">' + esc(centroTxt) + '</text>';
  return '<svg viewBox="0 0 240 240" class="ch-svg" style="max-height:210px">' + g + '</svg>';
}
function chBarras(itens){
  var W = 420, H = 230, ml = 34, mb = 40, mt = 22, max = Math.max.apply(null, itens.map(function(i){ return i.v; }).concat([1]));
  var step = Math.pow(10, Math.floor(Math.log10(max))), top = Math.ceil(max / step) * step; if (top / step < 3) { step = step / 2; top = Math.ceil(max / step) * step; }
  var g = '', ph = H - mt - mb, bw = Math.min(70, (W - ml - 10) / itens.length * 0.62), gap = (W - ml - 10) / itens.length;
  for (var y = 0; y <= top + 0.001; y += step){ var yy = mt + ph - (y / top) * ph; g += '<line x1="' + ml + '" x2="' + (W - 6) + '" y1="' + yy + '" y2="' + yy + '" stroke="#e6e8eb"/><text x="' + (ml - 6) + '" y="' + (yy + 4) + '" text-anchor="end" font-size="11" fill="#7a7f85">' + chFmt(y) + '</text>'; }
  itens.forEach(function(i, k){
    var h = Math.max(i.v ? 3 : 0, (i.v / top) * ph), x = ml + gap * k + (gap - bw) / 2, y0 = mt + ph - h;
    g += '<rect x="' + x.toFixed(1) + '" y="' + y0.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="5" fill="' + i.cor + '"/><text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y0 - 6).toFixed(1) + '" text-anchor="middle" font-size="14" font-weight="800" fill="#222">' + chFmt(i.v) + '</text><text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 16) + '" text-anchor="middle" font-size="11.5" fill="#555">' + esc(i.nome) + '</text>';
  });
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="ch-svg">' + g + '</svg>';
}
function chHBarras(itens, suf){
  var max = Math.max.apply(null, itens.map(function(i){ return i.v; }).concat([1])), ml = 130, W = 520, rh = 28, H = itens.length * rh + 8, g = '';
  itens.forEach(function(i, k){
    var y = 4 + k * rh, w = Math.max(i.v ? 6 : 0, (i.v / max) * (W - ml - 60));
    g += '<text x="' + (ml - 8) + '" y="' + (y + 16) + '" text-anchor="end" font-size="12" fill="#444">' + esc(i.nome) + '</text><rect x="' + ml + '" y="' + (y + 3) + '" width="' + (W - ml - 50) + '" height="18" rx="4" fill="#f1f2f4"/><rect x="' + ml + '" y="' + (y + 3) + '" width="' + w.toFixed(1) + '" height="18" rx="4" fill="' + (i.cor || CH.verde) + '"/><text x="' + (w < 46 ? ml + w + 6 : ml + w - 6).toFixed(1) + '" y="' + (y + 16) + '" text-anchor="' + (w < 46 ? 'start' : 'end') + '" font-size="12" font-weight="700" fill="' + (w < 46 ? '#333' : '#fff') + '">' + chFmt(i.v) + (suf || '') + '</text>';
  });
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="ch-svg">' + g + '</svg>';
}
function chLinha(pts, suf){
  var W = 520, H = 250, ml = 40, mr = 20, mt = 28, mb = 38, vs = pts.map(function(p){ return p.v; }), mx = Math.max.apply(null, vs.concat([1])), top = (Math.ceil(Math.ceil(mx * 1.15) / 4) * 4) || 4, g = '', pw = W - ml - mr, ph = H - mt - mb;
  var nt = 4; for (var t = 0; t <= nt; t++){ var val = top * t / nt, yy = mt + ph - (val / top) * ph; g += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + yy + '" y2="' + yy + '" stroke="#e6e8eb"/><text x="' + (ml - 6) + '" y="' + (yy + 4) + '" text-anchor="end" font-size="11" fill="#7a7f85">' + (Math.round(val * 10) / 10) + (suf || '') + '</text>'; }
  var X = function(k){ return ml + (pts.length > 1 ? pw * k / (pts.length - 1) : pw / 2); }, Y = function(v){ return mt + ph - (v / top) * ph; };
  var d = pts.map(function(p, k){ return (k ? 'L' : 'M') + X(k).toFixed(1) + ' ' + Y(p.v).toFixed(1); }).join(' ');
  g += '<path d="' + d + ' L' + X(pts.length - 1).toFixed(1) + ' ' + (mt + ph) + ' L' + X(0).toFixed(1) + ' ' + (mt + ph) + ' Z" fill="' + CH.teal + '" fill-opacity="0.10"/><path d="' + d + '" fill="none" stroke="' + CH.teal + '" stroke-width="2.6" stroke-linejoin="round"/>';
  pts.forEach(function(p, k){ g += '<circle cx="' + X(k).toFixed(1) + '" cy="' + Y(p.v).toFixed(1) + '" r="4.5" fill="#fff" stroke="' + CH.teal + '" stroke-width="2.4"/><text x="' + X(k).toFixed(1) + '" y="' + (Y(p.v) - 10).toFixed(1) + '" text-anchor="middle" font-size="11.5" font-weight="700" fill="#222">' + p.v + (suf || '') + '</text><text x="' + X(k).toFixed(1) + '" y="' + (H - 14) + '" text-anchor="middle" font-size="11" fill="#666">' + esc(p.nome) + '</text>'; });
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="ch-svg">' + g + '</svg>';
}
function chCss(){
  if (document.getElementById("chCss")) return;
  var s = document.createElement("style"); s.id = "chCss";
  s.textContent = ".ch-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:14px 0}.ch-g2{grid-template-columns:repeat(2,minmax(0,1fr))}.ch-card{background:#fff;border:1px solid var(--border);border-radius:14px;padding:16px 18px;box-shadow:0 1px 3px rgba(0,0,0,.04);display:flex;flex-direction:column}.ch-head{display:flex;align-items:center;gap:8px;margin-bottom:8px}.ch-tit{font-weight:700;color:var(--grena);font-size:15px}.ch-info{width:16px;height:16px;border:1px solid #aab;border-radius:50%;font-size:10px;display:inline-flex;align-items:center;justify-content:center;color:#889;cursor:help;font-style:italic}.ch-copy{margin-left:auto;border:1px solid var(--border);background:#fff;border-radius:7px;padding:3px 10px;font-size:11px;color:#667;cursor:pointer}.ch-copy:hover{background:#f6f6f8}.ch-body{flex:1;display:flex;align-items:center;justify-content:center}.ch-svg{width:100%;height:auto;display:block}.ch-leg{border-top:1px solid #eceef1;margin-top:10px;padding-top:10px;display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12.5px;color:#444}.ch-li i{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:6px;vertical-align:-1px}@media(max-width:1000px){.ch-grid,.ch-g2{grid-template-columns:1fr}}";
  document.head.appendChild(s);
}
function chCopiar(id, btn){
  var card = document.getElementById(id), svg = card && card.querySelector("svg"); if (!svg) return;
  var tit = card.querySelector(".ch-tit").textContent, old = btn.textContent;
  var vb = svg.viewBox.baseVal, esc2 = 2, w = vb.width * esc2, h = vb.height * esc2;
  var xml = new XMLSerializer().serializeToString(svg).replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" font-family="Arial,sans-serif"');
  var img = new Image();
  img.onload = function(){
    var c = document.createElement("canvas"); c.width = w; c.height = h + 60; var x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.fillStyle = CH.grena; x.font = "bold 22px Arial"; x.fillText(tit, 14, 32); x.drawImage(img, 0, 50, w, h);
    c.toBlob(function(b){ try { navigator.clipboard.write([new ClipboardItem({ "image/png": b })]).then(function(){ btn.textContent = "Copiado"; setTimeout(function(){ btn.textContent = old; }, 1500); }, function(){ toast("Não foi possível copiar a imagem.", true); }); } catch(e){ toast("Seu navegador não permite copiar imagem.", true); } });
  };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
}
async function carregarInd(){
  var box = document.getElementById("inLista"); if (!box) return;
  chCss(); box.innerHTML = '<p style="color:#777">Calculando...</p>';
  var vs, ads, pipes = [], tris = 0;
  try {
    vs = await api("GET", { r: "vagas" }); ads = await api("GET", { r: "admissoes" });
    var ativas = vs.filter(function(v){ return v.status === "Aberta" || v.status === "Preenchida"; });
    for (var i = 0; i < ativas.length; i++){ try { var d = await api("GET", { r: "vaga", id: ativas[i].id }); pipes.push({ v: ativas[i], p: d.pipeline || [] }); var t = await api("GET", { r: "triagens", vaga_id: ativas[i].id }); tris += (t || []).length; } catch(e){} }
  } catch(e){ box.innerHTML = '<span style="color:#b02a2a">' + esc(e.message) + '</span>'; return; }
  var pct = function(v, t){ return t ? Math.round(100 * v / t) : 0; };
  var por = function(st){ return vs.filter(function(v){ return v.status === st; }).length; };
  var stat = [{ nome: "Abertas", v: por("Aberta"), cor: CH.verde }, { nome: "Aguardando aprovação", v: por("Aguardando aprovação"), cor: CH.ambar }, { nome: "Preenchidas", v: por("Preenchida"), cor: CH.teal }, { nome: "Recusadas/canceladas", v: vs.length - por("Aberta") - por("Aguardando aprovação") - por("Preenchida"), cor: CH.verm }];
  var totV = vs.length; stat.forEach(function(s){ s.pct = pct(s.v, totV); });
  var comSla = vs.filter(function(v){ return sla(v); }), venc = comSla.filter(function(v){ return sla(v).rest < 0; }).length, ok = comSla.length - venc;
  var slaI = [{ nome: "No prazo", v: ok, cor: CH.verde, pct: pct(ok, comSla.length) }, { nome: "Vencido", v: venc, cor: CH.verm, pct: pct(venc, comSla.length) }];
  var pos = 0, pre = 0; vs.forEach(function(v){ if (v.status !== "Recusada" && v.posicoes){ pos += v.posicoes.total; pre += v.posicoes.preenchidas; } });
  var posB = [{ nome: "Posições", v: pos, cor: CH.teal }, { nome: "Preenchidas", v: pre, cor: CH.verde }, { nome: "Em seleção", v: pos - pre, cor: CH.ambar }];
  var etapas = ETAPAS_FALLBACK, cont = {}; etapas.forEach(function(e){ cont[e] = 0; }); var totC = 0;
  pipes.forEach(function(x){ x.p.forEach(function(c){ cont[c.etapa] = (cont[c.etapa] || 0) + 1; totC++; }); });
  var cores = { "Inscrito": CH.cinza, "Triagem": CH.azul, "Entrevista RH": CH.azul, "Entrevista Gestor": CH.teal, "Aprovado": CH.verde, "Carta Oferta": CH.verde, "Contratado": CH.grena, "Reprovado": CH.verm, "Banco de Talentos": CH.ambar };
  var funil = etapas.map(function(e){ return { nome: e, v: cont[e] || 0, cor: cores[e] || CH.verde }; });
  function chSemana(d){ var x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
  var sem = []; var hoje = chSemana(new Date()); for (var k = 7; k >= 0; k--){ var ini = new Date(hoje); ini.setDate(ini.getDate() - 7 * k); var fim = new Date(ini); fim.setDate(fim.getDate() + 7); sem.push({ nome: ("0" + ini.getDate()).slice(-2) + "/" + ("0" + (ini.getMonth() + 1)).slice(-2), v: vs.filter(function(v){ var c = new Date(v.criado_em); return c >= ini && c < fim; }).length }); }
  var itTot = 0, itOk = 0; var gr = { documentos: [0, 0], exame_epi: [0, 0], onboarding: [0, 0] };
  ads.forEach(function(a){ (a.itens || []).forEach(function(i){ itTot++; if (i.concluido) itOk++; if (gr[i.grupo]) { gr[i.grupo][1]++; if (i.concluido) gr[i.grupo][0]++; } }); });
  var adI = [{ nome: "Concluídos", v: itOk, cor: CH.verde, pct: pct(itOk, itTot) }, { nome: "Pendentes", v: itTot - itOk, cor: CH.ambar, pct: pct(itTot - itOk, itTot) }];
  var adG = [{ nome: "Documentos", v: pct(gr.documentos[0], gr.documentos[1]), cor: CH.verde }, { nome: "Exame / EPIs", v: pct(gr.exame_epi[0], gr.exame_epi[1]), cor: CH.verde }, { nome: "Onboarding", v: pct(gr.onboarding[0], gr.onboarding[1]), cor: CH.verde }];
  var slaPct = comSla.length ? pct(ok, comSla.length) : null;
  box.innerHTML = '<div class="ch-grid">' +
    chCard("ch1", "Vagas por status", "Distribuição de todas as vagas pelo status atual.", chDonut(stat, String(totV), "vagas"), chLegenda(stat)) +
    chCard("ch2", "Posições abertas x preenchidas", "Total de posições das vagas, quantas já foram preenchidas e quantas seguem em seleção.", chBarras(posB), chLegenda([{ nome: "Preenchidas", v: pre, cor: CH.verde, pct: pct(pre, pos) }, { nome: "Em seleção", v: pos - pre, cor: CH.ambar, pct: pct(pos - pre, pos) }])) +
    chCard("ch3", "SLA das vagas", "Vagas em andamento dentro e fora do prazo (dias úteis, conforme o nível do cargo).", chDonut(slaI, slaPct === null ? "-" : slaPct + "%", "no prazo"), chLegenda(slaI)) +
    '</div><div class="ch-grid ch-g2">' +
    chCard("ch4", "Funil de candidatos", "Candidatos vinculados às vagas abertas ou preenchidas, por etapa do processo (" + totC + " no total).", chHBarras(funil), "") +
    chCard("ch5", "Vagas criadas por semana - últimas 8 semanas", "Quantidade de vagas criadas em cada semana.", chLinha(sem), '<span class="ch-li"><i style="background:' + CH.teal + '"></i>Vagas criadas (' + sem.reduce(function(s, p){ return s + p.v; }, 0) + ' no período)</span>') +
    '</div><div class="ch-grid ch-g2">' +
    chCard("ch6", "Admissão e onboarding", "Itens dos checklists de admissão concluídos e pendentes (" + ads.length + " admissões).", chDonut(adI, itTot ? pct(itOk, itTot) + "%" : "-", "concluído"), chLegenda(adI)) +
    chCard("ch7", "Andamento por grupo de admissão", "Percentual de itens concluídos em cada grupo do checklist.", chHBarras(adG, "%"), '<span class="ch-li"><i style="background:' + CH.verde + '"></i>Triagens por IA realizadas: ' + tris + '</span>') +
    '</div>';
  box.querySelectorAll("button[data-ch]").forEach(function(b){ b.addEventListener("click", function(){ chCopiar(b.getAttribute("data-ch"), b); }); });
}


  /* ===== Padrão de gráficos nas telas Visão Geral e Dashboard ===== */
  function gcHook(box){ box.querySelectorAll("button[data-ch]").forEach(function(b){ if (b.__h) return; b.__h = 1; b.addEventListener("click", function(){ chCopiar(b.getAttribute("data-ch"), b); }); }); }
  function gcCorStatus(n){ n = String(n || "").toLowerCase(); if (/conclu/.test(n)) return CH.verde; if (/atras/.test(n)) return CH.verm; if (/andamento|triagem|psel/.test(n)) return CH.azul; if (/fazer|regist|aberta/.test(n)) return CH.ambar; return CH.cinza; }
  function gcCurto(s, n){ s = String(s || ""); return s.length > n ? s.slice(0, n - 1) + "…" : s; }
  function gcPct(v, t){ return t ? Math.round(100 * v / t) : 0; }
  function gcContar(arr, fn){ var m = {}; arr.forEach(function(x){ var k = fn(x); m[k] = (m[k] || 0) + 1; }); return m; }
  function gcStatusItens(items){
    var ord = ["Concluido", "Em andamento", "Atrasado", "A fazer", "A definir"], nom = { "Concluido": "Concluídas", "Em andamento": "Em andamento", "Atrasado": "Atrasadas", "A fazer": "A fazer", "A definir": "A definir" };
    var m = gcContar(items, function(it){ return it.status; }), tot = items.length;
    return ord.map(function(s){ return { nome: nom[s], v: m[s] || 0, cor: gcCorStatus(s), pct: gcPct(m[s] || 0, tot) }; });
  }
  function gcAreasQtd(items){
    var m = gcContar(items, function(it){ return it.areaResp || "Sem área"; });
    return Object.keys(m).map(function(k){ return { nome: gcCurto(k, 20), v: m[k], cor: CH.teal }; }).sort(function(a, b){ return b.v - a.v; }).slice(0, 8);
  }
  function gcAtrasoAreas(items){
    var st = computeDelayStats(items);
    return (st.areaStats || []).filter(function(a){ return a.avgDelay > 0; }).slice(0, 8).map(function(a){ return { nome: gcCurto(a.area, 20), v: Math.round(a.avgDelay * 10) / 10, cor: CH.verm }; });
  }
  function gcHost(id, antes){
    var h = document.getElementById(id); if (h) return h;
    h = document.createElement("div"); h.id = id; antes.parentNode.insertBefore(h, antes); return h;
  }
  function gcGeral(){
    var pg = document.getElementById("panel-geral"), cv = document.getElementById("areaChart"); if (!pg || !cv) return;
    var items; try { items = itemsForClients(selectedClients); } catch (e) { return; }
    chCss();
    var oldChart = cv.closest(".chart-card"), rk = document.getElementById("rankList"), oldRank = rk && rk.closest(".chart-card"), garg = document.getElementById("gargalosCard");
    [oldChart, oldRank, garg].forEach(function(e){ if (e) e.style.display = "none"; });
    var host = gcHost("gcGeral", oldChart);
    var st = gcStatusItens(items), tot = items.length, ds = computeDelayStats(items), ok = ds.onTimeCount || 0, cons = ds.consideredCount || 0;
    var prazo = [{ nome: "No prazo", v: ok, cor: CH.verde, pct: gcPct(ok, cons) }, { nome: "Com atraso", v: cons - ok, cor: CH.verm, pct: gcPct(cons - ok, cons) }];
    var garRows = []; try { garRows = computeGargalos().filter(function(r){ return r.media > 0; }).slice(0, 8).map(function(r){ return { nome: gcCurto(r.num + ". " + r.title, 20), v: Math.round(r.media * 10) / 10, cor: CH.ambar }; }); } catch (e) {}
    var atr = gcAtrasoAreas(items);
    host.innerHTML = '<div class="ch-grid">' +
      chCard("gc1", "Etapas por status", "Distribuição das etapas do checklist pelo status atual.", chDonut(st, String(tot), "etapas"), chLegenda(st)) +
      chCard("gc2", "Etapas por área responsável", "Quantidade de etapas sob responsabilidade de cada área (8 maiores).", chHBarras(gcAreasQtd(items)), "") +
      chCard("gc3", "Etapas concluídas no prazo", "Etapas concluídas ou atrasadas: quantas ficaram dentro do prazo previsto.", chDonut(prazo, cons ? gcPct(ok, cons) + "%" : "-", "no prazo"), chLegenda(prazo)) +
      '</div><div class="ch-grid ch-g2">' +
      chCard("gc4", "Atraso médio por área (dias por etapa)", "Média de dias de atraso por etapa, considerando todas as etapas de cada área.", atr.length ? chHBarras(atr, " d") : '<p style="color:#777">Nenhum atraso registrado.</p>', "") +
      chCard("gc5", "Maiores gargalos por etapa (dias de atraso médio)", "Etapas com maior atraso médio entre as implantações já realizadas.", garRows.length ? chHBarras(garRows, " d") : '<p style="color:#777">Sem dados suficientes.</p>', "") +
      '</div>';
    gcHook(host);
  }
  function gcDash(){
    var pn = document.getElementById("panel-dashboardExec"); if (!pn) return;
    chCss();
    var its = []; try { its = ITEMS.filter(function(it){ return it.cliente; }); } catch (e) {}
    var host = document.getElementById("gcDash");
    if (!host) { host = document.createElement("div"); host.id = "gcDash"; pn.appendChild(host); }
    var st = gcStatusItens(its), ds = computeDelayStats(its), atr = gcAtrasoAreas(its);
    var real = []; try { real = (coberturaHistoricoData || []).filter(function(f){ return !(f.__id && String(f.__id).indexOf("aval-") === 0) && f.PrecisaSubstituicao !== "Nao"; }); } catch (e) {}
    var sm = gcContar(real, function(f){ return f.StatusSolicitacao || "Registrada"; });
    var cs = Object.keys(sm).map(function(k){ return { nome: k, v: sm[k], cor: gcCorStatus(k), pct: gcPct(sm[k], real.length) }; });
    var mes = []; var d0 = new Date(); d0.setDate(1); d0.setHours(0, 0, 0, 0);
    for (var k = 5; k >= 0; k--) { var a = new Date(d0.getFullYear(), d0.getMonth() - k, 1), b = new Date(d0.getFullYear(), d0.getMonth() - k + 1, 1); mes.push({ nome: ("0" + (a.getMonth() + 1)).slice(-2) + "/" + String(a.getFullYear()).slice(2), v: real.filter(function(f){ var c = f.__created ? new Date(f.__created) : null; return c && c >= a && c < b; }).length }); }
    host.innerHTML = '<p style="margin:18px 0 0;font-size:12px;color:#888;letter-spacing:.04em">GRÁFICOS</p><div class="ch-grid ch-g2">' +
      chCard("gd1", "Implantações: etapas por status", "Todas as etapas das implantações ativas, por status.", chDonut(st, String(its.length), "etapas"), chLegenda(st)) +
      chCard("gd2", "Implantações: atraso médio por área (dias)", "Média de dias de atraso por etapa em cada área.", atr.length ? chHBarras(atr, " d") : '<p style="color:#777">Nenhum atraso registrado.</p>', "") +
      chCard("gd3", "Solicitações por status", "Solicitações de cobertura, substituição e requisição de pessoal.", chDonut(cs, String(real.length), "solicitações"), chLegenda(cs)) +
      chCard("gd4", "Solicitações criadas por mês", "Quantidade de solicitações abertas em cada um dos últimos 6 meses.", chLinha(mes), '<span class="ch-li"><i style="background:' + CH.teal + '"></i>Solicitações (' + mes.reduce(function(s, p){ return s + p.v; }, 0) + ' no período)</span>') +
      '</div>';
    gcHook(host);
  }
  function gcWrap(nome, fn){
    var o = window[nome]; if (typeof o !== "function" || o.__gc) return false;
    var w = function(){ var r = o.apply(this, arguments); try { fn(); } catch (e) { console.warn("gc " + nome, e); } return r; };
    w.__gc = 1; window[nome] = w; return true;
  }
  var gcT = setInterval(function(){
    var a = gcWrap("buildChart", gcGeral), b = gcWrap("renderDashboardExecutivo", gcDash);
    if (typeof window.buildChart === "function" && window.buildChart.__gc && typeof window.renderDashboardExecutivo === "function" && window.renderDashboardExecutivo.__gc) clearInterval(gcT);
  }, 800);
  setTimeout(function(){ try { gcGeral(); } catch (e) {} try { gcDash(); } catch (e) {} }, 2500);

window.rsDebug = { carregar: carregar, api: api };
})();
