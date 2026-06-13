import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { EventForm, type EventFormDefaults } from "../../../EventForm";
import { updateEvent } from "../../../actions";

export const dynamic = "force-dynamic";

// UTCのDateを datetime-local 用の JST 壁時計文字列 "YYYY-MM-DDTHH:mm" に変換
function toJstLocalInput(d: Date): string {
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 16);
}

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      venue: true,
      occurrences: { orderBy: { startsAt: "asc" } },
      eventCategories: { select: { categoryId: true } },
      eventPerformers: { include: { performer: { select: { name: true } } } },
    },
  });
  if (!event) notFound();

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

  const defaults: EventFormDefaults = {
    title: event.canonicalTitle,
    description: event.description ?? "",
    occurrences: event.occurrences.map((o) => ({
      startsAt: toJstLocalInput(o.startsAt),
      endsAt: o.endsAt ? toJstLocalInput(o.endsAt) : "",
    })),
    venueName: event.venue?.name ?? "",
    venueAddress: event.venue?.address ?? "",
    region: event.venue?.region ?? "",
    status: event.status,
    categoryIds: event.eventCategories.map((ec) => ec.categoryId),
    performers: event.eventPerformers.map((ep) => ep.performer.name).join(", "),
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">イベントを編集</h1>
        <Link href="/admin" className="text-sm text-primary hover:underline">
          ← 管理画面へ
        </Link>
      </header>

      <section className="rounded-2xl border border-outline-variant/40 bg-white p-6 shadow-sm">
        <EventForm
          categories={topCategories}
          action={updateEvent}
          defaults={defaults}
          eventId={event.id}
          submitLabel="更新する"
        />
      </section>
    </main>
  );
}
