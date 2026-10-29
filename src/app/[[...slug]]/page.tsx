import { App } from "@/components/app";
import { redirect } from "next/navigation";
import {
  getAuthorizationContext,
  isSuperAdmin,
} from "@/lib/supabase/authorization";
import { supabaseConfigured } from "@/lib/supabase/env";

function requiredExperience(segments: string[]) {
  if (["account", "cart", "checkout", "orders"].includes(segments[0]))
    return "customer";
  if (segments[0] === "merchant") return "merchant";
  if (segments[0] === "rider") return "rider";
  if (segments[0] === "admin") return "admin";
  return null;
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const experience = requiredExperience(slug);
  if (experience) {
    if (!supabaseConfigured) {
      if (process.env.NODE_ENV === "production") {
        redirect(
          "/auth?error=Supabase%20must%20be%20configured%20before%20using%20private%20routes.",
        );
      }
    } else {
      const context = await getAuthorizationContext();
      const path = `/${slug.join("/")}`;
      if (!context) redirect(`/auth?next=${encodeURIComponent(path)}`);
      const allowed =
        experience === "admin"
          ? isSuperAdmin(context)
          : experience === "merchant"
            ? context.merchantMemberships.length > 0 || isSuperAdmin(context)
            : experience === "rider"
              ? context.roles.includes("delivery_partner") ||
                isSuperAdmin(context)
              : context.roles.includes("customer") || isSuperAdmin(context);
      if (!allowed) redirect("/unauthorized");
    }
  }
  return <App segments={slug} />;
}
