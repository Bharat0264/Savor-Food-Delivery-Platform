-- Requires the test-only basejump-supabase_test_helpers extension documented in PHASE2-STAGE2.md.
begin;
select plan(16);

select tests.create_supabase_user('customer-a');
select tests.create_supabase_user('customer-b');
select tests.create_supabase_user('owner-a');
select tests.create_supabase_user('owner-b');
select tests.create_supabase_user('branch-manager-a');
select tests.create_supabase_user('rider-a');
select tests.create_supabase_user('rider-b');
select tests.create_supabase_user('platform-admin');

-- The Stage 1 Auth trigger must create customer identities with no client mutation.
select ok(
  exists (select 1 from public.profiles where id = tests.get_supabase_uid('customer-a'))
  and exists (select 1 from public.customer_accounts where user_id = tests.get_supabase_uid('customer-a'))
  and exists (select 1 from public.user_roles where user_id = tests.get_supabase_uid('customer-a') and role = 'customer'),
  'Auth user trigger creates profile, customer account, and customer role'
);

select lives_ok(
  $$select private.bootstrap_super_admin(tests.get_supabase_uid('platform-admin'))$$,
  'The SQL-owner-only bootstrap grants the first Super Admin once'
);
select throws_ok(
  $$select private.bootstrap_super_admin(tests.get_supabase_uid('owner-a'))$$,
  'P0001',
  'Platform administrator setup is already complete',
  'Super Admin bootstrap cannot run a second time'
);

select tests.authenticate_as_service_role();

insert into public.user_roles (user_id, role) values
  (tests.get_supabase_uid('owner-a'), 'merchant_owner'),
  (tests.get_supabase_uid('owner-b'), 'merchant_owner'),
  (tests.get_supabase_uid('branch-manager-a'), 'merchant_manager'),
  (tests.get_supabase_uid('rider-a'), 'delivery_partner'),
  (tests.get_supabase_uid('rider-b'), 'delivery_partner');

insert into public.merchants (id, legal_name, display_name, kind, status) values
  ('00000000-0000-0000-0000-0000000000a1', 'Merchant A Pvt Ltd', 'Merchant A', 'restaurant', 'approved'),
  ('00000000-0000-0000-0000-0000000000b1', 'Merchant B Pvt Ltd', 'Merchant B', 'grocery', 'approved');

insert into public.merchant_members (id, merchant_id, user_id, role, active) values
  ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', tests.get_supabase_uid('owner-a'), 'owner', true),
  ('10000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1', tests.get_supabase_uid('branch-manager-a'), 'manager', true),
  ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', tests.get_supabase_uid('owner-b'), 'owner', true);

