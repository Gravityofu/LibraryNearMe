-- AlterTable
ALTER TABLE "Library" ADD COLUMN     "chromeBgColor" TEXT NOT NULL DEFAULT '#383838',
ADD COLUMN     "chromeTextColor" TEXT NOT NULL DEFAULT '#F9F6F0',
ADD COLUMN     "footerCopyright" TEXT NOT NULL DEFAULT 'ⓒ 2026 Gravityofu',
ADD COLUMN     "footerVersion" TEXT NOT NULL DEFAULT '1.0.0';
