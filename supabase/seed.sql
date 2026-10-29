-- Stage 1 deliberately contains no identities, roles, merchants or financial fixtures.
-- Auth users must be created through Supabase Auth so the profile trigger creates a matching
-- public identity. The initial administrator is then granted once through the secured SQL-only
-- bootstrap function documented in docs/PHASE2-STAGE1.md.
insert into public.platform_settings (singleton)
values (true)
on conflict (singleton) do nothing;
