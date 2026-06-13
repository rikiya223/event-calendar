# デプロイ手順（Vercel）

このアプリは **Next.js 16 + Supabase(Postgres/Auth) + Prisma** 構成です。
ホスティングは **Vercel**（Next.js 製、無料枠あり）を想定しています。

> ⚠️ 前提：時刻はすべて日本時間(JST)で扱います。コードは TZ 非依存に修正済みなので、
> Vercel(UTC) で動かしても日時はズレません（`parseJstLocal` で +09:00 を明示）。

---

## 1. GitHub にコードを上げる

ローカルで git は初期化済み・初回コミット済みです。あとは GitHub に push するだけ：

```bash
# GitHub で空のリポジトリを作る（例: event-calendar）。README等は付けない。
git remote add origin https://github.com/<あなた>/event-calendar.git
git branch -M main
git push -u origin main
```

`.env`（パスワード等）は `.gitignore` 済みなので**push されません**。安全です。

## 2. Vercel にインポート

1. https://vercel.com にログイン → **Add New… → Project**
2. さきほどの GitHub リポジトリを選択 → **Import**
3. Framework は **Next.js** が自動検出される（そのままでOK）
4. **Environment Variables** に、`.env.example` のキーを実際の値で登録：
   - `DATABASE_URL` / `DIRECT_URL`（Supabase の接続文字列）
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ADMIN_EMAILS`（自分のログインメール）
   - `INGEST_SECRET`
   - （任意）`TMDB_API_KEY` … ※無料枠は**非商用のみ**。収益化するなら登録しない
5. **Deploy** を押す

`postinstall` で `prisma generate` が走るのでビルドは通ります。

## 3. 本番DBにスキーマを反映（マイグレーション）

Vercel のビルドはマイグレーションを**実行しません**。手元から本番DBに対して一度だけ流します：

```bash
# .env の DATABASE_URL/DIRECT_URL が本番(Supabase)を指している状態で
npx prisma migrate deploy
```

その後、カテゴリ初期データを投入：

```bash
npm run db:seed            # カテゴリツリー
npm run db:seed:curated    # 実在イベント29件（任意）
```

## 4. Supabase 認証の設定

Supabase ダッシュボード → **Authentication → URL Configuration** で、
**Site URL** に本番URL（例 `https://event-calendar.vercel.app`）を登録する。
これをしないとログイン後のリダイレクトが正しく動きません。

## 5. 動作確認

- トップ/カレンダーが表示されるか
- ログイン → `ADMIN_EMAILS` のアカウントで `/admin` に入れるか
- 管理画面でイベントを1件追加 → カレンダーに**正しい日時で**出るか（TZ確認）

---

## 補足

- **独自ドメイン**：Vercel の Project → Settings → Domains で追加できる。
- **取り込みの自動化**：今は手動。将来 Vercel Cron で `/api/ingest/*` を定期実行する（要 `INGEST_SECRET` をヘッダに付与）。
- **環境変数を変えたら**：Vercel で再デプロイが必要。
