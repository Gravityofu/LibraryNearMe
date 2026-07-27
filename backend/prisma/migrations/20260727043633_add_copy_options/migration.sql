/*
  Warnings:

  - The `status` column on the `Copy` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Copy" DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT '이용가능';

-- DropEnum
DROP TYPE "CopyStatus";

-- CreateTable
CREATE TABLE "CopyOption" (
    "id" SERIAL NOT NULL,
    "libraryId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CopyOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CopyOption_libraryId_category_value_key" ON "CopyOption"("libraryId", "category", "value");

-- AddForeignKey
ALTER TABLE "CopyOption" ADD CONSTRAINT "CopyOption_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "Library"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
