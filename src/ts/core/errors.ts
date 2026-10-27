import { NotConfiguredError } from "./supabase";

// Turns whatever the database or network throws into one sentence a student can act on.
export function friendly(error: unknown): string {
  if (error instanceof NotConfiguredError) return error.message;
  const text = typeof error === "string" ? error : (error as { message?: string } | null)?.message ?? "";
  if (/Invalid login credentials/i.test(text)) return "That email and password do not match.";
  if (/Email not confirmed/i.test(text)) return "Please confirm your email first. Check your inbox.";
  if (/already registered|already been registered/i.test(text)) return "That email already has an account. Try signing in.";
  if (/Database error saving new user/i.test(text)) return "We could not create that account. The username or email may already be taken, or registration is closed.";
  if (/rate limit/i.test(text)) return "Too many tries. Please wait a minute and try again.";
  if (/Failed to fetch|NetworkError|Load failed/i.test(text)) return "Cannot reach the library. Check your connection.";
  if (/row-level security|permission denied/i.test(text)) return "You are not allowed to do that.";
  if (/duplicate key/i.test(text)) return "That already exists.";
  return text || "Something went wrong. Please try again.";
}
