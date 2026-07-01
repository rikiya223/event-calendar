-- CreateIndex: 一覧・件数APIの絞り込み(region/weather/mood)にインデックスを張り、
-- COUNT()やfindMany()がテーブル全件走査にならないようにする。
CREATE INDEX "Idea_status_region_idx" ON "Idea"("status", "region");
CREATE INDEX "Idea_status_weather_idx" ON "Idea"("status", "weather");
CREATE INDEX "Idea_status_mood_idx" ON "Idea"("status", "mood");
