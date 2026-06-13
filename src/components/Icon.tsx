// Material Symbols（Outlined）アイコン。name は Google Material Symbols のアイコン名。
export function Icon({
  name,
  className = "",
  fill = false,
}: {
  name: string;
  className?: string;
  fill?: boolean;
}) {
  return (
    <span className={`material-symbols-outlined${fill ? " fill" : ""} ${className}`} aria-hidden>
      {name}
    </span>
  );
}
