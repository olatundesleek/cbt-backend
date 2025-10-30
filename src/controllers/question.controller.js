import * as questionService from "../services/question.service.js";
import { success } from "../utils/response.js";
import { generateCsvTemplate } from "../utils/csv.js";
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
    const csvContent = generateCsvTemplate();
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="question_template.csv"'
    );
    return res.send(csvContent);
  } catch (err) {
    next(err);
  }
}

export async function uploadQuestions(req, res, next) {
  try {
    if (!req.file) {
      throw new Error("Please upload a CSV file");
    }

    const questions = await questionService.uploadQuestionsFromCsv(
      req.file.path,
      req.body.bankId,
      req.user
    );

    // Delete the temporary file
    fs.unlinkSync(req.file.path);

    return success(
      res,
      `Successfully uploaded ${questions.length} questions`,
      questions,
      201
    );
  } catch (err) {
    // Clean up file on error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    next(err);
  }
}
