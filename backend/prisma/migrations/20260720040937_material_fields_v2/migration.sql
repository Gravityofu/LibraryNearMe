/*
  Warnings:

  - You are about to drop the column `callNumber` on the `Material` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Copy" ADD COLUMN     "callNumber" TEXT,
ADD COLUMN     "createdById" INTEGER,
ADD COLUMN     "memo" TEXT;

-- AlterTable
ALTER TABLE "Material" DROP COLUMN "callNumber",
ADD COLUMN     "classNumber" TEXT,
ADD COLUMN     "createdById" INTEGER,
ADD COLUMN     "format" TEXT,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "marc" JSONB,
ADD COLUMN     "subject" TEXT;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Copy" ADD CONSTRAINT "Copy_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
