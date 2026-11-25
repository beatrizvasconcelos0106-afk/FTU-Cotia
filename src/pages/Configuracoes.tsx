import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/ui';

export default function Configuracoes() {
  const { session } = useAuth();
  const email = session?.user?.email ?? '';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500">Informações do aplicativo e da conta</p>
      </div>

      <section className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="font-bold text-gray-900 mb-3">Identidade visual</h2>
        <div className="flex items-center gap-4">
          <Logo size="lg" />
          <div className="text-sm text-gray-600">
            <p className="font-medium text-gray-900">Logo Força Teen Universal</p>
            <p className="mt-1">
              A marca do FTU está aplicada no login e no cabeçalho, com a paleta verde oliva, laranja escuro,
              preto e branco.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="font-bold text-gray-900 mb-3">Conta</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Usuário</dt>
            <dd className="text-gray-900 font-medium text-right break-all">{email || '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Perfil</dt>
            <dd className="text-gray-900 font-medium">Conselheiro</dd>
          </div>
        </dl>
        <p className="text-xs text-gray-400 mt-3">
          Para criar ou alterar contas de acesso, utilize o painel de administração do Supabase. Não há
          cadastro público de usuários.
        </p>
      </section>

      <section className="bg-white rounded-2xl border border-gray-200 p-5 text-sm text-gray-600">
        <h2 className="font-bold text-gray-900 mb-2">Sobre o aplicativo</h2>
        <p>FTU Cotia — gestão e acompanhamento de adolescentes da Força Teen Universal.</p>
        <p className="mt-1">
          Todos os dados (cadastros, reuniões e chamadas) são salvos no banco de dados compartilhado, em
          tempo real, para todos os conselheiros autorizados.
        </p>
      </section>
    </div>
  );
}
