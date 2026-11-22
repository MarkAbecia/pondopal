-- v2: pay_paluwagan_round() permissions and status. alice owner, bob member, carol viewer, dave outsider.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email) values
  ('a1000000-0000-4000-8000-000000000001', 'alice@v2.local'),
  ('b1000000-0000-4000-8000-000000000002', 'bob@v2.local'),
  ('c1000000-0000-4000-8000-000000000003', 'carol@v2.local'),
  ('d1000000-0000-4000-8000-000000000004', 'dave@v2.local');
insert into public.spaces (id, name, type, created_by)
values ('99999999-1111-4000-8000-000000000000', 'Paluwagan crew', 'group', 'a1000000-0000-4000-8000-000000000001');
insert into public.space_members (space_id, user_id, role) values
  ('99999999-1111-4000-8000-000000000000', 'b1000000-0000-4000-8000-000000000002', 'member'),
  ('99999999-1111-4000-8000-000000000000', 'c1000000-0000-4000-8000-000000000003', 'viewer');
insert into public.paluwagan (id, space_id, name, contribution_centavos, frequency, start_date)
values ('88888888-1111-4000-8000-000000000000', '99999999-1111-4000-8000-000000000000', 'P', 100000, 'weekly', '2026-11-22');
-- one round, two payers
insert into public.paluwagan_rounds (paluwagan_id, space_id, round_number, user_id, due_date) values
  ('88888888-1111-4000-8000-000000000000', '99999999-1111-4000-8000-000000000000', 1, 'a1000000-0000-4000-8000-000000000001', '2026-11-22'),
  ('88888888-1111-4000-8000-000000000000', '99999999-1111-4000-8000-000000000000', 1, 'b1000000-0000-4000-8000-000000000002', '2026-11-22');

create function pg_temp.login(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

-- RLS hides the row from a member's UPDATE: it changes nothing rather than raising
select pg_temp.login('b1000000-0000-4000-8000-000000000002');
update public.paluwagan_rounds set paid_at = now() where user_id = 'b1000000-0000-4000-8000-000000000002';
reset role;
select is((select paid_at from public.paluwagan_rounds where user_id = 'b1000000-0000-4000-8000-000000000002'),
  null, 'members cannot update rounds directly');

select pg_temp.login('b1000000-0000-4000-8000-000000000002');
select ok(public.pay_paluwagan_round('88888888-1111-4000-8000-000000000000', 1, 'b1000000-0000-4000-8000-000000000002') is not null,
  'a member marks their own contribution');
select throws_ok($$ select public.pay_paluwagan_round('88888888-1111-4000-8000-000000000000', 1, 'a1000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'a member cannot mark someone else');
reset role;

select pg_temp.login('c1000000-0000-4000-8000-000000000003');
select throws_ok($$ select public.pay_paluwagan_round('88888888-1111-4000-8000-000000000000', 1, 'c1000000-0000-4000-8000-000000000003') $$,
  '42501', null, 'a viewer cannot mark payments');
reset role;

select pg_temp.login('d1000000-0000-4000-8000-000000000004');
select throws_ok($$ select public.pay_paluwagan_round('88888888-1111-4000-8000-000000000000', 1, 'd1000000-0000-4000-8000-000000000004') $$,
  'P0002', null, 'outsiders get not found');
reset role;

select pg_temp.login('a1000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.pay_paluwagan_round('88888888-1111-4000-8000-000000000000', 2, 'a1000000-0000-4000-8000-000000000001') $$,
  'P0002', null, 'missing round is not found');
select ok(public.pay_paluwagan_round('88888888-1111-4000-8000-000000000000', 1, 'a1000000-0000-4000-8000-000000000001') is not null,
  'the owner marks a contribution');
select is((select status::text from public.paluwagan where id = '88888888-1111-4000-8000-000000000000'),
  'completed', 'all contributions in: completed');
select public.pay_paluwagan_round('88888888-1111-4000-8000-000000000000', 1, 'b1000000-0000-4000-8000-000000000002', false);
select is((select status::text from public.paluwagan where id = '88888888-1111-4000-8000-000000000000'),
  'active', 'unmarking one reopens it');
reset role;

select * from finish();
rollback;
