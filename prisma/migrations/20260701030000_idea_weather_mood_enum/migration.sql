-- CreateEnum
CREATE TYPE "Weather" AS ENUM ('SUNNY', 'CLOUDY', 'RAINY', 'SNOWY');
CREATE TYPE "Mood" AS ENUM ('REFRESH', 'CALM', 'EXCITED', 'LIVELY', 'RELAXED', 'FOCUS');

-- AlterTable: 既存の自由入力(TEXT)を選択式(列挙型)に変換する。
-- 既知の日本語値は対応する列挙値へ、それ以外(未知の値)は null にする（任意項目のため安全）。
ALTER TABLE "Idea"
  ALTER COLUMN "weather" TYPE "Weather" USING (
    CASE "weather"
      WHEN '晴れ' THEN 'SUNNY'
      WHEN 'くもり' THEN 'CLOUDY'
      WHEN '雨' THEN 'RAINY'
      WHEN '雪' THEN 'SNOWY'
      ELSE NULL
    END
  )::"Weather";

ALTER TABLE "Idea"
  ALTER COLUMN "mood" TYPE "Mood" USING (
    CASE "mood"
      WHEN 'リフレッシュ' THEN 'REFRESH'
      WHEN '落ち着き' THEN 'CALM'
      WHEN 'わくわく' THEN 'EXCITED'
      WHEN 'わいわい' THEN 'LIVELY'
      WHEN 'のんびり' THEN 'RELAXED'
      WHEN '集中' THEN 'FOCUS'
      ELSE NULL
    END
  )::"Mood";
