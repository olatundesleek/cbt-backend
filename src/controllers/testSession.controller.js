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
    const sessionId = Number(req.params.sessionId);
    const questionNumber = Number(req.params.questionNumber);

    if (isNaN(sessionId) || isNaN(questionNumber)) {
      return res
        .status(400)
        .json({ error: "Invalid session ID or question number" });
    }

    const data = await sessionService.fetchQuestionsByNumber({
      sessionId,
      questionNumber,
    });

    return success(res, "Questions fetched successfully", {
      ...data,
      finished: data.finished, // explicitly include finished flag
    });
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
    const studentId = req.user.id;
    const { sessionId, answers } = req.body;

    // Validation before passing to service
    if (!sessionId || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    // Call the service
    const data = await sessionService.submitAnswerAndGetNext({
      sessionId: parseInt(sessionId),
      answers,
      studentId,
    });

    return success(res, "Answers submitted successfully", data);
  } catch (err) {
    next(err);
  }
}

export async function submitAndPrevious(req, res, next) {
  try {
    const studentId = req.user.id;
    const { sessionId, answers } = req.body;

    // Validation before passing to service
    if (!sessionId || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    // Call the service
    const data = await sessionService.submitAnswerAndGetPrevious({
      sessionId: parseInt(sessionId),
      answers,
      studentId,
    });

    return success(res, "Answers submitted successfully", data);
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
