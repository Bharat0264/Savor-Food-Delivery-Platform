-- Savor Phase 2 / Stage 1: identity, normalized domain foundation and secure defaults.
-- Money is always stored as integer minor units (INR paise). All timestamps are UTC timestamptz.

create schema if not exists private;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists postgis with schema extensions;

create type public.app_role as enum ('customer', 'merchant_owner', 'merchant_manager', 'delivery_partner', 'super_admin');
create type public.merchant_kind as enum ('restaurant', 'grocery');
create type public.merchant_status as enum ('draft', 'pending_approval', 'approved', 'suspended', 'rejected');
create type public.merchant_member_role as enum ('owner', 'manager', 'catalog_manager', 'order_manager', 'finance_viewer');
create type public.rider_availability as enum ('offline', 'available', 'busy', 'disabled');
create type public.cart_status as enum ('active', 'converted', 'abandoned');
create type public.order_status as enum ('pending_payment', 'confirmed', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'refund_pending', 'refunded');
create type public.payment_status as enum ('created', 'requires_action', 'authorized', 'captured', 'failed', 'cancelled', 'refunded', 'partially_refunded');
create type public.delivery_status as enum ('unassigned', 'assigned', 'accepted', 'at_pickup', 'picked_up', 'at_dropoff', 'delivered', 'cancelled');
create type public.notification_status as enum ('queued', 'sent', 'read', 'failed');
create type public.support_status as enum ('open', 'in_progress', 'resolved', 'closed');
create type public.ledger_entry_type as enum ('sale', 'payment_fee', 'commission', 'tax', 'delivery_fee', 'promotion', 'refund', 'chargeback', 'settlement', 'adjustment');
create type public.settlement_status as enum ('pending', 'eligible', 'scheduled', 'processing', 'paid', 'failed', 'on_hold', 'reversed', 'adjusted');
create type public.payout_status as enum ('created', 'submitted', 'paid', 'failed', 'reversed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  phone_e164 text,
  avatar_key text,
  timezone text not null default 'Asia/Kolkata',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.platform_settings (
  singleton boolean primary key default true check (singleton),
  setup_complete boolean not null default false,
  business_timezone text not null default 'Asia/Kolkata',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.platform_settings(singleton) values (true) on conflict do nothing;

create table public.customer_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  display_name text not null,
  kind public.merchant_kind not null,
  status public.merchant_status not null default 'draft',
  description text not null default '',
  logo_key text,
  support_email text,
  support_phone_e164 text,
  tax_registration_number text,
  currency char(3) not null default 'INR',
  timezone text not null default 'Asia/Kolkata',
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(display_name) between 1 and 160)
);

create table public.merchant_members (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.merchant_member_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, user_id)
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  name text not null,
  address_line1 text not null,
  address_line2 text,
  locality text,
  city text not null,
  postal_code text,
  location extensions.geography(Point, 4326),
  is_active boolean not null default true,
  accepts_orders boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, name)
);

create table public.branch_members (
  branch_id uuid not null references public.branches(id) on delete cascade,
  merchant_member_id uuid not null references public.merchant_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (branch_id, merchant_member_id)
);

create table public.rider_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  availability public.rider_availability not null default 'offline',
  vehicle_type text,
  vehicle_registration text,
  onboarding_verified_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rider_merchant_memberships (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.rider_accounts(user_id) on delete restrict,
  merchant_id uuid not null references public.merchants(id) on delete restrict,
  active boolean not null default true,
  granted_by uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rider_id, merchant_id)
);

create table public.merchant_categories (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (merchant_id, name)
);

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  parent_id uuid references public.product_categories(id) on delete set null,
  name text not null,
  kind public.merchant_kind not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (merchant_id, parent_id, name)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete restrict,
  category_id uuid references public.product_categories(id) on delete set null,
  name text not null,
  description text not null default '',
  sku text,
  is_vegetarian boolean,
  is_available boolean not null default true,
  tax_configuration_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, sku)
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null default 'Regular',
  sku text,
  price_minor integer not null check (price_minor >= 0),
  compare_at_price_minor integer check (compare_at_price_minor is null or compare_at_price_minor >= price_minor),
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, name),
  unique (product_id, sku)
);

create table public.modifier_groups (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  min_selections integer not null default 0 check (min_selections >= 0),
  max_selections integer check (max_selections is null or max_selections >= min_selections),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.modifier_options (
  id uuid primary key default gen_random_uuid(),
  modifier_group_id uuid not null references public.modifier_groups(id) on delete cascade,
  name text not null,
  price_delta_minor integer not null default 0,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (modifier_group_id, name)
);

create table public.tax_configurations (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  name text not null,
  rate_basis_points integer not null check (rate_basis_points between 0 and 10000),
  inclusive boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, name)
);
alter table public.products add constraint products_tax_configuration_fkey foreign key (tax_configuration_id) references public.tax_configurations(id) on delete set null;

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  object_key text not null unique,
  alt_text text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.inventory_levels (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  available_quantity integer not null default 0 check (available_quantity >= 0),
  reorder_level integer not null default 0 check (reorder_level >= 0),
  updated_at timestamptz not null default now(),
  unique (branch_id, variant_id)
);

