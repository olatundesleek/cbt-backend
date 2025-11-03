/*
  Warnings:

  - You are about to drop the column `isActive` on the `Test` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "testType" AS ENUM ('ACTIVE', 'SCHEDULED', 'COMPLETED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('GENERAL', 'STUDENT', 'TEACHER', 'CLASS', 'COURSE');

-- AlterTable
ALTER TABLE "Test" DROP COLUMN "isActive",
ADD COLUMN     "testState" TEXT NOT NULL DEFAULT 'scheduled';

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "classId" INTEGER,
    "courseId" INTEGER,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
