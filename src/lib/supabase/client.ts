"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "./env";

let client: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  if (!client) {
    const config = getSupabasePublicConfig();
    client = createBrowserClient(config.url, config.publishableKey);
  }
  return client;
}
