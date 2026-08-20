import { format, parseISO } from "date-fns";

export function formatDate(s: string | null | undefined, pattern = "MMM d, yyyy"): string {
  if (!s) return "—";
  try {
    return format(parseISO(s.slice(0, 10)), pattern);
  } catch {
    return s;
  }
}
