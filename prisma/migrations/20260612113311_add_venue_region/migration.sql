-- AlterTable
ALTER TABLE "Venue" ADD COLUMN     "region" TEXT;

-- CreateIndex
CREATE INDEX "Venue_region_idx" ON "Venue"("region");
