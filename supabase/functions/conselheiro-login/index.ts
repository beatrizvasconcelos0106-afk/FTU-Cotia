import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const SENHA_PADRAO = 'FTU123';
const EMAIL_DOMAIN = 'conselheiro.ftu.local';

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

interface ConselheiroRow {
  id: string;
  nome: string;
  email: string | null;
  ativo: boolean | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return json({ error: 'Método não permitido' }, 405);
    }

    const body = await req.json().catch(() => null);
    const nome = typeof body?.nome === 'string' ? body.nome.trim() : '';
    const senha = typeof body?.senha === 'string' ? body.senha : '';

    if (!nome || !senha) {
      return json({ error: 'Informe nome e senha.' }, 400);
    }

    const primeiroNome = normalize(nome.split(/\s+/)[0]);
    if (!primeiroNome) {
      return json({ error: 'Informe seu primeiro nome.' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return json({ error: 'Servidor mal configurado.' }, 500);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: conselheiros, error: consError } = await admin
      .from('ftu_conselheiros')
      .select('id, nome, email, ativo');

    if (consError) {
      console.error('conselheiro-login: falha ao consultar conselheiros', consError.message);
      return json({ error: 'Não foi possível verificar o cadastro agora. Tente novamente.' }, 500);
    }

    const match = (conselheiros as ConselheiroRow[] | null)?.find(
      (c) => normalize((c.nome ?? '').split(/\s+/)[0]) === primeiroNome,
    );

    if (!match) {
      return json({ error: 'Nome ou senha incorretos. Verifique e tente novamente.' }, 401);
    }

    if (match.ativo === false) {
      return json({ error: 'Este conselheiro está inativo. Fale com a administração.' }, 403);
    }

    const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (usersError) {
      console.error('conselheiro-login: falha ao listar usuários', usersError.message);
      return json({ error: 'Não foi possível verificar o acesso agora. Tente novamente.' }, 500);
    }

    const users = usersData?.users ?? [];
    const takenEmails = new Set(users.map((u) => (u.email ?? '').toLowerCase()));
    const existingUser =
      users.find((u) => (u.user_metadata as Record<string, unknown> | null)?.conselheiro_id === match.id) ??
      null;

    let email = existingUser?.email ?? '';
    if (!email) {
      const base = `${normalize(match.nome.split(/\s+/)[0])}@${EMAIL_DOMAIN}`;
      email = base;
      let n = 2;
      while (takenEmails.has(email)) {
        email = `${normalize(match.nome.split(/\s+/)[0])}${n}@${EMAIL_DOMAIN}`;
        n += 1;
      }
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password: SENHA_PADRAO,
        email_confirm: true,
        user_metadata: { conselheiro_id: match.id, nome: match.nome, origem: 'ftu-app' },
      });
      if (createError || !created?.user) {
        console.error('conselheiro-login: falha ao criar acesso', createError?.message);
        return json({ error: 'Não foi possível preparar seu acesso. Tente novamente.' }, 500);
      }
    }

    const grantRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: anonKey },
      body: JSON.stringify({ email, password: senha }),
    });

    if (!grantRes.ok) {
      return json({ error: 'Nome ou senha incorretos. Verifique e tente novamente.' }, 401);
    }

    const grant = (await grantRes.json()) as { access_token?: string; refresh_token?: string };
    if (!grant.access_token || !grant.refresh_token) {
      return json({ error: 'Não foi possível concluir o login. Tente novamente.' }, 500);
    }

    return json({ access_token: grant.access_token, refresh_token: grant.refresh_token }, 200);
  } catch (err) {
    console.error('conselheiro-login: erro inesperado', err instanceof Error ? err.message : err);
    return json({ error: 'Erro inesperado no login. Tente novamente.' }, 500);
  }
});
