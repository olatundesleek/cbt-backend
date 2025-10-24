import * as courseService from '../services/course.service.js';
export async function createCourse(req, res){
  try{
    const { title, description, teacherId } = req.body;
    const course = await courseService.createCourse({ title, description, teacherId, createdBy: req.user.id });
    res.status(201).json(course);
  }catch(err){
    res.status(400).json({ error: err.message });
  }
}
export async function getCourses(req, res){
  try{
    const courses = await courseService.getCoursesForUser(req.user);
    res.json(courses);
  }catch(err){
    res.status(400).json({ error: err.message });
  }
}
