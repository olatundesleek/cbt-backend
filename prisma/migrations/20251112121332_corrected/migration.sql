/*
  Warnings:

  - Made the column `passMark` on table `Test` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Test" ALTER COLUMN "passMark" SET NOT NULL;

-- AlterTable
ALTER TABLE "TestSession" ALTER COLUMN "score" SET DEFAULT 0;

-- DropEnum
DROP TYPE "testType";
