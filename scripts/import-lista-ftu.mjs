import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes no ambiente.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
const excelToDate = (v) => {
  if (typeof v !== 'number' || Number.isNaN(v)) return null;
  const d = new Date(EXCEL_EPOCH + Math.round(v) * 86400000);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};
const clean = (v) => (typeof v === 'string' ? v.trim() : v ?? null);
const isBatizado = (v) => /^sim/i.test(String(clean(v) ?? ''));
const semTelefone = (v) => /n.o est. no grupo/i.test(String(clean(v) ?? '')) || !clean(v);
const fmtTelefone = (v) => {
  if (semTelefone(v)) return null;
  let s = String(v).replace(/\D/g, '');
  if (s.length === 10 || s.length === 11) s = `55${s}`;
  return `+${s}`;
};

const wb = XLSX.read(readFileSync('src/components/Lista_Teens_Atualizada_22.11.2026.xlsx'));
const ctMap = {
  Beatriz: 'Beatriz', Gabriela: 'Gabriela', Gustavo: 'Gustavo', Jaemerson: 'Jaemerson',
  Mariana: 'Mariana', Ruth: 'Ruth', Felipe: 'Felipe',
};
const mapCT = (v) => {
  const s = String(clean(v) ?? '');
  return ctMap[s] ?? (s || null);
};
const mapStatus = (v) => {
  const s = String(clean(v) ?? '').toLowerCase();
  if (s.startsWith('frequente')) return 'Frequente';
  if (s.includes('não frequente') || s.includes('nao frequente')) return 'Nao frequente';
  return 'Novo';
};

// ---------- Lista FTU -> ftu_adolescentes ----------
const lista = XLSX.utils.sheet_to_json(wb.Sheets['Lista FTU'], { defval: '' });
const adolescentes = lista
  .filter((r) => clean(r['Nome']))
  .map((r) => ({
    nome: String(clean(r['Nome'])),
    sexo: /^girl/i.test(String(r['Teens'] ?? '')) ? 'F' : 'M',
    batismo_aguas: isBatizado(r['Batismo Águas ']),
    batismo_espirito_santo: isBatizado(r['Batismo Espírito Santo ']),
    telefone: fmtTelefone(r['Telefone']),
    data_nascimento: excelToDate(r['D. Nasc']),
    responsavel: clean(r['Responsável ']),
    telefone_responsavel: fmtTelefone(r['Telefone2']),
    ct_responsavel: mapCT(r['CT']),
    status: mapStatus(r['Status']),
    observacoes: clean(r['obs']) || null,
  }));

// ---------- Saída FTU -> ftu_saidas (via adolescentes já importados) ----------
const saidaSheet = XLSX.utils.sheet_to_json(wb.Sheets['Saída FTU'], { defval: '' });
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const motivoToTipo = (motivo) =>
  /formatura/i.test(String(motivo)) ? 'Transferencia FJU' : 'Afastado';

const saidas = saidaSheet
  .filter((r) => clean(r['Nome']))
  .map((r) => ({
    nome: String(clean(r['Nome'])),
    data_saida: excelToDate(r['Motivo']),
    motivo: clean(r['__EMPTY']) ?? null,
  }));

console.log(`Planilha: ${adolescentes.length} adolescentes, ${saidas.length} saídas.`);

const { data: existentes, error: errSel } = await supabase
  .from('ftu_adolescentes')
  .select('id, nome');
if (errSel) {
  console.error('Falha ao consultar adolescentes existentes:', errSel.message);
  process.exit(1);
}
const porNome = new Map((existentes ?? []).map((a) => [norm(a.nome), a]));

let inseridos = 0;
let atualizados = 0;
for (const a of adolescentes) {
  const key = norm(a.nome);
  if (porNome.has(key)) {
    const { error } = await supabase
      .from('ftu_adolescentes')
      .update({
        batismo_aguas: a.batismo_aguas,
        batismo_espirito_santo: a.batismo_espirito_santo,
        data_nascimento: a.data_nascimento,
        responsavel: a.responsavel,
        telefone_responsavel: a.telefone_responsavel,
        ct_responsavel: a.ct_responsavel,
        status: a.status,
        observacoes: a.observacoes,
      })
      .eq('nome', a.nome);
    if (error) console.error('  update falhou:', a.nome, error.message);
    else atualizados++;
  } else {
    const { error } = await supabase.from('ftu_adolescentes').insert(a);
    if (error) console.error('  insert falhou:', a.nome, error.message);
    else {
      porNome.set(key, { id: '', nome: a.nome });
      inseridos++;
    }
  }
}

// Saídas: garantir que cada teen da aba Saída FTU exista no cadastro e tenha sua saída
const { data: todos, error: errTodos } = await supabase
  .from('ftu_adolescentes')
  .select('id, nome');
if (errTodos) {
  console.error('Falha ao recarregar cadastro:', errTodos.message);
  process.exit(1);
}
const porNomeFinal = new Map((todos ?? []).map((a) => [norm(a.nome), a]));

const { data: saidasExistentes, error: errSaidas } = await supabase
  .from('ftu_saidas')
  .select('adolescente_id, data_saida');
if (errSaidas) {
  console.error('Falha ao consultar saídas:', errSaidas.message);
  process.exit(1);
}
const saidaChave = new Set((saidasExistentes ?? []).map((s) => `${s.adolescente_id}|${s.data_saida}`));

let saidasInseridas = 0;
let teensSaidaCriados = 0;
for (const s of saidas) {
  if (!s.data_saida) continue;
  const key = norm(s.nome);
  let teen = porNomeFinal.get(key);
  if (!teen) {
    const { data, error } = await supabase
      .from('ftu_adolescentes')
      .insert({ nome: s.nome, status: 'Afastado' })
      .select('id')
      .single();
    if (error) {
      console.error('  cadastro teen saída falhou:', s.nome, error.message);
      continue;
    }
    teen = data;
    porNomeFinal.set(key, teen);
    teensSaidaCriados++;
  }
  const chave = `${teen.id}|${s.data_saida}`;
  if (saidaChave.has(chave)) continue;
  const { error } = await supabase.from('ftu_saidas').insert({
    adolescente_id: teen.id,
    tipo: motivoToTipo(s.motivo),
    data_saida: s.data_saida,
    observacoes: s.motivo,
  });
  if (error) console.error('  saída falhou:', s.nome, error.message);
  else saidasInseridas++;
}

console.log(
  `Concluído: ${inseridos} adolescentes inseridos, ${atualizados} atualizados, ` +
  `${teensSaidaCriados} criados pela aba Saída, ${saidasInseridas} saídas importadas.`,
);
