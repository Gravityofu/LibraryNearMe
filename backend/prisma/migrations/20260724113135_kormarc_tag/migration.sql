-- CreateTable
CREATE TABLE "KormarcTag" (
    "id" SERIAL NOT NULL,
    "libraryId" INTEGER NOT NULL,
    "tag" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "indicators" TEXT,
    "subfieldCodes" TEXT,
    "example" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KormarcTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KormarcTag_libraryId_tag_key" ON "KormarcTag"("libraryId", "tag");
