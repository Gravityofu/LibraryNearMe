-- CreateTable
CREATE TABLE "BoardFont" (
    "id" SERIAL NOT NULL,
    "libraryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "fontFamilyName" TEXT NOT NULL,
    "googleFontUrl" TEXT,
    "isDeletable" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoardFont_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BoardFont_libraryId_fontFamilyName_key" ON "BoardFont"("libraryId", "fontFamilyName");

-- AddForeignKey
ALTER TABLE "BoardFont" ADD CONSTRAINT "BoardFont_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "Library"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
