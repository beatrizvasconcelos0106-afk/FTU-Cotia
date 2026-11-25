import { useState, type FormEvent } from 'react';
import { LogIn, KeyRound, Mail, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Logo, Alert } from '@/components/ui';

type Mode = 'login' | 'recovery';

const apiUrl = `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1/conselheiro-login`;

const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export default function Login() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const loginConselheiro = async (nome: string, senha: string): Promise<boolean> => {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Apikey: anonKey },
      body: JSON.stringify({ nome, senha }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { access_token?: string; refresh_token?: string };
    if (!data.access_token || !data.refresh_token) return false;
    const { error: sessErr } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    return !sessErr;
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!email.includes('@')) {
      const ok = await loginConselheiro(email, password);
      setLoading(false);
      if (!ok) setError('Nome ou senha incorretos. Verifique e tente novamente.');
      return;
    }

    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError('E-mail ou senha incorretos. Verifique e tente novamente.');
    }
  };

  const handleRecovery = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (err) {
      setError('Não foi possível enviar o e-mail de recuperação. Verifique o endereço.');
    } else {
      setSuccess('Enviamos um link de recuperação para o seu e-mail.');
    }
  };

  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#637d00] via-[#3f5000] to-[#090909] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <Logo size="lg" />
          <h1 className="text-3xl font-black text-white tracking-tight">FTU Cotia</h1>
          <p className="text-sm text-white/85 text-center">
            Gestão e acompanhamento de adolescentes da Força Teen Universal
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-6">
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome ou e-mail
                </label>
                <input
                  id="email"
                  type="text"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
                  placeholder="Primeiro nome ou e-mail"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
                  placeholder="Sua senha"
                />
              </div>

              <Alert kind="error" message={error} />
              <Alert kind="success" message={success} />

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-800 hover:bg-orange-900 active:scale-[0.98] transition text-white font-semibold py-3 disabled:opacity-60"
              >
                <LogIn className="w-4 h-4" />
                {loading ? 'Entrando...' : 'Entrar'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('recovery');
                  setError('');
                  setSuccess('');
                }}
                className="w-full text-sm text-orange-800 font-medium hover:underline"
              >
                Esqueci minha senha
              </button>
            </form>
          ) : (
            <form onSubmit={handleRecovery} className="space-y-4">
              <div className="flex items-center gap-2 text-gray-800 font-semibold">
                <KeyRound className="w-4 h-4 text-green-700" />
                Recuperar senha
              </div>
              <div>
                <label htmlFor="recovery-email" className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail cadastrado
                </label>
                <input
                  id="recovery-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
                  placeholder="seu@email.com"
                />
              </div>

              <p className="text-sm text-gray-500">
                A recuperação vale para acessos por e-mail. Conselheiros que entram por nome devem falar com a
                administração para redefinir a senha.
              </p>

              <Alert kind="error" message={error} />
              <Alert kind="success" message={success} />

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-800 hover:bg-orange-900 active:scale-[0.98] transition text-white font-semibold py-3 disabled:opacity-60"
              >
                <Mail className="w-4 h-4" />
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                  setSuccess('');
                }}
                className="w-full text-sm text-gray-600 font-medium hover:underline"
              >
                Voltar para o login
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-green-200/80 mt-6">
          Acesso restrito a conselheiros autorizados. Não há cadastro público.
        </p>
      </div>
    </div>
  );
}
