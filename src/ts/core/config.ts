// The Supabase address and public key. The same file (/config.js) is read by the game, so
// there is exactly one place to change them.
export interface OnlineConfig {
  supabase_url: string;
  anon_key: string;
}

declare global {
  interface Window {
    LIBRARY_ONLINE?: Partial<OnlineConfig>;
  }
}

export function onlineConfig(): OnlineConfig | null {
  const found = window.LIBRARY_ONLINE;
  if (found?.supabase_url && found.anon_key) return { supabase_url: found.supabase_url, anon_key: found.anon_key };
  return null;
}

export const HOME = "/";
export const LOGIN = "/login";
export const TIMEZONE = "Asia/Manila";
