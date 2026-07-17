/*
  Warnings:

  - A unique constraint covering the columns `[domain]` on the table `Library` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED');

-- AlterTable
ALTER TABLE "Library" ADD COLUMN     "domain" TEXT;

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "libraryId" INTEGER NOT NULL,
    "loginId" TEXT,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "birthDate" TIMESTAMP(3),
    "address" TEXT,
    "postalCode" TEXT,
    "memberNo" TEXT,
    "cardToken" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "provider" TEXT,
    "providerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_cardToken_key" ON "User"("cardToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_libraryId_loginId_key" ON "User"("libraryId", "loginId");

-- CreateIndex
CREATE UNIQUE INDEX "User_libraryId_memberNo_key" ON "User"("libraryId", "memberNo");

-- CreateIndex
CREATE UNIQUE INDEX "Library_domain_key" ON "Library"("domain");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "Library"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
