-- Structural guarantees that later migrations must keep.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

select is_empty($$
  select tablename from pg_tables where schemaname = 'public' and not rowsecurity
$$, 'every public table has RLS enabled');

select is_empty($$
  select c.relname from pg_class c
  where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
    and not exists (select 1 from pg_trigger t where t.tgrelid = c.oid and t.tgname = 'set_updated_at')
$$, 'every public table has the updated_at trigger');

select is_empty($$
  select c.conrelid::regclass::text, c.conname from pg_constraint c
  where c.contype = 'f' and c.connamespace = 'public'::regnamespace
    and not exists (
      select 1 from pg_index i
      where i.indrelid = c.conrelid
        and (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] = c.conkey)
$$, 'every foreign key is indexed');

select is_empty($$
  select c.relname from pg_class c
  where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
    and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
$$, 'every public table has at least one policy');

select * from finish();
rollback;
