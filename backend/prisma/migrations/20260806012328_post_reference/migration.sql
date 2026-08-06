-- CreateTable
CREATE TABLE "PostReference" (
    "id" SERIAL NOT NULL,
    "libraryId" INTEGER NOT NULL,
    "postId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "materialId" INTEGER,
    "referencedPostId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostReference_libraryId_idx" ON "PostReference"("libraryId");

-- CreateIndex
CREATE INDEX "PostReference_postId_idx" ON "PostReference"("postId");

-- AddForeignKey
ALTER TABLE "PostReference" ADD CONSTRAINT "PostReference_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "Library"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostReference" ADD CONSTRAINT "PostReference_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostReference" ADD CONSTRAINT "PostReference_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostReference" ADD CONSTRAINT "PostReference_referencedPostId_fkey" FOREIGN KEY ("referencedPostId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
