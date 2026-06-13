import { ResetUpdateForm } from "./ResetUpdateForm";

export const dynamic = "force-dynamic";

export default function ResetUpdatePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <h1 className="mb-2 text-center text-2xl font-bold text-slate-800">新しいパスワードの設定</h1>
      <p className="mb-8 text-center text-sm text-slate-500">
        新しいパスワードを入力してください。
      </p>
      <ResetUpdateForm />
    </main>
  );
}
