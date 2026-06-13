import { prisma } from "@/lib/prisma";
import type { SubmissionPayload } from "@/lib/submission";
import type { IngestResult } from "./holidays";

// RSS / AI 取り込みの共通出口：審査キュー（event_submissions）に PENDING で積む。
// 管理画面の既存の承認フロー（重複警告つき）をそのまま使う＝半自動。
// 冪等性は payload.sourceUrl で担保する（同じ取得元キーは再投入しない）。
export async function enqueueSubmissions(
  items: SubmissionPayload[],
): Promise<IngestResult> {
  let created = 0;
  let skipped = 0;

  for (const p of items) {
    if (!p.sourceUrl) continue;
    const dupSubmission = await prisma.eventSubmission.findFirst({
      where: { payload: { path: ["sourceUrl"], equals: p.sourceUrl } },
      select: { id: true },
    });
    // 承認済みでイベント化されている場合もスキップ（EventSource.sourceUrl に引き継がれる）
    const dupEvent = dupSubmission
      ? null
      : await prisma.eventSource.findFirst({
          where: { sourceUrl: p.sourceUrl },
          select: { id: true },
        });
    if (dupSubmission || dupEvent) {
      skipped++;
      continue;
    }
    await prisma.eventSubmission.create({
      data: { userId: null, status: "PENDING", payload: p },
    });
    created++;
  }

  return { created, skipped, scanned: items.length };
}
