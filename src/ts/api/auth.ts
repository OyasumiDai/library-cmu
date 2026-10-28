import { db } from "../core/supabase";
import { refreshProfile } from "../core/session";
import type { Profile } from "../types";
import { markSessionStart } from "../core/idle";

export interface Registration {
  email: string;
  password: string;
  username: string;
  full_name: string;
  student_id: string;
  gender: string;
  course: string;
  major: string;
  college: string;
  year_level: string;
  phone: string;
  terms_version: string;
}

export async function signIn(email: string, password: string): Promise<Profile | null> {
  const { data, error } = await db().auth.signInWithPassword({ email, password });
  if (error) throw error;
  markSessionStart();
  void db().rpc("log_event", { p_type: "signin" });
  const { data: profile } = await db().from("profiles").select("*").eq("id", data.user.id).maybeSingle();
  return (profile as Profile | null) ?? null;
}

export async function signOut(): Promise<void> {
  const { error } = await db().auth.signOut();
  if (error) throw error;
}

export async function usernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await db().rpc("username_available", { p_username: username });
  if (error) throw error;
  return data === true;
}

export class EmailTakenError extends Error {
  constructor() { super("That email already has an account. Sign in instead, or use Forgot password."); }
}

// creates the sign-up and emails the code; the account cannot be used until the code is typed in (confirmSignupCode)
export async function register(input: Registration): Promise<void> {
  const { password, email, ...meta } = input;
  const { data, error } = await db().auth.signUp({
    email,
    password,
    options: { data: meta, emailRedirectTo: `${location.origin}/login` },
  });
  if (error) {
    if (/already registered|already been registered|already exists/i.test(error.message)) throw new EmailTakenError();
    throw error;
  }
  // Supabase hides a confirmed email that is already in use: it answers "ok" but the user has no identities and no code is sent
  if (data.user && (data.user.identities?.length ?? 0) === 0) throw new EmailTakenError();
  // a session here means "Confirm email" is off in Supabase: never let an unconfirmed account in
  if (data.session) {
    await db().auth.signOut();
    console.error("Supabase > Authentication > Sign In / Providers > Email: turn on 'Confirm email' so new accounts need the emailed code.");
    throw new Error("Sign-up is not available right now. Please tell the library.");
  }
}

// confirming a new account: the 6-digit code from the email (a link would be used up by mail scanners before the person clicks it)
export async function confirmSignupCode(email: string, code: string): Promise<void> {
  const { error } = await db().auth.verifyOtp({ email, token: code, type: "signup" });
  if (error) throw error;
}

export async function resendSignupCode(email: string): Promise<void> {
  const { error } = await db().auth.resend({ type: "signup", email });
  if (error) throw error;
}

// the second step of "forgot password": the 6-digit code from the email signs the person in for one job only, choosing a new password
export async function verifyResetCode(email: string, code: string): Promise<void> {
  const { error } = await db().auth.verifyOtp({ email, token: code, type: "recovery" });
  if (error) throw error;
}

// change password from the profile: the current password must be right first
export async function changePassword(email: string, current: string, next: string): Promise<void> {
  const check = await db().auth.signInWithPassword({ email, password: current });
  if (check.error) throw new Error("Your current password is not right.");
  const { error } = await db().auth.updateUser({ password: next });
  if (error) throw error;
  void db().rpc("log_event", { p_type: "password" });
}

export async function sendResetEmail(email: string): Promise<void> {
  const { error } = await db().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/reset` });
  if (error) throw error;
}

export async function setPassword(password: string): Promise<void> {
  const { error } = await db().auth.updateUser({ password });
  if (error) throw error;
}

export async function acceptTerms(version: string): Promise<void> {
  const { error } = await db().rpc("accept_terms", { p_version: version });
  if (error) throw error;
  await refreshProfile();
}

export type ProfileEdit = Partial<Pick<Profile, "full_name" | "student_id" | "gender" | "course" | "major" | "college" | "year_level" | "phone" | "photo_url">>;

export async function updateProfile(id: string, edit: ProfileEdit): Promise<void> {
  const { error } = await db().from("profiles").update(edit).eq("id", id);
  if (error) throw error;
  void db().rpc("log_event", { p_type: "profile" });
  await refreshProfile();
}
