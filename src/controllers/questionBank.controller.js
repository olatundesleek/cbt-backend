import * as questionBankService from "../services/questionBank.service.js";
import { success } from "../utils/response.js";

export async function createQuestionBank(req, res, next) {
  try {
    const questionBank = await questionBankService.createQuestionBank({
      ...req.body,
      createdBy: req.user.id,
    });
    return success(
      res,
      "Question bank created successfully",
      questionBank,
      201
    );
  } catch (err) {
    next(err);
  }
}

export async function getQuestionBanks(req, res, next) {
  try {
    const banks = await questionBankService.getQuestionBanks(req.user);
    return success(res, "Question banks fetched successfully", banks);
  } catch (err) {
    next(err);
  }
}

export async function getQuestionBankById(req, res, next) {
  try {
    const bank = await questionBankService.getQuestionBankById(
      req.params.bankId,
      req.user
    );
    return success(res, "Question bank fetched successfully", bank);
  } catch (err) {
    next(err);
  }
}

export async function updateQuestionBank(req, res, next) {
  try {
    const bank = await questionBankService.updateQuestionBank(
      req.params.bankId,
      req.body,
      req.user
    );
    return success(res, "Question bank updated successfully", bank);
  } catch (err) {
    next(err);
  }
}

export async function deleteQuestionBank(req, res, next) {
  try {
    await questionBankService.deleteQuestionBank(req.params.bankId, req.user);
    return success(res, "Question bank deleted successfully");
  } catch (err) {
    next(err);
  }
}

export async function getQuestionsInBank(req, res, next) {
  try {
    const questions = await questionBankService.getQuestionsInBank(
      req.params.bankId,
      req.user
    );
    return success(res, "Questions fetched successfully", questions);
  } catch (err) {
    next(err);
  }
}
