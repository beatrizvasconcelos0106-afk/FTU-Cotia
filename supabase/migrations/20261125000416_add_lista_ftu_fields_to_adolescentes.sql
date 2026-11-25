/*
# Add Lista FTU sheet fields to adolescents

1. New Tables
- None.

2. Modified Tables
- `ftu_adolescentes`: adds `batismo_aguas` (boolean), `batismo_espirito_santo` (boolean),
  `data_nascimento` (date) and `responsavel` (text) to mirror the "Lista FTU" sheet columns.
  Existing rows keep NULL in the new columns; no data is rewritten.

3. Security
- No policy or grant changes; RLS and existing authenticated grants remain.

4. Important Notes
- Age is derived from `data_nascimento`, not stored.
- Safe to re-run (ADD COLUMN IF NOT EXISTS).
*/

ALTER TABLE public.ftu_adolescentes ADD COLUMN IF NOT EXISTS batismo_aguas boolean;
ALTER TABLE public.ftu_adolescentes ADD COLUMN IF NOT EXISTS batismo_espirito_santo boolean;
ALTER TABLE public.ftu_adolescentes ADD COLUMN IF NOT EXISTS data_nascimento date;
ALTER TABLE public.ftu_adolescentes ADD COLUMN IF NOT EXISTS responsavel text;
