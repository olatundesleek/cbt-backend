-- DropForeignKey
ALTER TABLE "Course" DROP CONSTRAINT "Course_teacherId_fkey";

-- AlterTable
ALTER TABLE "Course" ALTER COLUMN "teacherId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
