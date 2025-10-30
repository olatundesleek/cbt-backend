import * as resultService from "../services/result.service.js";
import { success } from "../utils/response.js";

export async function getResult(req, res, next) {
  try {
    const { sessionId } = req.params;
    const result = await resultService.getSessionResult(sessionId, req.user);
    return success(res, "Result retrieved successfully", result);
  } catch (err) {
    next(err);
  }
}

export async function getTestResults(req, res, next) {
  try {
    const { testId } = req.params;
    const { page, limit, sort, order } = req.query;
    const results = await resultService.getTestResults(testId, req.user, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      order,
    });
    return success(res, "Test results retrieved successfully", results);
  } catch (err) {
    next(err);
  }
}

export async function getAllResults(req, res, next) {
  try {
    const {
      testId,
      courseId,
      classId,
      studentId,
      startDate,
      endDate,
      page,
      limit,
      sort,
      order,
      search,
    } = req.query;

    const results = await resultService.getAllResults(req.user, {
      testId,
      courseId,
      classId,
      studentId,
      startDate,
      endDate,
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      order,
      search,
    });
    return success(res, "Results retrieved successfully", results);
  } catch (err) {
    next(err);
  }
}

export async function getStudentCourseResults(req, res, next) {
  try {
    const { courseId, startDate, endDate, testType } = req.query;
    const results = await resultService.getStudentCourseResults(req.user, {
      courseId,
      startDate,
      endDate,
      testType,
    });
    return success(res, "Course results retrieved successfully", results);
  } catch (err) {
    next(err);
  }
}

export async function toggleResultRelease(req, res, next) {
  try {
    const { testId } = req.params;
    const { showResult } = req.body;
    const test = await resultService.toggleResultRelease(
      testId,
      showResult,
      req.user
    );
    return success(res, "Result visibility updated successfully", test);
  } catch (err) {
    next(err);
  }
}
