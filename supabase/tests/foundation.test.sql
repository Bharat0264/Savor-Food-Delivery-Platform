begin;
select plan(8);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'merchants', 'merchants table exists');
select has_table('public', 'orders', 'orders table exists');
select has_table('public', 'financial_ledger_entries', 'immutable ledger table exists');
select col_is_pk('public', 'profiles', 'id', 'profile is keyed by Auth user id');
select col_is_pk('public', 'customer_accounts', 'user_id', 'customer is keyed by profile id');
select col_type_is('public', 'orders', 'total_minor', 'integer', 'order totals use integer minor units');
select has_index('public', 'orders', 'orders_merchant_status_idx', 'merchant order access index exists');

select * from finish();
rollback;
