-- AlterTable
ALTER TABLE "User" ADD COLUMN     "memberTypeId" INTEGER;

-- CreateTable
CREATE TABLE "MemberType" (
    "id" SERIAL NOT NULL,
    "libraryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MemberType_libraryId_name_key" ON "MemberType"("libraryId", "name");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_memberTypeId_fkey" FOREIGN KEY ("memberTypeId") REFERENCES "MemberType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberType" ADD CONSTRAINT "MemberType_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "Library"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
