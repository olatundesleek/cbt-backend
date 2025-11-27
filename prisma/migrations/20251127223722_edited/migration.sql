-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_bankId_fkey";

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "QuestionBank"("id") ON DELETE CASCADE ON UPDATE CASCADE;
