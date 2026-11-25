/*
# Add sheet fields: responsavel phone on adolescentes

1. New Tables
- None.

2. Modified Tables
- `ftu_adolescentes`: adds `telefone_responsavel` (text) mirroring the
  "Lista FTU" sheet "Telefone2" column. Existing rows keep NULL; no data rewritten.

3. Security
- No policy or grant changes; RLS and existing authenticated grants remain.

4. Important Notes
- Safe to re-run (ADD COLUMN IF NOT EXISTS).
*/

ALTER TABLE public.ftu_adolescentes ADD COLUMN IF NOT EXISTS telefone_responsavel text;
