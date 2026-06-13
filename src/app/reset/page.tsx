import Link from "next/link";
import { ResetRequestForm } from "./ResetRequestForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "パスワード再設定" };

export default function ResetPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <h1 className="mb-2 text-center text-2xl font-bold text-slate-800">パスワード再設定</h1>
      <p className="mb-8 text-center text-sm text-slate-500">
        登録メールアドレスに再設定用のリンクを送ります。
      </p>
      <ResetRequestForm />
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-primary hover:underline">
          ← ログインに戻る
        </Link>
      </p>
    </main>
  );
}
