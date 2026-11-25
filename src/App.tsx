import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Layout, { type PageKey } from '@/components/Layout';
import Login from '@/pages/Login';
import Painel from '@/pages/Painel';
import Chamada from '@/pages/Chamada';
import Adolescentes from '@/pages/Adolescentes';
import Conselheiros from '@/pages/Conselheiros';
import Atendimentos from '@/pages/Atendimentos';
import Saidas from '@/pages/Saidas';
import Relatorios from '@/pages/Relatorios';
import Configuracoes from '@/pages/Configuracoes';
import { Spinner } from '@/components/ui';

function ProtectedApp() {
  const { session, loading } = useAuth();
  const [page, setPage] = useState<PageKey>('painel');

  if (loading) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!session) return <Login />;

  return (
    <Layout page={page} onNavigate={setPage}>
      {page === 'painel' && <Painel onNavigate={setPage} />}
      {page === 'chamada' && <Chamada />}
      {page === 'adolescentes' && <Adolescentes />}
      {page === 'conselheiros' && <Conselheiros />}
      {page === 'atendimentos' && <Atendimentos />}
      {page === 'saidas' && <Saidas />}
      {page === 'relatorios' && <Relatorios />}
      {page === 'config' && <Configuracoes />}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ProtectedApp />
    </AuthProvider>
  );
}
