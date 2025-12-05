import * as courseService from "../services/course.service.js";
import { success } from "../utils/response.js";
export async function createCourse(req, res, next) {
  try {
    const { title, description, teacherId } = req.body;
    const userRole = req.user.role;
    const course = await courseService.createCourse(
      title,
      description,
      teacherId,
      userRole
    );
    return success(res, "Course created successfully", course);
  } catch (err) {
    next(err);
  }
}

export async function updateCourse(req, res, next) {
  try {
    const { title, description, teacherId } = req.body;
    const { courseId } = req.params;
    const course = await courseService.updateCourse(
      courseId,
      title,
      description,
      teacherId
    );
    return success(res, "Course updated successfully", course);
  } catch (err) {
    next(err);
  }
}

export async function deleteCourse(req, res, next) {
  try {
    const { courseId } = req.params;
    await courseService.deleteCourse(courseId);
    return success(res, "Course deleted successfully", null);
  } catch (err) {
    next(err);
  }
}

export async function getCourses(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || "createdAt";
    const order = req.query.order || "desc";

    const courses = await courseService.getCoursesForUser(req.user, {
      page,
      limit,
      sort,
      order,
    });
    res.json(courses);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
