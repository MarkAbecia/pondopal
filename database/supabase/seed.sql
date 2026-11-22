-- Seed: system categories, challenge templates, and LOCAL-ONLY demo data.
-- Demo logins (local dev only): juan@pondopal.test / maria@pondopal.test, password "pondopal-demo".

-- ---------------------------------------------------------------- system categories

insert into public.categories (space_id, type, name, icon) values
  (null, 'expense', 'Food', 'restaurant'),
  (null, 'expense', 'Groceries', 'cart'),
  (null, 'expense', 'Transport', 'bus'),
  (null, 'expense', 'Bills & Utilities', 'flash'),
  (null, 'expense', 'Rent', 'home'),
  (null, 'expense', 'Load & Data', 'phone-portrait'),
  (null, 'expense', 'Shopping', 'bag'),
  (null, 'expense', 'Health', 'medkit'),
  (null, 'expense', 'Education', 'school'),
  (null, 'expense', 'Entertainment', 'film'),
  (null, 'expense', 'Personal Care', 'sparkles'),
  (null, 'expense', 'Family Support', 'people'),
  (null, 'expense', 'Other', 'ellipsis-horizontal'),
  (null, 'income', 'Salary', 'briefcase'),
  (null, 'income', 'Freelance', 'laptop'),
  (null, 'income', 'Business', 'storefront'),
  (null, 'income', 'Allowance', 'wallet'),
  (null, 'income', 'Remittance', 'globe'),
  (null, 'income', 'Gifts', 'gift'),
  (null, 'income', 'Other', 'ellipsis-horizontal');

-- ---------------------------------------------------------------- challenge templates
-- Rules are read by backend/app/domain; see misc/docs/challenge-rules.md.

insert into public.challenge_templates (key, name, description, rules) values
  ('week_52', '52-Week Challenge', 'Week n saves n × base. ₱50 base totals ₱68,900.',
   '{"cells": 52, "period": "week", "value": "index_times_base", "default_base_centavos": 5000, "reversible": true}'),
  ('day_365', '365-Day Grid', 'Tick any cell; each is worth its number × base. ₱1 base totals ₱66,795.',
   '{"cells": 365, "period": "day", "value": "index_times_base", "default_base_centavos": 100, "any_order": true}'),
  ('bill_50', '₱50 Bill Alkansya', 'Drop ₱50 bills until you hit your target count.',
   '{"period": "day", "value": "bills_times_unit", "unit_centavos": 5000, "setting": "target_bills"}'),
  ('no_spend', 'No-Spend Days', 'A day counts when you log no expenses in the space (Asia/Manila).',
   '{"period": "day", "value": "zero", "derived_from": "transactions"}'),
  ('custom', 'Custom Challenge', 'Your own amount, your own pace.',
   '{"period": "day", "value": "entered_amount"}');

-- ---------------------------------------------------------------- demo data (local only)

do $$
declare
  juan uuid := '11111111-1111-4111-8111-111111111111';
  maria uuid := '22222222-2222-4222-8222-222222222222';
  ours uuid := '33333333-3333-4333-8333-333333333333';
  u record;
begin
  for u in select * from (values (juan, 'juan@pondopal.test', 'Juan'),
                                 (maria, 'maria@pondopal.test', 'Maria')) v (id, email, name)
  loop
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                            confirmation_token, email_change, email_change_token_new, recovery_token)
    values ('00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
            extensions.crypt('pondopal-demo', extensions.gen_salt('bf')), now(),
            '{"provider": "email", "providers": ["email"]}', jsonb_build_object('full_name', u.name),
            now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), u.id, u.id::text, jsonb_build_object('sub', u.id::text, 'email', u.email),
            'email', now(), now(), now());
  end loop;

  -- Partner space: Juan owns it (trigger), Maria is an admin.
  insert into public.spaces (id, name, type, created_by) values (ours, 'Juan & Maria', 'partner', juan);
  insert into public.space_members (space_id, user_id, role) values (ours, maria, 'admin');

  insert into public.transactions (space_id, user_id, type, amount_centavos, occurred_at, note, category_id)
  select ours, t.who, t.type::public.txn_type, t.amount, now() - t.ago, t.note,
         (select id from public.categories where space_id is null and name = t.cat and type = t.type::public.txn_type)
  from (values
    (juan, 'expense', 245000, interval '2 days', 'Meralco', 'Bills & Utilities'),
    (maria, 'expense', 187550, interval '1 day', 'Puregold run', 'Groceries'),
    (juan, 'expense', 120000, interval '5 days', 'Converge fiber', 'Bills & Utilities'),
    (maria, 'income', 2500000, interval '7 days', 'Kinsenas', 'Salary')
  ) t (who, type, amount, ago, note, cat);

  insert into public.budgets (space_id, category_id, month, limit_centavos)
  select ours, id, date_trunc('month', now() at time zone 'Asia/Manila')::date, 1500000
  from public.categories where space_id is null and name = 'Groceries';

  insert into public.recurring_bills (space_id, name, amount_centavos, due_day, next_due_at)
  values (ours, 'Meralco', 250000, 15, date_trunc('month', now()) + interval '1 month 14 days');

  insert into public.goals (space_id, name, target_centavos, deadline, pay_frequency, created_by)
  values (ours, 'Boracay trip', 6000000, (now() + interval '6 months')::date, 'semi_monthly', juan);

  with c as (
    insert into public.challenges (space_id, template_key, name, base_centavos, created_by)
    values (ours, 'week_52', 'Ipon 2027', 5000, juan) returning id
  )
  insert into public.challenge_entries (challenge_id, space_id, user_id, cell_index, amount_centavos)
  select c.id, ours, who, n, n * 5000 from c, (values (juan), (maria)) w (who), generate_series(1, 3) n;
end $$;
