import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "プライバシーポリシー" };

const UPDATED = "2026年6月13日";

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10">
      <h1 className="text-2xl font-bold text-on-surface">プライバシーポリシー</h1>
      <p className="mt-1 text-xs text-on-surface-variant">最終更新日：{UPDATED}</p>

      <div className="mt-6 space-y-6 text-sm leading-relaxed text-on-surface-variant">
        <p>
          {SITE_NAME}（以下「本サービス」）は、利用者の個人情報を以下のとおり取り扱います。
        </p>

        <Section title="1. 取得する情報">
          <ul className="ml-4 list-disc space-y-1">
            <li>アカウント情報：メールアドレス（認証のために利用）</li>
            <li>利用者が作成したデータ：ブックマーク、投稿したイベント情報</li>
            <li>ログイン状態を保持するための Cookie・セッション情報</li>
            <li>アクセスログ等の技術情報（不具合対応・改善のため）</li>
          </ul>
        </Section>

        <Section title="2. 利用目的">
          <ul className="ml-4 list-disc space-y-1">
            <li>本サービスの提供・本人確認・ログイン状態の維持</li>
            <li>ブックマーク等のパーソナライズ機能の提供</li>
            <li>投稿内容の審査・掲載</li>
            <li>不正利用の防止、品質改善、お問い合わせ対応</li>
          </ul>
        </Section>

        <Section title="3. 外部サービスへの提供・委託">
          本サービスは、提供のために以下の外部サービスを利用しており、必要な範囲で情報が処理されます。
          <ul className="ml-4 mt-2 list-disc space-y-1">
            <li>
              <strong>Supabase</strong>（認証・データベース基盤）
            </li>
            <li>
              <strong>Vercel</strong>（ホスティング基盤）
            </li>
            <li>
              <strong>Google Maps</strong>（会場地図の表示。会場名・住所が送信されます）
            </li>
            <li>
              <strong>TMDb</strong>（映画情報の一部。本サービスは TMDb の公認を受けたものではありません）
            </li>
          </ul>
          法令に基づく場合を除き、利用者の同意なく第三者へ個人情報を提供・販売することはありません。
        </Section>

        <Section title="4. 保有期間">
          アカウント情報・利用者データは、アカウントが存在する間、または利用目的の達成に必要な期間保有します。退会時には削除または匿名化します。
        </Section>

        <Section title="5. 利用者の権利">
          利用者は、自身の個人情報の開示・訂正・削除・利用停止を求めることができます。ご希望の場合は下記の連絡先までご連絡ください。アカウントの削除をご希望の場合も同様です。
        </Section>

        <Section title="6. Cookie について">
          本サービスはログイン状態の保持のために Cookie を使用します。ブラウザ設定で Cookie を無効にすると、一部機能が利用できない場合があります。
        </Section>

        <Section title="7. お問い合わせ・改定">
          本ポリシーに関するお問い合わせは{" "}
          <a href="/about" className="text-primary hover:underline">
            運営者情報・お問い合わせ
          </a>{" "}
          をご覧ください。本ポリシーは必要に応じて改定し、本ページに掲載します。
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-1.5 font-bold text-on-surface">{title}</h2>
      <div>{children}</div>
    </section>
  );
}
