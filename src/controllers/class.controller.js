import * as classService from "../services/class.service.js";
import { success, error } from "../utils/response.js";

export async function createClass(req, res, next) {
  try {
    const { className, teacherId, courses } = req.body;
    const newClass = await classService.createClass(
      className,
      teacherId,
      courses
    );
    return success(res, "Class created successfully", newClass, 201);
  } catch (err) {
    next(err); // Let global handler send response
  }
}

export async function getClass(req, res) {
  try {
    const classes = await classService.getClassesForUser(req.user);
    res.json(classes);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function updateClass(req, res, next) {
  try {
    console.log(
      "Updating class with ID:",
      req.params.classId,
      "with data:",
      req.body
    );

    const { className, teacherId, courses = [] } = req.body;

    const updatedClass = await classService.updateClass(
      req.params.classId,
      className,
      teacherId,
      courses
    );

    return success(res, "Class updated successfully", updatedClass);
  } catch (err) {
    next(err);
  }
}

export async function deleteClass(req, res) {
  try {
    await classService.deleteClass(req.params.classId);
    res.json({ message: "Class deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
