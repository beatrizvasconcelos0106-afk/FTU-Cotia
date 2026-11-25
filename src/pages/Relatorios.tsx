import { useEffect, useMemo, useState } from 'react';
import { TrendingDown, AlertTriangle } from 'lucide-react';
import {
  supabase,
  formatDateBR,
  statusLabel,
  tipoReuniaoLabel,
  type Adolescente,
  type Presenca,
  type Reuniao,
} from '@/lib/supabase';
import { Alert, EmptyState, Spinner, StatCard } from '@/components/ui';

interface ReuniaoComPresencas extends Reuniao {
  ftu_presencas: Presenca[];
}

interface FrequenciaIndividual {
  adolescente: Adolescente;
  presencas: number;
  faltas: number;
  percentual: number;
  duasFaltasConsecutivas: boolean;
}

export default function Relatorios() {
  const [reunioes, setReunioes] = useState<ReuniaoComPresencas[]>([]);
  const [adolescentes, setAdolescentes] = useState<Adolescente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [filtroCT, setFiltroCT] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    const [reunRes, adolRes] = await Promise.all([
      supabase.from('ftu_reunioes').select('*, ftu_presencas(*)').order('data_reuniao', { ascending: false }),      supabase.from('ftu_adolescentes').select('*').order('nome', { ascending: true }),
    ]);
    if (reunRes.error || adolRes.error) {
      setError('Não foi possível carregar os dados dos relatórios.');
    } else {
      setReunioes((reunRes.data as ReuniaoComPresencas[]) ?? []);
      setAdolescentes((adolRes.data as Adolescente[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const cts = useMemo(
    () =>
      Array.from(new Set(adolescentes.map((a) => a.ct_responsavel).filter((c): c is string => !!c))).sort(),
    [adolescentes],
  );

  const reunioesFiltradas = useMemo(
    () =>
      reunioes.filter((r) => {
        if (periodoInicio && r.data_reuniao < periodoInicio) return false;
        if (periodoFim && r.data_reuniao > periodoFim) return false;
        return true;
      }),
    [reunioes, periodoInicio, periodoFim],
  );

  const adolescentesFiltrados = useMemo(
    () => adolescentes.filter((a) => !filtroCT || a.ct_responsavel === filtroCT),
    [adolescentes, filtroCT],
  );

  const idsFiltrados = useMemo(() => new Set(adolescentesFiltrados.map((a) => a.id)), [adolescentesFiltrados]);

  const totais = useMemo(() => {
    const porStatus = { Novo: 0, Frequente: 0, 'Nao frequente': 0, Afastado: 0 } as Record<string, number>;
    adolescentesFiltrados.forEach((a) => {
      porStatus[a.status] = (porStatus[a.status] ?? 0) + 1;
    });
    return porStatus;
  }, [adolescentesFiltrados]);

  const presencasPorReuniao = useMemo(() => {
    return reunioesFiltradas.map((r) => {
      const relevantes = r.ftu_presencas.filter((p) => idsFiltrados.has(p.adolescente_id));
      const presentes = relevantes.filter((p) => p.presente).length;
      return { reuniao: r, presentes, faltas: relevantes.length - presentes };
    });
  }, [reunioesFiltradas, idsFiltrados]);

  const frequenciaIndividual = useMemo<FrequenciaIndividual[]>(() => {
    return adolescentesFiltrados
      .map((a) => {
        const regs = reunioesFiltradas.flatMap((r) =>
          r.ftu_presencas.filter((p) => p.adolescente_id === a.id),
        );
        // Order by meeting date to detect consecutive misses
        const ordenados = regs.sort((p1, p2) => {
          const d1 = reunioesFiltradas.find((r) => r.id === p1.reuniao_id)?.data_reuniao ?? '';
          const d2 = reunioesFiltradas.find((r) => r.id === p2.reuniao_id)?.data_reuniao ?? '';
          return d1.localeCompare(d2);
        });
        let duasConsecutivas = false;
        for (let i = 1; i < ordenados.length; i++) {
          if (!ordenados[i].presente && !ordenados[i - 1].presente) duasConsecutivas = true;
        }
        const presencas = regs.filter((p) => p.presente).length;
        const total = regs.length;
        return {
          adolescente: a,
          presencas,
          faltas: total - presencas,
          percentual: total > 0 ? Math.round((presencas / total) * 100) : -1,
          duasFaltasConsecutivas: duasConsecutivas,
        };
      })
      .sort((a, b) => a.adolescente.nome.localeCompare(b.adolescente.nome));
  }, [adolescentesFiltrados, reunioesFiltradas]);

  const frequenciaMensal = useMemo(() => {
    const map = new Map<string, { presentes: number; total: number }>();
    reunioesFiltradas.forEach((r) => {
      const mes = r.data_reuniao.slice(0, 7);
      r.ftu_presencas
        .filter((p) => idsFiltrados.has(p.adolescente_id))
        .forEach((p) => {
          const cur = map.get(mes) ?? { presentes: 0, total: 0 };
          cur.total += 1;
          if (p.presente) cur.presentes += 1;
          map.set(mes, cur);
        });
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .reverse()
      .map(([mes, v]) => ({
        mes,
        label: formatMes(mes),
        percentual: v.total > 0 ? Math.round((v.presentes / v.total) * 100) : 0,
        presentes: v.presentes,
        total: v.total,
      }));
  }, [reunioesFiltradas, idsFiltrados]);

  const alertas = useMemo(() => {
    const acompanhamento = frequenciaIndividual.filter(
      (f) => f.duasFaltasConsecutivas || (f.percentual >= 0 && f.percentual < 50),
    );
    const mesesBaixos = frequenciaMensal.filter((m) => m.percentual < 50);
    return { acompanhamento, mesesBaixos };
  }, [frequenciaIndividual, frequenciaMensal]);

  if (loading) return <Spinner label="Calculando relatórios..." />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-sm text-gray-500">Frequência e acompanhamento dos adolescentes</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Período — de</span>
          <input
            type="date"
            value={periodoInicio}
            onChange={(e) => setPeriodoInicio(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Período — até</span>
          <input
            type="date"
            value={periodoFim}
            onChange={(e) => setPeriodoFim(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">CT</span>
          <select
            value={filtroCT}
            onChange={(e) => setFiltroCT(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
          >
            <option value="">Todos os CTs</option>
            {cts.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Alert kind="error" message={error} />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total de adolescentes" value={adolescentesFiltrados.length} tone="green" />
        <StatCard label="Frequentes" value={totais['Frequente'] ?? 0} tone="green" />
        <StatCard label="Não frequentes" value={totais['Nao frequente'] ?? 0} tone="amber" />
        <StatCard label="Novos" value={totais['Novo'] ?? 0} tone="sky" />
      </section>

      {reunioesFiltradas.length === 0 ? (
        <EmptyState
          title="Nenhuma reunião no período"
          description="Salve chamadas na tela Fazer chamada para ver os relatórios."
        />
      ) : (
        <>
          <section className="bg-white rounded-2xl border border-gray-200 p-4">
            <h2 className="font-bold text-gray-900 mb-3">Presenças e faltas por reunião</h2>
            <ul className="space-y-2">
              {presencasPorReuniao.map(({ reuniao: r, presentes, faltas }) => {
                const total = presentes + faltas;
                const pct = total > 0 ? Math.round((presentes / total) * 100) : 0;
                return (
                  <li key={r.id} className="text-sm">
                    <div className="flex justify-between gap-2 mb-1">
                      <span className="text-gray-800 font-medium">
                        {formatDateBR(r.data_reuniao)}{' '}
                        <span className="text-gray-400 font-normal">· {tipoReuniaoLabel(r.tipo)}</span>
                      </span>
                      <span className="text-gray-600 shrink-0">
                        {presentes}P / {faltas}F ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pct >= 50 ? 'bg-green-600' : 'bg-orange-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 p-4">
            <h2 className="font-bold text-gray-900 mb-3">Frequência mensal</h2>
            {frequenciaMensal.length === 0 ? (
              <p className="text-sm text-gray-500">Sem dados no período.</p>
            ) : (
              <ul className="space-y-2">
                {frequenciaMensal.map((m) => (
                  <li key={m.mes} className="text-sm">
                    <div className="flex justify-between mb-1">
                      <span className={`font-medium ${m.percentual < 50 ? 'text-red-700' : 'text-gray-800'}`}>
                        {m.label}
                      </span>
                      <span className="text-gray-600">{m.percentual}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${m.percentual < 50 ? 'bg-red-500' : 'bg-green-600'}`}
                        style={{ width: `${m.percentual}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 p-4">
            <h2 className="font-bold text-gray-900 mb-1">Frequência individual</h2>
            <p className="text-xs text-gray-500 mb-3">
              Percentual = presenças / total de chamadas em que o adolescente foi registrado no período.
            </p>
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                    <th className="py-2 font-medium">Nome</th>
                    <th className="py-2 font-medium">Status</th>
                    <th className="py-2 font-medium text-center">P</th>
                    <th className="py-2 font-medium text-center">F</th>
                    <th className="py-2 font-medium text-center">Freq.</th>
                  </tr>
                </thead>
                <tbody>
                  {frequenciaIndividual.map((f) => (
                    <tr key={f.adolescente.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 text-gray-900">{f.adolescente.nome}</td>
                      <td className="py-2 text-gray-600">{statusLabel(f.adolescente.status)}</td>
                      <td className="py-2 text-center text-green-700 font-medium">{f.presencas}</td>
                      <td className="py-2 text-center text-red-700 font-medium">{f.faltas}</td>
                      <td
                        className={`py-2 text-center font-semibold ${
                          f.percentual < 0 ? 'text-gray-400' : f.percentual < 50 ? 'text-red-700' : 'text-green-700'
                        }`}
                      >
                        {f.percentual < 0 ? '—' : `${f.percentual}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 p-4">
            <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Precisam de acompanhamento
            </h2>
            {alertas.acompanhamento.length === 0 ? (
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-green-600" />
                Nenhum adolescente em situação de alerta no período.
              </p>
            ) : (
              <ul className="space-y-2">
                {alertas.acompanhamento.map((f) => (
                  <li
                    key={f.adolescente.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5 text-sm"
                  >
                    <span className="text-gray-900 font-medium">{f.adolescente.nome}</span>
                    <span className="text-xs text-orange-800 text-right">
                      {f.duasFaltasConsecutivas && '2 faltas seguidas'}
                      {f.duasFaltasConsecutivas && f.percentual >= 0 && f.percentual < 50 && ' · '}
                      {f.percentual >= 0 && f.percentual < 50 && `frequência ${f.percentual}%`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {alertas.mesesBaixos.length > 0 && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
                <strong>Atenção:</strong> frequência mensal abaixo de 50% em{' '}
                {alertas.mesesBaixos.map((m) => m.label).join(', ')}.
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function formatMes(mes: string): string {
  const [y, m] = mes.split('-').map(Number);
  const nomes = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  if (!y || !m || m < 1 || m > 12) return mes;
  return `${nomes[m - 1]} ${y}`;
}
