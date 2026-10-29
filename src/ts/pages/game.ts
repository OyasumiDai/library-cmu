import { publicSettings } from "../api/content";
import { boot } from "../core/boot";
import { mount, qs } from "../core/dom";
import { reveal } from "../core/motion";
import { controlsHtml, featuresHtml, readGamePage } from "../ui/gamePage";

// the "Inside the game" cards and the "Controls" come from the game_page setting (edited in the panel);
// without it, or if the database cannot be reached, the page keeps the text written in game.html
boot(async () => {
  const settings = await publicSettings().catch(() => null);
  if (!settings?.game_page) return;
  const page = readGamePage(settings.game_page);
  mount(qs("#gameFeatures"), featuresHtml(page));
  mount(qs("#gameControls"), controlsHtml(page));
  reveal(qs("[data-page-root]"));
});
