import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseConfigured } from "@/lib/supabase/env";

export async function GET(request: NextRequest) {
  const destination = new URL("/auth", request.url);
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  if (next?.startsWith("/") && !next.startsWith("//"))
    destination.pathname = next;
  if (!supabaseConfigured || !code) {
    destination.searchParams.set("error", "Unable to complete sign-in.");
    return NextResponse.redirect(destination);
  }

  const response = NextResponse.redirect(destination);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values) {
          values.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) destination.searchParams.set("error", "The sign-in link expired.");
  return error ? NextResponse.redirect(destination) : response;
}
