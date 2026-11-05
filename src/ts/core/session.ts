import type { Session } from "@supabase/supabase-js";
import type { Profile } from "../types";
import { db, isConfigured } from "./supabase";

export interface SessionState {
  session: Session | null;
  profile: Profile | null;
}

let state: SessionState = { session: null, profile: null };
const listeners = new Set<(next: SessionState) => void>();

export const current = (): SessionState => state;
export const isMember = (): boolean => state.profile !== null && state.profile.active;
export const isStaff = (): boolean => isMember() && (state.profile?.role === "staff" || state.profile?.role === "admin");
export const isAdmin = (): boolean => isMember() && state.profile?.role === "admin";
export const hasPerm = (perm: string): boolean => isAdmin() || (isStaff() && (state.profile?.permissions ?? []).includes(perm));

// where a signed-in person lands: staff go to their dashboard, students to the catalog
export const homeFor = (profile: Profile | null): string => (profile && profile.role !== "student" ? "/panel?tab=dashboard" : "/catalog");

export function onSessionChange(listener: (next: SessionState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data } = await db().from("profiles").select("*").eq("id", userId).maybeSingle();
  return (data as Profile | null) ?? null;
}

function publish(next: SessionState): void {
  state = next;
  const body = document.body;
  body.dataset.auth = next.profile ? "member" : "guest";
  if (isStaff()) body.dataset.staff = "true";
  else delete body.dataset.staff;
  if (isAdmin()) body.dataset.admin = "true";
  else delete body.dataset.admin;
  // what the person may open: admins everything, staff what the admin granted ("game" means either game permission)
  const granted = isAdmin() ? ["students", "game_edit", "game_host", "system", "reports", "audit"] : isStaff() ? next.profile?.permissions ?? [] : [];
  body.dataset.perms = [...granted, ...(granted.some((g) => g.startsWith("game")) ? ["game"] : [])].join(" ");
  listeners.forEach((listener) => listener(next));
}

export async function refreshProfile(): Promise<Profile | null> {
  if (!state.session) return null;
  const profile = await loadProfile(state.session.user.id);
  publish({ session: state.session, profile });
  return profile;
}

// Call once per page. Resolves with who is signed in, and keeps the page in step with later sign-ins and outs.
export async function initSession(): Promise<SessionState> {
  if (!isConfigured()) {
    publish({ session: null, profile: null });
    return state;
  }
  const client = db();
  const { data } = await client.auth.getSession();
  const profile = data.session ? await loadProfile(data.session.user.id) : null;
  publish({ session: data.session, profile });

  client.auth.onAuthStateChange((event, session) => {
    if (event === "INITIAL_SESSION") return;
    // Supabase warns against awaiting other client calls inside this callback, so defer them
    setTimeout(async () => {
      publish({ session, profile: session ? await loadProfile(session.user.id) : null });
    }, 0);
  });
  return state;
}
