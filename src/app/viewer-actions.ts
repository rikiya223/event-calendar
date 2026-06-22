"use server";

import { getCurrentUser } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

// 共通レイアウト（サイドバー/下部ナビ）のログイン表示をクライアント側から取得するためのアクション。
// これにより各ページHTMLは認証に依存せず＝ISR/キャッシュ可能になる。
// クローラ等（JS非実行）はキャッシュHTMLをそのまま受け取り、この関数は呼ばれない＝関数実行ゼロ。
// 注: "use server" ファイルは async 関数のみ export 可（型は別ファイルで定義）。
export async function getViewerState(): Promise<{ email: string | null; admin: boolean }> {
  const user = await getCurrentUser();
  return { email: user?.email ?? null, admin: isAdminEmail(user?.email) };
}
