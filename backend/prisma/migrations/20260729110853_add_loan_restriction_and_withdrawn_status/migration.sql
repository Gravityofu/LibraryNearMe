-- AlterEnum
ALTER TYPE "UserStatus" ADD VALUE 'WITHDRAWN';

-- CreateTable
CREATE TABLE "LoanRestriction" (
    "id" SERIAL NOT NULL,
    "libraryId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanRestriction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoanRestriction_libraryId_idx" ON "LoanRestriction"("libraryId");

-- CreateIndex
CREATE INDEX "LoanRestriction_userId_idx" ON "LoanRestriction"("userId");

-- AddForeignKey
ALTER TABLE "LoanRestriction" ADD CONSTRAINT "LoanRestriction_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "Library"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanRestriction" ADD CONSTRAINT "LoanRestriction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
