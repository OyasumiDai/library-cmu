// The floating library assistant (bottom right). Two brains behind one chat window:
//   1. the AI assistant: the page calls /api/assistant (a small server function) which forwards the question
//      to your ChatGPT automation. See site/ASSISTANT_PROMPT.md.
//   2. quick answers: a built-in list (src/data/assistant.json). Used when the AI is not connected yet or is
//      slow, so the assistant always answers something useful.
import kb from "../../data/assistant.json";
import { publicSettings, settingNumber } from "../api/content";
import { escapeHtml, html, icon, raw, Safe } from "./dom";
import { current, isStaff } from "./session";
import type { SiteSettings } from "../types";

interface Turn {
  role: "user" | "assistant";
  content: string;
}
interface Entry {
  id: string;
  keywords: string[];
  answer: string;
  roles?: string[];
}

const STORE = "cmu-assistant";
const MAX_TURNS = 30;
const MAX_CHARS = 400;
const WAIT_MS = 1500;
const TIMEOUT_MS = 25000;

let facts: SiteSettings = {};
let turns: Turn[] = [];
let busy = false;
let lastSent = 0;
let mode: "ai" | "basic" = "basic";

// ---------------------------------------------------------------- text: safe, tiny markdown
// bold, bullet lists, line breaks and links that stay on this site
export function renderText(text: string): Safe {
  const lines = escapeHtml(text).split("\n");
  let out = "";
  let inList = false;
  for (const line of lines) {
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    if (bullet && !inList) { out += "<ul>"; inList = true; }
    if (!bullet && inList) { out += "</ul>"; inList = false; }
    const body = (bullet ? bullet[1] : line)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\((\/[A-Za-z0-9/_?=&#-]*)\)/g, '<a href="$2">$1</a>');
    out += bullet ? `<li>${body}</li>` : line.trim() === "" ? "<br>" : `<p>${body}</p>`;
  }
  if (inList) out += "</ul>";
  return raw(out);
}

// ---------------------------------------------------------------- brain 2: quick answers
function fill(text: string): string {
  const profile = current().profile;
  return text
    .replace("{name}", profile?.username ?? "there")
    .replace("{loan_days}", String(settingNumber(facts, "loan_days", 7)))
    .replace("{max_loans}", String(settingNumber(facts, "max_loans", 3)));
}

export function quickAnswer(question: string, staff = isStaff(), admin = current().profile?.role === "admin"): string {
  const text = question.toLowerCase();
  let best: Entry | null = null;
  let bestScore = 0;
  for (const entry of kb.entries as Entry[]) {
    if (entry.roles && !(entry.roles.includes("staff") && staff) && !(entry.roles.includes("admin") && admin)) continue;
    let score = 0;
    for (const word of entry.keywords) if (text.includes(word)) score += word.includes(" ") ? 3 : 2;
    if (score > bestScore) { best = entry; bestScore = score; }
  }
  return fill(best ? best.answer : kb.fallback);
}

// ---------------------------------------------------------------- brain 1: the AI function
async function askAi(question: string): Promise<string | null> {
  const session = current().session;
  if (!session) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const reply = await fetch("/api/assistant", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ message: question, history: turns.slice(-10), page: document.body.dataset.page ?? "" }),
    });
    if (reply.status === 429) return "You are asking very quickly. Please wait a moment and try again.";
    if (!reply.ok) return null;
    const data = (await reply.json()) as { reply?: string };
    return typeof data.reply === "string" && data.reply.trim() ? data.reply.trim() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------- the window
const root = () => document.getElementById("assistant")!;
const part = <T extends HTMLElement>(selector: string) => root().querySelector<T>(selector)!;

function save(): void {
  try { sessionStorage.setItem(STORE, JSON.stringify(turns.slice(-MAX_TURNS))); } catch { /* private mode */ }
}

function bubble(turn: Turn): string {
  return html`<div class="assistant__msg assistant__msg--${turn.role}">${turn.role === "assistant" ? renderText(turn.content) : turn.content}</div>`.value;
}

function draw(): void {
  const log = part("#assistantLog");
  log.innerHTML = turns.map(bubble).join("") + (busy ? '<div class="assistant__msg assistant__msg--assistant assistant__typing" aria-label="The assistant is typing"><i></i><i></i><i></i></div>' : "");
  log.scrollTop = log.scrollHeight;
  part("#assistantMode").textContent = mode === "ai" ? "AI assistant" : "Quick answers";
  part("#assistantMode").dataset.mode = mode;
  part("#assistantChips").hidden = turns.length > 2;
}

async function send(text: string): Promise<void> {
  const question = text.trim().slice(0, MAX_CHARS);
  if (!question || busy) return;
  const now = Date.now();
  if (now - lastSent < WAIT_MS) return;
  lastSent = now;
  turns.push({ role: "user", content: question });
  busy = true;
  draw();
  const ai = await askAi(question);
  mode = ai ? "ai" : "basic";
  turns.push({ role: "assistant", content: ai ?? quickAnswer(question) });
  busy = false;
  save();
  draw();
}

function setOpen(open: boolean): void {
  const el = root();
  el.dataset.open = String(open);
  part("#assistantPanel").hidden = !open;
  part("#assistantLauncher").setAttribute("aria-expanded", String(open));
  if (open) {
    el.classList.remove("is-new");
    try { localStorage.setItem("cmu-assistant-seen", "1"); } catch { /* ignore */ }
    part<HTMLInputElement>("#assistantInput").focus();
    draw();
  }
}

export async function initAssistant(): Promise<void> {
  const profile = current().profile;
  if (!profile || document.getElementById("assistant")) return;
  try { facts = await publicSettings(); } catch { /* the quick answers fall back to defaults */ }
  if (facts.assistant_enabled === false) return;

  try { turns = JSON.parse(sessionStorage.getItem(STORE) ?? "[]") as Turn[]; } catch { turns = []; }
  if (!turns.length) turns = [{ role: "assistant", content: fill(kb.greeting) }];
  const seen = (() => { try { return localStorage.getItem("cmu-assistant-seen") === "1"; } catch { return true; } })();
  const chips = (isStaff() ? kb.suggestions.staff : kb.suggestions.student) as string[];

  const el = document.createElement("div");
  el.id = "assistant";
  el.className = `assistant${seen ? "" : " is-new"}`;
  el.dataset.open = "false";
  el.innerHTML = html`
    <section class="assistant__panel px" id="assistantPanel" role="dialog" aria-label="Library assistant" hidden>
      <header class="assistant__head">
        <img src="/assets/brand/cmu-library-crest.png" alt="" width="36" height="36">
        <div class="assistant__title"><strong>Library assistant</strong><span id="assistantMode" data-mode="basic">Quick answers</span></div>
        <button class="assistant__tool" type="button" id="assistantClear" aria-label="Start a new chat" title="New chat">${icon("refresh")}</button>
        <button class="assistant__tool" type="button" id="assistantClose" aria-label="Close the assistant">${icon("cross")}</button>
      </header>
      <div class="assistant__log" id="assistantLog" role="log" aria-live="polite"></div>
      <div class="assistant__chips" id="assistantChips">${chips.map((c) => html`<button class="chip" type="button" data-ask="${c}">${c}</button>`)}</div>
      <form class="assistant__form" id="assistantForm" autocomplete="off">
        <input class="input" id="assistantInput" maxlength="${MAX_CHARS}" placeholder="Ask about the library..." aria-label="Your question">
        <button class="btn btn--icon" type="submit" aria-label="Send">${icon("chevron-right", "icon--lg")}</button>
      </form>
    </section>
    <button class="assistant__launcher" type="button" id="assistantLauncher" aria-expanded="false" aria-controls="assistantPanel" aria-label="Ask the library assistant">
      ${icon("help", "icon--xl")}<span class="assistant__hint">Need help?</span>
    </button>`.value;
  document.body.appendChild(el);

  part("#assistantLauncher").addEventListener("click", () => setOpen(root().dataset.open !== "true"));
  part("#assistantClose").addEventListener("click", () => { setOpen(false); part("#assistantLauncher").focus(); });
  part("#assistantClear").addEventListener("click", () => {
    turns = [{ role: "assistant", content: fill(kb.greeting) }];
    save();
    draw();
  });
  part("#assistantChips").addEventListener("click", (event) => {
    const chip = (event.target as Element).closest<HTMLElement>("[data-ask]");
    if (chip) void send(chip.dataset.ask ?? "");
  });
  part<HTMLFormElement>("#assistantForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = part<HTMLInputElement>("#assistantInput");
    const value = input.value;
    input.value = "";
    void send(value);
  });
  el.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && el.dataset.open === "true") setOpen(false);
  });
  draw();
}
