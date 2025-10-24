import * as sessionService from '../services/testSession.service.js';
export async function startTest(req, res) {
  try{
    const studentId = req.user.id;
    const testId = parseInt(req.params.testId);
    const session = await sessionService.startSession({ studentId, testId });
    res.status(201).json(session);
  }catch(err){ res.status(400).json({ error: err.message }); }
}
export async function fetchQuestion(req, res){
  try{
    const sessionId = parseInt(req.params.sessionId);
    const questionNumber = parseInt(req.params.questionNumber);
    const data = await sessionService.fetchQuestionByNumber({ sessionId, questionNumber });
    res.json(data);
  }catch(err){ res.status(400).json({ error: err.message }); }
}
export async function submitAndNext(req, res){
  try{
    const sessionId = parseInt(req.params.sessionId);
    const questionId = parseInt(req.params.questionId);
    const { selectedOption } = req.body;
    const data = await sessionService.submitAnswerAndGetNext({ sessionId, questionId, selectedOption });
    res.json(data);
  }catch(err){ res.status(400).json({ error: err.message }); }
}
export async function finishTest(req, res){
  try{
    const sessionId = parseInt(req.params.sessionId);
    const updated = await sessionService.finishSession({ sessionId, studentId: req.user.id });
    res.json(updated);
  }catch(err){ res.status(400).json({ error: err.message }); }
}
