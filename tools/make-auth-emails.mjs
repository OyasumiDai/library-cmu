// Writes the sign-in emails Supabase sends (confirm sign-up, reset password with the 6-digit code, magic link,
// change email, invite, re-authentication) in the library's design. Paste each file into
// Supabase > Authentication > Emails. Run again after changing the design in api/_mail.mjs:
//   node tools/make-auth-emails.mjs
// {{ .Token }}, {{ .ConfirmationURL }} and {{ .SiteURL }} are Supabase's own placeholders; Supabase fills them in.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const { layout, button, otpBlock, esc } = await import(pathToFileURL(path.resolve("api/_mail.mjs")).href);
const out = path.resolve("..", "supabase", "email-templates");
fs.mkdirSync(out, { recursive: true });

const logoSrc = "{{ .SiteURL }}/assets/brand/cmu-library-crest.png";
const library = { name: "CMU Library" };
const p = (text) => `<p style="margin:0 0 10px">${text}</p>`;
const small = (text) => `<p style="margin:14px 0 0;font-size:13px;color:#5a6a8a">${text}</p>`;
const note = "You are receiving this because someone used this email address on CMU Library.";

const templates = {
  "confirm-signup": { subject: "Confirm your CMU Library account", title: "Confirm your email", pill: "Welcome", tone: "info",
    body: p("Thanks for joining the library! Type this 6-digit code on the sign-up page to confirm your email address and finish creating your account.") + otpBlock("{{ .Token }}", "Type these 6 digits on the sign-up page. They work for 15 minutes. Never share this code with anyone.") + small("If you did not sign up, you can ignore this email.") },
  "reset-password": { subject: "Your CMU Library password reset code", title: "Reset your password", pill: "Password reset", tone: "warning",
    body: p("Use this 6-digit code on the reset page to choose a new password. It works for 15 minutes.") + otpBlock("{{ .Token }}", "Type these 6 digits on the reset page. Never share this code with anyone.") + small("If you did not ask for this, ignore this email. Your password stays the same.") },
  "magic-link": { subject: "Your CMU Library sign-in link", title: "Sign in to the library", pill: "Sign in", tone: "info",
    body: p("Press the button to sign in. The link works once.") + button("Sign in", "{{ .ConfirmationURL }}") + otpBlock("{{ .Token }}", "Or type this code if the page asks for one.") },
  "change-email": { subject: "Confirm your new CMU Library email", title: "Confirm your new email", pill: "Email change", tone: "info",
    body: p("You asked to change the email on your library account from <strong>{{ .Email }}</strong> to <strong>{{ .NewEmail }}</strong>.") + button("Confirm the change", "{{ .ConfirmationURL }}") + small("If this was not you, please contact the library right away.") },
  "invite": { subject: "You are invited to CMU Library", title: "You are invited", pill: "Invitation", tone: "success",
    body: p("The library invited you to create an account. Press the button to accept and choose your password.") + button("Accept the invitation", "{{ .ConfirmationURL }}") },
  "reauthentication": { subject: "Your CMU Library security code", title: "Confirm it is you", pill: "Security check", tone: "warning",
    body: p("Enter this code to confirm a sensitive change on your account.") + otpBlock("{{ .Token }}", "Never share this code with anyone.") },
};

for (const [name, t] of Object.entries(templates)) {
  const html = layout({ title: t.title, pill: t.pill, tone: t.tone, preheader: t.subject, bodyHtml: t.body, library, siteUrl: "{{ .SiteURL }}", logoSrc, footerNote: note });
  fs.writeFileSync(path.join(out, `${name}.html`), html);
  fs.writeFileSync(path.join(out, `${name}.subject.txt`), t.subject + "\n");
}
console.log(`${Object.keys(templates).length} templates written to ${out}`);
void esc;
