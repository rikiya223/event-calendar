import Link from "next/link";
import { Icon } from "@/components/Icon";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <Icon name="event_busy" className="text-[56px] text-outline" />
      <h1 className="mt-4 text-2xl font-bold text-on-surface">ページが見つかりません</h1>
      <p className="mt-2 text-sm text-on-surface-variant">
        お探しのページは削除されたか、URLが間違っている可能性があります。
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/calendar" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
          カレンダーへ
        </Link>
        <Link href="/explore" className="rounded-full border border-outline-variant/40 px-5 py-2.5 text-sm font-semibold text-on-surface-variant hover:bg-surface-variant/40">
          さがす
        </Link>
      </div>
    </main>
  );
}
