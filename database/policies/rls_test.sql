-- RLS behaviour. Users: alice (owner of group space G), bob (member), carol (viewer), dave (outsider).
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-4000-8000-000000000001', 'alice@test.local', '{"full_name": "Alice"}'),
  ('b0000000-0000-4000-8000-000000000002', 'bob@test.local', '{}'),
  ('c0000000-0000-4000-8000-000000000003', 'carol@test.local', '{}'),
  ('d0000000-0000-4000-8000-000000000004', 'dave@test.local', '{}');

insert into public.spaces (id, name, type, created_by)
values ('99999999-0000-4000-8000-000000000000', 'Barkada', 'group', 'a0000000-0000-4000-8000-000000000001');
insert into public.space_members (space_id, user_id, role) values
  ('99999999-0000-4000-8000-000000000000', 'b0000000-0000-4000-8000-000000000002', 'member'),
  ('99999999-0000-4000-8000-000000000000', 'c0000000-0000-4000-8000-000000000003', 'viewer');
insert into public.transactions (id, space_id, user_id, type, amount_centavos) values
  ('77777777-0000-4000-8000-000000000000', '99999999-0000-4000-8000-000000000000',
   'a0000000-0000-4000-8000-000000000001', 'expense', 50000);
insert into public.transactions (space_id, user_id, type, amount_centavos)
select id, created_by, 'expense', 1000 from public.spaces
where type = 'personal' and created_by = 'a0000000-0000-4000-8000-000000000001';
update public.profiles set expo_push_token = 'ExponentPushToken[secret]'
where user_id = 'a0000000-0000-4000-8000-000000000001';

-- Run the rest of a statement as this user. SECURITY DEFINER isn't used, so SET LOCAL ROLE sticks.
create function pg_temp.login(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

-- ---------------------------------------------------------------- signup trigger
select is((select count(*)::int from public.spaces s join public.space_members m on m.space_id = s.id and m.role = 'owner'
           where s.type = 'personal' and s.created_by = 'a0000000-0000-4000-8000-000000000001'),
          1, 'signup creates a personal space owned by the user');
select is((select display_name from public.profiles where user_id = 'a0000000-0000-4000-8000-000000000001'),
          'Alice', 'signup creates a profile from metadata');

-- ---------------------------------------------------------------- dave: outsider
select pg_temp.login('d0000000-0000-4000-8000-000000000004');
select is_empty($$ select 1 from public.spaces where id = '99999999-0000-4000-8000-000000000000' $$,
  'non-member cannot see the space');
select is_empty($$ select 1 from public.transactions where space_id = '99999999-0000-4000-8000-000000000000' $$,
  'non-member cannot read its transactions');
select is_empty($$ select 1 from public.space_members where space_id = '99999999-0000-4000-8000-000000000000' $$,
  'non-member cannot list its members');
select is_empty($$ select 1 from public.transactions t join public.spaces s on s.id = t.space_id
                   where s.type = 'personal' and t.user_id <> 'd0000000-0000-4000-8000-000000000004' $$,
  'nobody sees another user''s personal transactions');
select is_empty($$ select 1 from public.profiles where user_id = 'a0000000-0000-4000-8000-000000000001' $$,
  'non-member cannot read a stranger''s profile');
select throws_ok($$ insert into public.transactions (space_id, type, amount_centavos)
                    values ('99999999-0000-4000-8000-000000000000', 'expense', 100) $$,
  '42501', null, 'non-member cannot write into the space');
select throws_ok($$ insert into public.space_members (space_id, user_id, role)
                    values ('99999999-0000-4000-8000-000000000000', 'd0000000-0000-4000-8000-000000000004', 'admin') $$,
  '42501', null, 'nobody can add themselves to a space directly');
reset role;

-- ---------------------------------------------------------------- carol: viewer
select pg_temp.login('c0000000-0000-4000-8000-000000000003');
select isnt_empty($$ select 1 from public.transactions where space_id = '99999999-0000-4000-8000-000000000000' $$,
  'viewer can read transactions');
select throws_ok($$ insert into public.transactions (space_id, type, amount_centavos)
                    values ('99999999-0000-4000-8000-000000000000', 'expense', 100) $$,
  '42501', null, 'viewer cannot write transactions');
reset role;

-- ---------------------------------------------------------------- bob: member
select pg_temp.login('b0000000-0000-4000-8000-000000000002');
select lives_ok($$ insert into public.transactions (space_id, type, amount_centavos)
                   values ('99999999-0000-4000-8000-000000000000', 'expense', 100) $$,
  'member can write own transaction');
select throws_ok($$ insert into public.transactions (space_id, user_id, type, amount_centavos)
                    values ('99999999-0000-4000-8000-000000000000', 'a0000000-0000-4000-8000-000000000001', 'expense', 100) $$,
  '42501', null, 'member cannot write a transaction as someone else');
update public.transactions set amount_centavos = 1 where id = '77777777-0000-4000-8000-000000000000';
update public.space_members set role = 'admin'
where space_id = '99999999-0000-4000-8000-000000000000' and user_id = 'b0000000-0000-4000-8000-000000000002';
select isnt_empty($$ select 1 from public.profiles where user_id = 'a0000000-0000-4000-8000-000000000001' $$,
  'co-member can read profile');
select throws_ok($$ select expo_push_token from public.profiles $$,
  '42501', null, 'push tokens are not readable');
select throws_ok($$ insert into public.budgets (space_id, category_id, month, limit_centavos)
                    select '99999999-0000-4000-8000-000000000000', id, '2026-11-01', 100 from public.categories limit 1 $$,
  '42501', null, 'member cannot manage budgets');
reset role;
select is((select amount_centavos from public.transactions where id = '77777777-0000-4000-8000-000000000000'),
          50000::bigint, 'member cannot edit someone else''s transaction');
select is((select role::text from public.space_members
           where space_id = '99999999-0000-4000-8000-000000000000' and user_id = 'b0000000-0000-4000-8000-000000000002'),
          'member', 'member cannot promote themselves');

-- ---------------------------------------------------------------- invites
select pg_temp.login('a0000000-0000-4000-8000-000000000001');
insert into public.invites (space_id, code) values ('99999999-0000-4000-8000-000000000000', 'JOINUS1234');
select throws_ok($$ insert into public.invites (space_id)
                    select id from public.spaces where type = 'personal' $$,
  '42501', null, 'personal spaces cannot have invites');
reset role;

select pg_temp.login('d0000000-0000-4000-8000-000000000004');
select is(public.accept_invite(' joinus1234 '), '99999999-0000-4000-8000-000000000000'::uuid,
  'accepting an invite returns the space');
select isnt_empty($$ select 1 from public.transactions where space_id = '99999999-0000-4000-8000-000000000000' $$,
  'new member can now read the space');
select throws_ok($$ select public.accept_invite('NOPE') $$, 'P0002', null, 'unknown invite code is rejected');
reset role;

-- ---------------------------------------------------------------- leaving
select pg_temp.login('a0000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.leave_space('99999999-0000-4000-8000-000000000000') $$,
  '42501', null, 'owner cannot leave');
reset role;
select pg_temp.login('b0000000-0000-4000-8000-000000000002');
select public.leave_space('99999999-0000-4000-8000-000000000000');
select is_empty($$ select 1 from public.transactions where space_id = '99999999-0000-4000-8000-000000000000' $$,
  'after leaving, the space is hidden');
reset role;

select * from finish();
rollback;
