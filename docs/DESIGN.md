# データモデル設計メモ（MVP）

仕様書 `event-calendar-spec.md` 5章をベースに、実装に向けて確定した設計判断を記録する。
スキーマの実体は [`prisma/schema.prisma`](../prisma/schema.prisma)。

## 確定した設計判断

### 1. 日時は `EventOccurrence` に一本化（仕様からの変更）
仕様書では `events.starts_at/ends_at` と `event_occurrences` の両方が日時を持っていたが、
これは二重持ちで不整合の温床になる。**日時は `EventOccurrence`（開催回）だけが持つ**ことにした。

- 単発イベントでも「開催回1件」を作る。
- カレンダー表示・名寄せSTEP1（開催日±1日のブロッキング）は必ず `EventOccurrence.startsAt` を引く。
- `startsAt` にインデックスを張り、月/週/日の範囲クエリを高速化する。

### 2. カテゴリの色は大分類のみ
`Category` は `parentId` による自己参照ツリー。`colorKey` は大分類（`parentId = null`）のみが持ち、
中分類以下は `null`。表示時は親をたどって色を継承し、アイコン＋名称で区別する（仕様 2.1 / 4.3）。

### 3. `events`（正規）と `event_sources`（生データ）を 1対多 で分離
同一イベントが複数ソースから入る前提。統合・分離・再処理を後から柔軟にできる形を最初から入れる（仕様 2.2）。
MVPでは `sourceType` は `MANUAL`（手動登録）と `USER`（ユーザー投稿）のみ使用。
自動収集（`OFFICIAL_API` / `SCRAPING` / `AI_AGENT`）は enum に用意だけしておき Phase2 で使う。

### 4. 信頼度スコア
各 `EventSource.trustWeight`（公式=高 / スクレイピング=中 / 投稿・AI=低）から
`Event.confidenceScore` を算出し、自動公開／審査を振り分ける（仕様 5.4）。MVPでは手動運用でも可。

## 認証・インフラ方針
- **Supabase に一本化**：Postgres（DB）＋ Auth（認証）＋ Storage（画像）を1サービスで賄う。
  ORM は Prisma を継続使用（Supabase の Postgres に対して動く）。
- 認証は**閲覧では不要**。ブックマーク・投稿のときだけログインを要求する（仕様1.2）。
  ログイン方式は Supabase Auth のメール＋ソーシャル（Google等）を想定。
- 認証ユーザーは Supabase の `auth.users` に入る。アプリ側 `User` テーブルとは
  Supabase の user id（uuid）で対応づける（プロフィール拡張用）。

## MVP時点で未実装（将来）
- 画像保存（会場・イベント画像）→ Supabase Storage を後で有効化。
- 全文検索（Elasticsearch）。まずは Postgres の LIKE / ts_vector で十分。
- AI整形・名寄せSTEP3（Phase2）。

## 未決事項（追って詰める）
- 管理画面のアクセス制御（当面は単純なパスワード or Supabaseの管理者ロールで割り切るか）。
- タイムゾーンの扱い（DBはUTC保存、表示でJST変換を基本方針とする想定）。
