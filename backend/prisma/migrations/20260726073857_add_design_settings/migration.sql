/*
  Warnings:

  - You are about to drop the column `chromeBgColor` on the `Library` table. All the data in the column will be lost.
  - You are about to drop the column `chromeTextColor` on the `Library` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Library" DROP COLUMN "chromeBgColor",
DROP COLUMN "chromeTextColor",
ADD COLUMN     "buttonStyles" JSONB NOT NULL DEFAULT '[{"name": "버튼1", "bgColor": "#383838", "textColor": "#F9F6F0"}]',
ADD COLUMN     "footerBgColor" TEXT NOT NULL DEFAULT '#383838',
ADD COLUMN     "footerTextColor" TEXT NOT NULL DEFAULT '#F9F6F0',
ADD COLUMN     "sidebarBgColor" TEXT NOT NULL DEFAULT '#383838',
ADD COLUMN     "sidebarTextColor" TEXT NOT NULL DEFAULT '#F9F6F0';
