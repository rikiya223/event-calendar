-- AlterTable: Idea に一覧カード表示用の集計カラムを追加（初期値0）
ALTER TABLE "Idea" ADD COLUMN "favoriteCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Idea" ADD COLUMN "commentCount" INTEGER NOT NULL DEFAULT 0;
