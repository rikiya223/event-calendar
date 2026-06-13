import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/supabase/server";
import { SubmitForm } from "./SubmitForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "イベントを投稿" };

export default async function SubmitPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/submit");

  const topCategories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      icon: true,
      children: { orderBy: { name: "asc" }, select: { id: true, name: true } },
    },
  });

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">イベントを投稿</h1>
        <p className="mt-1 text-sm text-slate-500">
          見つけたイベントを教えてください。管理者の承認後にカレンダーへ公開されます。
        </p>
      </header>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <SubmitForm categories={topCategories} />
      </section>
    </main>
  );
}
