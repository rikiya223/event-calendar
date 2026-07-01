"use client";

import { useMemo, useState, useTransition } from "react";
import { parseCsv } from "@/lib/csv";
import {
  importEventsFromCsv,
  importIdeasFromCsv,
  type ImportResult,
} from "./actions";

type Kind = "event" | "idea";

const TEMPLATES: Record<Kind, { headers: string; sample: string }> = {
  event: {
    headers: "title,startsAt,description,endsAt,venueName,region,category",
    sample:
      "隅田川花火大会,2026-07-25 19:00,約2万発の花火,,隅田川,東京都,祭り\n" +
      "ゴッホ展,2026-08-01,印象派の企画展,2026-09-30,上野の森美術館,東京都,アート",
  },
  idea: {
    headers:
      "title,description,area,region,minPeople,maxPeople,mood,weather,durationMin,category",
    sample:
      "山手線を一周散歩,ぐるっと歩いて街を眺める,山手線沿線,東京都,1,2,リフレッシュ,晴れ,180,散歩\n" +
      "深夜のコンビニ食べ比べ,気になるものを何個か,,,,1,3,わいわい,,60,グルメ",
  },
};

export function BulkImport({ kind }: { kind: Kind }) {
  const tpl = TEMPLATES[kind];
  const [text, setText] = useState("");
  const [publish, setPublish] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  // クライアント側の簡易プレビュー（送信前に件数と先頭数行を確認）
  const preview = useMemo(() => {
    if (!text.trim()) return null;
    const { headers, rows } = parseCsv(text);
    return { headers, rows };
  }, [text]);

  const loadSample = () => setText(`${tpl.headers}\n${tpl.sample}`);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setText(await file.text());
    e.target.value = ""; // 同じファイルを選び直せるようにリセット
  };

  const submit = () => {
    setResult(null);
    startTransition(async () => {
      const fn = kind === "event" ? importEventsFromCsv : importIdeasFromCsv;
      const r = await fn(text, publish);
      setResult(r);
      if (r.ok) setText("");
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-2 text-sm font-medium text-slate-700">
        1行目はヘッダ。列:{" "}
        <code className="block break-all text-xs sm:inline">{tpl.headers}</code>
      </p>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <label className="flex-1 cursor-pointer rounded-lg border border-primary px-4 py-2.5 text-center text-sm font-medium text-primary">
          CSVファイルを選択
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={onFile}
            className="hidden"
          />
        </label>
        <button
          type="button"
          onClick={loadSample}
          className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-600"
        >
          サンプルを挿入
        </button>
      </div>

      <p className="mb-2 text-xs text-slate-400">
        ファイルを選ぶと下に読み込まれます。貼り付けでも直接編集でもOK。
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder={`${tpl.headers}\n...`}
        className="w-full rounded-lg border border-slate-300 p-2 font-mono text-sm"
      />

      {preview && (
        <div className="mt-3 overflow-x-auto">
          <p className="mb-1 text-xs text-slate-500">
            プレビュー: {preview.rows.length} 行
          </p>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {preview.headers.map((h) => (
                  <th
                    key={h}
                    className="border border-slate-200 bg-slate-50 px-2 py-1 text-left font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.slice(0, 5).map((row, i) => (
                <tr key={i}>
                  {preview.headers.map((h) => (
                    <td key={h} className="border border-slate-200 px-2 py-1">
                      {row[h]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {preview.rows.length > 5 && (
            <p className="mt-1 text-xs text-slate-400">
              …ほか {preview.rows.length - 5} 行
            </p>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={publish}
            onChange={(e) => setPublish(e.target.checked)}
            className="h-5 w-5"
          />
          すぐ公開する（オフ = 審査待ちの下書き）
        </label>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !text.trim()}
          className="rounded-lg bg-primary px-4 py-3 text-base font-medium text-white disabled:opacity-50 sm:ml-auto sm:py-2 sm:text-sm"
        >
          {pending ? "登録中…" : "一括登録"}
        </button>
      </div>

      {result && (
        <div
          className={`mt-3 rounded-lg p-3 text-sm ${
            result.ok
              ? "bg-green-50 text-green-800"
              : "bg-amber-50 text-amber-800"
          }`}
        >
          <p className="font-medium">
            {result.created} 件を登録
            {result.failed > 0 && `（${result.failed} 件スキップ）`}
            {publish ? "・公開" : "・審査待ち"}
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-1 list-inside list-disc text-xs">
              {result.errors.slice(0, 20).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
