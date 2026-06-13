"use client";

import { deleteEvent } from "./actions";

export function DeleteEventButton({ eventId, title }: { eventId: string; title: string }) {
  return (
    <form
      action={deleteEvent}
      onSubmit={(e) => {
        if (!confirm(`「${title}」を削除します。よろしいですか？`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={eventId} />
      <button className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50">
        削除
      </button>
    </form>
  );
}
