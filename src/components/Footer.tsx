import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-outline-variant/30 px-4 py-6 text-center text-xs leading-relaxed text-on-surface-variant">
      <nav className="mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <Link href="/about" className="hover:text-primary hover:underline">運営者情報・お問い合わせ</Link>
        <span className="text-outline-variant/50">·</span>
        <Link href="/terms" className="hover:text-primary hover:underline">利用規約</Link>
        <span className="text-outline-variant/50">·</span>
        <Link href="/privacy" className="hover:text-primary hover:underline">プライバシーポリシー</Link>
      </nav>
      <p>
        映画情報の一部は{" "}
        <a
          href="https://www.themoviedb.org"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          TMDb
        </a>{" "}
        のデータを使用しています（本サービスは TMDb の公認・認証を受けたものではありません）。祝日データ：内閣府。
      </p>
      <p className="mt-1 text-outline">© {year} イベントカレンダー</p>
    </footer>
  );
}
