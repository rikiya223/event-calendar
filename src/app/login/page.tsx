import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";
import { safeNext } from "@/lib/url";

export const dynamic = "force-dynamic";
export const metadata = { title: "ログイン" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const dest = safeNext(next);

  const user = await getCurrentUser();
  if (user) redirect(dest);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <h1 className="mb-2 text-center text-2xl font-bold text-slate-800">ようこそ</h1>
      <p className="mb-8 text-center text-sm text-slate-500">
        ログインするとブックマークや投稿が使えます
      </p>
      <LoginForm next={next} />
    </main>
  );
}
