/*
  Warnings:

  - You are about to drop the column `loginBanner` on the `SystemSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SystemSettings" DROP COLUMN "loginBanner",
ADD COLUMN     "loginBannerUrl" TEXT;
