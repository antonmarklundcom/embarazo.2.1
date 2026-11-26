import { expect, type Locator, type Page } from "@playwright/test";

// "Hoy corto" — the pregnancy home shows the week hero, "Hoy" and the stories,
// and everything else sits in five rows that open on tap and are not rendered
// until they do (components/home/HomeSection.tsx). A spec that checks a block
// inside one of them opens the row first, through here, so the row's name is
// spelled in one place.
//
// Also before an ABSENCE check (`toHaveCount(0)`) on something that would live
// in a row: in a closed row it is absent anyway, and the check would prove
// nothing.

export type HomeSectionTitle =
  | "Tu semana"
  | "Herramientas"
  | "Acompañada"
  | "En Paraguay"
  | "Más";

export function homeSectionButton(page: Page, title: HomeSectionTitle): Locator {
  return page.getByRole("button", { name: title, exact: true });
}

/** Opens the row (a no-op if it is already open) and waits for its panel. */
export async function openHomeSection(page: Page, title: HomeSectionTitle): Promise<void> {
  const button = homeSectionButton(page, title);
  await expect(button).toBeVisible();
  if ((await button.getAttribute("aria-expanded")) !== "true") await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  const panelId = await button.getAttribute("aria-controls");
  await expect(page.locator(`[id="${panelId}"]`)).toBeVisible();
}

export const HOME_SECTION_TITLES: readonly HomeSectionTitle[] = [
  "Tu semana",
  "Herramientas",
  "Acompañada",
  "En Paraguay",
  "Más",
];

/** Every row open: for a check that something is absent anywhere on Hoy. */
export async function openAllHomeSections(page: Page): Promise<void> {
  for (const title of HOME_SECTION_TITLES) await openHomeSection(page, title);
}
