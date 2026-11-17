// Gera tv/dados.json com indicadores AGREGADOS por area (sem nomes de pessoas, clientes ou etapas).
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

// Data no fuso de Brasilia (yyyy-mm-dd)
const diaBR = iso => { if (!iso) return null; const d = new Date(iso); if (isNaN(d)) return null; return new Date(d.getTime() - 3 * 3600e3).toISOString().slice(0, 10); };
const hojeBR = diaBR(new Date().toISOString());
const somaDias = (dia, n) => { const d = new Date(dia + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const inicioSemana = dia => { const d = new Date(dia + 'T12:00:00Z'); const w = (d.getUTCDay() + 6) % 7; return somaDias(dia, -w); };

const ACENTOS = { 'Atividades Fisicas': 'Atividades Físicas', 'Saude Corporativa': 'Saúde Corporativa', 'Nutricao': 'Nutrição', 'Psicologia': 'Psicologia' };
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

const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);

function novoBloco() {
  return { emAberto: 0, atrasadas: 0, concluidas30d: 0, comPrazo30d: 0, noPrazo30d: 0, concluidasSemana: 0,
    semanas: [], alertas: { enviados30d: 0, respondidos30d: 0, semResposta30d: 0, pedidosAjuda30d: 0, somaMin: 0, nMin: 0 } };
}

const tk = await token();
const kanban = await itens(tk, LISTA_KANBAN, 'field_2,field_5,field_10,field_11,field_12');
const respostas = await itens(tk, LISTA_RESPOSTAS, 'Area,Acao,EnviadoEm,MinutosAteResposta');

const lim30 = somaDias(hojeBR, -30);
const semanaAtual = inicioSemana(hojeBR);
const iniciosSemanas = Array.from({ length: SEMANAS }, (_, i) => somaDias(semanaAtual, -7 * (SEMANAS - 1 - i)));

const areas = {};
const total = novoBloco();
const bloco = nome => (areas[nome] ||= novoBloco());
const semMap = new Map(); // chave area|semana

for (const f of kanban) {
  const st = String(f.field_12 || '');
  const nome = areaDe(f);
  const alvos = [bloco(nome), total];
  const real = diaBR(f.field_11), prev = diaBR(f.field_10);
  for (const b of alvos) {
    if (['A fazer', 'Em andamento', 'Atrasado'].includes(st)) b.emAberto++;
    if (st === 'Atrasado') b.atrasadas++;
    if (st === 'Concluido' && real) {
      if (real >= lim30) { b.concluidas30d++; if (prev) { b.comPrazo30d++; if (real <= prev) b.noPrazo30d++; } }
      if (real >= semanaAtual) b.concluidasSemana++;
    }
  }
  if (st === 'Concluido' && real) {
    const s = inicioSemana(real);
    if (s >= iniciosSemanas[0]) for (const k of [nome + '|' + s, '__total|' + s]) {
      const v = semMap.get(k) || { c: 0, p: 0, n: 0 }; v.c++; if (prev) { v.p++; if (real <= prev) v.n++; } semMap.set(k, v);
    }
  }
}

for (const f of respostas) {
  const env = diaBR(f.EnviadoEm);
  if (!env || env < lim30) continue;
  const nome = ACENTOS[f.Area] || f.Area || 'Outras';
  for (const b of [bloco(nome), total]) {
    const a = b.alertas; a.enviados30d++;
    if (['concluir', 'prazo', 'ajuda'].includes(f.Acao)) { a.respondidos30d++; if (typeof f.MinutosAteResposta === 'number') { a.somaMin += f.MinutosAteResposta; a.nMin++; } }
    if (f.Acao === 'sem_resposta') a.semResposta30d++;
    if (f.Acao === 'ajuda') a.pedidosAjuda30d++;
  }
}

function finaliza(b, chave) {
  const a = b.alertas;
  return {
    emAberto: b.emAberto, atrasadas: b.atrasadas, concluidasSemana: b.concluidasSemana,
    concluidas30d: b.concluidas30d, pctNoPrazo30d: pct(b.noPrazo30d, b.comPrazo30d),
    semanas: iniciosSemanas.map(s => { const v = semMap.get(chave + '|' + s) || { c: 0, p: 0, n: 0 }; return { inicio: s, concluidas: v.c, pctNoPrazo: pct(v.n, v.p) }; }),
    alertas: { enviados30d: a.enviados30d, pctRespondidos30d: pct(a.respondidos30d, a.enviados30d), semResposta30d: a.semResposta30d,
      pedidosAjuda30d: a.pedidosAjuda30d, tempoMedioMin: a.nMin ? Math.round(a.somaMin / a.nMin) : null }
  };
}

const dados = {
  empresa: finaliza(total, '__total'),
  areas: Object.keys(areas).sort((x, y) => x.localeCompare(y, 'pt'))
    .map(n => ({ area: n, ...finaliza(areas[n], n) }))
    .filter(a => a.emAberto || a.concluidas30d || a.alertas.enviados30d)
};

// So grava se os numeros mudaram (evita commits desnecessarios)
if (existsSync(ARQUIVO)) {
  try { const antigo = JSON.parse(readFileSync(ARQUIVO, 'utf8')); if (JSON.stringify(antigo.dados) === JSON.stringify(dados)) { console.log('Sem mudancas.'); process.exit(0); } } catch {}
}
writeFileSync(ARQUIVO, JSON.stringify({ geradoEm: new Date().toISOString(), dados }, null, 1));
console.log(`Atualizado: ${dados.areas.length} areas, ${kanban.length} etapas, ${respostas.length} respostas.`);
