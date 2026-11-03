import teamData from "../../data/team.json";
import { db } from "../core/supabase";
import type { Announcement, ContentPage, Course, Notice, SiteSettings, TeamMember } from "../types";

export async function publicSettings(): Promise<SiteSettings> {
  const { data, error } = await db().from("site_settings").select("key,value");
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((row: { key: string; value: unknown }) => [row.key, row.value]));
}

export const settingText = (settings: SiteSettings, key: string, fallback = ""): string => {
  const value = settings[key];
  return typeof value === "string" ? value : fallback;
};
export const settingNumber = (settings: SiteSettings, key: string, fallback = 0): number => {
  const value = Number(settings[key]);
  return Number.isFinite(value) ? value : fallback;
};

export interface RegistrationInfo {
  open: boolean;
  domains: string[] | null;
  terms_version: string;
}

export async function registrationInfo(): Promise<RegistrationInfo> {
  const { data, error } = await db().rpc("registration_info");
  if (error) throw error;
  return data as RegistrationInfo;
}

export async function publicStats(): Promise<{ titles: number; students: number; games: number }> {
  const { data, error } = await db().rpc("public_stats");
  if (error) throw error;
  return data as { titles: number; students: number; games: number };
}

export async function contentPage(slug: string): Promise<ContentPage | null> {
  const { data, error } = await db().from("content_pages").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data as ContentPage | null;
}

export async function courses(): Promise<Course[]> {
  const { data, error } = await db().from("courses").select("*").order("sort").order("program");
  if (error) throw error;
  return (data ?? []) as Course[];
}

// The people behind the library are fixed in the website itself (src/data/team.json), not in the database:
// they cannot be added, changed or removed from the staff panel.
export async function team(): Promise<TeamMember[]> {
  return teamData.people.map((p, i) => ({ id: i + 1, team_group: "dev_team" as const, name: p.name, position: p.position, email: "", photo_url: p.photo, character: p.character, bio: p.bio, display_order: i + 1, is_active: true }));
}

export async function announcements(limit = 50): Promise<Announcement[]> {
  const { data, error } = await db().from("announcements").select("*").eq("published", true).order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as Announcement[];
}

export async function notices(userId: string, limit = 30): Promise<Notice[]> {
  const { data, error } = await db().from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as Notice[];
}

export async function markNoticeRead(id: number, read = true): Promise<void> {
  const { error } = await db().from("notifications").update({ is_read: read }).eq("id", id);
  if (error) throw error;
}

export async function deleteNotice(id: number): Promise<void> {
  const { error } = await db().from("notifications").delete().eq("id", id);
  if (error) throw error;
}

export async function markNoticesRead(userId: string): Promise<void> {
  const { error } = await db().from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
  if (error) throw error;
}
