-- CreateTable
CREATE TABLE "UserCalendarPref" (
    "userId" UUID NOT NULL,
    "excludedCategoryIds" UUID[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCalendarPref_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "UserCalendarPref" ADD CONSTRAINT "UserCalendarPref_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
