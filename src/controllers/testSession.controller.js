import * as sessionService from "../services/testSession.service.js";
import { success } from "../utils/response.js";

export async function startTest(req, res, next) {
  try {
    const studentId = req.user.id;
    const testId = parseInt(req.params.testId);
    const data = await sessionService.startSession({ studentId, testId });
    return success(res, "Session started", data, 201);
  } catch (err) {
    next(err);
  }
}

export async function fetchQuestion(req, res, next) {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const questionNumber = parseInt(req.params.questionNumber);
    const data = await sessionService.fetchQuestionsByNumber({
      sessionId,
      questionNumber,
      includeAnswers: false,
    });
    return success(res, "Questions fetched", data);
  } catch (err) {
    next(err);
  }
}

export async function submitAnswerOnly(req, res, next) {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const questionId = parseInt(req.params.questionId);
    const { selectedOption } = req.body;
    const data = await sessionService.submitAnswerOnly({
      sessionId,
      questionId,
      selectedOption,
    });
    return success(res, "Answer submitted", data);
  } catch (err) {
    next(err);
  }
}

export async function submitAndNext(req, res, next) {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const questionId = parseInt(req.params.questionId);
    const { selectedOption } = req.body;
    const data = await sessionService.submitAnswerAndGetNext({
      sessionId,
      questionId,
      selectedOption,
    });
    return success(res, "Answer submitted", data);
  } catch (err) {
    next(err);
  }
}

export async function finishTest(req, res, next) {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const updated = await sessionService.finishSession({
      sessionId,
      studentId: req.user.id,
    });
    return success(res, "Session finished", updated);
  } catch (err) {
    next(err);
  }
}
