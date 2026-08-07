-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "answerContent" TEXT,
ADD COLUMN     "answerKeywords" TEXT,
ADD COLUMN     "answeredAt" TIMESTAMP(3);
