import type { StatusAdolescente } from '@/lib/supabase';

export interface LinhaPlanilha {
  linha: number;
  nome: string;
  sexo: '' | 'M' | 'F';
  telefone: string;
  ct_responsavel: string;
  status: StatusAdolescente;
  observacoes: string;
}

export interface ProblemaLinha {
  linha: number;
  motivo: string;
}

export interface ResultadoLeitura {
  validos: LinhaPlanilha[];
  problemas: ProblemaLinha[];
  duplicadosArquivo: number;
  totalLinhas: number;
}

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normHeader(s: string): string {
  return stripAccents(String(s ?? '')).toLowerCase().trim().replace(/\s+/g, ' ');
}

function normValue(s: string): string {
  return stripAccents(String(s ?? '')).toLowerCase().trim().replace(/\s+/g, ' ');
}

function mapHeader(h: string): string | null {
  const n = normHeader(h);
  if (['nome', 'nome completo', 'adolescente', 'nome do adolescente'].includes(n)) return 'nome';
  if (['sexo', 'genero'].includes(n)) return 'sexo';
  if (['telefone', 'tel', 'celular', 'whatsapp', 'fone'].includes(n)) return 'telefone';
  if (['ct', 'ct responsavel', 'ct_responsavel', 'ct responsÁvel'.toLowerCase()].includes(n)) return 'ct_responsavel';
  if (['status', 'situacao'].includes(n)) return 'status';
  if (['observacoes', 'observacao', 'obs', 'observacoes gerais'].includes(n)) return 'observacoes';
  return null;
}

function parseSexo(v: string): '' | 'M' | 'F' {
  const n = normValue(v);
  if (!n) return '';
  if (['m', 'masc', 'masculino', 'homem', 'menino', 'h'].includes(n)) return 'M';
  if (['f', 'fem', 'feminino', 'mulher', 'menina', 'mtriz'].includes(n)) return 'F';
  return '';
}

function parseStatus(v: string): StatusAdolescente {
  const n = normValue(v).replace(/[.!]/g, '');
  if (!n) return 'Novo';
  if (n.includes('nao') && n.includes('freq')) return 'Nao frequente';
  if (n.includes('afast')) return 'Afastado';
  if (n.includes('freq')) return 'Frequente';
  if (n.includes('novo') || n.includes('nova')) return 'Novo';
  return 'Novo';
}

export function parsePlanilha(rows: Record<string, unknown>[]): ResultadoLeitura {
  if (rows.length === 0) {
    return { validos: [], problemas: [], duplicadosArquivo: 0, totalLinhas: 0 };
  }

  // Detect header row: first row whose cells map to at least 2 known columns
  let headerRowIdx = -1;
  let colMap: Record<number, string> = {};
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const map: Record<number, string> = {};
    Object.keys(rows[i]).forEach((k) => {
      const field = mapHeader(k);
      if (field) map[Number(k)] = field;
    });
    if (Object.keys(map).length >= 2) {
      headerRowIdx = i;
      colMap = map;
      break;
    }
  }

  if (headerRowIdx === -1) {
    return {
      validos: [],
      problemas: [{ linha: 1, motivo: 'Não encontrei colunas reconhecíveis. Use os títulos: Nome, Sexo, Telefone, CT, Status, Observações.' }],
      duplicadosArquivo: 0,
      totalLinhas: rows.length,
    };
  }

  const validos: LinhaPlanilha[] = [];
  const problemas: ProblemaLinha[] = [];
  const vistos = new Set<string>();
  let duplicadosArquivo = 0;

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const linhaNum = i + 1;
    const get = (field: string): string => {
      for (const [col, f] of Object.entries(colMap)) {
        if (f === field) {
          const v = row[col];
          if (v === null || v === undefined) return '';
          return String(v).trim();
        }
      }
      return '';
    };

    const nome = get('nome');
    if (!nome) {
      // Completely empty row: ignore silently
      const anyValue = Object.values(row).some((v) => v !== null && v !== undefined && String(v).trim() !== '');
      if (!anyValue) continue;
      problemas.push({ linha: linhaNum, motivo: 'Sem nome' });
      continue;
    }

    const chave = normValue(nome);
    if (vistos.has(chave)) {
      duplicadosArquivo++;
      continue;
    }
    vistos.add(chave);

    validos.push({
      linha: linhaNum,
      nome,
      sexo: parseSexo(get('sexo')),
      telefone: get('telefone'),
      ct_responsavel: get('ct_responsavel'),
      status: parseStatus(get('status')),
      observacoes: get('observacoes'),
    });
  }

  return { validos, problemas, duplicadosArquivo, totalLinhas: rows.length - headerRowIdx - 1 };
}
