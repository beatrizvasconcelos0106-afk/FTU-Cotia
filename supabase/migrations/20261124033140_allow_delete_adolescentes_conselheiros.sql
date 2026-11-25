/*
# Allow authenticated staff to delete adolescents and counselors

1. New Tables
- None.

2. Modified Tables
- `ftu_adolescentes`: authenticated users can now delete a record.
  Deleting an adolescent also removes all related attendance (ftu_presencas),
  counseling sessions (ftu_atendimentos) and exit records (ftu_saidas) via
  the existing ON DELETE CASCADE foreign keys.
- `ftu_conselheiros`: authenticated users can now delete a record.
  The conselheiro_id on ftu_atendimentos becomes NULL (ON DELETE SET NULL).

3. Security
- GRANT DELETE on both tables to the authenticated role only.
- One DELETE policy per table scoped to authenticated.
- The app always requires login, so anon access is not granted.

4. Important Notes
- Deletion is surfaced in the UI only after an explicit confirmation prompt.
- No other tables, columns, or rows are affected by this migration.
- Safe to re-run (DROP POLICY IF EXISTS before CREATE POLICY).
*/

GRANT DELETE ON public.ftu_adolescentes TO authenticated;
GRANT DELETE ON public.ftu_conselheiros TO authenticated;

DROP POLICY IF EXISTS "Authenticated can delete adolescentes" ON public.ftu_adolescentes;
CREATE POLICY "Authenticated can delete adolescentes" ON public.ftu_adolescentes
FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can delete conselheiros" ON public.ftu_conselheiros;
CREATE POLICY "Authenticated can delete conselheiros" ON public.ftu_conselheiros
FOR DELETE TO authenticated USING (true);
