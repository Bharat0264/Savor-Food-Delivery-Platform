import "server-only";

import { createClient } from "./server";
import { supabaseConfigured } from "./env";

export type AppRole =
  | "customer"
  | "merchant_owner"
  | "merchant_manager"
  | "delivery_partner"
  | "super_admin";

export type MerchantMembership = {
  merchantId: string;
  role:
    | "owner"
    | "manager"
    | "catalog_manager"
    | "order_manager"
    | "finance_viewer";
};

export type AuthorizationContext = {
  userId: string;
  roles: AppRole[];
  merchantMemberships: MerchantMembership[];
};

export async function getAuthorizationContext(): Promise<AuthorizationContext | null> {
  if (!supabaseConfigured) return null;
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || typeof userId !== "string") return null;

  const [
    { data: roleRows, error: rolesError },
    { data: membershipRows, error: membershipsError },
  ] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase
      .from("merchant_members")
      .select("merchant_id, role")
      .eq("user_id", userId)
      .eq("active", true),
  ]);
  if (rolesError || membershipsError) return null;

  return {
    userId,
    roles: (roleRows ?? []).map((row) => row.role as AppRole),
    merchantMemberships: (membershipRows ?? []).map((row) => ({
      merchantId: row.merchant_id as string,
      role: row.role as MerchantMembership["role"],
    })),
  };
}

export function isSuperAdmin(context: AuthorizationContext) {
  return context.roles.includes("super_admin");
}

export function isMerchantOwner(
  context: AuthorizationContext,
  merchantId: string,
) {
  return (
    isSuperAdmin(context) ||
    context.merchantMemberships.some(
      (membership) =>
        membership.merchantId === merchantId && membership.role === "owner",
    )
  );
}

export function canManageMerchant(
  context: AuthorizationContext,
  merchantId: string,
) {
  return (
    isSuperAdmin(context) ||
    context.merchantMemberships.some(
      (membership) =>
        membership.merchantId === merchantId &&
        (membership.role === "owner" || membership.role === "manager"),
    )
  );
}

export async function canManageBranch(
  context: AuthorizationContext,
  branchId: string,
) {
  if (isSuperAdmin(context)) return true;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branch_members")
    .select(
      "branch_id, merchant_members!inner(merchant_id, user_id, active, role)",
    )
    .eq("branch_id", branchId)
    .eq("merchant_members.user_id", context.userId)
    .eq("merchant_members.active", true)
    .maybeSingle();
  if (error || !data) return false;
  const membership = data.merchant_members as unknown as {
    merchant_id: string;
    role: MerchantMembership["role"];
  };
  return (
    ["manager", "catalog_manager", "order_manager"].includes(membership.role) ||
    isMerchantOwner(context, membership.merchant_id)
  );
}

export function canManageRiders(
  context: AuthorizationContext,
  merchantId: string,
) {
  return canManageMerchant(context, merchantId);
}

export async function canViewOrder(
  context: AuthorizationContext,
  orderId: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id")
    .eq("id", orderId)
    .maybeSingle();
  return !error && Boolean(data);
}

export async function canAssignDelivery(
  context: AuthorizationContext,
  orderId: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("merchant_id, branch_id")
    .eq("id", orderId)
    .maybeSingle();
  if (error || !data) return false;
  return (
    canManageRiders(context, data.merchant_id as string) &&
    (await canManageBranch(context, data.branch_id as string))
  );
}

export async function canViewSettlement(
  context: AuthorizationContext,
  financialAccountId: string,
) {
  if (isSuperAdmin(context)) return true;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("merchant_financial_accounts")
    .select("merchant_id")
    .eq("id", financialAccountId)
    .maybeSingle();
  if (error || !data) return false;
  return context.merchantMemberships.some(
    (membership) =>
      membership.merchantId === data.merchant_id &&
      ["owner", "manager", "finance_viewer"].includes(membership.role),
  );
}

export function postLoginPath(context: AuthorizationContext) {
  if (isSuperAdmin(context)) return "/admin";
  if (context.roles.includes("delivery_partner")) return "/rider";
  if (context.merchantMemberships.length > 1) return "/merchant/select";
  if (context.merchantMemberships.length === 1) return "/merchant";
  return "/account";
}