create table public.inventory_adjustments (
  id uuid primary key default gen_random_uuid(),
  inventory_level_id uuid not null references public.inventory_levels(id) on delete restrict,
  delta_quantity integer not null check (delta_quantity <> 0),
  reason text not null,
  idempotency_key text unique,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.product_price_history (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  price_minor integer not null check (price_minor >= 0),
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now()
);

create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,
  check (is_closed or (opens_at is not null and closes_at is not null)),
  unique (branch_id, weekday)
);

create table public.merchant_service_areas (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  name text not null,
  area extensions.geometry(Polygon, 4326) not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer_accounts(user_id) on delete cascade,
  label text not null,
  line1 text not null,
  line2 text,
  locality text,
  city text not null,
  postal_code text,
  location extensions.geography(Point, 4326),
  delivery_notes text not null default '',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer_accounts(user_id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete set null,
  status public.cart_status not null default 'active',
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index carts_one_active_merchant_per_customer on public.carts(customer_id) where status = 'active';

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);

create table public.cart_item_modifier_options (
  cart_item_id uuid not null references public.cart_items(id) on delete cascade,
  modifier_option_id uuid not null references public.modifier_options(id) on delete restrict,
  quantity integer not null default 1 check (quantity > 0),
  primary key (cart_item_id, modifier_option_id)
);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references public.merchants(id) on delete cascade,
  code text not null,
  active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  min_order_minor integer not null default 0 check (min_order_minor >= 0),
  discount_type text not null check (discount_type in ('fixed', 'percentage')),
  discount_value integer not null check (discount_value >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, code)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  customer_id uuid not null references public.customer_accounts(user_id) on delete restrict,
  merchant_id uuid not null references public.merchants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  delivery_address_id uuid references public.customer_addresses(id) on delete set null,
  delivery_address_snapshot jsonb not null,
  status public.order_status not null default 'pending_payment',
  currency char(3) not null default 'INR',
  subtotal_minor integer not null check (subtotal_minor >= 0),
  tax_minor integer not null default 0 check (tax_minor >= 0),
  delivery_fee_minor integer not null default 0 check (delivery_fee_minor >= 0),
  discount_minor integer not null default 0 check (discount_minor >= 0),
  total_minor integer not null check (total_minor >= 0),
  customer_note text not null default '',
  idempotency_key text not null unique,
  placed_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total_minor = subtotal_minor + tax_minor + delivery_fee_minor - discount_minor)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name_snapshot text not null,
  variant_name_snapshot text not null,
  unit_price_minor integer not null check (unit_price_minor >= 0),
  quantity integer not null check (quantity > 0),
  tax_minor integer not null default 0 check (tax_minor >= 0),
  modifier_snapshot jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  from_status public.order_status,
  to_status public.order_status not null,
  actor_id uuid references public.profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  provider text not null,
  provider_payment_id text,
  idempotency_key text not null unique,
  amount_minor integer not null check (amount_minor >= 0),
  currency char(3) not null default 'INR',
  status public.payment_status not null default 'created',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_attempt_id uuid not null references public.payment_attempts(id) on delete restrict,
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (payment_attempt_id, provider_event_id)
);

create table public.cancellations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  initiated_by uuid references public.profiles(id) on delete set null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  payment_attempt_id uuid references public.payment_attempts(id) on delete set null,
  amount_minor integer not null check (amount_minor > 0),
  reason text not null,
  provider_refund_id text,
  status public.payment_status not null default 'created',
  requested_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_refund_id)
);

