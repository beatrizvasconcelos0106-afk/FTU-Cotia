import { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, AlertTriangle, CalendarDays } from 'lucide-react';
import {
  supabase,
  formatDateBR,
  statusLabel,
  tipoReuniaoLabel,
  type Adolescente,
  type Presenca,
  type Reuniao,
} from '@/lib/supabase';
import { Alert, Spinner, StatCard } from '@/components/ui';
import type { PageKey } from '@/components/Layout';

interface ReuniaoComPresencas extends Reuniao {
  ftu_presencas: Presenca[];
}

export default function Painel({ onNavigate }: { onNavigate: (p: PageKey) => void }) {
  const [adolescentes, setAdolescentes] = useState<Adolescente[]>([]);
  const [reunioes, setReunioes] = useState<ReuniaoComPresencas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    const [adolRes, reunRes] = await Promise.all([
      supabase.from('ftu_adolescentes').select('*').order('nome', { ascending: true }),
      supabase
        .from('ftu_reunioes')
        .select('*, ftu_presencas(*)')
        .order('data_reuniao', { ascending: false })
        .limit(6),
    ]);
    if (adolRes.error || reunRes.error) {
      setError('Não foi possível carregar os dados do painel.');
    } else {
      setAdolescentes((adolRes.data as Adolescente[]) ?? []);
      setReunioes((reunRes.data as ReuniaoComPresencas[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const porStatus: Record<string, number> = { Novo: 0, Frequente: 0, 'Nao frequente': 0, Afastado: 0 };
    adolescentes.forEach((a) => {
      porStatus[a.status] = (porStatus[a.status] ?? 0) + 1;
    });
    return porStatus;
  }, [adolescentes]);

  const acompanhamento = useMemo(() => {
    const ativos = adolescentes.filter((a) => a.status !== 'Afastado');
    const reunioesPorAdol = new Map<string, { data: string; presente: boolean }[]>();
    const ordem = [...reunioes].sort((r1, r2) => r1.data_reuniao.localeCompare(r2.data_reuniao));
    ordem.forEach((r) => {
      r.ftu_presencas.forEach((p) => {
        const list = reunioesPorAdol.get(p.adolescente_id) ?? [];
        list.push({ data: r.data_reuniao, presente: p.presente });
        reunioesPorAdol.set(p.adolescente_id, list);
      });
    });
    return ativos
      .map((a) => {
        const regs = reunioesPorAdol.get(a.id) ?? [];
        const duasConsecutivas =
          regs.length >= 2 && !regs[regs.length - 1].presente && !regs[regs.length - 2].presente;
        const presencas = regs.filter((r) => r.presente).length;
        const pct = regs.length > 0 ? Math.round((presencas / regs.length) * 100) : -1;
        const motivo =
          duasConsecutivas && pct >= 0 && pct < 50
            ? '2 faltas seguidas · frequência abaixo de 50%'
            : duasConsecutivas
              ? '2 faltas seguidas'
              : pct >= 0 && pct < 50
                ? 'Frequência abaixo de 50%'
                : a.status === 'Nao frequente'
                  ? 'Status: não frequente'
                  : '';
        return motivo ? { adolescente: a, motivo } : null;
      })
      .filter((x): x is { adolescente: Adolescente; motivo: string } => x !== null)
      .slice(0, 8);
  }, [adolescentes, reunioes]);

  if (loading) return <Spinner label="Carregando painel..." />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Painel</h1>
        <p className="text-sm text-gray-500">Visão geral do FTU Cotia</p>
      </div>

      <Alert kind="error" message={error} />

      <section className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard label="Frequentes" value={stats['Frequente'] ?? 0} tone="green" />
        <StatCard label="Não frequentes" value={stats['Nao frequente'] ?? 0} tone="amber" />
        <StatCard label="Novos" value={stats['Novo'] ?? 0} tone="sky" />
      </section>

      <button
        onClick={() => onNavigate('chamada')}
        className="w-full flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-green-700 to-green-800 text-white p-5 text-left shadow-md hover:from-green-800 hover:to-green-900 transition active:scale-[0.99]"
      >
        <span>
          <span className="flex items-center gap-2 font-bold">
            <ClipboardCheck className="w-5 h-5" /> Fazer chamada de hoje
          </span>
          <span className="text-sm text-green-100">Selecione a data, marque presenças e salve</span>
        </span>
      </button>

      <section className="bg-white rounded-2xl border border-gray-200 p-4">
        <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          Adolescentes que precisam de acompanhamento
        </h2>
        {acompanhamento.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum alerta no momento.</p>
        ) : (
          <ul className="space-y-2">
            {acompanhamento.map(({ adolescente, motivo }) => (
              <li
                key={adolescente.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5 text-sm"
              >
                <span className="text-gray-900 font-medium truncate">{adolescente.nome}</span>
                <span className="text-xs text-orange-800 text-right shrink-0">{motivo}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-gray-200 p-4">
        <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-green-700" />
          Últimas reuniões
        </h2>
        {reunioes.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma chamada registrada ainda.</p>
        ) : (
          <ul className="space-y-2">
            {reunioes.map((r) => {
              const presentes = r.ftu_presencas.filter((p) => p.presente).length;
              const total = r.ftu_presencas.length;
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm"
                >
                  <span className="text-gray-900 font-medium">
                    {formatDateBR(r.data_reuniao)}
                    <span className="text-gray-400 font-normal"> · {tipoReuniaoLabel(r.tipo)}</span>
                  </span>
                  <span className="text-xs text-gray-600 shrink-0">
                    {presentes}P / {total - presentes}F
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <button
          onClick={() => onNavigate('relatorios')}
          className="mt-3 text-sm font-medium text-green-700 hover:underline"
        >
          Ver relatórios completos
        </button>
      </section>
    </div>
  );
}
