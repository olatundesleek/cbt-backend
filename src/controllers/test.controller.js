import * as testService from '../services/test.service.js';
export async function createTest(req, res){
  try{
    const { title, type, courseId } = req.body;
    const test = await testService.createTest({ title, type, courseId, createdBy: req.user.id });
    res.status(201).json(test);
  }catch(err){
    res.status(400).json({ error: err.message });
  }
}
export async function getTest(req, res){
  try{
    const test = await testService.getTest(parseInt(req.params.id), req.user);
    res.json(test);
  }catch(err){
    res.status(400).json({ error: err.message });
  }
}
