// The game runs inside this page (same address, so it shares the website login). It is only started when
// the person presses Enter: browsers need a click before a game may play sound, and the download is big.
import { publicSettings, settingText } from "../api/content";
import { boot } from "../core/boot";
import { html, mount, qs } from "../core/dom";
import { current } from "../core/session";
import { loading } from "../ui/components";

const LABELS: Record<string, string> = { online: "Open now", maintenance: "Under maintenance", offline: "Closed" };

// is the game actually published? The site can be deployed before the game is built
async function gameIsPublished(entry: string): Promise<boolean> {
  try {
    const reply = await fetch(`${entry.replace(/\/?$/, "/")}index.html`, { cache: "no-store" });
    // a real game page mentions Godot; a "not found" page or a fallback does not
    return reply.ok && (reply.headers.get("content-type") ?? "").includes("html") && /godot/i.test(await reply.text());
  } catch {
    return false;
  }
}

function lock(message: string, title: string): void {
  qs("#posterTitle").textContent = title;
  qs("#posterText").textContent = message;
  qs("#enter").hidden = true;
}

boot(async () => {
  const profile = current().profile!;
  const settings = await publicSettings();
  const status = settingText(settings, "game_status", "maintenance");
  const entry = settingText(settings, "game_entry", "/play/");
  qs("#gameTitle").textContent = settingText(settings, "game_title", "CMU Virtual Library");
  const text = settingText(settings, "game_description");
  if (text) qs("#gameText").textContent = text;
  qs("#gameState").textContent = LABELS[status] ?? status;
  qs("#gameDot").dataset.state = status;
  const role = profile.role === "student" ? "Student" : profile.role === "admin" ? "Admin" : "Staff";
  qs("#stageWho").textContent = `Playing as ${profile.username} · ${role}`;

  const published = await gameIsPublished(entry);
  if (status !== "online") return lock("The library game is closed for a little while. Everything else on the site works as usual.", "Under maintenance");
  if (!published) return lock("The game is on its way and is not published yet. Browsing and borrowing books already work.", "Coming soon");

  const newTab = qs<HTMLAnchorElement>("#newTab");
  newTab.href = entry;
  newTab.hidden = false;

  const enter = qs<HTMLButtonElement>("#enter");
  enter.disabled = false;
  enter.addEventListener("click", () => {
    const screen = qs("#stageScreen");
    mount(screen, html`
      <div class="stage__loading" id="stageLoading">${loading("Opening the library")}</div>
      <iframe class="stage__frame" id="gameFrame" title="Library game" src="${entry}" allow="fullscreen; autoplay; gamepad; clipboard-write" allowfullscreen></iframe>`);
    const frame = qs<HTMLIFrameElement>("#gameFrame");
    frame.addEventListener("load", () => qs("#stageLoading").remove());
    const full = qs<HTMLButtonElement>("#fullscreen");
    full.hidden = false;
    full.addEventListener("click", () => void frame.requestFullscreen?.());
    frame.focus();
  });
});
