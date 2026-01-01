-- DropForeignKey
ALTER TABLE "QuestionBank" DROP CONSTRAINT "QuestionBank_createdBy_fkey";

-- AddForeignKey
ALTER TABLE "QuestionBank" ADD CONSTRAINT "QuestionBank_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
