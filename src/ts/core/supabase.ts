import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { onlineConfig } from "./config";

export class NotConfiguredError extends Error {
  constructor() {
    super("The library database is not connected yet. Ask an admin to set SUPABASE_URL and SUPABASE_ANON_KEY.");
    this.name = "NotConfiguredError";
  }
}

let client: SupabaseClient | null = null;

// One client for the whole page. The session lives in localStorage under the usual
// sb-<project>-auth-token key, which is what lets the game (same origin) reuse the login.
export function db(): SupabaseClient {
  if (client) return client;
  const config = onlineConfig();
  if (!config) throw new NotConfiguredError();
  client = createClient(config.supabase_url, config.anon_key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}

export function isConfigured(): boolean {
  return onlineConfig() !== null;
}
