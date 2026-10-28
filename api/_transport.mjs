// The Gmail sender shared by every email function. Google shows app passwords as "abcd efgh ijkl mnop":
// the spaces are stripped here so pasting it into Vercel works either way.
import nodemailer from "nodemailer";

export const mailEnv = () => ({
  user: String(process.env.GMAIL_USER ?? "").trim(),
  pass: String(process.env.GMAIL_APP_PASSWORD ?? "").replace(/\s+/g, ""),
});

export function gmailTransport() {
  const { user, pass } = mailEnv();
  if (!user || !pass) return null;
  return nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass }, connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000 });
}

// a short, safe reason a sender can show an admin (never the password)
export function explainMailError(error) {
  const code = error?.code ?? "";
  const text = String(error?.response ?? error?.message ?? "");
  if (code === "EAUTH" || /535|Username and Password not accepted|BadCredentials/i.test(text)) return "Gmail refused the login. Use a Google App password (not the normal password) and the exact Gmail address; 2-step verification must be on.";
  if (code === "ETIMEDOUT" || code === "ESOCKET" || code === "ECONNECTION" || code === "ECONNREFUSED") return "Could not reach Gmail from the server. Try again in a minute.";
  if (/daily user sending limit|rate/i.test(text)) return "Gmail's daily sending limit was reached.";
  return `Sending failed (${code || "error"}).`;
}

// the address links in emails point to: SITE_URL when set, else the production domain Vercel provides,
// never a preview deployment (those sit behind Vercel's login) or whatever host the staff member happened to use
export function siteUrlFor(req) {
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "";
  const fromRequest = `${String(req.headers["x-forwarded-proto"] ?? "https").split(",")[0]}://${req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost"}`;
  return (process.env.SITE_URL || production || fromRequest).replace(/\/$/, "");
}
