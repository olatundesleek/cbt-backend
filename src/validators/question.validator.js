import Joi from "joi";

export const createManyQuestionsSchema = Joi.array()
  .items(
    Joi.object({
      question: Joi.string().min(10).max(500).required(),
      image: Joi.string().uri().optional(),
      options: Joi.array()
        .items(Joi.string().min(2).max(100).required())
        .min(2)
        .max(4)
        .required(),
      answer: Joi.string().valid(Joi.ref("options")).required(),
      testId: Joi.number().integer().required(),
    })
  )
  .min(1)
  .max(100);
