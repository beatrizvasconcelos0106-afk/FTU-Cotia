import { useCallback, useEffect, useMemo, useState } from 'react';
import { History, Check, X, Save, ClipboardCheck, Trash2 } from 'lucide-react';
import {
  supabase,
  TIPOS_REUNIAO,
  tipoReuniaoLabel,
  formatDateBR,
  type Adolescente,
  type Presenca,
  type Reuniao,
  type TipoReuniao,
} from '@/lib/supabase';
import { Alert, EmptyState, Spinner } from '@/components/ui';

interface Row {
  adolescente: Adolescente;
  presente: boolean | null;
  presencaId: string | null;
}

export default function Chamada() {
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [tipo, setTipo] = useState<TipoReuniao>('terca-feira');

  const [adolescentes, setAdolescentes] = useState<Adolescente[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [reuniao, setReuniao] = useState<Reuniao | null>(null);
  const [existing, setExisting] = useState<Presenca[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<Reuniao[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadAdolescentes = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data: adols, error: err } = await supabase
      .from('ftu_adolescentes')
      .select('*')
      .neq('status', 'Afastado')
      .order('nome', { ascending: true });
    if (err) {
      setError('Não foi possível carregar a lista de adolescentes.');
      setAdolescentes([]);
    } else {
      setAdolescentes((adols as Adolescente[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAdolescentes();
  }, [loadAdolescentes]);

  // Load existing meeting + attendance whenever date/type changes
  useEffect(() => {
    let cancelled = false;
    const loadMeeting = async () => {
      setSuccess('');
      setError('');
      setExisting([]);
      setReuniao(null);
      const { data: found, error: err } = await supabase
        .from('ftu_reunioes')
        .select('*')
        .eq('data_reuniao', data)
        .eq('tipo', tipo)
        .maybeSingle();
      if (cancelled) return;
      if (err) {
        setError('Não foi possível verificar reuniões nesta data.');
        return;
      }
      if (!found) return;
      const reuniaoRow = found as Reuniao;
      setReuniao(reuniaoRow);
      const { data: pres, error: perr } = await supabase
        .from('ftu_presencas')
        .select('*')
        .eq('reuniao_id', reuniaoRow.id);
      if (cancelled) return;
      if (perr) {
        setError('Não foi possível carregar a chamada salva desta reunião.');
        return;
      }
      setExisting((pres as Presenca[]) ?? []);
    };
    loadMeeting();
    return () => {
      cancelled = true;
    };
  }, [data, tipo]);

  const rowsKey = `${data}|${tipo}|${adolescentes.length}|${existing.length}`;

  useEffect(() => {
    const map = new Map(existing.map((p) => [p.adolescente_id, p]));
    setRows(
      adolescentes.map((a) => {
        const p = map.get(a.id);
        return { adolescente: a, presente: p ? p.presente : null, presencaId: p?.id ?? null };
      }),
    );
  }, [rowsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => {
    const marked = rows.filter((r) => r.presente !== null);
    const presentes = rows.filter((r) => r.presente === true).length;
    return { total: rows.length, marked: marked.length, presentes, faltas: marked.length - presentes };
  }, [rows]);

  const setPresenca = (id: string, presente: boolean) => {
    setRows((prev) =>
      prev.map((r) =>
        r.adolescente.id === id
          ? { ...r, presente: r.presente === presente ? null : presente }
          : r,
      ),
    );
  };

  const marcarTodos = (presente: boolean) => {
    setRows((prev) => prev.map((r) => ({ ...r, presente })));
  };

  const salvar = async () => {
    setSuccess('');
    setError('');
    if (stats.marked === 0) {
      setError('Marque pelo menos um adolescente como presente ou falta antes de salvar.');
      return;
    }
    setSaving(true);
    try {
      let reuniaoId = reuniao?.id ?? null;
      if (!reuniaoId) {
        const { data: created, error: err } = await supabase
          .from('ftu_reunioes')
          .insert({ data_reuniao: data, tipo })
          .select()
          .maybeSingle();
        if (err || !created) {
          if (err?.code === '23505') {
            setError('Já existe uma chamada para esta data e tipo. Recarregue a página.');
          } else {
            setError('Não foi possível criar a reunião. Tente novamente.');
          }
          setSaving(false);
          return;
        }
        reuniaoId = (created as Reuniao).id;
        setReuniao(created as Reuniao);
      }

      const records = rows
        .filter((r) => r.presente !== null)
        .map((r) => ({
          reuniao_id: reuniaoId,
          adolescente_id: r.adolescente.id,
          presente: r.presente as boolean,
        }));

      // Upsert avoids duplicates via the unique constraint (reuniao_id, adolescente_id)
      const { error: upsertErr } = await supabase
        .from('ftu_presencas')
        .upsert(records, { onConflict: 'reuniao_id, adolescente_id' });
      if (upsertErr) {
        setError('Não foi possível salvar a chamada. Tente novamente.');
        setSaving(false);
        return;
      }

      // Refresh existing rows so presencaId stays accurate
      const { data: pres } = await supabase.from('ftu_presencas').select('*').eq('reuniao_id', reuniaoId);
      setExisting((pres as Presenca[]) ?? []);
      setSuccess('Chamada salva com sucesso no servidor.');
    } finally {
      setSaving(false);
    }
  };

  const openHistory = async () => {
    setHistoryOpen(true);
    const { data: reus, error: err } = await supabase
      .from('ftu_reunioes')
      .select('*')
      .order('data_reuniao', { ascending: false })
      .limit(60);
    if (err) {
      setError('Não foi possível carregar as chamadas anteriores.');
      return;
    }
    setHistory((reus as Reuniao[]) ?? []);
  };

  const excluirChamada = async (r: Reuniao) => {
    const confirmado = window.confirm(
      `Excluir a chamada de ${formatDateBR(r.data_reuniao)} — ${tipoReuniaoLabel(r.tipo)}?\n\nAs presenças e faltas dessa chamada também serão removidas. Essa ação não pode ser desfeita.`,
    );
    if (!confirmado) return;

    setDeletingId(r.id);
    setError('');
    setSuccess('');
    const { error: err } = await supabase.from('ftu_reunioes').delete().eq('id', r.id);
    setDeletingId(null);
    if (err) {
      setError('Não foi possível excluir a chamada. Tente novamente.');
      return;
    }

    setHistory((prev) => prev.filter((item) => item.id !== r.id));
    if (reuniao?.id === r.id) {
      setReuniao(null);
      setExisting([]);
      setRows((prev) => prev.map((row) => ({ ...row, presente: null, presencaId: null })));
    }
    setSuccess('Chamada excluída com sucesso.');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fazer chamada</h1>
          <p className="text-sm text-gray-500">Marque presenças e faltas e salve no servidor</p>
        </div>
        <button
          onClick={openHistory}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <History className="w-4 h-4" />
          <span className="hidden sm:inline">Chamadas anteriores</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">Data da reunião</span>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">Tipo de reunião</span>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoReuniao)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
            >
              {TIPOS_REUNIAO.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {reuniao && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            Já existe chamada salva para {formatDateBR(data)} — {tipoReuniaoLabel(tipo)}. Você pode corrigir os
            registros e salvar de novo.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => marcarTodos(true)}
            className="rounded-xl border border-green-300 bg-green-50 text-green-800 px-3 py-1.5 text-xs font-semibold hover:bg-green-100"
          >
            Todos presentes
          </button>
          <button
            onClick={() => marcarTodos(false)}
            className="rounded-xl border border-red-200 bg-red-50 text-red-800 px-3 py-1.5 text-xs font-semibold hover:bg-red-100"
          >
            Nenhum presente
          </button>
          <span className="text-xs text-gray-500 sm:ml-auto">
            {stats.presentes} presentes · {stats.faltas} faltas · {stats.total - stats.marked} sem marcação
          </span>
        </div>
      </div>

      <Alert kind="success" message={success} />
      <Alert kind="error" message={error} />

      {loading ? (
        <Spinner label="Carregando adolescentes..." />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nenhum adolescente disponível"
          description="Cadastre adolescentes na tela Adolescentes. Afastados não aparecem na chamada."
        />
      ) : (
        <ul className="space-y-2">
          {rows.map(({ adolescente: a, presente }) => (
            <li key={a.id} className="bg-white rounded-2xl border border-gray-200 p-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{a.nome}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {[a.ct_responsavel || 'Sem CT', a.sexo === 'M' ? 'M' : a.sexo === 'F' ? 'F' : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <button
                  onClick={() => setPresenca(a.id, true)}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition active:scale-95 ${
                    presente === true
                      ? 'bg-green-600 text-white shadow'
                      : 'bg-green-50 text-green-800 hover:bg-green-100'
                  }`}
                >
                  <Check className="w-4 h-4" /> Presente
                </button>
                <button
                  onClick={() => setPresenca(a.id, false)}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition active:scale-95 ${
                    presente === false ? 'bg-red-600 text-white shadow' : 'bg-red-50 text-red-800 hover:bg-red-100'
                  }`}
                >
                  <X className="w-4 h-4" /> Falta
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {rows.length > 0 && (
        <button
          onClick={salvar}
          disabled={saving}
          className="sticky bottom-4 w-full flex items-center justify-center gap-2 rounded-2xl bg-orange-800 hover:bg-orange-900 text-white font-semibold py-3.5 shadow-lg disabled:opacity-60"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Salvando...' : 'Salvar chamada'}
        </button>
      )}

      {/* History modal */}
      {historyOpen && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setHistoryOpen(false)} />
          <div className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[80dvh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Chamadas anteriores</h2>
              <button onClick={() => setHistoryOpen(false)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              {history.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhuma chamada registrada ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {history.map((r) => (
                    <li key={r.id} className="flex items-center gap-2 rounded-xl border border-gray-200 p-2 hover:bg-gray-50">
                      <button
                        onClick={() => {
                          setData(r.data_reuniao);
                          setTipo(r.tipo);
                          setHistoryOpen(false);
                        }}
                        className="flex-1 flex items-center justify-between gap-3 px-2 py-1 text-left min-w-0"
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <ClipboardCheck className="w-4 h-4 text-orange-800 shrink-0" />
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {formatDateBR(r.data_reuniao)}
                          </span>
                        </span>
                        <span className="text-xs text-gray-500 shrink-0">{tipoReuniaoLabel(r.tipo)}</span>
                      </button>
                      <button
                        onClick={() => excluirChamada(r)}
                        disabled={deletingId === r.id}
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50 shrink-0"
                        title="Excluir chamada"
                        aria-label={`Excluir chamada de ${formatDateBR(r.data_reuniao)}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-gray-400 mt-3">
                Selecione uma reunião para carregar e corrigir os registros. Use o ícone de lixeira somente quando a chamada foi criada por engano.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
