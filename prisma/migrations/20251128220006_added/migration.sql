-- DropForeignKey
ALTER TABLE "Test" DROP CONSTRAINT "Test_bankId_fkey";

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "QuestionBank"("id") ON DELETE CASCADE ON UPDATE CASCADE;
