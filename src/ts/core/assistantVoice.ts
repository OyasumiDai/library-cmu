// "Hold to talk" for the assistant. While the mic button is held the browser records; on release the clip goes to
// /api/voice (a server function that listens, asks the assistant and reads the answer aloud with the ElevenLabs voice).
// The person's own words are never added to the chat: only the assistant's answer appears, and it is also spoken.
import { current } from "./session";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking";
export interface VoiceAnswer { transcript: string; reply: string }
export interface VoiceHooks {
  history(): { role: "user" | "assistant"; content: string }[];
  onState(state: VoiceState, note?: string): void;
  onAnswer(answer: VoiceAnswer): void;
}

const MAX_MS = 30_000; // a long hold stops by itself
const MIN_MS = 450; // shorter than this is an accidental tap
const TIMEOUT_MS = 50_000;
const TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

export const voiceSupported = (): boolean => !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";

// ---------------------------------------------------------------- the answer, spoken
// Phones only allow sound after a touch, so one audio context is unlocked while the button is pressed.
let context: AudioContext | null = null;
let playing: AudioBufferSourceNode | null = null;

function audioContext(): AudioContext {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return (context ??= new Ctx());
}

export function stopSpeaking(): void {
  try { playing?.stop(); } catch { /* already finished */ }
  playing = null;
}

async function speak(base64: string): Promise<void> {
  const ctx = audioContext();
  await ctx.resume().catch(() => undefined);
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const buffer = await ctx.decodeAudioData(bytes.buffer);
  stopSpeaking();
  const node = ctx.createBufferSource();
  node.buffer = buffer;
  node.connect(ctx.destination);
  playing = node;
  await new Promise<void>((resolve) => {
    node.onended = () => { if (playing === node) playing = null; resolve(); };
    node.start();
  });
}

// ---------------------------------------------------------------- the recording
const toBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

const MESSAGES: Record<string, string> = {
  no_speech: "I did not hear anything. Hold the mic, speak, then let go.",
  slow_down: "You are asking very quickly. Please wait a moment and try again.",
  not_configured: "Voice is not set up yet. Please type your question.",
  sign_in_required: "Please sign in again to use voice.",
  too_long: "That was too long. Try a shorter question.",
};

async function ask(blob: Blob, mime: string, hooks: VoiceHooks): Promise<{ answer?: VoiceAnswer & { audio: string | null }; note?: string }> {
  const session = current().session;
  if (!session) return { note: MESSAGES.sign_in_required };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const reply = await fetch("/api/voice", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ audio: await toBase64(blob), mime, history: hooks.history().slice(-10), page: document.body.dataset.page ?? "" }),
    });
    if (!reply.ok) {
      const data = (await reply.json().catch(() => ({}))) as { error?: string };
      return { note: MESSAGES[data.error ?? ""] ?? "I could not answer by voice just now. You can type your question." };
    }
    const data = (await reply.json()) as Partial<VoiceAnswer> & { audio?: string | null };
    if (typeof data.reply !== "string" || !data.reply.trim()) return { note: "I could not answer by voice just now. You can type your question." };
    return { answer: { transcript: String(data.transcript ?? ""), reply: data.reply.trim(), audio: data.audio ?? null } };
  } catch {
    return { note: "That took too long. Please try again." };
  } finally {
    clearTimeout(timer);
  }
}

// Hold the button (finger, mouse, or Space / Enter) to talk; let go to send.
export function attachHoldToTalk(button: HTMLButtonElement, hooks: VoiceHooks): void {
  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let chunks: Blob[] = [];
  let startedAt = 0;
  let holding = false;
  let busy = false; // sending the clip / waiting for the answer
  let press = 0; // tells one press from the next while the browser is still asking for the mic
  let timer: number | undefined;

  const freeMic = (): void => { stream?.getTracks().forEach((t) => t.stop()); stream = null; };

  async function finish(mime: string): Promise<void> {
    freeMic();
    const blob = new Blob(chunks, { type: mime });
    chunks = [];
    if (Date.now() - startedAt < MIN_MS || blob.size < 1200) { hooks.onState("idle", "Hold the mic button while you talk, then let go."); return; }
    busy = true;
    hooks.onState("thinking");
    const { answer, note } = await ask(blob, mime, hooks);
    busy = false;
    if (!answer) { hooks.onState("idle", note); return; }
    hooks.onAnswer({ transcript: answer.transcript, reply: answer.reply });
    if (!answer.audio) { hooks.onState("idle"); return; }
    hooks.onState("speaking");
    try { await speak(answer.audio); } catch { /* the written answer is already in the chat */ }
    if (!holding && !busy) hooks.onState("idle");
  }

  async function begin(): Promise<void> {
    if (holding || busy) return;
    holding = true;
    const mine = ++press;
    stopSpeaking();
    void audioContext().resume().catch(() => undefined); // unlock sound while the finger is down
    hooks.onState("listening");
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (!holding || mine !== press) { media.getTracks().forEach((t) => t.stop()); return; } // let go before the mic was ready
      stream = media;
      const type = TYPES.find((t) => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(media, type ? { mimeType: type } : undefined);
      recorder = rec;
      chunks = [];
      rec.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      rec.onstop = () => void finish(rec.mimeType || type || "audio/webm");
      startedAt = Date.now();
      rec.start();
      timer = window.setTimeout(end, MAX_MS);
    } catch (error) {
      holding = false;
      freeMic();
      const denied = (error as DOMException)?.name === "NotAllowedError" || (error as DOMException)?.name === "SecurityError";
      hooks.onState("idle", denied ? "Please allow the microphone in your browser, then hold the mic again." : "I could not use the microphone on this device.");
    }
  }

  function end(): void {
    if (!holding) return;
    holding = false;
    clearTimeout(timer);
    if (recorder && recorder.state === "recording") recorder.stop();
    else hooks.onState("idle"); // let go before recording began
    recorder = null;
  }

  button.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    try { button.setPointerCapture(event.pointerId); } catch { /* not every browser */ }
    void begin();
  });
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) button.addEventListener(name, end);
  button.addEventListener("contextmenu", (event) => event.preventDefault()); // a long press on a phone must not open a menu
  button.addEventListener("keydown", (event) => {
    if ((event.key === " " || event.key === "Enter") && !event.repeat) { event.preventDefault(); void begin(); }
  });
  button.addEventListener("keyup", (event) => { if (event.key === " " || event.key === "Enter") end(); });
  button.addEventListener("blur", end);
  window.addEventListener("pagehide", end);
}
