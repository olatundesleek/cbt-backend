import * as studentService from "../services/student.service.js";
import { success } from "../utils/response.js";

export async function getStudents(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || "createdAt";
    const order = req.query.order || "desc";

    const users = await studentService.getStudents(req.user, {
      page,
      limit,
      sort,
      order,
    });
    return success(res, "Students fetched successfully", users);
  } catch (err) {
    next(err);
  }
}

export async function getStudentByUsername(req, res, next) {
  try {
    const { username } = req.params;
    const user = await studentService.getStudentByUsername(req.user, username);
    return success(res, "Student fetched successfully", user);
  } catch (err) {
    next(err);
  }
}

export async function assignClassToStudent(req, res, next) {
  try {
    const { studentId } = req.params;
    const { classId } = req.body;

    const updated = await studentService.assignStudentToClass(
      studentId,
      classId,
      req.user
    );
    return success(res, "Student assigned to class", updated);
  } catch (err) {
    next(err);
  }
}
