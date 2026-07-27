-- CreateTable
CREATE TABLE "MaterialType" (
    "id" SERIAL NOT NULL,
    "libraryId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "nameKo" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "usesMarc" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "maxLoanCount" INTEGER,
    "loanPeriodDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookKdcRule" (
    "id" SERIAL NOT NULL,
    "libraryId" INTEGER NOT NULL,
    "materialTypeId" INTEGER NOT NULL,
    "kdcPrefix" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "maxLoanCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookKdcRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaterialType_libraryId_code_key" ON "MaterialType"("libraryId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "BookKdcRule_libraryId_materialTypeId_kdcPrefix_key" ON "BookKdcRule"("libraryId", "materialTypeId", "kdcPrefix");

-- AddForeignKey
ALTER TABLE "MaterialType" ADD CONSTRAINT "MaterialType_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "Library"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookKdcRule" ADD CONSTRAINT "BookKdcRule_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "Library"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookKdcRule" ADD CONSTRAINT "BookKdcRule_materialTypeId_fkey" FOREIGN KEY ("materialTypeId") REFERENCES "MaterialType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
