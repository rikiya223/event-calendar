"use client";

import { useEffect, useState } from "react";
import { getViewerState } from "@/app/viewer-actions";

export type ViewerState = { email: string | null; admin: boolean };

// ページ内の複数コンポーネントで1回だけ取得を共有する（モジュールレベルでメモ化）。
let cached: Promise<ViewerState> | null = null;

export function useViewer(): ViewerState | null {
  const [state, setState] = useState<ViewerState | null>(null);
  useEffect(() => {
    cached ??= getViewerState();
    let alive = true;
    cached.then((v) => {
      if (alive) setState(v);
    });
    return () => {
      alive = false;
    };
  }, []);
  return state; // null = 読み込み中
}