create table public.delivery_assignments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  rider_id uuid references public.rider_accounts(user_id) on delete set null,
  assigned_by uuid references public.profiles(id) on delete set null,
  status public.delivery_status not null default 'unassigned',
  verification_code_hash text,
  verification_expires_at timestamptz,
  verification_attempts integer not null default 0 check (verification_attempts >= 0),
  assigned_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rider_location_events (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.rider_accounts(user_id) on delete restrict,
  order_id uuid references public.orders(id) on delete set null,
  location extensions.geography(Point, 4326) not null,
  accuracy_meters numeric(8,2),
  recorded_at timestamptz not null,
  received_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  customer_id uuid not null references public.customer_accounts(user_id) on delete restrict,
  merchant_id uuid not null references public.merchants(id) on delete restrict,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  data jsonb not null default '{}'::jsonb,
  status public.notification_status not null default 'queued',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer_accounts(user_id) on delete restrict,
  order_id uuid references public.orders(id) on delete set null,
  subject text not null,
  message text not null,
  status public.support_status not null default 'open',
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.merchant_financial_accounts (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null unique references public.merchants(id) on delete restrict,
  currency char(3) not null default 'INR',
  payout_provider text,
  payout_provider_account_ref text,
  payout_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.deduction_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create table public.deduction_rule_versions (
  id uuid primary key default gen_random_uuid(),
  deduction_rule_id uuid not null references public.deduction_rules(id) on delete restrict,
  version integer not null,
  effective_from timestamptz not null,
  effective_to timestamptz,
  configuration jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (deduction_rule_id, version)
);

create table public.financial_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  merchant_financial_account_id uuid not null references public.merchant_financial_accounts(id) on delete restrict,
  order_id uuid references public.orders(id) on delete restrict,
  refund_id uuid references public.refunds(id) on delete restrict,
  entry_type public.ledger_entry_type not null,
  amount_minor integer not null check (amount_minor <> 0),
  currency char(3) not null default 'INR',
  external_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_attempt_id uuid not null references public.payment_attempts(id) on delete restrict,
  merchant_financial_account_id uuid not null references public.merchant_financial_accounts(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  amount_minor integer not null check (amount_minor <> 0),
  created_at timestamptz not null default now(),
  unique (payment_attempt_id, merchant_financial_account_id, order_id)
);

create table public.settlement_batches (
  id uuid primary key default gen_random_uuid(),
  merchant_financial_account_id uuid not null references public.merchant_financial_accounts(id) on delete restrict,
  status public.settlement_status not null default 'pending',
  scheduled_for date,
  anchor_event_at timestamptz,
  hold_reason text,
  payout_attempt_id uuid,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.settlement_line_items (
  id uuid primary key default gen_random_uuid(),
  settlement_batch_id uuid not null references public.settlement_batches(id) on delete restrict,
  ledger_entry_id uuid not null references public.financial_ledger_entries(id) on delete restrict,
  deduction_rule_version_id uuid references public.deduction_rule_versions(id) on delete restrict,
  amount_minor integer not null check (amount_minor <> 0),
  created_at timestamptz not null default now(),
  unique (settlement_batch_id, ledger_entry_id)
);

create table public.payout_attempts (
  id uuid primary key default gen_random_uuid(),
  merchant_financial_account_id uuid not null references public.merchant_financial_accounts(id) on delete restrict,
  provider text not null,
  provider_payout_ref text,
  amount_minor integer not null check (amount_minor > 0),
  currency char(3) not null default 'INR',
  status public.payout_status not null default 'created',
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payout_ref)
);
alter table public.settlement_batches add constraint settlement_batches_payout_attempt_fkey foreign key (payout_attempt_id) references public.payout_attempts(id) on delete set null;

create table public.settlement_reconciliations (
  id uuid primary key default gen_random_uuid(),
  settlement_batch_id uuid not null references public.settlement_batches(id) on delete restrict,
  provider_reference text not null,
  reconciled_amount_minor integer not null,
  status text not null check (status in ('matched', 'mismatch', 'pending')),
  notes text not null default '',
  reconciled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (settlement_batch_id, provider_reference)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  request_id uuid,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index merchant_members_user_id_idx on public.merchant_members(user_id);
create index branches_merchant_id_idx on public.branches(merchant_id);
create index branch_members_member_id_idx on public.branch_members(merchant_member_id);
create index rider_memberships_rider_id_idx on public.rider_merchant_memberships(rider_id) where active;
create index products_merchant_id_idx on public.products(merchant_id);
create index variants_product_id_idx on public.product_variants(product_id);
create index inventory_branch_variant_idx on public.inventory_levels(branch_id, variant_id);
create index customer_addresses_customer_id_idx on public.customer_addresses(customer_id);
create index carts_customer_status_idx on public.carts(customer_id, status);
create index orders_customer_created_idx on public.orders(customer_id, created_at desc);
create index orders_merchant_status_idx on public.orders(merchant_id, status, created_at desc);
create index orders_branch_status_idx on public.orders(branch_id, status, created_at desc);
create index order_items_order_id_idx on public.order_items(order_id);
create index payment_attempts_order_id_idx on public.payment_attempts(order_id);
create index delivery_assignments_rider_status_idx on public.delivery_assignments(rider_id, status);
create index rider_location_events_rider_recorded_idx on public.rider_location_events(rider_id, recorded_at desc);
create index rider_location_events_location_idx on public.rider_location_events using gist(location);
create index merchant_service_areas_area_idx on public.merchant_service_areas using gist(area);
create index notifications_recipient_created_idx on public.notifications(recipient_id, created_at desc);
create index financial_ledger_account_created_idx on public.financial_ledger_entries(merchant_financial_account_id, created_at);
create index settlement_batches_account_status_idx on public.settlement_batches(merchant_financial_account_id, status);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);

create or replace function private.touch_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  insert into public.customer_accounts (user_id) values (new.id);
  insert into public.user_roles (user_id, role) values (new.id, 'customer'::public.app_role);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure private.handle_new_auth_user();

create or replace function private.prevent_financial_ledger_mutation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'Financial ledger entries are immutable';
end;
$$;

create trigger financial_ledger_entries_immutable
  before update or delete on public.financial_ledger_entries
  for each row execute procedure private.prevent_financial_ledger_mutation();

create or replace function private.bootstrap_super_admin(target_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select setup_complete from public.platform_settings where singleton) then
    raise exception 'Platform administrator setup is already complete';
  end if;
  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception 'Target user does not have a profile';
  end if;
  insert into public.user_roles (user_id, role) values (target_user_id, 'super_admin'::public.app_role)
    on conflict do nothing;
  update public.platform_settings set setup_complete = true where singleton;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, after_data)
  values (target_user_id, 'platform.bootstrap_super_admin', 'profile', target_user_id, jsonb_build_object('role', 'super_admin'));
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles','user_roles','platform_settings','customer_accounts','merchants','merchant_members','branches','branch_members','rider_accounts','rider_merchant_memberships',
    'merchant_categories','product_categories','products','product_variants','modifier_groups','modifier_options','tax_configurations','product_images','inventory_levels','inventory_adjustments','product_price_history','business_hours','merchant_service_areas',
    'customer_addresses','carts','cart_items','cart_item_modifier_options','promotions','orders','order_items','order_status_history','payment_attempts','payment_events','cancellations','refunds','delivery_assignments','rider_location_events','reviews','notifications','support_tickets',
    'merchant_financial_accounts','deduction_rules','deduction_rule_versions','financial_ledger_entries','payment_allocations','settlement_batches','settlement_line_items','payout_attempts','settlement_reconciliations','audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

revoke all on schema private from public;
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
revoke execute on all functions in schema private from public;
grant usage on schema public to anon, authenticated, service_role;

create trigger profiles_touch_updated_at before update on public.profiles for each row execute procedure private.touch_updated_at();
create trigger merchants_touch_updated_at before update on public.merchants for each row execute procedure private.touch_updated_at();
create trigger merchant_members_touch_updated_at before update on public.merchant_members for each row execute procedure private.touch_updated_at();
create trigger branches_touch_updated_at before update on public.branches for each row execute procedure private.touch_updated_at();
create trigger rider_accounts_touch_updated_at before update on public.rider_accounts for each row execute procedure private.touch_updated_at();
create trigger rider_memberships_touch_updated_at before update on public.rider_merchant_memberships for each row execute procedure private.touch_updated_at();
create trigger products_touch_updated_at before update on public.products for each row execute procedure private.touch_updated_at();
create trigger variants_touch_updated_at before update on public.product_variants for each row execute procedure private.touch_updated_at();
create trigger taxes_touch_updated_at before update on public.tax_configurations for each row execute procedure private.touch_updated_at();
create trigger addresses_touch_updated_at before update on public.customer_addresses for each row execute procedure private.touch_updated_at();
create trigger carts_touch_updated_at before update on public.carts for each row execute procedure private.touch_updated_at();
create trigger promotions_touch_updated_at before update on public.promotions for each row execute procedure private.touch_updated_at();
create trigger orders_touch_updated_at before update on public.orders for each row execute procedure private.touch_updated_at();
create trigger payment_attempts_touch_updated_at before update on public.payment_attempts for each row execute procedure private.touch_updated_at();
create trigger refunds_touch_updated_at before update on public.refunds for each row execute procedure private.touch_updated_at();
create trigger delivery_assignments_touch_updated_at before update on public.delivery_assignments for each row execute procedure private.touch_updated_at();
create trigger reviews_touch_updated_at before update on public.reviews for each row execute procedure private.touch_updated_at();
create trigger support_tickets_touch_updated_at before update on public.support_tickets for each row execute procedure private.touch_updated_at();
create trigger financial_accounts_touch_updated_at before update on public.merchant_financial_accounts for each row execute procedure private.touch_updated_at();
create trigger settlements_touch_updated_at before update on public.settlement_batches for each row execute procedure private.touch_updated_at();
create trigger payouts_touch_updated_at before update on public.payout_attempts for each row execute procedure private.touch_updated_at();
