// Student feedback about the website and the 2D-3D game (tools/student-feedback.sql).
// Students send and read their own; staff with the Student Profiles permission and admins read everyone's.
import { db } from "../core/supabase";
import type { Feedback } from "../types";

const NOT_READY = "Feedback is not switched on yet. An admin needs to run tools/student-feedback.sql in the Supabase SQL Editor.";
const check = (error: { message: string } | null): void => {
  if (!error) return;
  if (/feedback/i.test(error.message) && /does not exist|schema cache|relation/i.test(error.message)) throw new Error(NOT_READY);
  if (/row-level security|violates row-level/i.test(error.message)) throw new Error("You can send up to 5 feedbacks a day. Please try again tomorrow.");
  throw error;
};

export async function sendFeedback(topic: Feedback["topic"], rating: number, suggestion: string): Promise<void> {
  check((await db().from("feedback").insert({ topic, rating, suggestion: suggestion.trim() })).error);
}

// one student's feedback, newest first (a student reading their own, or staff reading a profile)
export async function feedbackOf(userId: string): Promise<Feedback[]> {
  const { data, error } = await db().from("feedback").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200);
  check(error);
  return (data ?? []) as Feedback[];
}

// every student's feedback, for the badges and counts in Students; empty while the SQL is not run yet
export async function allFeedback(): Promise<Feedback[]> {
  const { data, error } = await db().from("feedback").select("id,user_id,topic,rating,is_read,created_at").order("created_at", { ascending: false }).limit(3000);
  if (error) return [];
  return (data ?? []) as Feedback[];
}

export async function markFeedbackRead(ids: number[]): Promise<void> {
  if (!ids.length) return;
  check((await db().from("feedback").update({ is_read: true }).in("id", ids)).error);
}
