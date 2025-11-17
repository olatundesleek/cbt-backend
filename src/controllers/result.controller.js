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
    const { courseId, startDate, endDate, testType, limit } = req.query;
    const results = await resultService.getStudentCourseResults(req.user, {
      courseId,
      startDate,
      endDate,
      testType,
      limit: parseInt(limit),
    });
    return success(res, "Course results retrieved successfully", results);
  } catch (err) {
    next(err);
  }
}

export async function downloadStudentCourseResults(req, res) {
  try {
    const user = req.user;

    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    let format = req.query.format; // DO NOT destructure this, left it like this on purpose, no do oversabi
    format = format ? format.toString().toLowerCase() : "pdf";

    const results = await resultService.getStudentCourseResults(user, {
      startDate,
      endDate,
    });

    if (format === "excel") {
      const workbook = await resultService.generateExcel(results);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", "attachment; filename=results.xlsx");
      await workbook.xlsx.write(res);
      return res.end();
    }

    if (format === "pdf") {
      const pdfBuffer = await resultService.generatePDF(results);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=results.pdf");
      return res.send(pdfBuffer);
    }

    return res.status(400).json({ error: "Invalid format. Use pdf or excel." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to generate download." });
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
