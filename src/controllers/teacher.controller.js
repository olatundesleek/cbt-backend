import * as teacherService from "../services/teacher.service.js";
import { success } from "../utils/response.js";

export async function getTeachers(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || "createdAt";
    const order = req.query.order || "desc";

    const users = await teacherService.getTeachers(req.user, {
      page,
      limit,
      sort,
      order,
    });
    return success(res, "Teachers fetched successfully", users);
  } catch (err) {
    next(err);
  }
}

export async function assignClassTeacher(req, res, next) {
  try {
    const { classId } = req.params;
    const { teacherId } = req.body;
    console.log("Assigning class:", classId, "to teacher:", teacherId);

    const updated = await teacherService.assignClassTeacher(
      teacherId,
      classId,
      req.user
    );
    return success(res, "Teacher assigned to class", updated);
  } catch (err) {
    next(err);
  }
}
