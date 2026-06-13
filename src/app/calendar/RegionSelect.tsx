"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";

// 「地域を追加」プルダウン。未選択の都道府県を選ぶと、その地域を足したURLへ遷移する（複数選択）。
export function RegionSelect({
  options,
}: {
  options: { label: string; value: string; href: string }[];
}) {
  const router = useRouter();
  return (
    <div className="relative inline-flex shrink-0 items-center">
      <Icon name="location_on" className="pointer-events-none absolute left-2.5 text-[18px] text-outline" />
      <select
        value=""
        onChange={(e) => {
          const o = options.find((opt) => opt.value === e.target.value);
          if (o) router.push(o.href, { scroll: false });
        }}
        aria-label="地域を追加"
        className="h-9 cursor-pointer appearance-none rounded-full bg-surface-variant/40 pl-8 pr-8 text-sm font-medium text-on-surface transition hover:bg-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <option value="" disabled>
          地域
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon name="expand_more" className="pointer-events-none absolute right-2 text-[18px] text-outline" />
    </div>
  );
}
