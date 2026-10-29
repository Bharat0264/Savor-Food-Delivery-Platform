const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigured = Boolean(url && publishableKey);

export function getSupabasePublicConfig() {
  if (!url || !publishableKey) {
    throw new Error("Supabase is not configured.");
  }
  return { url, publishableKey };
}
