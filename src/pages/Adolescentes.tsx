import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Plus, Search, Pencil, Eye, X, Users, Upload, Trash2 } from 'lucide-react';
import {
  supabase,
  STATUS_OPTIONS,
  statusLabel,
  statusColor,
  type Adolescente,
  type StatusAdolescente,
} from '@/lib/supabase';
import { Alert, EmptyState, Spinner } from '@/components/ui';
import ImportarPlanilha from '@/components/ImportarPlanilha';

interface FormState {
  id: string | null;
  nome: string;
  sexo: '' | 'M' | 'F';
  telefone: string;
  ct_responsavel: string;
  status: StatusAdolescente;
  observacoes: string;
}

const emptyForm: FormState = {
  id: null,
  nome: '',
  sexo: '',
  telefone: '',
  ct_responsavel: '',
  status: 'Novo',
  observacoes: '',
};

export default function Adolescentes() {
  const [items, setItems] = useState<Adolescente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [busca, setBusca] = useState('');
  const [filtroCT, setFiltroCT] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  const [form, setForm] = useState<FormState | null>(null);
  const [viewing, setViewing] = useState<Adolescente | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Adolescente | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase
      .from('ftu_adolescentes')
      .select('*')
      .order('nome', { ascending: true });
    if (err) {
      setError('Não foi possível carregar os adolescentes. Tente novamente.');
    } else {
      setItems((data as Adolescente[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const cts = useMemo(
    () => Array.from(new Set(items.map((a) => a.ct_responsavel).filter((c): c is string => !!c))).sort(),
    [items],
  );

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return items.filter((a) => {
      if (q && !a.nome.toLowerCase().includes(q)) return false;
      if (filtroCT && a.ct_responsavel !== filtroCT) return false;
      if (filtroStatus && a.status !== filtroStatus) return false;
      return true;
    });
  }, [items, busca, filtroCT, filtroStatus]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setFormError('');
    if (!form.nome.trim()) {
      setFormError('Informe o nome do adolescente.');
      return;
    }
    setSaving(true);
    const payload = {
      nome: form.nome.trim(),
      sexo: form.sexo || null,
      telefone: form.telefone.trim() || null,
      ct_responsavel: form.ct_responsavel.trim() || null,
      status: form.status,
      observacoes: form.observacoes.trim() || null,
    };
    const { error: err } = form.id
      ? await supabase.from('ftu_adolescentes').update(payload).eq('id', form.id)
      : await supabase.from('ftu_adolescentes').insert(payload);
    setSaving(false);
    if (err) {
      setFormError('Não foi possível salvar. Verifique os dados e tente novamente.');
      return;
    }
    setForm(null);
    setSuccess(form.id ? 'Adolescente atualizado com sucesso.' : 'Adolescente cadastrado com sucesso.');
    load();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    setError('');
    const { error: err } = await supabase.from('ftu_adolescentes').delete().eq('id', confirmDelete.id);
    setDeleting(false);
    if (err) {
      setError('Não foi possível excluir o adolescente. Tente novamente.');
    } else {
      setSuccess(`${confirmDelete.nome} foi excluído(a) do cadastro.`);
    }
    setConfirmDelete(null);
    load();
  };

  const startEdit = (a: Adolescente) => {
    setViewing(null);
    setSuccess('');
    setForm({
      id: a.id,
      nome: a.nome,
      sexo: a.sexo ?? '',
      telefone: a.telefone ?? '',
      ct_responsavel: a.ct_responsavel ?? '',
      status: a.status,
      observacoes: a.observacoes ?? '',
    });
  };

  return (
    <div className="space-y-4">
            <Alert kind="success" message={success} />

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Adolescentes</h1>
          <p className="text-sm text-gray-500">{items.length} cadastrados</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSuccess('');
              setImportOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl border border-green-700 text-green-800 hover:bg-green-50 active:scale-[0.98] transition text-sm font-semibold px-4 py-2.5"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Importar Planilha</span>
            <span className="sm:hidden">Importar</span>
          </button>
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
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome..."
            className="w-full rounded-xl border border-gray-300 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
          />
        </div>
        <select
          value={filtroCT}
          onChange={(e) => setFiltroCT(e.target.value)}
          className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
        >
          <option value="">Todos os CTs</option>
          {cts.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
        >
          <option value="">Todos os status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Spinner label="Carregando adolescentes..." />
      ) : error ? (
        <Alert kind="error" message={error} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nenhum adolescente encontrado"
          description="Ajuste a busca e os filtros ou cadastre um novo adolescente."
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((a) => (
            <li
              key={a.id}
              className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-green-100 text-green-800 flex items-center justify-center font-semibold shrink-0">
                {a.nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{a.nome}</p>
                <p className="text-xs text-gray-500 truncate">
                  {[a.ct_responsavel || 'Sem CT', a.sexo === 'M' ? 'Masculino' : a.sexo === 'F' ? 'Feminino' : null]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <span
                className={`hidden sm:inline-flex text-xs font-medium rounded-full px-2.5 py-1 ${statusColor(a.status)}`}
              >
                {statusLabel(a.status)}
              </span>
              <button
                onClick={() => setViewing(a)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                title="Consultar"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => startEdit(a)}
                className="p-2 rounded-lg text-green-700 hover:bg-green-50"
                title="Editar"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setSuccess(''); setConfirmDelete(a); }}
                className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                title="Excluir"
              >
                <Trash2 className="w-4 h-4" />
              </button>
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
                <h2 className="font-bold text-gray-900">Excluir adolescente?</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Você está prestes a excluir <strong>{confirmDelete.nome}</strong>. Todo o histórico de presenças, atendimentos e saída FTU vinculados também será removido.
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

      {/* Import modal */}
      {importOpen && (
        <ImportarPlanilha
          onClose={() => setImportOpen(false)}
          onImported={({ inseridos, ignorados }) => {
            setImportOpen(false);
            if (inseridos > 0) {
              setSuccess(
                ignorados > 0
                  ? `${inseridos} adolescente(s) importado(s) com sucesso. ${ignorados} linha(s) ignoradas (já cadastradas, repetidas ou com problema).`
                  : `${inseridos} adolescente(s) importado(s) com sucesso.`,
              );
            } else {
              setError('Nenhum adolescente novo foi importado. Verifique se já não estão cadastrados.');
            }
            load();
          }}
        />
      )}

      {/* View modal */}
      {viewing && (
        <Modal title={viewing.nome} onClose={() => setViewing(null)}>
          <dl className="space-y-2 text-sm">
            <Row label="Status" value={statusLabel(viewing.status)} />
            <Row label="Sexo" value={viewing.sexo === 'M' ? 'Masculino' : viewing.sexo === 'F' ? 'Feminino' : '—'} />
            <Row label="Telefone" value={viewing.telefone || '—'} />
            <Row label="CT responsável" value={viewing.ct_responsavel || '—'} />
            <Row label="Observações" value={viewing.observacoes || '—'} />
          </dl>
        </Modal>
      )}

      {/* Form modal */}
      {form && (
        <Modal title={form.id ? 'Editar adolescente' : 'Cadastrar adolescente'} onClose={() => setForm(null)}>
          <form onSubmit={handleSave} className="space-y-3">
            <Field label="Nome *">
              <input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sexo">
                <select
                  value={form.sexo}
                  onChange={(e) => setForm({ ...form, sexo: e.target.value as FormState['sexo'] })}
                  className={inputCls}
                >
                  <option value="">Não informado</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </Field>
              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as StatusAdolescente })}
                  className={inputCls}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Telefone">
              <input
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                inputMode="tel"
                className={inputCls}
              />
            </Field>
            <Field label="CT responsável">
              <input
                value={form.ct_responsavel}
                onChange={(e) => setForm({ ...form, ct_responsavel: e.target.value })}
                placeholder="Ex.: CT Central"
                className={inputCls}
                list="ct-list-adolescentes"
              />
              <datalist id="ct-list-adolescentes">
                {cts.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="Observações">
              <textarea
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                rows={3}
                className={inputCls}
              />
            </Field>

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
        </Modal>
      )}
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600';

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[90dvh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 truncate pr-2">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">
          <Users className="hidden" />
          {children}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500 shrink-0">{label}</dt>
      <dd className="text-gray-900 font-medium text-right">{value}</dd>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      {children}
    </label>
  );
}
