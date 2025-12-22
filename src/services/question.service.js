import { log } from "console";
import prisma from "../config/prisma.js";
import { getCachedOrFetch } from "../utils/cache.js";
import cacheManager from "../utils/cache.js";

const canAccessQuestion = async (questionId, user) => {
  const question = await prisma.question.findUnique({
    where: { id: parseInt(questionId) },
    include: { bank: { select: { createdBy: true } } },
  });

  if (!question) throw new Error("Question not found");

  // Admin can access all questions
  if (user.role === "ADMIN") return true;

  // Teachers can only access their own question banks' questions
  if (user.role === "TEACHER") {
    return question.bank.createdBy === user.id;
  }

  return false;
};

export const createQuestion = async (data, user) => {
  try {
    // Handle both single question and array of questions
    const questions = Array.isArray(data) ? data : [data];

    // Get unique bank IDs from all questions
    const bankIds = [...new Set(questions.map((q) => parseInt(q.bankId)))];

    // Verify all question banks exist and user owns them
    const banks = await prisma.questionBank.findMany({
      where: { id: { in: bankIds } },
    });

    // Check if all banks were found
    if (banks.length !== bankIds.length) {
      throw new Error("One or more question banks not found");
    }

    // Check ownership of all banks
    if (user.role !== "ADMIN") {
      const unauthorized = banks.some((bank) => bank.createdBy !== user.id);
      if (unauthorized) {
        throw new Error("Cannot add questions to one or more banks");
      }
    }

    // Create all questions in a transaction
    const createdQuestions = await prisma.$transaction(
      questions.map((q) =>
        prisma.question.create({
          data: {
            text: q.text,
            options: q.options,
            answer: q.answer,
            marks: q.marks || 1,
            bankId: parseInt(q.bankId),
          },
          include: {
            bank: {
              select: {
                questionBankName: true,
                course: {
                  select: {
                    title: true,
                  },
                },
              },
            },
          },
        })
      )
    );

    // Return array if input was array, otherwise return single question
    const result = Array.isArray(data) ? createdQuestions : createdQuestions[0];

    // Invalidate cache after creating questions
    invalidateQuestionCaches();

    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Invalidate question-related caches
 */
const invalidateQuestionCaches = (bankId = null) => {
  try {
    cacheManager.invalidate("all_questions");
    if (bankId) {
      cacheManager.invalidate(`questions_bank_${bankId}`);
    }
    cacheManager.invalidate("all_question_banks");
  } catch (err) {}
};

export const getQuestionById = async (questionId, user) => {
  if (!(await canAccessQuestion(questionId, user))) {
    throw new Error("Cannot access this question");
  }

  const question = await prisma.question.findUnique({
    where: { id: parseInt(questionId) },
    include: {
      bank: {
        select: {
          questionBankName: true,
          course: {
            select: {
              title: true,
            },
          },
        },
      },
    },
  });

  if (!question) throw new Error("Question not found");
  return question;
};

export const updateQuestion = async (questionId, data, user) => {
  if (!(await canAccessQuestion(questionId, user))) {
    throw new Error("Cannot update this question");
  }

  const question = await prisma.question.update({
    where: { id: parseInt(questionId) },
    data: {
      text: data.text,
      options: data.options,
      answer: data.answer,
      marks: data.marks,
    },
    include: {
      bank: {
        select: {
          questionBankName: true,
          course: {
            select: {
              title: true,
            },
          },
        },
      },
    },
  });

  // Invalidate cache after update
  invalidateQuestionCaches(question.bankId);

  return question;
};

export const deleteQuestion = async (questionId, user) => {
  try {
    if (!(await canAccessQuestion(questionId, user))) {
      throw new Error("Cannot delete this question");
    }

    const question = await prisma.question.findUnique({
      where: { id: parseInt(questionId) },
    });

    await prisma.question.delete({
      where: { id: parseInt(questionId) },
    });

    // Invalidate cache after delete
    if (question) {
      invalidateQuestionCaches(question.bankId);
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
};

import { parseQuestionsCsv } from "../utils/csv.js";

export const uploadQuestionsFromCsv = async (filePath, bankId, user) => {
  try {
    // Verify question bank exists and user owns it
    const bank = await prisma.questionBank.findUnique({
      where: { id: parseInt(bankId) },
    });

    if (!bank) throw new Error("Question bank not found");
    if (bank.createdBy !== user.id && user.role !== "ADMIN") {
      throw new Error("Cannot add questions to this bank");
    }

    // Parse CSV file
    const questions = await parseQuestionsCsv(filePath);

    // Validate all questions point to the same bank
    // if (questions.some((q) => parseInt(q.bankId) !== parseInt(bankId))) {
    //   throw new Error("All questions must belong to the specified bank");
    // }

    // Create all questions in a transaction
    const createdQuestions = await prisma.$transaction(
      questions.map((q) =>
        prisma.question.create({
          data: {
            text: q.text,
            options: q.options,
            answer: q.answer,
            marks: q.marks || 1,
            bankId: parseInt(bankId),
          },
          include: {
            bank: {
              select: {
                questionBankName: true,
                course: {
                  select: {
                    title: true,
                  },
                },
              },
            },
          },
        })
      )
    );

    // Invalidate cache after creating questions
    invalidateQuestionCaches(parseInt(bankId));

    return createdQuestions;
  } catch (error) {
    throw error;
  }
};
