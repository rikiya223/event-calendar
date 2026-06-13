# イベント収集ソース一覧

イベント情報を追加するときの「どこを見るか」台帳。更新したら追記する。

**大原則**
- 転記してよいのは**事実（日時・会場・名称）のみ**。説明文は**自前の短文**で書く（他社の文章＝著作物を複製しない）。
- 出典・リンクは**一次情報（各団体の公式）**に。集約サイトは「日付の手がかり」までにとどめ、`sourceUrl` は公式へ。
- 冪等キー：`EventSource.sourceUrl` を**ユニーク**にする（公式URL＋`#fragment` など）。再投入しても重複しない。
- **過去イベントは入れない**。未来＋開催中のみ。暫定日のものはタイトル/説明に「暫定日程」と明記。

---

## 1. 自動取り込み（Vercel Cron / `src/lib/ingest/feeds.ts`）

毎日 03:00 JST に `/api/ingest/cron` が巡回。フィードを足すには `feeds.ts` の配列に追記するだけ。

| ソース | 種類 | URL | カテゴリ | 備考 |
|---|---|---|---|---|
| 祝日（内閣府） | 専用 | （holidaysルートが自動取得） | 季節行事/祝日 | 設定不要・自動公開 |
| 映画.com 公開予定 | iCal | `https://eiga.com/movie/coming.ics` | 公開日 | 公式iCal。`includeDescription:false`（あらすじは著作物なので保存しない） |

### 試したが**不採用**のフィード（再検証不要）
| ソース | URL | 不採用の理由 |
|---|---|---|
| Connpass 新着 | `https://connpass.com/explore/ja.atom` | 動くがIT勉強会中心でカテゴリ不適合・量が多くノイズ |
| 東京都美術館 RSS | `https://www.tobikan.jp/rss.xml` | 597件・お知らせ主体でイベント以外のノイズが大きい |
| Doorkeeper | `https://www.doorkeeper.jp/events.ics` | 406（公開iCalなし） |

> 日本の多くの団体は公開フィード（iCal/RSS）を出していない。きれいな公式フィードは貴重。

---

## 2. 手動キュレーション用ソース（カテゴリ別の公式）

確定日を確認 →『prisma/seedCurated.ts』に追記 → `npm run db:seed:curated`。

### ⚾ 野球
- NPB（日程・日本シリーズ・CS・オールスター・交流戦）: https://npb.jp/
- 夏の甲子園（朝日新聞）: https://www.asahi.com/koshien/ ／ 日本高野連: https://www.jhbf.or.jp/
- センバツ（毎日新聞 センバツLIVE）

### 🤼 相撲
- 日本相撲協会（本場所スケジュール）: https://www.sumo.or.jp/

### ⚽ サッカー
- 日本代表（JFA / SAMURAI BLUE）: https://www.jfa.jp/samuraiblue/
- Jリーグ（日程・天皇杯・ルヴァン）: https://www.jleague.jp/

### 🎵 音楽フェス・ライブ
- フジロック: https://www.fujirockfestival.com/
- サマーソニック: https://www.summersonic.com/
- ROCK IN JAPAN: https://rijfes.jp/
- 個別アーティストは各公式サイト・FC

### 🖼 美術展・博物館
- 各館の公式サイトを一次情報に（例）
  - 国立新美術館 https://www.nact.jp/
  - 東京都美術館 https://www.tobikan.jp/
  - 森美術館 https://www.mori.art.museum/
  - 東京国立近代美術館 https://www.momat.go.jp/
  - 横浜美術館 https://yokohama.art.museum/
  - 大阪中之島美術館 https://nakka-art.jp/
  - 大阪市立自然史博物館 https://www.mus-nh.city.osaka.jp/
  - 国立博物館（東博/京博/奈良博/九博）各公式
- **日付の手がかり**（出典は公式館に置くこと／集約サイトはスクレイピングしない）
  - 美術展ナビ: https://artexhibition.jp/
  - Tokyo Art Beat（年間スケジュール記事）: https://www.tokyoartbeat.com/

### 🎬 映画
- 映画.com（iCalで自動取り込み済み）: https://eiga.com/
- 各配給会社の作品公式サイト
- 東京国際映画祭: https://2026.tiff-jp.net/

### 🎮 ゲーム
- ファミ通: https://www.famitsu.com/
- 東京ゲームショウ: https://tgs.nikkeibp.co.jp/
- 各メーカー公式（任天堂/PlayStation/Rockstar など）

### 🏆 賞レース・年間の賞
- M-1グランプリ: https://www.m-1gp.com/
- キングオブコント: https://king-of-conte.com/
- 日本レコード大賞（TBS）／NHK紅白歌合戦（NHK）
- 芥川賞・直木賞（日本文学振興会）: https://bungakushinko.or.jp/
- 新語・流行語大賞（自由国民社）: https://www.jiyu.co.jp/singo/
- ノーベル賞: https://www.nobelprize.org/
- ※春の賞（本屋大賞・日本アカデミー賞など）は3〜4月開催。来季分を年明けに追加。

### 🎆 花火・季節行事
- 各大会の公式サイト（隅田川・長岡まつり・大曲の花火 など）
- **日付の手がかり**: ウォーカープラス花火 https://hanabi.walkerplus.com/

### 🛍 POP UPストア（未対応）
- 短期開催で信頼できる公開スケジュールが集めにくい。**個別ブランド/施設の公式お知らせ**を都度確認して追加する方針。
  - 例：各百貨店の催事スケジュール、PARCO/ルミネ等の館公式、ブランド公式X

---

## 3. ライセンス・注意メモ
- **TMDb**（映画API）：無料枠は**非商用のみ**。収益化するなら使わない（現在は映画.com iCalで代替）。
- **自治体オープンデータ**：多くは CC BY（**商用OK・要クレジット**）。イベント一覧を出している自治体があれば iCal/RSS 化を検討。
- 政府・国研究機関の発表（祝日・ノーベル賞等）は事実情報。
