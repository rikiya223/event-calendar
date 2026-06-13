"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";

// 横スクロールのカルーセル。左右の矢印で送る（スマホはスワイプ前提で矢印は隠す）。
// 触っていない間は一定間隔で自動的に「次へ」送る（端まで来たら先頭へ戻る）。
export function Carousel({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  const step = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.85), behavior: "smooth" });
  };

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const el = ref.current;
      if (!el) return;
      // 中身が1画面に収まっていれば動かさない
      if (el.scrollWidth <= el.clientWidth + 4) return;
      // 端まで来たら先頭に戻る、それ以外は1つ送る
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: Math.max(280, el.clientWidth * 0.85), behavior: "smooth" });
      }
    }, 3500);
    return () => clearInterval(id);
  }, [paused]);

  // 操作中（ホバー/フォーカス/スワイプ）は自動送りを止め、離れたら再開する
  const hold = () => setPaused(true);
  const release = () => setPaused(false);

  return (
    <div
      className="group relative"
      onMouseEnter={hold}
      onMouseLeave={release}
      onFocusCapture={hold}
      onBlurCapture={release}
      onTouchStart={hold}
      onTouchEnd={release}
    >
      <div
        ref={ref}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => step(-1)}
        aria-label="前へ"
        className="absolute -left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-outline-variant/40 bg-white text-on-surface shadow-md transition hover:bg-surface-variant/60 sm:grid"
      >
        <Icon name="chevron_left" />
      </button>
      <button
        type="button"
        onClick={() => step(1)}
        aria-label="次へ"
        className="absolute -right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-outline-variant/40 bg-white text-on-surface shadow-md transition hover:bg-surface-variant/60 sm:grid"
      >
        <Icon name="chevron_right" />
      </button>
    </div>
  );
}
