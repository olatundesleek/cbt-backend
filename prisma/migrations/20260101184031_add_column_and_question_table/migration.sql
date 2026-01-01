-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "comprehensionId" INTEGER,
ADD COLUMN     "imageId" INTEGER;

-- CreateTable
CREATE TABLE "QuestionBankImage" (
    "id" SERIAL NOT NULL,
    "questionBankId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionBankImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comprehension" (
    "id" SERIAL NOT NULL,
    "questionBankId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comprehension_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "QuestionBankImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_comprehensionId_fkey" FOREIGN KEY ("comprehensionId") REFERENCES "Comprehension"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionBankImage" ADD CONSTRAINT "QuestionBankImage_questionBankId_fkey" FOREIGN KEY ("questionBankId") REFERENCES "QuestionBank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comprehension" ADD CONSTRAINT "Comprehension_questionBankId_fkey" FOREIGN KEY ("questionBankId") REFERENCES "QuestionBank"("id") ON DELETE CASCADE ON UPDATE CASCADE;
