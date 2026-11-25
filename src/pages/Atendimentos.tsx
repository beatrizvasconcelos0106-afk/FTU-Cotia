import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Plus, Pencil, X, HandHeart } from 'lucide-react';
import { supabase, formatDateBR, type Atendimento, type Adolescente, type Conselheiro } from '@/lib/supabase';
import { Alert, EmptyState, Spinner } from '@/components/ui';

interface FormState {
  id: string | null;
  adolescente_id: string;
  conselheiro_id: string;
  data_atendimento: string;
  observacoes: string;
  retorno: string;
}

interface AtendimentoComNomes extends Atendimento {
  adolescente_nome?: string;
  conselheiro_nome?: string;
}

const inputCls =
  'w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600';

export default function Atendimentos() {
  const [items, setItems] = useState<AtendimentoComNomes[]>([]);
  const [adolescentes, setAdolescentes] = useState<Adolescente[]>([]);
  const [conselheiros, setConselheiros] = useState<Conselheiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    const [atendRes, adolRes, consRes] = await Promise.all([
      supabase
        .from('ftu_atendimentos')
        .select('*, ftu_adolescentes(nome), ftu_conselheiros(nome)')
        .order('data_atendimento', { ascending: false }),
      supabase.from('ftu_adolescentes').select('*').order('nome', { ascending: true }),
      supabase.from('ftu_conselheiros').select('*').order('nome', { ascending: true }),
    ]);
    if (atendRes.error || adolRes.error || consRes.error) {
      setError('Não foi possível carregar os atendimentos. Tente novamente.');
    } else {
      const raw = (atendRes.data as Record<string, unknown>[]) ?? [];
      setItems(
        raw.map((r) => ({
          ...(r as unknown as Atendimento),
          adolescente_nome: (r.ftu_adolescentes as { nome: string } | null)?.nome,
          conselheiro_nome: (r.ftu_conselheiros as { nome: string } | null)?.nome,
        })),
      );
      setAdolescentes((adolRes.data as Adolescente[]) ?? []);
      setConselheiros((consRes.data as Conselheiro[]) ?? []);
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
      setFormError('Selecione o adolescente atendido.');
      return;
    }
    if (!form.data_atendimento) {
      setFormError('Informe a data do atendimento.');
      return;
    }
    setSaving(true);
    const payload = {
      adolescente_id: form.adolescente_id,
      conselheiro_id: form.conselheiro_id || null,
      data_atendimento: form.data_atendimento,
      observacoes: form.observacoes.trim() || null,
      retorno: form.retorno.trim() || null,
    };
    const { error: err } = form.id
      ? await supabase.from('ftu_atendimentos').update(payload).eq('id', form.id)
      : await supabase.from('ftu_atendimentos').insert(payload);
    setSaving(false);
    if (err) {
      setFormError('Não foi possível salvar o atendimento. Tente novamente.');
      return;
    }
    setForm(null);
    setSuccess(form.id ? 'Atendimento atualizado com sucesso.' : 'Atendimento registrado com sucesso.');
    load();
  };

  const porAdolescente = useMemo(() => {
    const map = new Map<string, AtendimentoComNomes[]>();
    items.forEach((a) => {
      const list = map.get(a.adolescente_id) ?? [];
      list.push(a);
      map.set(a.adolescente_id, list);
    });
    return map;
  }, [items]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Atendimento dos conselheiros</h1>
          <p className="text-sm text-gray-500">{items.length} atendimentos registrados</p>
        </div>
        <button
          onClick={() => {
            setSuccess('');
            setForm({
              id: null,
              adolescente_id: '',
              conselheiro_id: '',
              data_atendimento: new Date().toISOString().slice(0, 10),
              observacoes: '',
              retorno: '',
            });
          }}
          className="flex items-center gap-2 rounded-xl bg-green-700 hover:bg-green-800 active:scale-[0.98] transition text-white text-sm font-semibold px-4 py-2.5"
        >
          <Plus className="w-4 h-4" /> Novo
        </button>
      </div>

      <Alert kind="success" message={success} />

      {loading ? (
        <Spinner label="Carregando atendimentos..." />
      ) : error ? (
        <Alert kind="error" message={error} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nenhum atendimento registrado"
          description="Registre o primeiro atendimento de conselheiro com adolescente."
        />
      ) : (
        <ul className="space-y-2">
          {items.map((a) => (
            <li key={a.id} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center shrink-0">
                  <HandHeart className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {a.adolescente_nome || 'Adolescente'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDateBR(a.data_atendimento)}
                    {a.conselheiro_nome && ` · Conselheiro(a): ${a.conselheiro_nome}`}
                  </p>
                  {a.observacoes && <p className="text-sm text-gray-700 mt-1.5">{a.observacoes}</p>}
                  {a.retorno && (
                    <p className="text-sm mt-1.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-amber-900">
                      <strong>Retorno:</strong> {a.retorno}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSuccess('');
                    setForm({
                      id: a.id,
                      adolescente_id: a.adolescente_id,
                      conselheiro_id: a.conselheiro_id ?? '',
                      data_atendimento: a.data_atendimento,
                      observacoes: a.observacoes ?? '',
                      retorno: a.retorno ?? '',
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
              <h2 className="font-bold text-gray-900">
                {form.id ? 'Editar atendimento' : 'Novo atendimento'}
              </h2>
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
                <span className="block text-sm font-medium text-gray-700 mb-1">Conselheiro(a)</span>
                <select
                  value={form.conselheiro_id}
                  onChange={(e) => setForm({ ...form, conselheiro_id: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Não informado</option>
                  {conselheiros.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Data *</span>
                <input
                  type="date"
                  value={form.data_atendimento}
                  onChange={(e) => setForm({ ...form, data_atendimento: e.target.value })}
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
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Retorno</span>
                <textarea
                  value={form.retorno}
                  onChange={(e) => setForm({ ...form, retorno: e.target.value })}
                  rows={2}
                  placeholder="Pendências ou combinados para o próximo encontro"
                  className={inputCls}
                />
              </label>

              <Alert kind="error" message={formError} />

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
