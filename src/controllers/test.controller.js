import * as testService from "../services/test.service.js";
import { success } from "../utils/response.js";

export async function createTest(req, res, next) {
  try {
    const test = await testService.createTest(req.body, req.user);
    return success(res, "Test created successfully", test, 201);
  } catch (err) {
    next(err);
  }
}

export async function getTestById(req, res, next) {
  try {
    const test = await testService.getTestById(req.params.testId, req.user);
    return success(res, "Test fetched successfully", test);
  } catch (err) {
    next(err);
  }
}

export async function updateTest(req, res, next) {
  try {
    const test = await testService.updateTest(
      req.params.testId,
      req.body,
      req.user
    );
    return success(res, "Test updated successfully", test);
  } catch (err) {
    next(err);
  }
}

export async function getTests(req, res, next) {
  try {
    const tests = await testService.getTests(req.user);
    return success(res, "Tests fetched successfully", tests);
  } catch (err) {
    next(err);
  }
}
