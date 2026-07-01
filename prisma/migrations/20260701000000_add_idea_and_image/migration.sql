-- AlterTable: Event に画像URLを追加（任意）
ALTER TABLE "Event" ADD COLUMN "imageUrl" TEXT;

-- CreateTable: Idea（日付に紐づかない遊びアイデア）
CREATE TABLE "Idea" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "area" TEXT,
    "region" TEXT,
    "minPeople" INTEGER,
    "maxPeople" INTEGER,
    "mood" TEXT,
    "weather" TEXT,
    "durationMin" INTEGER,
    "status" "EventStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Idea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Idea_status_idx" ON "Idea"("status");

-- CreateTable: IdeaCategory（Idea ⇔ Category の多対多。Event とカテゴリを共用）
CREATE TABLE "IdeaCategory" (
    "ideaId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,

    CONSTRAINT "IdeaCategory_pkey" PRIMARY KEY ("ideaId","categoryId")
);

-- CreateIndex
CREATE INDEX "IdeaCategory_categoryId_idx" ON "IdeaCategory"("categoryId");

-- AddForeignKey
ALTER TABLE "IdeaCategory" ADD CONSTRAINT "IdeaCategory_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaCategory" ADD CONSTRAINT "IdeaCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
