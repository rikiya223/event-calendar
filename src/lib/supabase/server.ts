import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// サーバー（サーバーコンポーネント・サーバーアクション）用の Supabase クライアント。
// Cookie でセッションを読み書きする。
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // サーバーコンポーネントから呼ばれた場合は set 不可。
            // middleware でセッションを更新しているため無視してよい。
          }
        },
      },
    },
  );
}

// ログイン中のユーザーを取得（未ログインなら null）
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
