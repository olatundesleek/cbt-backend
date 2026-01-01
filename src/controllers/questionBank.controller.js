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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || "createdAt";
    const order = req.query.order || "desc";

    const banks = await questionBankService.getQuestionBanks(req.user, {
      page,
      limit,
      sort,
      order,
    });
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

export async function uploadBankImages(req, res, next) {
  try {
    const files = req.files || [];

    if (!files.length)
      return res.status(400).json({ message: "No images uploaded" });

    const images = await questionBankService.uploadBankImages(
      req.params.bankId,
      files,
      req.body,
      req.user
    );

    return success(res, "Images uploaded successfully", images, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateBankImage(req, res, next) {
  try {
    const image = await questionBankService.updateBankImage(
      req.params.id,
      req.body,
      req.file, // optional new file
      req.user
    );
    return success(res, "Image updated successfully", image);
  } catch (err) {
    next(err);
  }
}

export async function deleteBankImage(req, res, next) {
  try {
    await questionBankService.deleteBankImage(req.params.id, req.user);
    return success(res, "Image deleted successfully");
  } catch (err) {
    next(err);
  }
}

export async function createComprehension(req, res, next) {
  try {
    const comprehension = await questionBankService.createComprehension(
      req.params.bankId,
      req.body,
      req.user
    );
    return success(
      res,
      "Comprehension created successfully",
      comprehension,
      201
    );
  } catch (err) {
    next(err);
  }
}

export async function updateComprehension(req, res, next) {
  try {
    const comprehension = await questionBankService.updateComprehension(
      req.params.id,
      req.body,
      req.user
    );
    return success(res, "Comprehension updated successfully", comprehension);
  } catch (err) {
    next(err);
  }
}

export async function deleteComprehension(req, res, next) {
  try {
    await questionBankService.deleteComprehension(req.params.id, req.user);
    return success(res, "Comprehension deleted successfully");
  } catch (err) {
    next(err);
  }
}

export async function getBankResources(req, res, next) {
  try {
    const resources = await questionBankService.getBankResources(
      req.params.bankId,
      req.user
    );
    return success(res, "Bank resources fetched successfully", resources);
  } catch (err) {
    next(err);
  }
}
