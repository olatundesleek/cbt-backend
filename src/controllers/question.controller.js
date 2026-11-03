import * as questionService from "../services/question.service.js";
import { success } from "../utils/response.js";
import { generateQuestionExcelTemplate } from "../utils/excel.js";
import { uploadQuestionsSchema } from "../validators/question.validator.js";
import fs from "fs";

export async function createQuestion(req, res, next) {
  try {
    const isArray = Array.isArray(req.body);
    const result = await questionService.createQuestion(req.body, req.user);

    return success(
      res,
      isArray
        ? `${result.length} questions created successfully`
        : "Question created successfully",
      result,
      201
    );
  } catch (err) {
    next(err);
  }
}

export async function getQuestionById(req, res, next) {
  try {
    const question = await questionService.getQuestionById(
      req.params.questionId,
      req.user
    );
    return success(res, "Question fetched successfully", question);
  } catch (err) {
    next(err);
  }
}

export async function updateQuestion(req, res, next) {
  try {
    const question = await questionService.updateQuestion(
      req.params.questionId,
      req.body,
      req.user
    );
    return success(res, "Question updated successfully", question);
  } catch (err) {
    next(err);
  }
}

export async function deleteQuestion(req, res, next) {
  try {
    await questionService.deleteQuestion(req.params.questionId, req.user);
    return success(res, "Question deleted successfully");
  } catch (err) {
    next(err);
  }
}

export async function getUploadTemplate(req, res, next) {
  try {
    const workbook = await generateQuestionExcelTemplate();
    const content = await workbook.xlsx.writeBuffer();
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="question_template.xlsx"'
    );
    return res.send(content);
  } catch (err) {
    next(err);
  }
}

export async function uploadQuestions(req, res, next) {
  let questions;
  let uploadError;

  try {
    if (!req.file) {
      throw Object.assign(new Error("Please upload an Excel (.xlsx) file"), {
        status: 400,
      });
    }

    const validation = uploadQuestionsSchema.validate(req.body);
    if (validation.error) {
      throw Object.assign(
        new Error(validation.error.details[0].message),
        { status: 400 }
      );
    }

    req.body = validation.value;
    questions = await questionService.uploadQuestionsFromExcel(
      req.file.path,
      req.body.bankId,
      req.user
    );
  } catch (err) {
    uploadError = err;
  }

  if (req.file) {
    try {
      await fs.promises.unlink(req.file.path);
    } catch (cleanupError) {
      if (cleanupError.code !== "ENOENT") {
        if (uploadError) {
          console.error("Failed to remove uploaded question workbook:", cleanupError);
        } else {
          uploadError = cleanupError;
        }
      }
    }
  }

  if (uploadError) return next(uploadError);

  return success(
    res,
    `Successfully uploaded ${questions.length} questions`,
    questions,
    201
  );
}
