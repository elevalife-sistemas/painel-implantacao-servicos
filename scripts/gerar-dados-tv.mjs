// Gera tv/dados.json com indicadores AGREGADOS por area (sem nomes de pessoas, clientes ou etapas).
// Regras de calculo IGUAIS as do Sistema de Gestao Operacional (computeDelayStats do index.html).
// Roda no GitHub Actions. A senha do cracha vem do segredo TV_CLIENT_SECRET.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const TENANT_ID = 'cfb770f9-787a-45dd-8368-a47edc43fc12';
const CLIENT_ID = '67c39ca1-b00c-432c-9fc3-1473edf57bdf'; // Painel TV - Leitura BPM
const CLIENT_SECRET = process.env.TV_CLIENT_SECRET;
const SITE = 'elevalife.sharepoint.com,7341bd27-7a54-45f1-a342-379bee5bbca8,4c2a4665-63b1-47ba-9c36-5e4e93d1d8b2';
const LISTA_KANBAN = '4563517e-40d7-4fa4-99ff-bf126b15c95c';
const LISTA_RESPOSTAS = 'b0c0a8bf-7cb8-476f-b245-c519c9b93611';
const ARQUIVO = 'tv/dados.json';
const SEMANAS = 8;
const DIA = 86400000;

if (!CLIENT_SECRET) { console.error('Falta o segredo TV_CLIENT_SECRET no GitHub.'); process.exit(1); }

async function token() {
  const r = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: CLIENT_ID, client_secret: CLIENT_SECRET, scope: 'https://graph.microsoft.com/.default' })
  });
  const j = await r.json();
  if (!j.access_token) { console.error('Falha no login do cracha:', j.error, j.error_description?.split('\n')[0]); process.exit(1); }
  return j.access_token;
}

