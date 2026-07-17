-- CreateEnum
CREATE TYPE "CopyStatus" AS ENUM ('AVAILABLE', 'ON_LOAN', 'RESERVED', 'REPAIR', 'LOST', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "Material" (
    "id" SERIAL NOT NULL,
    "libraryId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "creator" TEXT,
    "publisher" TEXT,
    "pubYear" TEXT,
    "isbn" TEXT,
    "callNumber" TEXT,
    "summary" TEXT,
    "coverUrl" TEXT,
    "onlineUrl" TEXT,
    "marcRaw" TEXT,
    "extra" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Copy" (
    "id" SERIAL NOT NULL,
    "libraryId" INTEGER NOT NULL,
    "materialId" INTEGER NOT NULL,
    "registrationNo" TEXT NOT NULL,
    "specialCode" TEXT,
    "shelfNo" TEXT,
    "location" TEXT,
    "status" "CopyStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Copy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Material_libraryId_idx" ON "Material"("libraryId");

-- CreateIndex
CREATE INDEX "Copy_materialId_idx" ON "Copy"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "Copy_libraryId_registrationNo_key" ON "Copy"("libraryId", "registrationNo");

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "Library"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Copy" ADD CONSTRAINT "Copy_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "Library"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Copy" ADD CONSTRAINT "Copy_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
