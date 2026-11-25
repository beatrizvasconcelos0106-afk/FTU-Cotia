/*
# Create attendance counseling (atendimentos) and exits (saidas) tables

1. New Tables
- `ftu_atendimentos`: counseling sessions between a counselor and an adolescent.
  - `id` (uuid, primary key)
  - `adolescente_id` (uuid, not null, references ftu_adolescentes)
  - `conselheiro_id` (uuid, nullable, references ftu_conselheiros)
  - `data_atendimento` (date, not null)
  - `observacoes` (text, nullable)
  - `retorno` (text, nullable) — follow-up notes for the next meeting
  - `created_at`, `updated_at` (timestamptz)
- `ftu_saidas`: registry of adolescents who left the program.
  - `id` (uuid, primary key)
  - `adolescente_id` (uuid, not null, references ftu_adolescentes)
  - `tipo` (text, not null, check: 'Afastado' | 'Transferencia FJU')
  - `data_saida` (date, not null)
  - `observacoes` (text, nullable)
  - `created_at`, `updated_at` (timestamptz)

2. Modified Tables
- None. Existing tables and history are untouched.

3. Security
- RLS enabled on both tables; SELECT/INSERT/UPDATE granted to `authenticated` only
  (shared-data model: every authenticated user sees the same rows).
- Four separate policies per table, all scoped `TO authenticated`.

4. Important Notes
- Exits never delete the adolescent row: history (meetings, attendance) is preserved.
- Safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS).
*/

CREATE TABLE IF NOT EXISTS public.ftu_atendimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adolescente_id uuid NOT NULL REFERENCES public.ftu_adolescentes(id) ON DELETE CASCADE,
  conselheiro_id uuid REFERENCES public.ftu_conselheiros(id) ON DELETE SET NULL,
  data_atendimento date NOT NULL,
  observacoes text,
  retorno text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ftu_saidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adolescente_id uuid NOT NULL REFERENCES public.ftu_adolescentes(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('Afastado', 'Transferencia FJU')),
  data_saida date NOT NULL,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ftu_atendimentos_adolescente ON public.ftu_atendimentos (adolescente_id);
CREATE INDEX IF NOT EXISTS idx_ftu_atendimentos_data ON public.ftu_atendimentos (data_atendimento DESC);
CREATE INDEX IF NOT EXISTS idx_ftu_saidas_adolescente ON public.ftu_saidas (adolescente_id);

ALTER TABLE public.ftu_atendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ftu_saidas ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.ftu_atendimentos TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ftu_saidas TO authenticated;

DROP POLICY IF EXISTS "Authenticated can read atendimentos" ON public.ftu_atendimentos;
CREATE POLICY "Authenticated can read atendimentos" ON public.ftu_atendimentos
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert atendimentos" ON public.ftu_atendimentos;
CREATE POLICY "Authenticated can insert atendimentos" ON public.ftu_atendimentos
FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update atendimentos" ON public.ftu_atendimentos;
CREATE POLICY "Authenticated can update atendimentos" ON public.ftu_atendimentos
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can read saidas" ON public.ftu_saidas;
CREATE POLICY "Authenticated can read saidas" ON public.ftu_saidas
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert saidas" ON public.ftu_saidas;
CREATE POLICY "Authenticated can insert saidas" ON public.ftu_saidas
FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update saidas" ON public.ftu_saidas;
CREATE POLICY "Authenticated can update saidas" ON public.ftu_saidas
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
