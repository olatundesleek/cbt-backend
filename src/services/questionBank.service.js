import prisma from "../config/prisma.js";

const canAccessQuestionBank = async (bankId, user) => {
  const bank = await prisma.questionBank.findUnique({
    where: { id: parseInt(bankId) },
  });

  if (!bank) throw new Error("Question bank not found");

  // Admin can access all banks
  if (user.role === "ADMIN") return true;

  // Teachers can only access their own banks
  if (user.role === "TEACHER") {
    return bank.createdBy === user.id;
  }

  return false;
};

export const createQuestionBank = async (data) => {
  try {
    // If courseId provided, verify it exists
    if (data.courseId) {
      const course = await prisma.course.findUnique({
        where: { id: parseInt(data.courseId) },
      });
      if (!course) throw new Error("Course not found");
    }

    const bank = await prisma.questionBank.create({
      data: {
        questionBankName: data.questionBankName,
        description: data.description,
        courseId: data.courseId ? parseInt(data.courseId) : undefined,
        createdBy: parseInt(data.createdBy),
      },
      include: {
        course: {
          select: {
            title: true,
          },
        },
        teacher: {
          select: {
            firstname: true,
            lastname: true,
          },
        },
      },
    });

    return bank;
  } catch (error) {
    throw error;
  }
};

export const getQuestionBanks = async (user) => {
  const where = {};

  // If not admin, only show own banks
  if (user.role === "TEACHER") {
    where.createdBy = user.id;
  }

  const banks = await prisma.questionBank.findMany({
    where,
    include: {
      course: {
        select: {
          title: true,
        },
      },
      teacher: {
        select: {
          firstname: true,
          lastname: true,
        },
      },
      questions: true,
      _count: {
        select: {
          questions: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return banks;
};

export const getQuestionBankById = async (bankId, user) => {
  if (!(await canAccessQuestionBank(bankId, user))) {
    throw new Error("Cannot access this question bank");
  }

  const bank = await prisma.questionBank.findUnique({
    where: { id: parseInt(bankId) },
    include: {
      course: {
        select: {
          title: true,
        },
      },
      teacher: {
        select: {
          firstname: true,
          lastname: true,
        },
      },
      _count: {
        select: {
          questions: true,
        },
      },
    },
  });

  return bank;
};

export const updateQuestionBank = async (bankId, data, user) => {
  if (!(await canAccessQuestionBank(bankId, user))) {
    throw new Error("Cannot update this question bank");
  }

  try {
    // If updating courseId, verify course exists
    if (data.courseId) {
      const course = await prisma.course.findUnique({
        where: { id: parseInt(data.courseId) },
      });
      if (!course) throw new Error("Course not found");
    }

    const bank = await prisma.questionBank.update({
      where: { id: parseInt(bankId) },
      data: {
        questionBankName: data.questionBankName,
        description: data.description,
        courseId: data.courseId ? parseInt(data.courseId) : undefined,
      },
      include: {
        course: {
          select: {
            title: true,
          },
        },
        teacher: {
          select: {
            firstname: true,
            lastname: true,
          },
        },
      },
    });

    return bank;
  } catch (error) {
    if (error.code === "P2002") {
      throw new Error("Question bank name already exists");
    }
    throw error;
  }
};

export const deleteQuestionBank = async (bankId, user) => {
  if (!(await canAccessQuestionBank(bankId, user))) {
    throw new Error("Cannot delete this question bank");
  }

  const bankIdInt = parseInt(bankId);

  // Check if any test is using this bank
  const testsUsingBank = await prisma.test.findMany({
    where: { bankId: bankIdInt },
    select: { id: true, title: true },
  });

  if (testsUsingBank.length > 0) {
    const testTitles = testsUsingBank.map((t) => t.title).join(", ");
    const error = new Error("unable to delete question bank");
    error.details = `Cannot delete this question bank. The following tests are still using it: ${testTitles}. Please assign them to another bank first.`;
    throw error;
  }

  // Safe to delete, this will cascade delete all questions in the bank
  await prisma.questionBank.delete({
    where: { id: bankIdInt },
  });

  return { message: "Question bank deleted successfully" };
};

export const getQuestionsInBank = async (bankId, user) => {
  if (!(await canAccessQuestionBank(bankId, user))) {
    throw new Error("Cannot access questions in this bank");
  }

  const questions = await prisma.question.findMany({
    where: { bankId: parseInt(bankId) },
    orderBy: {
      createdAt: "desc",
    },
  });

  return questions;
};
