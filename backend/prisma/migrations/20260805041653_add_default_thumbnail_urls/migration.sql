-- AlterTable
ALTER TABLE "Board" ADD COLUMN     "defaultThumbnailUrl" TEXT;

-- AlterTable
ALTER TABLE "Library" ADD COLUMN     "defaultMaterialCoverUrl" TEXT,
ADD COLUMN     "defaultThumbnailUrl" TEXT;
