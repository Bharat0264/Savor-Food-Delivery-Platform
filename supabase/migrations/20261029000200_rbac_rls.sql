-- Savor Phase 2 / Stage 2: authorization helpers, RLS policies and least-privilege grants.
-- All helpers read trusted membership records. No browser supplied role is consulted.

create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = 'super_admin'::public.app_role
  );
$$;

create or replace function private.is_merchant_owner(target_merchant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_super_admin() or exists (
    select 1 from public.merchant_members mm
    where mm.merchant_id = target_merchant_id
      and mm.user_id = (select auth.uid())
      and mm.active
      and mm.role = 'owner'::public.merchant_member_role
  );
$$;

create or replace function private.can_manage_merchant(target_merchant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_super_admin() or exists (
    select 1 from public.merchant_members mm
    where mm.merchant_id = target_merchant_id
      and mm.user_id = (select auth.uid())
      and mm.active
      and mm.role in ('owner'::public.merchant_member_role, 'manager'::public.merchant_member_role)
  );
$$;

create or replace function private.can_manage_catalog(target_merchant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_super_admin() or exists (
    select 1 from public.merchant_members mm
    where mm.merchant_id = target_merchant_id
      and mm.user_id = (select auth.uid())
      and mm.active
      and mm.role in (
        'owner'::public.merchant_member_role,
        'manager'::public.merchant_member_role,
        'catalog_manager'::public.merchant_member_role
      )
  );
$$;

create or replace function private.can_manage_branch(target_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_super_admin() or exists (
    select 1
    from public.branches b
    join public.merchant_members mm on mm.merchant_id = b.merchant_id
    left join public.branch_members bm on bm.branch_id = b.id and bm.merchant_member_id = mm.id
    where b.id = target_branch_id
      and mm.user_id = (select auth.uid())
      and mm.active
      and (
        mm.role = 'owner'::public.merchant_member_role
        or (
          bm.branch_id is not null
          and mm.role in (
            'manager'::public.merchant_member_role,
            'catalog_manager'::public.merchant_member_role,
            'order_manager'::public.merchant_member_role
          )
        )
      )
  );
$$;

create or replace function private.can_manage_orders_for_branch(target_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_super_admin() or exists (
    select 1
    from public.branches b
    join public.merchant_members mm on mm.merchant_id = b.merchant_id
    left join public.branch_members bm on bm.branch_id = b.id and bm.merchant_member_id = mm.id
    where b.id = target_branch_id
      and mm.user_id = (select auth.uid())
      and mm.active
      and (
        mm.role = 'owner'::public.merchant_member_role
        or (
          bm.branch_id is not null
          and mm.role in ('manager'::public.merchant_member_role, 'order_manager'::public.merchant_member_role)
        )
      )
  );
$$;

create or replace function private.can_manage_riders(target_merchant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_super_admin() or exists (
    select 1 from public.merchant_members mm
    where mm.merchant_id = target_merchant_id
      and mm.user_id = (select auth.uid())
      and mm.active
      and mm.role in ('owner'::public.merchant_member_role, 'manager'::public.merchant_member_role)
  );
$$;

create or replace function private.can_manage_product(target_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.products p
    where p.id = target_product_id and private.can_manage_catalog(p.merchant_id)
  );
$$;

create or replace function private.can_manage_variant(target_variant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    where pv.id = target_variant_id and private.can_manage_catalog(p.merchant_id)
  );
$$;

create or replace function private.can_view_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_super_admin() or exists (
    select 1 from public.orders o
    where o.id = target_order_id
      and (
        o.customer_id = (select auth.uid())
        or private.can_manage_orders_for_branch(o.branch_id)
        or exists (
          select 1 from public.delivery_assignments da
          where da.order_id = o.id and da.rider_id = (select auth.uid())
        )
      )
  );
$$;

create or replace function private.can_assign_delivery(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_super_admin() or exists (
    select 1 from public.orders o
    where o.id = target_order_id
      and private.can_manage_orders_for_branch(o.branch_id)
      and private.can_manage_riders(o.merchant_id)
  );
$$;

create or replace function private.can_view_settlement(target_financial_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_super_admin() or exists (
    select 1
    from public.merchant_financial_accounts fa
    join public.merchant_members mm on mm.merchant_id = fa.merchant_id
    where fa.id = target_financial_account_id
      and mm.user_id = (select auth.uid())
      and mm.active
      and mm.role in (
        'owner'::public.merchant_member_role,
        'manager'::public.merchant_member_role,
        'finance_viewer'::public.merchant_member_role
      )
  );
$$;

create or replace function private.is_public_merchant(target_merchant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.merchants m
    where m.id = target_merchant_id and m.status = 'approved'::public.merchant_status
  );
$$;

create or replace function private.can_manage_rider_account(target_rider_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_super_admin() or target_rider_id = (select auth.uid()) or exists (
    select 1 from public.rider_merchant_memberships rm
    where rm.rider_id = target_rider_id
      and rm.active
      and private.can_manage_riders(rm.merchant_id)
  );
$$;

create or replace function private.can_manage_rider_membership(target_rider_id uuid, target_merchant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_super_admin() or (
    private.can_manage_riders(target_merchant_id)
    and not exists (
      select 1 from public.rider_merchant_memberships rm
      where rm.rider_id = target_rider_id
        and rm.active
        and rm.merchant_id <> target_merchant_id
    )
  );
$$;

create or replace function private.can_review_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.orders o
    where o.id = target_order_id
      and o.customer_id = (select auth.uid())
      and o.status = 'delivered'::public.order_status
  );
$$;

-- Helpers execute inside policies but cannot be invoked through the exposed API schema.
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
revoke all on all functions in schema private from public, authenticated;
grant execute on function private.is_super_admin() to anon, authenticated;
grant execute on function private.is_merchant_owner(uuid) to anon, authenticated;
grant execute on function private.can_manage_merchant(uuid) to anon, authenticated;
grant execute on function private.can_manage_catalog(uuid) to anon, authenticated;
grant execute on function private.can_manage_branch(uuid) to anon, authenticated;
grant execute on function private.can_manage_orders_for_branch(uuid) to anon, authenticated;
grant execute on function private.can_manage_riders(uuid) to anon, authenticated;
grant execute on function private.can_manage_product(uuid) to anon, authenticated;
grant execute on function private.can_manage_variant(uuid) to anon, authenticated;
grant execute on function private.can_view_order(uuid) to anon, authenticated;
grant execute on function private.can_assign_delivery(uuid) to anon, authenticated;
grant execute on function private.can_view_settlement(uuid) to anon, authenticated;
grant execute on function private.is_public_merchant(uuid) to anon, authenticated;
grant execute on function private.can_manage_rider_account(uuid) to anon, authenticated;
grant execute on function private.can_manage_rider_membership(uuid, uuid) to anon, authenticated;
grant execute on function private.can_review_order(uuid) to anon, authenticated;

-- New tables must not regain public Data API privileges by default.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Identity and membership data.
grant select (id, display_name, phone_e164, avatar_key, timezone, created_at, updated_at) on public.profiles to authenticated;
grant update (display_name, phone_e164, avatar_key, timezone) on public.profiles to authenticated;
create policy profiles_select on public.profiles for select to authenticated using (
  id = (select auth.uid()) or (select private.is_super_admin())
);
create policy profiles_update on public.profiles for update to authenticated using (
  id = (select auth.uid())
) with check (id = (select auth.uid()));

grant select on public.user_roles to authenticated;
create policy user_roles_select on public.user_roles for select to authenticated using (
  user_id = (select auth.uid()) or (select private.is_super_admin())
);

grant select on public.customer_accounts to authenticated;
grant update (marketing_opt_in) on public.customer_accounts to authenticated;
create policy customer_accounts_select on public.customer_accounts for select to authenticated using (
  user_id = (select auth.uid()) or (select private.is_super_admin())
);
create policy customer_accounts_update on public.customer_accounts for update to authenticated using (
  user_id = (select auth.uid())
) with check (user_id = (select auth.uid()));

grant select on public.merchant_members to authenticated;
create policy merchant_members_select on public.merchant_members for select to authenticated using (
  user_id = (select auth.uid())
  or (select private.can_manage_merchant(merchant_id))
  or (select private.is_super_admin())
);

grant select on public.branch_members to authenticated;
create policy branch_members_select on public.branch_members for select to authenticated using (
  exists (
    select 1 from public.merchant_members mm
    where mm.id = branch_members.merchant_member_id
      and (mm.user_id = (select auth.uid()) or (select private.can_manage_merchant(mm.merchant_id)))
  ) or (select private.is_super_admin())
);

grant select on public.rider_accounts to authenticated;
grant update (availability) on public.rider_accounts to authenticated;
create policy rider_accounts_select on public.rider_accounts for select to authenticated using (
  (select private.can_manage_rider_account(user_id))
);
create policy rider_accounts_update_self on public.rider_accounts for update to authenticated using (
  user_id = (select auth.uid()) and disabled_at is null
) with check (user_id = (select auth.uid()) and disabled_at is null);

grant select, insert, delete on public.rider_merchant_memberships to authenticated;
grant update (rider_id, merchant_id, active, revoked_at) on public.rider_merchant_memberships to authenticated;
create policy rider_memberships_select on public.rider_merchant_memberships for select to authenticated using (
  rider_id = (select auth.uid())
  or (select private.can_manage_riders(merchant_id))
  or (select private.is_super_admin())
);
create policy rider_memberships_insert on public.rider_merchant_memberships for insert to authenticated with check (
  (select private.can_manage_rider_membership(rider_id, merchant_id))
);
create policy rider_memberships_update on public.rider_merchant_memberships for update to authenticated using (
  (select private.can_manage_riders(merchant_id))
) with check ((select private.can_manage_rider_membership(rider_id, merchant_id)));
create policy rider_memberships_delete on public.rider_merchant_memberships for delete to authenticated using (
  (select private.can_manage_riders(merchant_id))
);

-- Public discovery and catalog. Write privileges are limited to catalog roles.
grant select on public.merchants, public.merchant_categories, public.product_categories, public.products, public.product_variants, public.modifier_groups, public.modifier_options, public.product_images, public.business_hours, public.merchant_service_areas to anon, authenticated;
create policy merchants_select on public.merchants for select to anon, authenticated using (
  status = 'approved'::public.merchant_status
  or (select private.can_manage_merchant(id))
  or (select private.is_super_admin())
);
grant update (legal_name, display_name, description, logo_key, support_email, support_phone_e164, status, approved_at, approved_by, suspended_at) on public.merchants to authenticated;
create policy merchants_admin_update on public.merchants for update to authenticated using (
  (select private.is_super_admin())
) with check ((select private.is_super_admin()));
create policy merchant_categories_select on public.merchant_categories for select to anon, authenticated using (
  (select private.is_public_merchant(merchant_id)) or (select private.can_manage_catalog(merchant_id))
);
create policy product_categories_select on public.product_categories for select to anon, authenticated using (
  (select private.is_public_merchant(merchant_id)) or (select private.can_manage_catalog(merchant_id))
);
create policy products_select on public.products for select to anon, authenticated using (
  (select private.is_public_merchant(merchant_id)) or (select private.can_manage_catalog(merchant_id))
);
create policy variants_select on public.product_variants for select to anon, authenticated using (
  exists (select 1 from public.products p where p.id = product_variants.product_id and ((select private.is_public_merchant(p.merchant_id)) or (select private.can_manage_catalog(p.merchant_id))))
);
create policy modifier_groups_select on public.modifier_groups for select to anon, authenticated using (
  exists (select 1 from public.products p where p.id = modifier_groups.product_id and ((select private.is_public_merchant(p.merchant_id)) or (select private.can_manage_catalog(p.merchant_id))))
);
create policy modifier_options_select on public.modifier_options for select to anon, authenticated using (
  exists (select 1 from public.modifier_groups mg join public.products p on p.id = mg.product_id where mg.id = modifier_options.modifier_group_id and ((select private.is_public_merchant(p.merchant_id)) or (select private.can_manage_catalog(p.merchant_id))))
);
create policy product_images_select on public.product_images for select to anon, authenticated using (
  exists (select 1 from public.products p where p.id = product_images.product_id and ((select private.is_public_merchant(p.merchant_id)) or (select private.can_manage_catalog(p.merchant_id))))
);
create policy business_hours_select on public.business_hours for select to anon, authenticated using (
  exists (select 1 from public.branches b where b.id = business_hours.branch_id and ((select private.is_public_merchant(b.merchant_id)) or (select private.can_manage_branch(b.id))))
);
create policy service_areas_select on public.merchant_service_areas for select to anon, authenticated using (
  exists (select 1 from public.branches b where b.id = merchant_service_areas.branch_id and ((select private.is_public_merchant(b.merchant_id)) or (select private.can_manage_branch(b.id))))
);

grant select, insert, update, delete on public.merchant_categories, public.product_categories, public.products, public.product_variants, public.modifier_groups, public.modifier_options, public.tax_configurations, public.product_images to authenticated;
create policy merchant_categories_write on public.merchant_categories for all to authenticated using ((select private.can_manage_catalog(merchant_id))) with check ((select private.can_manage_catalog(merchant_id)));
create policy product_categories_write on public.product_categories for all to authenticated using ((select private.can_manage_catalog(merchant_id))) with check ((select private.can_manage_catalog(merchant_id)));
create policy products_write on public.products for all to authenticated using ((select private.can_manage_catalog(merchant_id))) with check ((select private.can_manage_catalog(merchant_id)));
create policy variants_write on public.product_variants for all to authenticated using ((select private.can_manage_product(product_id))) with check ((select private.can_manage_product(product_id)));
create policy modifier_groups_write on public.modifier_groups for all to authenticated using ((select private.can_manage_product(product_id))) with check ((select private.can_manage_product(product_id)));
create policy modifier_options_write on public.modifier_options for all to authenticated using (
  exists (select 1 from public.modifier_groups mg where mg.id = modifier_options.modifier_group_id and (select private.can_manage_product(mg.product_id)))
) with check (
  exists (select 1 from public.modifier_groups mg where mg.id = modifier_options.modifier_group_id and (select private.can_manage_product(mg.product_id)))
);
create policy tax_configurations_write on public.tax_configurations for all to authenticated using ((select private.can_manage_catalog(merchant_id))) with check ((select private.can_manage_catalog(merchant_id)));
create policy product_images_write on public.product_images for all to authenticated using ((select private.can_manage_product(product_id))) with check ((select private.can_manage_product(product_id)));

grant select, update on public.inventory_levels to authenticated;
grant select, insert on public.inventory_adjustments to authenticated;
create policy inventory_levels_select on public.inventory_levels for select to authenticated using ((select private.can_manage_branch(branch_id)));
create policy inventory_levels_update on public.inventory_levels for update to authenticated using ((select private.can_manage_branch(branch_id))) with check ((select private.can_manage_branch(branch_id)));
create policy inventory_adjustments_select on public.inventory_adjustments for select to authenticated using (
  exists (select 1 from public.inventory_levels il where il.id = inventory_adjustments.inventory_level_id and (select private.can_manage_branch(il.branch_id)))
);
create policy inventory_adjustments_insert on public.inventory_adjustments for insert to authenticated with check (
  created_by = (select auth.uid())
  and exists (select 1 from public.inventory_levels il where il.id = inventory_adjustments.inventory_level_id and (select private.can_manage_branch(il.branch_id)))
);

-- Customer-private commerce records. Orders and payment state remain read-only until Stage 3.
grant select, insert, update, delete on public.customer_addresses to authenticated;
create policy addresses_own on public.customer_addresses for all to authenticated using (
  customer_id = (select auth.uid())
) with check (customer_id = (select auth.uid()));

grant select, insert, update, delete on public.carts, public.cart_items, public.cart_item_modifier_options to authenticated;
create policy carts_own on public.carts for all to authenticated using (customer_id = (select auth.uid())) with check (customer_id = (select auth.uid()));
create policy cart_items_own on public.cart_items for all to authenticated using (
  exists (select 1 from public.carts c where c.id = cart_items.cart_id and c.customer_id = (select auth.uid()))
) with check (
  exists (select 1 from public.carts c where c.id = cart_items.cart_id and c.customer_id = (select auth.uid()))
);
create policy cart_item_modifiers_own on public.cart_item_modifier_options for all to authenticated using (
  exists (select 1 from public.cart_items ci join public.carts c on c.id = ci.cart_id where ci.id = cart_item_modifier_options.cart_item_id and c.customer_id = (select auth.uid()))
) with check (
  exists (select 1 from public.cart_items ci join public.carts c on c.id = ci.cart_id where ci.id = cart_item_modifier_options.cart_item_id and c.customer_id = (select auth.uid()))
);

grant select on public.orders, public.order_items, public.order_status_history, public.payment_attempts, public.cancellations, public.refunds to authenticated;
create policy orders_select on public.orders for select to authenticated using ((select private.can_view_order(id)));
create policy order_items_select on public.order_items for select to authenticated using ((select private.can_view_order(order_id)));
create policy order_history_select on public.order_status_history for select to authenticated using ((select private.can_view_order(order_id)));
create policy payment_attempts_select on public.payment_attempts for select to authenticated using ((select private.can_view_order(order_id)));
create policy cancellations_select on public.cancellations for select to authenticated using ((select private.can_view_order(order_id)));
create policy refunds_select on public.refunds for select to authenticated using ((select private.can_view_order(order_id)));

grant select (id, order_id, rider_id, assigned_by, status, assigned_at, picked_up_at, delivered_at, created_at, updated_at) on public.delivery_assignments to authenticated;
create policy delivery_assignments_select on public.delivery_assignments for select to authenticated using ((select private.can_view_order(order_id)));
create view public.delivery_tracking with (security_invoker = true) as
  select id, order_id, rider_id, status, assigned_at, picked_up_at, delivered_at, created_at, updated_at
  from public.delivery_assignments;
grant select on public.delivery_tracking to authenticated;

grant select, insert, update, delete on public.reviews to authenticated;
create policy reviews_select on public.reviews for select to authenticated using (
  customer_id = (select auth.uid())
  or (select private.can_manage_merchant(merchant_id))
  or (select private.is_super_admin())
);
create policy reviews_insert on public.reviews for insert to authenticated with check (
  customer_id = (select auth.uid()) and (select private.can_review_order(order_id))
);
create policy reviews_update on public.reviews for update to authenticated using (customer_id = (select auth.uid())) with check (customer_id = (select auth.uid()));
create policy reviews_delete on public.reviews for delete to authenticated using (customer_id = (select auth.uid()));

grant select, update (read_at) on public.notifications to authenticated;
create policy notifications_own on public.notifications for select to authenticated using (recipient_id = (select auth.uid()));
create policy notifications_read on public.notifications for update to authenticated using (recipient_id = (select auth.uid())) with check (recipient_id = (select auth.uid()));

grant select, insert, update (subject, message) on public.support_tickets to authenticated;
create policy support_tickets_select on public.support_tickets for select to authenticated using (
  customer_id = (select auth.uid()) or (select private.is_super_admin())
);
create policy support_tickets_insert on public.support_tickets for insert to authenticated with check (customer_id = (select auth.uid()));
create policy support_tickets_update on public.support_tickets for update to authenticated using (customer_id = (select auth.uid())) with check (customer_id = (select auth.uid()));

-- Financial records are read-only to authorized finance roles. There are no client write grants.
grant select on public.merchant_financial_accounts, public.financial_ledger_entries, public.payment_allocations, public.settlement_batches, public.settlement_line_items, public.payout_attempts, public.settlement_reconciliations, public.deduction_rules, public.deduction_rule_versions to authenticated;
create policy financial_accounts_select on public.merchant_financial_accounts for select to authenticated using ((select private.can_view_settlement(id)));
create policy ledger_select on public.financial_ledger_entries for select to authenticated using ((select private.can_view_settlement(merchant_financial_account_id)));
create policy payment_allocations_select on public.payment_allocations for select to authenticated using ((select private.can_view_settlement(merchant_financial_account_id)));
create policy settlement_batches_select on public.settlement_batches for select to authenticated using ((select private.can_view_settlement(merchant_financial_account_id)));
create policy settlement_line_items_select on public.settlement_line_items for select to authenticated using (
  exists (select 1 from public.settlement_batches sb where sb.id = settlement_line_items.settlement_batch_id and (select private.can_view_settlement(sb.merchant_financial_account_id)))
);
create policy payout_attempts_select on public.payout_attempts for select to authenticated using ((select private.can_view_settlement(merchant_financial_account_id)));
create policy reconciliations_select on public.settlement_reconciliations for select to authenticated using (
  exists (select 1 from public.settlement_batches sb where sb.id = settlement_reconciliations.settlement_batch_id and (select private.can_view_settlement(sb.merchant_financial_account_id)))
);
create policy deduction_rules_admin_select on public.deduction_rules for select to authenticated using ((select private.is_super_admin()));
create policy deduction_rule_versions_admin_select on public.deduction_rule_versions for select to authenticated using ((select private.is_super_admin()));

grant select on public.audit_logs to authenticated;
create policy audit_logs_admin_select on public.audit_logs for select to authenticated using ((select private.is_super_admin()));

create or replace function private.audit_sensitive_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_row jsonb;
  after_row jsonb;
begin
  if tg_op = 'DELETE' then
    before_row := to_jsonb(old);
  else
    after_row := to_jsonb(new);
  end if;
  insert into public.audit_logs (actor_id, action, entity_type, before_data, after_data)
  values ((select auth.uid()), lower(tg_table_name) || '.' || lower(tg_op), tg_table_name, before_row, after_row);
  return coalesce(new, old);
end;
$$;

create trigger audit_merchants after insert or update or delete on public.merchants for each row execute procedure private.audit_sensitive_change();
create trigger audit_merchant_members after insert or update or delete on public.merchant_members for each row execute procedure private.audit_sensitive_change();
create trigger audit_branch_members after insert or update or delete on public.branch_members for each row execute procedure private.audit_sensitive_change();
create trigger audit_rider_memberships after insert or update or delete on public.rider_merchant_memberships for each row execute procedure private.audit_sensitive_change();
create trigger audit_products after insert or update or delete on public.products for each row execute procedure private.audit_sensitive_change();
create trigger audit_product_variants after insert or update or delete on public.product_variants for each row execute procedure private.audit_sensitive_change();
create trigger audit_inventory_adjustments after insert on public.inventory_adjustments for each row execute procedure private.audit_sensitive_change();
revoke all on function private.audit_sensitive_change() from public, authenticated;
