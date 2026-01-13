import prisma from "../config/prisma.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import fs from "fs";
import path from "path";

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

export const getQuestionBanks = async (user, options = {}) => {
  try {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const sort = options.sort || "createdAt";
    const order = options.order || "desc";

    const skip = (page - 1) * limit;

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
      skip,
      take: limit,
      orderBy: {
        [sort]: order,
      },
    });

    const total = await prisma.questionBank.count({ where });

    return {
      data: banks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    throw error;
  }
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
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  return questions;
};

export const uploadBankImages = async (bankId, files, body, user) => {
  if (!(await canAccessQuestionBank(bankId, user))) {
    throw new Error("Not authorized to upload images to this question bank");
  }

  const BASE_URL =
    process.env.NODE_ENV === "development"
      ? `http://localhost:${process.env.PORT || 4000}`
      : "";

  // Process all files first to prepare data
  const imageData = [];
  for (const file of files) {
    let imageUrl;

    if (process.env.NODE_ENV === "development") {
      const uploadDir = path.join(process.cwd(), "uploads", "question-banks");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const ext = path.extname(file.originalname);
      const filename = `qb_${bankId}_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}${ext}`;
      const uploadPath = path.join(uploadDir, filename);

      fs.renameSync(file.path, uploadPath);

      imageUrl = `${BASE_URL}/uploads/question-banks/${filename}`;
    } else {
      const uploaded = await uploadToCloudinary(
        file.path,
        `question-banks/${bankId}`
      );
      imageUrl = uploaded.secure_url;
    }

    imageData.push({
      url: imageUrl,
      questionBankId: Number(bankId),
      description: body.description || null,
    });
  }

  // Create all images in a transaction
  const createdImagesResult = await prisma.$transaction(
    imageData.map((data) => prisma.questionBankImage.create({ data }))
  );

  return createdImagesResult;
};

// Update an image

export const updateBankImage = async (imageId, data, file, user) => {
  const BASE_URL =
    process.env.NODE_ENV === "development"
      ? `http://localhost:${process.env.PORT || 4000}`
      : "";

  const image = await prisma.questionBankImage.findUnique({
    where: { id: Number(imageId) },
    include: { questionBank: true },
  });

  if (!image) throw new Error("Image not found");

  if (!(await canAccessQuestionBank(image.questionBank.id, user))) {
    throw new Error("Not authorized to update this image");
  }

  let imageUrl = undefined;

  // Replace image
  if (file) {
    if (process.env.NODE_ENV === "development") {
      const uploadDir = path.join(process.cwd(), "uploads", "question-banks");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const ext = path.extname(file.originalname);
      const filename = `qb_${image.bankId}_${Date.now()}${ext}`;
      const uploadPath = path.join(uploadDir, filename);

      fs.renameSync(file.path, uploadPath);

      imageUrl = `${BASE_URL}/uploads/question-banks/${filename}`;
    } else {
      const uploaded = await uploadToCloudinary(
        file.path,
        `question-banks/${image.bankId}`
      );
      imageUrl = uploaded.secure_url;
    }
  }

  return prisma.questionBankImage.update({
    where: { id: Number(imageId) },
    data: {
      ...(imageUrl !== undefined && { url: imageUrl }),
      ...(data.description !== undefined && {
        description: data.description,
      }),
    },
  });
};

// Delete an image
export const deleteBankImage = async (imageId, user) => {
  const image = await prisma.questionBankImage.findUnique({
    where: { id: Number(imageId) },
    include: { questionBank: true },
  });

  if (!image) throw new Error("Image not found");

  if (!(await canAccessQuestionBank(image.questionBank.id, user))) {
    throw new Error("Not authorized to delete this image");
  }

  await prisma.questionBankImage.delete({
    where: { id: Number(imageId) },
  });

  // delete the image from the folder if stored locally
  if (process.env.NODE_ENV === "development") {
    const imagePath = path.join(
      process.cwd(),
      "uploads",
      "question-banks",
      path.basename(image.url)
    );
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  } else {
    //   delete from any server that it is stored on
  }
};

// Create a comprehension

export const createComprehension = async (bankId, body, user) => {
  if (!(await canAccessQuestionBank(bankId, user))) {
    throw new Error("Not authorized to add comprehension to this bank");
  }

  const comprehension = await prisma.comprehension.create({
    data: {
      title: body.title,
      content: body.content,
      questionBankId: parseInt(bankId),
    },
  });

  return comprehension;
};

/**
 * Update a comprehension
 */
export const updateComprehension = async (comprehensionId, body, user) => {
  try {
    const id = Number(comprehensionId);
    if (isNaN(id)) throw new Error("Invalid comprehension ID");

    const comprehension = await prisma.comprehension.findUnique({
      where: { id },
      include: { questionBank: true },
    });
    if (!comprehension) throw new Error("Comprehension not found");

    if (!(await canAccessQuestionBank(comprehension.questionBank.id, user))) {
      throw new Error("Not authorized to update this comprehension");
    }

    const data = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.content !== undefined) data.content = body.content;

    if (Object.keys(data).length === 0) {
      throw new Error("No fields to update");
    }

    return prisma.comprehension.update({
      where: { id },
      data,
    });
  } catch (error) {
    console.log(error);
    throw error;
  }
};

/**
 * Delete a comprehension
 */
export const deleteComprehension = async (comprehensionId, user) => {
  const comprehension = await prisma.comprehension.findUnique({
    where: { id: parseInt(comprehensionId) },
    include: { questionBank: true },
  });
  if (!comprehension) throw new Error("Comprehension not found");

  if (!(await canAccessQuestionBank(comprehension.questionBank.id, user))) {
    throw new Error("Not authorized to delete this comprehension");
  }

  await prisma.comprehension.delete({
    where: { id: parseInt(comprehensionId) },
  });
  return true;
};

export const getBankResources = async (bankId, user) => {
  if (!(await canAccessQuestionBank(bankId, user))) {
    throw new Error("Cannot access resources of this question bank");
  }
  const comprehensions = await prisma.comprehension.findMany({
    where: { questionBankId: parseInt(bankId) },
    orderBy: { createdAt: "desc" },
  });
  const images = await prisma.questionBankImage.findMany({
    where: { questionBankId: parseInt(bankId) },
    orderBy: { createdAt: "desc" },
  });

  return { comprehensions, images };
};
