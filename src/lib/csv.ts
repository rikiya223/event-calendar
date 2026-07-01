// 小さなCSVパーサ（ダブルクオート・エスケープ("")・改行を含むフィールドに対応）。
// 依存を増やさないための最小実装。1行目をヘッダとして扱い、各行をオブジェクト化する。

export type CsvParseResult = {
  headers: string[];
  rows: Record<string, string>[];
};

function splitRecords(text: string): string[][] {
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;

  const pushField = () => {
    record.push(field);
    field = "";
  };
  const pushRecord = () => {
    pushField();
    records.push(record);
    record = [];
  };

  // BOM除去
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        pushField();
      } else if (c === "\n") {
        pushRecord();
      } else if (c === "\r") {
        // CRLF の CR は無視（次の \n で改行）
      } else {
        field += c;
      }
    }
  }
  // 末尾の未確定レコード
  if (field.length > 0 || record.length > 0) pushRecord();
  return records;
}

export function parseCsv(text: string): CsvParseResult {
  const records = splitRecords(text).filter(
    (r) => r.length > 0 && !(r.length === 1 && r[0].trim() === ""),
  );
  if (records.length === 0) return { headers: [], rows: [] };

  const headers = records[0].map((h) => h.trim());
  const rows = records.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (r[i] ?? "").trim();
    });
    return obj;
  });
  return { headers, rows };
}
