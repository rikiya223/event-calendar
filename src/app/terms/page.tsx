import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "利用規約" };

const UPDATED = "2026年6月13日";

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10">
      <h1 className="text-2xl font-bold text-on-surface">利用規約</h1>
      <p className="mt-1 text-xs text-on-surface-variant">最終更新日：{UPDATED}</p>

      <div className="mt-6 space-y-6 text-sm leading-relaxed text-on-surface-variant">
        <p>
          本規約は、{SITE_NAME}（以下「本サービス」）の利用条件を定めるものです。利用者は本サービスを利用することで本規約に同意したものとみなします。
        </p>

        <Section n="1" title="サービス内容">
          本サービスは、日本国内のイベント情報をカレンダー形式で閲覧・検索できるサービスです。掲載情報は各主催者・公式サイト等の公開情報、利用者からの投稿、外部データ等をもとに作成しています。
        </Section>

        <Section n="2" title="情報の正確性">
          掲載情報の正確性・最新性・完全性について、運営者は努力しますが保証しません。日程・会場・料金などは変更される場合があります。実際にお出かけの際は、必ず<strong>主催者・公式情報をご確認ください</strong>。掲載情報に基づく行動によって生じた損害について、運営者は責任を負いません。
        </Section>

        <Section n="3" title="アカウント">
          一部機能（「気になる」・イベント投稿など）の利用にはアカウント登録が必要です。登録情報は正確に入力してください。アカウントの管理は利用者の責任で行うものとします。
        </Section>

        <Section n="4" title="投稿について">
          利用者は、虚偽の情報、第三者の権利を侵害する情報、公序良俗に反する情報を投稿してはなりません。投稿内容は運営者の審査のうえ掲載され、運営者は予告なく編集・削除できるものとします。投稿者は、投稿内容を本サービス上で利用（掲載・編集）することを運営者に許諾するものとします。
        </Section>

        <Section n="5" title="禁止事項">
          法令違反、不正アクセス、本サービスの運営妨害、スクレイピング等による過度な負荷、その他運営者が不適切と判断する行為を禁止します。
        </Section>

        <Section n="6" title="免責・サービスの変更／停止">
          運営者は、事前の通知なく本サービスの内容を変更・中断・終了できるものとし、それにより生じた損害について責任を負いません。
        </Section>

        <Section n="7" title="規約の変更">
          運営者は必要に応じて本規約を変更できます。変更後の規約は本ページに掲載した時点で効力を生じます。
        </Section>

        <Section n="8" title="準拠法・管轄">
          本規約は日本法に準拠します。本サービスに関して紛争が生じた場合、【運営者の所在地を管轄する裁判所】を専属的合意管轄裁判所とします。
        </Section>
      </div>
    </main>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-1.5 font-bold text-on-surface">
        第{n}条　{title}
      </h2>
      <p>{children}</p>
    </section>
  );
}
