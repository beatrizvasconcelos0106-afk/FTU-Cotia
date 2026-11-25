/*
# Allow authenticated staff to delete incorrect attendance sessions

1. New Tables
- None.

2. Modified Tables
- `ftu_reunioes`: authenticated users can now delete a meeting record when a call was created incorrectly.
- Related `ftu_presencas` rows are removed automatically by the existing foreign key cascade when their meeting is deleted.

3. Security
- Grant DELETE on `ftu_reunioes` to `authenticated` only.
- Add a separate DELETE RLS policy for authenticated users.
- The application requires login and uses a shared staff workspace, so every authenticated staff member can correct or remove a call.

4. Important Notes
- Deletion is exposed in the app only after an explicit confirmation prompt.
- This removes the selected meeting and its attendance records, but does not remove adolescents or other historical data.
- The migration is idempotent and does not change existing columns or tables.
*/

GRANT DELETE ON public.ftu_reunioes TO authenticated;

DROP POLICY IF EXISTS "Authenticated can delete reunioes" ON public.ftu_reunioes;
CREATE POLICY "Authenticated can delete reunioes" ON public.ftu_reunioes
FOR DELETE TO authenticated USING (true);
