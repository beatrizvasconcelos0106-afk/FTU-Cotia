import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type StatusAdolescente = 'Novo' | 'Frequente' | 'Nao frequente' | 'Afastado';

export type TipoReuniao = 'terca-feira' | 'sexta-feira' | 'sabado_ftu_play' | 'domingo_auditorio';

export interface Adolescente {
  id: string;
  nome: string;
  sexo: 'M' | 'F' | null;
  telefone: string | null;
  ct_responsavel: string | null;
  status: StatusAdolescente;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conselheiro {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  ct_responsavel: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Reuniao {
  id: string;
  data_reuniao: string;
  tipo: TipoReuniao;
  observacoes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Presenca {
  id: string;
  reuniao_id: string;
  adolescente_id: string;
  presente: boolean;
  registrado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface Atendimento {
  id: string;
  adolescente_id: string;
  conselheiro_id: string | null;
  data_atendimento: string;
  observacoes: string | null;
  retorno: string | null;
  created_at: string;
  updated_at: string;
}

export interface Saida {
  id: string;
  adolescente_id: string;
  tipo: 'Afastado' | 'Transferencia FJU';
  data_saida: string;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export const STATUS_OPTIONS: { value: StatusAdolescente; label: string }[] = [
  { value: 'Novo', label: 'Novo' },
  { value: 'Frequente', label: 'Frequente' },
  { value: 'Nao frequente', label: 'Não frequente' },
  { value: 'Afastado', label: 'Afastado' },
];

export const TIPOS_REUNIAO: { value: TipoReuniao; label: string }[] = [
  { value: 'terca-feira', label: 'Terça-feira' },
  { value: 'sexta-feira', label: 'Sexta-feira' },
  { value: 'sabado_ftu_play', label: 'Sábado FTU Play' },
  { value: 'domingo_auditorio', label: 'Domingo Auditório' },
];

export function tipoReuniaoLabel(tipo: string): string {
  return TIPOS_REUNIAO.find((t) => t.value === tipo)?.label ?? tipo;
}

export function statusLabel(status: string): string {
  if (status === 'Nao frequente') return 'Não frequente';
  return status;
}

export function statusColor(status: string): string {
  switch (status) {
    case 'Novo':
      return 'bg-sky-100 text-sky-800';
    case 'Frequente':
      return 'bg-green-100 text-green-800';
    case 'Nao frequente':
      return 'bg-amber-100 text-amber-800';
    case 'Afastado':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function formatDateBR(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  if (!y || !m || !d) return dateISO;
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}
