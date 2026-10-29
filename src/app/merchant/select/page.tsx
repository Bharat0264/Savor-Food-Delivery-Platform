import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getAuthorizationContext,
  isSuperAdmin,
} from "@/lib/supabase/authorization";
import { supabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default async function MerchantSelectionPage() {
  if (!supabaseConfigured) redirect("/auth");
  const context = await getAuthorizationContext();
  if (
    !context ||
    (!context.merchantMemberships.length && !isSuperAdmin(context))
  )
    redirect("/unauthorized");

  const supabase = await createClient();
  const merchantIds = context.merchantMemberships.map(
    (membership) => membership.merchantId,
  );
  const { data: merchants } = merchantIds.length
    ? await supabase
        .from("merchants")
        .select("id, display_name")
        .in("id", merchantIds)
    : { data: [] };

  return (
    <main className="section auth-page" id="main-content">
      <div className="auth-copy">
        <div className="eyebrow">MERCHANT ACCESS</div>
        <h1>
          Choose the business <em>you’re working with.</em>
        </h1>
        <p>
          Memberships are kept separate. Every later merchant action is checked
          against the selected record and your server-verified membership.
        </p>
      </div>
      <div className="panel auth-card">
        <h2>Your authorized businesses</h2>
        <div className="auth-form">
          {(merchants ?? []).map((merchant) => (
            <Link
              className="btn dark"
              href={`/merchant?merchant=${merchant.id}`}
              key={merchant.id}
            >
              {merchant.display_name}
            </Link>
          ))}
          {isSuperAdmin(context) && !merchantIds.length && (
            <Link className="btn dark" href="/admin">
              Open platform administration
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
