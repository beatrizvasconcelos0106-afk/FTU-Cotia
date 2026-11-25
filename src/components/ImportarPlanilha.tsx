import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase, STATUS_OPTIONS } from '@/lib/supabase';import {
  parsePlanilha,
  type LinhaPlanilha,
  type ProblemaLinha,
} from '@/lib/importPlanilha';
import { Alert, Spinner } from '@/components/ui';

interface Props {
  onClose: () => void;
  onImported: (resumo: { inseridos: number; ignorados: number }) => void;
}

export default function ImportarPlanilha({ onClose, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [lendo, setLendo] = useState(false);
  const [lido, setLido] = useState<{ validos: LinhaPlanilha[]; problemas: ProblemaLinha[]; duplicadosArquivo: number } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroLeitura, setErroLeitura] = useState('');
  const [erroSalvar, setErroSalvar] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File | null) => {
    setErroLeitura('');
    setLido(null);
    if (!f) return;
    setFile(f);
    setLendo(true);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
      const resultado = parsePlanilha(rows);
      if (resultado.validos.length === 0 && resultado.problemas.length > 0 && resultado.totalLinhas === 0) {
        setErroLeitura('A planilha está vazia ou não pôde ser lida.');
      } else {
        setLido({
          validos: resultado.validos,
          problemas: resultado.problemas,
          duplicadosArquivo: resultado.duplicadosArquivo,
        });
      }
    } catch {
      setErroLeitura('Não foi possível ler o arquivo. Verifique se é um CSV ou Excel válido (.csv, .xlsx, .xls).');
    }
    setLendo(false);
  };

  const importar = async () => {
    if (!lido || lido.validos.length === 0) return;
    setErroSalvar('');
    setSalvando(true);

    const nomes = lido.validos.map((v) => v.nome.trim().toLowerCase());
    const { data: existentes, error: errBusca } = await supabase
      .from('ftu_adolescentes')
      .select('nome')
      .in('nome', nomes);
    if (errBusca) {
      setErroSalvar('Não foi possível verificar os cadastros existentes. Tente novamente.');
      setSalvando(false);
      return;
    }
    const nomesExistentes = new Set(
      (existentes ?? []).map((n: { nome: string }) => n.nome.trim().toLowerCase()),
    );

    const novos = lido.validos.filter((v) => !nomesExistentes.has(v.nome.trim().toLowerCase()));
    const jaCadastrados = lido.validos.length - novos.length;

    let inseridos = 0;
    let ignorados = jaCadastrados + lido.duplicadosArquivo + lido.problemas.length;

    // Insert in chunks to avoid oversized requests
    const CHUNK = 100;
    for (let i = 0; i < novos.length; i += CHUNK) {
      const chunk = novos.slice(i, i + CHUNK).map((v) => ({
        nome: v.nome,
        sexo: v.sexo || null,
        telefone: v.telefone || null,
        ct_responsavel: v.ct_responsavel || null,
        status: v.status,
        observacoes: v.observacoes || null,
      }));
      const { error: err } = await supabase.from('ftu_adolescentes').insert(chunk);
      if (err) {
        setErroSalvar('Não foi possível salvar os registros. Nenhuma linha foi salva nesta tentativa — verifique a planilha e tente novamente.');
        setSalvando(false);
        return;
      }
      inseridos += chunk.length;
    }

    setSalvando(false);
    onImported({ inseridos, ignorados });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[90dvh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Upload className="w-5 h-5 text-green-700" />
            Importar planilha
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">
            Selecione um arquivo CSV ou Excel (.xlsx, .xls). A primeira linha deve conter os títulos das
            colunas. Colunas reconhecidas (qualquer ordem, acentos opcionais):
          </p>
          <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-700">
            <strong>Nome</strong> (obrigatório), Sexo, Telefone, CT, Status, Observações
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />

          <button
            onClick={() => inputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-green-300 bg-green-50/50 px-4 py-8 text-center hover:bg-green-50 transition"
          >
            <FileSpreadsheet className="w-8 h-8 text-green-700" />
            <span className="text-sm font-medium text-green-900">
              {file ? file.name : 'Toque para escolher o arquivo'}
            </span>
            {file && (
              <span className="text-xs text-gray-500">
                {lendo ? 'Lendo planilha...' : 'Toque para trocar o arquivo'}
              </span>
            )}
          </button>

          {lendo && <Spinner label="Lendo planilha..." />}
          <Alert kind="error" message={erroLeitura} />
          <Alert kind="error" message={erroSalvar} />

          {lido && !lendo && (
            <div className="space-y-3">
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
                <div className="text-sm text-green-900">
                  <strong>{lido.validos.length}</strong> adolescente(s) prontos para cadastrar.
                  {lido.duplicadosArquivo > 0 && (
                    <span className="block text-xs mt-0.5">
                      {lido.duplicadosArquivo} linha(s) repetida(s) no arquivo serão ignoradas.
                    </span>
                  )}
                </div>
              </div>

              {lido.problemas.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-900">
                    <strong>{lido.problemas.length}</strong> linha(s) com problema serão ignoradas:
                    <ul className="list-disc list-inside text-xs mt-1 max-h-24 overflow-y-auto">
                      {lido.problemas.slice(0, 10).map((p) => (
                        <li key={p.linha}>
                          Linha {p.linha}: {p.motivo}
                        </li>
                      ))}
                      {lido.problemas.length > 10 && <li>...e mais {lido.problemas.length - 10}</li>}
                    </ul>
                  </div>
                </div>
              )}

              {lido.validos.length > 0 && (
                <div className="rounded-xl border border-gray-200">
                  <p className="text-xs font-medium text-gray-500 px-3 pt-2">Prévia dos dados</p>
                  <div className="max-h-48 overflow-y-auto px-3 pb-2 mt-1">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-gray-500 border-b border-gray-100">
                          <th className="py-1.5 font-medium">Nome</th>
                          <th className="py-1.5 font-medium">CT</th>
                          <th className="py-1.5 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lido.validos.slice(0, 50).map((v) => (
                          <tr key={v.linha} className="border-b border-gray-50 last:border-0">
                            <td className="py-1.5 text-gray-900">{v.nome}</td>
                            <td className="py-1.5 text-gray-600">{v.ct_responsavel || '—'}</td>
                            <td className="py-1.5 text-gray-600">
                              {STATUS_OPTIONS.find((s) => s.value === v.status)?.label ?? v.status}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {lido.validos.length > 50 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Mostrando os primeiros 50 de {lido.validos.length}.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-300 text-gray-700 font-medium py-2.5 text-sm hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={importar}
              disabled={!lido || lido.validos.length === 0 || salvando || lendo}
              className="flex-1 rounded-xl bg-green-700 hover:bg-green-800 text-white font-semibold py-2.5 text-sm disabled:opacity-50"
            >
              {salvando ? 'Importando...' : `Importar ${lido?.validos.length ?? 0} cadastro(s)`}
            </button>
          </div>

          {lido && (
            <p className="text-xs text-gray-400">
              Status aceitos na planilha: {STATUS_OPTIONS.map((s) => s.label).join(', ')} — quem não tiver
              status será cadastrado como <strong>Novo</strong>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
