-- AlterTable
ALTER TABLE "CopyOption" ADD COLUMN     "canLoan" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canReserve" BOOLEAN NOT NULL DEFAULT false;