insert into public.branches (id, merchant_id, name, address_line1, city, accepts_orders) values
  ('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'A One', '1 First Road', 'Bengaluru', true),
  ('20000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1', 'A Two', '2 Second Road', 'Bengaluru', true),
  ('20000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'B One', '3 Third Road', 'Bengaluru', true);

insert into public.branch_members (branch_id, merchant_member_id) values
  ('20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a2');

insert into public.products (id, merchant_id, name) values
  ('30000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'A Product'),
  ('30000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'B Product');
insert into public.product_variants (id, product_id, price_minor) values
  ('40000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a1', 10000),
  ('40000000-0000-0000-0000-0000000000b1', '30000000-0000-0000-0000-0000000000b1', 10000);

insert into public.orders (id, customer_id, merchant_id, branch_id, delivery_address_snapshot, subtotal_minor, total_minor, idempotency_key, status) values
  ('50000000-0000-0000-0000-0000000000a1', tests.get_supabase_uid('customer-a'), '00000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1', '{}'::jsonb, 10000, 10000, 'test-customer-a-a1', 'confirmed'),
  ('50000000-0000-0000-0000-0000000000a2', tests.get_supabase_uid('customer-a'), '00000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a2', '{}'::jsonb, 10000, 10000, 'test-customer-a-a2', 'confirmed'),
  ('50000000-0000-0000-0000-0000000000b1', tests.get_supabase_uid('customer-b'), '00000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-0000000000b1', '{}'::jsonb, 10000, 10000, 'test-customer-b-b1', 'confirmed');

insert into public.rider_accounts (user_id, availability) values
  (tests.get_supabase_uid('rider-a'), 'available'),
  (tests.get_supabase_uid('rider-b'), 'available');
insert into public.rider_merchant_memberships (rider_id, merchant_id, active) values
  (tests.get_supabase_uid('rider-a'), '00000000-0000-0000-0000-0000000000a1', true),
  (tests.get_supabase_uid('rider-b'), '00000000-0000-0000-0000-0000000000b1', true);
insert into public.delivery_assignments (order_id, rider_id, status) values
  ('50000000-0000-0000-0000-0000000000a1', tests.get_supabase_uid('rider-a'), 'assigned'),
  ('50000000-0000-0000-0000-0000000000b1', tests.get_supabase_uid('rider-b'), 'assigned');

insert into public.merchant_financial_accounts (id, merchant_id) values
  ('60000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1');
insert into public.financial_ledger_entries (merchant_financial_account_id, order_id, entry_type, amount_minor) values
  ('60000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-0000000000a1', 'sale', 10000);

select tests.authenticate_as('customer-a');
select results_eq(
  $$select count(*) from public.orders$$,
  array[2::bigint],
  'Customer A cannot view Customer B orders'
);
select results_eq(
  $$select count(*) from public.delivery_tracking$$,
  array[1::bigint],
  'Customer A sees only delivery tracking rows for their assigned order'
);
select throws_ok(
  $$update public.financial_ledger_entries set amount_minor = 1$$,
  '42501',
  'permission denied for table financial_ledger_entries',
  'Customers cannot alter financial records'
);
select throws_ok(
  $$update public.user_roles set role = 'super_admin' where user_id = auth.uid()$$,
  '42501',
  'permission denied for table user_roles',
  'Customers cannot elevate their own role'
);

select tests.authenticate_as('branch-manager-a');
select results_eq(
  $$select count(*) from public.products$$,
  array[1::bigint],
  'Merchant A manager cannot access Merchant B products'
);
select results_eq(
  $$select count(*) from public.orders$$,
  array[1::bigint],
  'Branch manager cannot access another assigned merchant branch'
);
select throws_ok(
  $$insert into public.rider_merchant_memberships (rider_id, merchant_id, active) values (tests.get_supabase_uid('rider-b'), '00000000-0000-0000-0000-0000000000a1', true)$$,
  '42501',
  'new row violates row-level security policy for table rider_merchant_memberships',
  'Merchant A cannot attach Merchant B rider without platform authorization'
);

select tests.authenticate_as('rider-a');
select results_eq(
  $$select count(*) from public.orders$$,
  array[1::bigint],
  'Riders cannot access unrelated deliveries'
);

select tests.authenticate_as('platform-admin');
select results_eq(
  $$select count(*) from public.orders$$,
  array[3::bigint],
  'Super Admin can read authorized platform-wide orders'
);

select tests.authenticate_as_service_role();
update public.merchant_members set active = false where id = '10000000-0000-0000-0000-0000000000a2';
select tests.authenticate_as('branch-manager-a');
select results_eq(
  $$select count(*) from public.orders$$,
  array[0::bigint],
  'Disabled merchant membership immediately loses order access'
);

select tests.clear_authentication();
select results_eq(
  $$select count(*) from public.profiles$$,
  array[0::bigint],
  'Anonymous users cannot read private profile records'
);
select results_eq(
  $$select count(*) from public.merchants$$,
  array[2::bigint],
  'Anonymous users can browse only approved public merchants'
);
select tests.rls_enabled('public');

select * from finish();
rollback;
