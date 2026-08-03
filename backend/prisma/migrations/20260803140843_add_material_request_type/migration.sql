-- CreateTable
CREATE TABLE "MaterialRequestType" (
    "id" SERIAL NOT NULL,
    "libraryId" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialRequestType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaterialRequestType_libraryId_value_key" ON "MaterialRequestType"("libraryId", "value");

-- AddForeignKey
ALTER TABLE "MaterialRequestType" ADD CONSTRAINT "MaterialRequestType_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "Library"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
