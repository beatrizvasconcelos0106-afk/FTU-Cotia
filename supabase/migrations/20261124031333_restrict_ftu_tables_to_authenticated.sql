/*
# Restrict FTU data access to authenticated staff

1. New Tables
- None.

2. Modified Tables
- `ftu_adolescentes`, `ftu_conselheiros`, `ftu_reunioes`, `ftu_presencas`, `ftu_atendimentos` and `ftu_saidas` no longer expose table privileges to the public `anon` role.
- Existing authenticated grants and RLS policies remain in place.

3. Security
- Revoke all table privileges from `anon` on every FTU table.
- Keep the existing authenticated-only policies as the authorization layer.
- This matches the app login requirement: operational data is available only after a user signs in.

4. Important Notes
- No rows, columns, or historical records are deleted.
- This migration only tightens access privileges and is safe to re-run.
*/

REVOKE ALL ON public.ftu_adolescentes FROM anon;
REVOKE ALL ON public.ftu_conselheiros FROM anon;
REVOKE ALL ON public.ftu_reunioes FROM anon;
REVOKE ALL ON public.ftu_presencas FROM anon;
REVOKE ALL ON public.ftu_atendimentos FROM anon;
REVOKE ALL ON public.ftu_saidas FROM anon;
