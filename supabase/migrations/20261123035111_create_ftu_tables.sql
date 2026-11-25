/*
# Create FTU Cotia tables

1. New Tables
- `ftu_adolescentes`: adolescents (nome, sexo, telefone, ct_responsavel, status, observacoes).
  `status` uses a check constraint with values: Novo, Frequente, Nao frequente, Afastado.
- `ftu_conselheiros`: counselors (nome, email, telefone, ct_responsavel, ativo).
- `ftu_reunioes`: meetings (data_reuniao date, tipo: terca-feira | sexta-feira | sabado_ftu_play | domingo_auditorio, observacoes).
  Unique on (data_reuniao, tipo) to avoid duplicate meetings for the same day/type.
- `ftu_presencas`: attendance records (reuniao_id, adolescente_id, presente boolean, registrado_por uuid, created_at, updated_at).
  Unique on (reuniao_id, adolescente_id) to prevent duplicate attendance for the same teen in the same meeting.

2. Modified Tables
- None (tables are new; no existing structure was changed).

3. Security
- Enable Row Level Security on all four tables.
- Grant SELECT/INSERT/UPDATE to `authenticated` only (app has a sign-in screen; no public sign-up UI is exposed in the app).
- All policies scoped `TO authenticated` using `USING (true)`: the app requirement is that every authenticated user shares the same data (shared staff workspace, no per-user ownership). Unauthenticated (anon) users get no grants and no policies, so data is fully protected from the public.
- `registrado_por` and `created_by` default to `auth.uid()` so inserts can omit them.

4. Important Notes
- Unique constraint on `ftu_presencas (reuniao_id, adolescente_id)` prevents duplicate attendance rows; the app updates the existing row instead (preserving history).
- No destructive operations; safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS pattern).
*/

CREATE TABLE IF NOT EXISTS public.ftu_adolescentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  sexo text CHECK (sexo IN ('M', 'F')),
  telefone text,
  ct_responsavel text,
  status text NOT NULL DEFAULT 'Novo' CHECK (status IN ('Novo', 'Frequente', 'Nao frequente', 'Afastado')),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ftu_conselheiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text,
  telefone text,
  ct_responsavel text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ftu_reunioes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_reuniao date NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('terca-feira', 'sexta-feira', 'sabado_ftu_play', 'domingo_auditorio')),
  observacoes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (data_reuniao, tipo)
);

CREATE TABLE IF NOT EXISTS public.ftu_presencas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reuniao_id uuid NOT NULL REFERENCES public.ftu_reunioes(id) ON DELETE CASCADE,
  adolescente_id uuid NOT NULL REFERENCES public.ftu_adolescentes(id) ON DELETE CASCADE,
  presente boolean NOT NULL DEFAULT false,
  registrado_por uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reuniao_id, adolescente_id)
);

CREATE INDEX IF NOT EXISTS idx_ftu_adolescentes_nome ON public.ftu_adolescentes (nome);
CREATE INDEX IF NOT EXISTS idx_ftu_adolescentes_status ON public.ftu_adolescentes (status);
CREATE INDEX IF NOT EXISTS idx_ftu_reunioes_data ON public.ftu_reunioes (data_reuniao DESC);
CREATE INDEX IF NOT EXISTS idx_ftu_presencas_reuniao ON public.ftu_presencas (reuniao_id);
CREATE INDEX IF NOT EXISTS idx_ftu_presencas_adolescente ON public.ftu_presencas (adolescente_id);

ALTER TABLE public.ftu_adolescentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ftu_conselheiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ftu_reunioes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ftu_presencas ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.ftu_adolescentes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ftu_conselheiros TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ftu_reunioes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ftu_presencas TO authenticated;

DROP POLICY IF EXISTS "Authenticated can read adolescentes" ON public.ftu_adolescentes;
CREATE POLICY "Authenticated can read adolescentes" ON public.ftu_adolescentes
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert adolescentes" ON public.ftu_adolescentes;
CREATE POLICY "Authenticated can insert adolescentes" ON public.ftu_adolescentes
FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update adolescentes" ON public.ftu_adolescentes;
CREATE POLICY "Authenticated can update adolescentes" ON public.ftu_adolescentes
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can read conselheiros" ON public.ftu_conselheiros;
CREATE POLICY "Authenticated can read conselheiros" ON public.ftu_conselheiros
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert conselheiros" ON public.ftu_conselheiros;
CREATE POLICY "Authenticated can insert conselheiros" ON public.ftu_conselheiros
FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update conselheiros" ON public.ftu_conselheiros;
CREATE POLICY "Authenticated can update conselheiros" ON public.ftu_conselheiros
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can read reunioes" ON public.ftu_reunioes;
CREATE POLICY "Authenticated can read reunioes" ON public.ftu_reunioes
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert reunioes" ON public.ftu_reunioes;
CREATE POLICY "Authenticated can insert reunioes" ON public.ftu_reunioes
FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update reunioes" ON public.ftu_reunioes;
CREATE POLICY "Authenticated can update reunioes" ON public.ftu_reunioes
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can read presencas" ON public.ftu_presencas;
CREATE POLICY "Authenticated can read presencas" ON public.ftu_presencas
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert presencas" ON public.ftu_presencas;
CREATE POLICY "Authenticated can insert presencas" ON public.ftu_presencas
FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update presencas" ON public.ftu_presencas;
CREATE POLICY "Authenticated can update presencas" ON public.ftu_presencas
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
