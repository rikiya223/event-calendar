import { redirect } from "next/navigation";

// トップは「さがす」と役割が重複するため廃止し、カレンダーへ統合。
// 既存ブックマークや外部リンク用に / は /calendar へリダイレクトする。
export default function Home() {
  redirect("/calendar");
}
