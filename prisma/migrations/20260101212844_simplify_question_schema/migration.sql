/*
  Warnings:

  - You are about to drop the column `comprehensionId` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `imageId` on the `Question` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_comprehensionId_fkey";

-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_imageId_fkey";

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "comprehensionId",
DROP COLUMN "imageId",
ADD COLUMN     "comprehensionText" TEXT,
ADD COLUMN     "imageUrl" TEXT;
