export const THEMES = [
  {
    id: "mill",
    label: "Mill night",
    swatch: "#8aa4bb",
    bg: "#141820",
  },
  {
    id: "galvalume",
    label: "Galvalume",
    swatch: "#9aa3ad",
    bg: "#1c1d20",
  },
  {
    id: "brake",
    label: "Brake shop",
    swatch: "#c47a4a",
    bg: "#1a1714",
  },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const THEME_KEY = "qx-theme";
export const DEFAULT_THEME: ThemeId = "mill";

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}

export function readStoredTheme(): ThemeId {
  try {
    const value = localStorage.getItem(THEME_KEY);
    if (isThemeId(value)) return value;
  } catch {
    /* private mode */
  }
  return DEFAULT_THEME;
}

export function applyTheme(id: ThemeId) {
  const theme = THEMES.find((t) => t.id === id) ?? THEMES[0];
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  root.style.colorScheme = "dark";
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme.bg);
  try {
    localStorage.setItem(THEME_KEY, theme.id);
  } catch {
    /* private mode */
  }
}
