import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Plus, Pencil, X, LogOut, Search } from 'lucide-react';
import { supabase, formatDateBR, type Saida, type Adolescente } from '@/lib/supabase';
import { Alert, EmptyState, Spinner } from '@/components/ui';

type TipoSaida = 'Afastado' | 'Transferencia FJU';

interface FormState {
  id: string | null;
  adolescente_id: string;
  tipo: TipoSaida;
  data_saida: string;
  observacoes: string;
}

interface SaidaComNome extends Saida {
  adolescente_nome?: string;
}

const inputCls =
  'w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600';

export default function Saidas() {
  const [items, setItems] = useState<SaidaComNome[]>([]);
  const [adolescentes, setAdolescentes] = useState<Adolescente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [aba, setAba] = useState<TipoSaida>('Afastado');
  const [busca, setBusca] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    const [saidasRes, adolRes] = await Promise.all([
      supabase
        .from('ftu_saidas')
        .select('*, ftu_adolescentes(nome)')
        .order('data_saida', { ascending: false }),
      supabase.from('ftu_adolescentes').select('*').order('nome', { ascending: true }),
    ]);
    if (saidasRes.error || adolRes.error) {
      setError('Não foi possível carregar as saídas. Tente novamente.');
    } else {
      const raw = (saidasRes.data as Record<string, unknown>[]) ?? [];
      setItems(
        raw.map((r) => ({
          ...(r as unknown as Saida),
          adolescente_nome: (r.ftu_adolescentes as { nome: string } | null)?.nome,
        })),
      );
      setAdolescentes((adolRes.data as Adolescente[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setFormError('');
    if (!form.adolescente_id) {
      setFormError('Selecione o adolescente.');
      return;
    }
    if (!form.data_saida) {
      setFormError('Informe a data da saída.');
      return;
    }
    setSaving(true);
    const payload = {
      adolescente_id: form.adolescente_id,
      tipo: form.tipo,
      data_saida: form.data_saida,
      observacoes: form.observacoes.trim() || null,
    };
    const { error: err } = form.id
      ? await supabase.from('ftu_saidas').update(payload).eq('id', form.id)
      : await supabase.from('ftu_saidas').insert(payload);
    setSaving(false);
    if (err) {
      setFormError('Não foi possível salvar a saída. Tente novamente.');
      return;
    }

    // Keep the adolescent status consistent with the exit record
    const novoStatus = form.tipo === 'Afastado' ? 'Afastado' : form.tipo;
    const { error: errStatus } = await supabase
      .from('ftu_adolescentes')
      .update({ status: 'Afastado' })
      .eq('id', form.adolescente_id);
    if (errStatus) {
      setSuccess(
        'Saída registrada, mas não foi possível atualizar o status do adolescente. Ajuste manualmente em Adolescentes.',
      );
    } else {
      setSuccess(form.id ? 'Saída atualizada com sucesso.' : 'Saída registrada com sucesso.');
    }
    void novoStatus;
    setForm(null);
    load();
  };

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return items.filter((s) => {
      if (s.tipo !== aba) return false;
      if (q && !(s.adolescente_nome ?? '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, aba, busca]);

  const totalAfastados = items.filter((s) => s.tipo === 'Afastado').length;
  const totalTransferidos = items.filter((s) => s.tipo === 'Transferencia FJU').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Saída FTU</h1>
          <p className="text-sm text-gray-500">Afastados e transferências para a FJU</p>
        </div>
        <button
          onClick={() => {
            setSuccess('');
            setForm({
              id: null,
              adolescente_id: '',
              tipo: aba,
              data_saida: new Date().toISOString().slice(0, 10),
              observacoes: '',
            });
          }}
          className="flex items-center gap-2 rounded-xl bg-green-700 hover:bg-green-800 active:scale-[0.98] transition text-white text-sm font-semibold px-4 py-2.5"
        >
          <Plus className="w-4 h-4" /> Nova saída
        </button>
      </div>

      <Alert kind="success" message={success} />

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
          {(
            [
              { v: 'Afastado' as TipoSaida, label: 'Afastado', total: totalAfastados },
              { v: 'Transferencia FJU' as TipoSaida, label: 'Transferência FJU', total: totalTransferidos },
            ]
          ).map((t) => (
            <button
              key={t.v}
              onClick={() => setAba(t.v)}
              className={`flex-1 sm:flex-none rounded-lg px-4 py-2 text-sm font-semibold transition ${
                aba === t.v ? 'bg-white text-green-900 shadow' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label} ({t.total})
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome..."
            className="w-full rounded-xl border border-gray-300 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
          />
        </div>
      </div>

      {loading ? (
        <Spinner label="Carregando saídas..." />
      ) : error ? (
        <Alert kind="error" message={error} />
      ) : filtrados.length === 0 ? (
        <EmptyState
          title={aba === 'Afastado' ? 'Nenhum afastado registrado' : 'Nenhuma transferência FJU registrada'}
          description="Registre uma saída com o botão Nova saída. O histórico do adolescente é preservado."
        />
      ) : (
        <ul className="space-y-2">
          {filtrados.map((s) => (
            <li key={s.id} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    s.tipo === 'Afastado'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-orange-100 text-orange-800'
                  }`}
                >
                  <LogOut className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{s.adolescente_nome || 'Adolescente'}</p>
                  <p className="text-xs text-gray-500">
                    {s.tipo === 'Afastado' ? 'Afastado' : 'Transferência FJU'} · {formatDateBR(s.data_saida)}
                  </p>
                  {s.observacoes && <p className="text-sm text-gray-700 mt-1.5">{s.observacoes}</p>}
                </div>
                <button
                  onClick={() => {
                    setSuccess('');
                    setForm({
                      id: s.id,
                      adolescente_id: s.adolescente_id,
                      tipo: s.tipo,
                      data_saida: s.data_saida,
                      observacoes: s.observacoes ?? '',
                    });
                  }}
                  className="p-2 rounded-lg text-green-700 hover:bg-green-50"
                  title="Editar"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {form && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setForm(null)} />
          <div className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[90dvh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">{form.id ? 'Editar saída' : 'Nova saída'}</h2>
              <button onClick={() => setForm(null)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-3">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Adolescente *</span>
                <select
                  value={form.adolescente_id}
                  onChange={(e) => setForm({ ...form, adolescente_id: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Selecione...</option>
                  {adolescentes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Tipo de saída *</span>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoSaida })}
                  className={inputCls}
                >
                  <option value="Afastado">Afastado</option>
                  <option value="Transferencia FJU">Transferência FJU</option>
                </select>
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Data da saída *</span>
                <input
                  type="date"
                  value={form.data_saida}
                  onChange={(e) => setForm({ ...form, data_saida: e.target.value })}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Observações</span>
                <textarea
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  rows={3}
                  className={inputCls}
                />
              </label>

              <Alert kind="error" message={formError} />

              <p className="text-xs text-gray-400">
                Ao registrar uma saída, o adolescente fica com status "Afastado" e deixa de aparecer na
                chamada. O histórico dele (presenças e atendimentos) é preservado.
              </p>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setForm(null)}
                  className="flex-1 rounded-xl border border-gray-300 text-gray-700 font-medium py-2.5 text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-green-700 hover:bg-green-800 text-white font-semibold py-2.5 text-sm disabled:opacity-60"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
