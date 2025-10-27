// import * as courseService from '../services/course.service.js';
export async function createQuestions(req, res) {
  try {
    const { question, options, answer } = req.body;
    const createdQuestion = await questionService.createQuestion({
      question,
      options,
      answer,
      createdBy: req.user.id,
    });
    res.status(201).json(createdQuestion);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
export async function getQuestions(req, res) {
  try {
    const questions = await questionService.getQuestionsForUser(req.user);
    res.json(questions);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
