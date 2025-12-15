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

// get all results endpoint for admin / teachers
export async function getAllResults(req, res, next) {
  try {
    const filters = {
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 10,
      testId: req.query.testId ? parseInt(req.query.testId, 10) : undefined,
      courseId: req.query.courseId
        ? parseInt(req.query.courseId, 10)
        : undefined,
      classId: req.query.classId ? parseInt(req.query.classId, 10) : undefined,
      studentId: req.query.studentId
        ? parseInt(req.query.studentId, 10)
        : undefined,
      testType: req.query.testType?.toUpperCase(), // "TEST", "EXAM", or "ALL"
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      search: req.query.search,
      sort: req.query.sort,
      order: req.query.order,
    };

    const results = await resultService.getAllResults(req.user, filters);

    return success(res, "Results retrieved successfully", results);
  } catch (err) {
    next(err);
  }
}

export async function getStudentCourseResults(req, res, next) {
  try {
    const { courseId, startDate, endDate, testType, limit, page, sort, order } =
      req.query;
    const results = await resultService.getStudentCourseResults(req.user, {
      courseId,
      startDate,
      endDate,
      testType: testType?.toUpperCase(),
      limit: parseInt(limit) || 10,
      page: parseInt(page) || 1,
      sort,
      order,
    });
    return success(res, "Course results retrieved successfully", results);
  } catch (err) {
    next(err);
  }
}

export async function downloadStudentCourseResults(req, res) {
  try {
    const user = req.user;

    let format = req.query.format; // DO NOT destructure this, left it like this on purpose, no do oversabi
    format = format ? format.toString().toLowerCase() : "pdf";

    // Pass all filters including pagination and sorting
    const filters = { ...req.query };
    delete filters.format; // Remove format from filters

    const results = await resultService.getStudentCourseResults(user, filters);

    if (format === "excel") {
      const workbook = await resultService.generateExcel(results);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="student-results.xlsx"'
      );
      await workbook.xlsx.write(res);
      return res.end();
    }

    if (format === "pdf") {
      const pdfBuffer = await resultService.generatePDF(results);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="student-results.pdf"'
      );
      return res.send(pdfBuffer);
    }

    return res.status(400).json({ error: "Invalid format. Use pdf or excel." });
  } catch (err) {
    return res.status(500).json({ error: "Failed to generate download." });
  }
}

export async function downloadResults(req, res) {
  try {
    const user = req.user;

    const filters = { ...req.query };
    delete filters.format;

    let format = req.query.format;
    format = format ? format.toString().toLowerCase() : "pdf";

    if (format === "pdf") {
      const pdfBuffer = await resultService.generateAllResultsPdf(
        user,
        filters
      );
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="results.pdf"'
      );
      return res.send(pdfBuffer);
    }

    if (format === "excel") {
      const workbook = await resultService.generateAllResultsExcel(
        user,
        filters
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="results.xlsx"'
      );
      await workbook.xlsx.write(res);
      return res.end();
    }

    return res.status(400).json({ error: "Invalid format. Use pdf or excel." });
  } catch (err) {
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
