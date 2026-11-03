// The footer shows the library hours and contact details. Admins edit them in Settings, so they are not fixed text.
import { settingText } from "../api/content";
import { html, maybe, mount } from "../core/dom";
import type { SiteSettings } from "../types";

export function fillFooter(settings: SiteSettings): void {
  const target = maybe("#footerInfo");
  if (!target) return;
  const hours = settingText(settings, "library_hours");
  const contact = settingText(settings, "library_contact");
  mount(target, html`${hours ? html`<p><strong>Library hours:</strong> ${hours}</p>` : ""}${contact ? html`<p><strong>Contact:</strong> ${contact}</p>` : ""}`);
}
