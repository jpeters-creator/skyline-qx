import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyTheme,
  DEFAULT_THEME,
  readStoredTheme,
  THEME_KEY,
  type ThemeId,
} from "@/lib/theme";

const ThemeContext = createContext<{
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
}>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);

  useEffect(() => {
    const stored = readStoredTheme();
    setThemeState(stored);
    applyTheme(stored);
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_KEY && e.newValue) {
        const next = readStoredTheme();
        setThemeState(next);
        applyTheme(next);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme: (id: ThemeId) => {
        setThemeState(id);
        applyTheme(id);
      },
    }),
    [theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
