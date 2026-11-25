import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Pencil, X, Trash2 } from 'lucide-react';
import { supabase, type Conselheiro } from '@/lib/supabase';
import { Alert, EmptyState, Spinner } from '@/components/ui';

interface FormState {
  id: string | null;
  nome: string;
  email: string;
  telefone: string;
  ativo: boolean;
}

const emptyForm: FormState = {
  id: null,
  nome: '',
  email: '',
  telefone: '',
  ativo: true,
};

const inputCls =
  'w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600';

export default function Conselheiros() {
  const [items, setItems] = useState<Conselheiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [confirmDelete, setConfirmDelete] = useState<Conselheiro | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase
      .from('ftu_conselheiros')
      .select('*')
      .order('nome', { ascending: true });
    if (err) {
      setError('Não foi possível carregar os conselheiros. Tente novamente.');
    } else {
      setItems((data as Conselheiro[]) ?? []);
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
    if (!form.nome.trim()) {
      setFormError('Informe o nome do conselheiro.');
      return;
    }
    setSaving(true);
    const payload = {
      nome: form.nome.trim(),
      email: form.email.trim() || null,
      telefone: form.telefone.trim() || null,
      ativo: form.ativo,
    };
    const { error: err } = form.id
      ? await supabase.from('ftu_conselheiros').update(payload).eq('id', form.id)
      : await supabase.from('ftu_conselheiros').insert(payload);
    setSaving(false);
    if (err) {
      setFormError('Não foi possível salvar. Verifique os dados e tente novamente.');
      return;
    }
    setForm(null);
    setSuccess(form.id ? 'Conselheiro atualizado com sucesso.' : 'Conselheiro cadastrado com sucesso.');
    load();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    setError('');
    const { error: err } = await supabase.from('ftu_conselheiros').delete().eq('id', confirmDelete.id);
    setDeleting(false);
    if (err) {
      setError('Não foi possível excluir o conselheiro. Tente novamente.');
    } else {
      setSuccess(`${confirmDelete.nome} foi excluído(a) do cadastro.`);
    }
    setConfirmDelete(null);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conselheiros</h1>
          <p className="text-sm text-gray-500">{items.length} cadastrados</p>
        </div>
        <button
          onClick={() => {
            setSuccess('');
            setForm({ ...emptyForm });
          }}
          className="flex items-center gap-2 rounded-xl bg-green-700 hover:bg-green-800 active:scale-[0.98] transition text-white text-sm font-semibold px-4 py-2.5"
        >
          <Plus className="w-4 h-4" /> Cadastrar
        </button>
      </div>

      <Alert kind="success" message={success} />

      {loading ? (
        <Spinner label="Carregando conselheiros..." />
      ) : error ? (
        <Alert kind="error" message={error} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nenhum conselheiro cadastrado"
          description="Cadastre o primeiro conselheiro da equipe."
        />
      ) : (
        <ul className="space-y-2">
          {items.map((c) => (
            <li key={c.id} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center font-semibold shrink-0">
                  {c.nome.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {c.nome}
                    {!c.ativo && <span className="ml-2 text-xs text-red-600 font-medium">Inativo</span>}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{c.email}</p>
                </div>
                <button
                  onClick={() => { setSuccess(''); setConfirmDelete(c); }}
                  className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setSuccess('');
                    setForm({
                      id: c.id,
                      nome: c.nome,
                      email: c.email ?? '',
                      telefone: c.telefone ?? '',
                      ativo: c.ativo,
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

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-3xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Excluir conselheiro?</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Você está prestes a excluir <strong>{confirmDelete.nome}</strong>. Os atendimentos registrados por este conselheiro serão mantidos, mas sem vínculo com ele.
                </p>
                <p className="text-sm font-semibold text-red-700 mt-2">Essa ação não pode ser desfeita.</p>
              </div>
            </div>
            <Alert kind="error" message={error} />
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-xl border border-gray-300 text-gray-700 font-medium py-2.5 text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 text-sm disabled:opacity-60"
              >
                {deleting ? 'Excluindo...' : 'Sim, excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form modal */}
      {form && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setForm(null)} />
          <div className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[90dvh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">{form.id ? 'Editar conselheiro' : 'Cadastrar conselheiro'}</h2>
              <button onClick={() => setForm(null)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-3">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Nome *</span>
                <input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  required
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">E-mail</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Telefone</span>
                <input
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  inputMode="tel"
                  className={inputCls}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-green-700 focus:ring-green-600"
                />
                Conselheiro ativo
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
