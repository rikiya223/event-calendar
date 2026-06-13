"use client";

import { useRef } from "react";
import { Icon } from "@/components/Icon";

// 横スクロールのカルーセル。左右の矢印で送る（スマホはスワイプ前提で矢印は隠す）。
export function Carousel({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.85), behavior: "smooth" });
  };
  return (
    <div className="group relative">
      <div
        ref={ref}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => scrollBy(-1)}
        aria-label="前へ"
        className="absolute -left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-outline-variant/40 bg-white text-on-surface shadow-md transition hover:bg-surface-variant/60 sm:grid"
      >
        <Icon name="chevron_left" />
      </button>
      <button
        type="button"
        onClick={() => scrollBy(1)}
        aria-label="次へ"
        className="absolute -right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-outline-variant/40 bg-white text-on-surface shadow-md transition hover:bg-surface-variant/60 sm:grid"
      >
        <Icon name="chevron_right" />
      </button>
    </div>
  );
}
