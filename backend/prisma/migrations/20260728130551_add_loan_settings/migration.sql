-- AlterTable
ALTER TABLE "MaterialType" ADD COLUMN     "maxReservationCount" INTEGER;

-- CreateTable
CREATE TABLE "LoanSetting" (
    "id" SERIAL NOT NULL,
    "libraryId" INTEGER NOT NULL,
    "memberTypeId" INTEGER NOT NULL,
    "maxLoanCount" INTEGER NOT NULL DEFAULT 5,
    "maxReservationCount" INTEGER NOT NULL DEFAULT 3,
    "maxSuspensionDays" INTEGER,
    "reservationHoldDays" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoanSetting_libraryId_memberTypeId_key" ON "LoanSetting"("libraryId", "memberTypeId");

-- AddForeignKey
ALTER TABLE "LoanSetting" ADD CONSTRAINT "LoanSetting_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "Library"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanSetting" ADD CONSTRAINT "LoanSetting_memberTypeId_fkey" FOREIGN KEY ("memberTypeId") REFERENCES "MemberType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
