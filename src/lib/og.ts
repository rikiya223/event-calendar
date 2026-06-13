// next/og(satori) 用に Noto Sans JP のサブセット(TTF)を取得する。
// satori は woff2 に未対応なので、古いブラウザの User-Agent を送って
// Google Fonts に TTF を返させる。必要な文字だけ &text= で取得するので軽量。
// 取得に失敗しても画像生成は止めない（null を返してデフォルトフォントにフォールバック）。
export async function loadJpFont(text: string, weight = 700): Promise<ArrayBuffer | null> {
  try {
    const api = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@${weight}&text=${encodeURIComponent(text)}`;
    const css = await (
      await fetch(api, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/535.5+ (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1",
        },
      })
    ).text();
    const m = css.match(/src:\s*url\((https:[^)]+)\)/);
    if (!m) return null;
    return await (await fetch(m[1])).arrayBuffer();
  } catch {
    return null;
  }
}
