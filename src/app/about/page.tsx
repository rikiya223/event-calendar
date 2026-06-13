import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

export const metadata: Metadata = { title: "運営者情報・お問い合わせ" };

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10">
      <h1 className="text-2xl font-bold text-on-surface">運営者情報・お問い合わせ</h1>

      <div className="mt-6 space-y-6 text-sm leading-relaxed text-on-surface-variant">
        <section>
          <h2 className="mb-1.5 font-bold text-on-surface">{SITE_NAME}について</h2>
          <p>{SITE_DESCRIPTION}</p>
        </section>

        <section>
          <h2 className="mb-1.5 font-bold text-on-surface">運営者</h2>
          <dl className="rounded-xl border border-outline-variant/40 bg-white p-4">
            <Row label="運営者" value="【運営者名を記入】" />
            <Row label="連絡先" value="【連絡先メールアドレスを記入】" />
          </dl>
          <p className="mt-2 text-xs text-outline">
            ※ 公開前に上記の【　】を実際の情報に置き換えてください（src/app/about/page.tsx）。
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 font-bold text-on-surface">お問い合わせ</h2>
          <p>
            掲載情報の誤り・削除依頼、その他のお問い合わせは、上記の連絡先までご連絡ください。イベントの掲載リクエストは{" "}
            <Link href="/submit" className="text-primary hover:underline">
              イベント投稿
            </Link>{" "}
            からも受け付けています。
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 font-bold text-on-surface">データの出典</h2>
          <p>
            掲載情報は各主催者・公式サイト等の公開情報をもとにしています。映画情報の一部は TMDb、祝日データは内閣府の提供情報を利用しています。各イベントの出典は詳細ページに記載しています。
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 font-bold text-on-surface">関連ページ</h2>
          <ul className="space-y-1">
            <li>
              <Link href="/terms" className="text-primary hover:underline">
                利用規約
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="text-primary hover:underline">
                プライバシーポリシー
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 py-1.5">
      <dt className="w-20 shrink-0 font-medium text-on-surface">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
