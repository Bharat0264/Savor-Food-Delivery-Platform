import { redirect } from "next/navigation";
import {
  getAuthorizationContext,
  postLoginPath,
} from "@/lib/supabase/authorization";
import { supabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default async function AuthRedirectPage() {
  if (!supabaseConfigured)
    redirect("/auth?error=Supabase%20is%20not%20configured.");
  const context = await getAuthorizationContext();
  if (!context)
    redirect(
      "/auth?error=Your%20session%20has%20expired.%20Please%20sign%20in%20again.",
    );
  redirect(postLoginPath(context));
}
