import { cn } from "@/lib/utils";

export function FoldlineMark({
  className,
  wordmark = false,
  compact = false,
}: {
  className?: string;
  wordmark?: boolean;
  compact?: boolean;
}) {
  if (wordmark) {
    return (
      <img
        src="/skyline-lockup-light.png"
        alt="Skyline Sheet Metal"
        width={160}
        height={155}
        className={cn(
          "w-auto shrink-0 bg-transparent object-contain object-left",
          compact ? "h-[4.35rem] sm:h-[4.85rem]" : "h-28 sm:h-32",
          className,
        )}
      />
    );
  }

  return (
    <img
      src="/skyline-mark.png"
      alt=""
      width={72}
      height={85}
      className={cn(
        "h-auto w-[4.5rem] shrink-0 bg-transparent object-contain",
        className,
      )}
    />
  );
}
