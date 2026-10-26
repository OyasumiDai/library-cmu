// What every staff-panel section looks like to the panel shell.
export interface PanelTab {
  id: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
  // a permission an administrator may grant staff (admins always have it): students, reports, game, system, audit
  need?: string;
  // called with the page's search text (?q=) when the section opens from the dashboard search
  render(root: HTMLElement, query?: string): Promise<void> | void;
}

export const go = (tab: string, query = ""): void => {
  location.href = `/panel?tab=${tab}${query ? `&q=${encodeURIComponent(query)}` : ""}`;
};