async function itens(tk, lista, campos) {
  let url = `https://graph.microsoft.com/v1.0/sites/${SITE}/lists/${lista}/items?$expand=fields($select=${campos})&$top=999`;
  const out = [];
  while (url) {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${tk}` } });
    if (!r.ok) { console.error('Erro ao ler lista', lista, r.status, (await r.text()).slice(0, 300)); process.exit(1); }
    const j = await r.json();
    out.push(...j.value.map(v => v.fields));
    url = j['@odata.nextLink'];
  }
  return out;
}

const ACENTOS = { 'Atividades Fisicas': 'Atividades Físicas', 'Saude Corporativa': 'Saúde Corporativa', 'Nutricao': 'Nutrição' };
function areaDe(f) {
  const a = String(f.field_5 || '').trim().toUpperCase();
  let nome;
  if (a === 'VENDAS' || a === 'MARKETING') nome = 'Novas Receitas';
  else if (a.includes('RH')) nome = 'Recursos Humanos';
  else if (a.includes('DP')) nome = 'Departamento Pessoal';
  else if (a.includes('COORDENADOR')) nome = String(f.field_2 || '').trim();
  else nome = String(f.field_5 || '').trim();
  nome = nome || 'Outras';
  return ACENTOS[nome] || nome;
}

// Inicio da semana (segunda 00:00 em Brasilia) em ms UTC
function inicioSemanaMs(ms) {
  const br = new Date(ms - 3 * 3600e3);
  const w = (br.getUTCDay() + 6) % 7;
  return Date.UTC(br.getUTCFullYear(), br.getUTCMonth(), br.getUTCDate() - w) + 3 * 3600e3;
}
const ddmm = ms => { const d = new Date(ms - 3 * 3600e3); return String(d.getUTCDate()).padStart(2, '0') + '/' + String(d.getUTCMonth() + 1).padStart(2, '0'); };

const agora = Date.now();
const semanaAtual = inicioSemanaMs(agora);
const inicios = Array.from({ length: SEMANAS }, (_, i) => semanaAtual - 7 * DIA * (SEMANAS - 1 - i));

function calcula(itensArea) {
  let total = 0, concluidas = 0, andamento = 0, atrasadas = 0, diasAtraso = 0, noPrazo = 0, avaliadas = 0;
  const atrasosConcluidas = [];
  for (const it of itensArea) {
    total++;
    if (it.status === 'Concluido') concluidas++;
    if (it.status === 'Em andamento') andamento++;
    if (it.status === 'Atrasado') atrasadas++;
    let atraso = 0;
    if (it.status === 'Concluido' && it.real && it.prev) {
      atraso = Math.round((it.real - it.prev) / DIA);
      atrasosConcluidas.push(atraso); avaliadas++;
      if (atraso <= 0) noPrazo++;
    } else if (it.status === 'Atrasado' && it.prev) {
      atraso = Math.max(0, Math.round((agora - it.prev) / DIA)); avaliadas++;
    }
    if (atraso > 0) diasAtraso += atraso;
  }
  const pct = avaliadas ? Math.round(noPrazo / avaliadas * 100) : null;
  const tempoMedio = atrasosConcluidas.length ? Math.round(atrasosConcluidas.reduce((s, d) => s + d, 0) / atrasosConcluidas.length * 10) / 10 : null;

  // Evolucao: situacao ao fim de cada semana (a ultima semana usa o numero atual, igual ao sistema)
  const semanas = inicios.map((ini, k) => {
    const fim = ini + 7 * DIA;
    let c = 0, av = 0, ok = 0;
    for (const it of itensArea) {
      if (it.real && it.real >= ini && it.real < fim) c++;
      if (!it.prev) continue;
      if (it.status === 'Concluido' && it.real && it.real < fim) { av++; if (Math.round((it.real - it.prev) / DIA) <= 0) ok++; }
      else if (it.prev < fim && (!it.real || it.real >= fim) && it.status !== 'A definir' && (it.status === 'Atrasado' || it.real)) av++;
    }
    const p = k === SEMANAS - 1 ? pct : (av ? Math.round(ok / av * 100) : null);
    return { inicio: ddmm(ini), pctNoPrazo: p, concluidas: c };
  });
  return { total, concluidas, andamento, atrasadas, diasAtraso, noPrazo, avaliadas, pctNoPrazo: pct, tempoMedio, semanas };
}


// ---------- Ponto (PontoCheck · site Departamento Pessoal - Ponto) ----------
const PONTO_SITE = 'elevalife.sharepoint.com,81c02d70-5179-4b9a-aaba-532156fe4596,9ab13a96-fd43-41d9-bd5a-3a90d2dda0bf';
const AREAS_PONTO = { AF: 'Atividades Físicas', ERGO: 'Ergonomia', FISIO: 'Fisioterapia', ENFERMAGEM: 'Enfermagem', ADMINISTRATIVO: 'Administrativo' };
const MESES_NOME = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
async function gget(tk, url, tipo) {
  const r = await fetch('https://graph.microsoft.com/v1.0' + url, { headers: { Authorization: `Bearer ${tk}` } });
  if (!r.ok) throw new Error('Ponto ' + r.status + ' em ' + url.split('?')[0]);
  return tipo === 'json' ? r.json() : r.text();
}
async function lerPonto(tk) {
  const pasta = await gget(tk, `/sites/${PONTO_SITE}/drive/root:/Sistema%20Ponto:/children?$select=id,name&$top=999`, 'json');
  const arq = pasta.value || [];
  const cfgItem = arq.find(f => f.name === 'config.json');
  const cfg = cfgItem ? JSON.parse(await gget(tk, `/sites/${PONTO_SITE}/drive/items/${cfgItem.id}/content`)) : {};
  const colabsCfg = cfg.colaboradores || {};
  const meses = arq.map(f => ({ id: f.id, mk: (f.name.match(/^mes-(\d{4}-\d{2})\.json$/) || [])[1] })).filter(f => f.mk).sort((a, b) => a.mk.localeCompare(b.mk)).slice(-6);
  if (!meses.length) return null;
  const resumoMes = [];
  let atual = null;
  for (const m of meses) {
    const dado = JSON.parse(await gget(tk, `/sites/${PONTO_SITE}/drive/items/${m.id}/content`));
    const ocorr = Object.values(dado.ocorr || {}).filter(o => !['foto', 'geo'].includes(o.tipo));
    const areaDoColab = ck => AREAS_PONTO[(colabsCfg[ck] || {}).area] || 'Outras';
    // Areas com menos de 3 colaboradores no mes entram em "Outras" (para nao identificar pessoas)
    const pessoas = {};
    Object.keys(dado.colabs || {}).forEach(ck => { const a = areaDoColab(ck); (pessoas[a] ||= new Set()).add(ck); });
    const areaFinal = ck => { const a = areaDoColab(ck); return (pessoas[a] && pessoas[a].size >= 3) ? a : 'Outras'; };
    const novo = () => ({ total: 0, resolvidas: 0, pendentes: 0, aguardandoCoord: 0, faltas: 0, atrasos: 0, horaExtra: 0, ajustes: 0 });
    const emp = novo(), porArea = {};
    for (const o of ocorr) {
      const alvo = [emp, (porArea[areaFinal(o.ck)] ||= novo())];
      const ok = o.status === 'CONCLUIDO' || !!o.resolvidoSolides;
      for (const b of alvo) {
        b.total++; if (ok) b.resolvidas++; else { b.pendentes++; if (o.aguardando) b.aguardandoCoord++; }
        if (o.tipo === 'falta') b.faltas++;
        if (o.tipo === 'atraso') b.atrasos++;
        if (o.tipo === 'he') b.horaExtra++;
        if (o.tipo === 'ajuste' || o.tipo === 'nao_registrado') b.ajustes++;
      }
    }
    const fin = b => ({ ...b, pctResolvidas: b.total ? Math.round(b.resolvidas / b.total * 100) : null });
    const [ano, mm] = m.mk.split('-');
    resumoMes.push({ inicio: MESES_NOME[+mm - 1] + '/' + ano.slice(2), pctNoPrazo: fin(emp).pctResolvidas, concluidas: emp.total });
    atual = { mes: MESES_NOME[+mm - 1] + '/' + ano, empresa: fin(emp),
      areas: Object.keys(porArea).sort((a, b) => a.localeCompare(b, 'pt')).map(n => ({ nome: n, ...fin(porArea[n]) })) };
  }
  return { ...atual, meses: resumoMes };
}

const tk = await token();
const kanban = await itens(tk, LISTA_KANBAN, 'field_1,field_2,field_5,field_10,field_11,field_12');
const respostas = await itens(tk, LISTA_RESPOSTAS, 'Area,Acao,EnviadoEm,MinutosAteResposta');

// Mesmo recorte do sistema: todos os clientes, exceto o "Checklist Mestre (modelo)" (itens sem cliente)
const base = kanban.filter(f => String(f.field_1 || '').trim() !== '').map(f => ({
  area: areaDe(f), status: String(f.field_12 || 'A definir'),
  prev: f.field_10 ? Date.parse(f.field_10) : null, real: f.field_11 ? Date.parse(f.field_11) : null
}));

const nomes = [...new Set(base.map(i => i.area))].sort((a, b) => a.localeCompare(b, 'pt'));

const lim30 = agora - 30 * DIA;
function alertas(nome) {
  const lst = respostas.filter(r => r.EnviadoEm && Date.parse(r.EnviadoEm) >= lim30 && (!nome || (ACENTOS[r.Area] || r.Area) === nome));
  const resp = lst.filter(r => ['concluir', 'prazo', 'ajuda'].includes(r.Acao));
  const mins = resp.map(r => r.MinutosAteResposta).filter(m => typeof m === 'number');
  return { enviados30d: lst.length, pctRespondidos30d: lst.length ? Math.round(resp.length / lst.length * 100) : null,
    semResposta30d: lst.filter(r => r.Acao === 'sem_resposta').length, tempoMedioMin: mins.length ? Math.round(mins.reduce((s, m) => s + m, 0) / mins.length) : null };
}

const dados = {
  empresa: { nome: 'Visão geral da ElevaLife', ...calcula(base), alertas: alertas(null) },
  areas: nomes.map(n => ({ nome: n, ...calcula(base.filter(i => i.area === n)), alertas: alertas(n) }))
};
try { dados.ponto = await lerPonto(tk); } catch (e) { console.error('Ponto indisponivel:', e.message); dados.ponto = null; }

if (existsSync(ARQUIVO)) {
  try { const antigo = JSON.parse(readFileSync(ARQUIVO, 'utf8')); if (JSON.stringify(antigo.dados) === JSON.stringify(dados)) { console.log('Sem mudancas.'); process.exit(0); } } catch {}
}
writeFileSync(ARQUIVO, JSON.stringify({ geradoEm: new Date().toISOString(), versao: 2, dados }, null, 1));
console.log(`Ponto: ${dados.ponto ? dados.ponto.mes + ' ' + dados.ponto.empresa.total + ' tratativas, ' + dados.ponto.areas.length + ' areas' : 'sem dados'}`);
console.log(`Atualizado: ${dados.areas.length} areas, ${base.length} etapas (sem o modelo), ${respostas.length} respostas. No prazo: ${dados.empresa.pctNoPrazo}% (${dados.empresa.noPrazo}/${dados.empresa.avaliadas}).`);
