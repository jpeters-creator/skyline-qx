import { applyTheme, readStoredTheme, THEMES, type ThemeId } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Shop finish">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ background: current.swatch }}
          />
          <span className="hidden font-display text-[11px] font-medium tracking-[0.12em] uppercase sm:inline">
            {current.label}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => setTheme(value as ThemeId)}
        >
          {THEMES.map((item) => (
            <DropdownMenuRadioItem key={item.id} value={item.id}>
              <span
                className="mr-2 size-2.5 rounded-full"
                style={{ background: item.swatch }}
              />
              {item.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeSwatches() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {THEMES.map((item) => {
        const active = theme === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setTheme(item.id)}
            className={
              active
                ? "shop-panel flex items-center gap-3 p-3 text-left ring-1 ring-steel"
                : "shop-panel flex items-center gap-3 p-3 text-left hover:bg-steel-soft"
            }
          >
            <span
              className="size-8 rounded-md"
              style={{ background: item.bg, boxShadow: `inset 0 0 0 2px ${item.swatch}` }}
            />
            <span>
              <span className="block font-display text-sm font-medium tracking-[0.04em]">
                {item.label}
              </span>
              <span className="label-stamp">{item.id}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export { applyTheme, readStoredTheme };
