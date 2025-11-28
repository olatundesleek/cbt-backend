-- DropForeignKey
ALTER TABLE "TestSession" DROP CONSTRAINT "TestSession_studentId_fkey";

-- AddForeignKey
ALTER TABLE "TestSession" ADD CONSTRAINT "TestSession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
