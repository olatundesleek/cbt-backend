import Joi from "joi";

const isSafeFloat = (value) => {
  if (value <= 0 || value > 3.4e38) return false;
  return Number.isInteger(value * 64); // multiples of 1/64
};

//  Single Question Schema
const singleQuestionSchema = Joi.object({
  text: Joi.string().min(10).max(500).required(),

  options: Joi.array().items(Joi.string().min(1)).min(2).required().messages({
    "array.base": "Options must be an array of strings",
    "array.min": "At least two options are required",
  }),

  answer: Joi.string()
    .required()
    .custom((value, helpers) => {
      const { options } = helpers.state.ancestors[0];
      if (!options.includes(value)) {
        return helpers.error("any.invalid", {
          message: "Answer must match one of the options",
        });
      }
      return value;
    }),

  imageUrl: Joi.string().uri().optional().allow(null, ""),
  comprehensionText: Joi.string().min(10).optional().allow(null, ""),

  marks: Joi.number()
    .custom((value, helpers) => {
      if (!isSafeFloat(value)) {
        // This ensures the message is returned directly
        return helpers.message(
          "Marks must be a safe float (like 0.5,0.25, 1, 1.25, 1.5, etc.)",
        );
      }
      return value;
    })
    .default(1),
  bankId: Joi.number().integer().required(),
});

//  Allow single or multiple questions
export const createQuestionSchema = Joi.alternatives().try(
  singleQuestionSchema,
  Joi.array().items(singleQuestionSchema).min(1).max(100),
);

//  Update Question Schema
export const updateQuestionSchema = Joi.object({
  text: Joi.string().min(10).max(500).optional(),

  options: Joi.array().items(Joi.string().min(1)).min(2).optional().messages({
    "array.base": "Options must be an array of strings",
    "array.min": "At least two options are required",
  }),

  answer: Joi.string().optional(),

  imageUrl: Joi.string().uri().optional().allow(null, ""),
  comprehensionText: Joi.string().min(10).optional().allow(null, ""),

  marks: Joi.number()
    .custom((value, helpers) => {
      if (!isSafeFloat(value)) {
        // This ensures the message is returned directly
        return helpers.message(
          "Marks must be a safe float (like 0.5,0.25, 1, 1.25, 1.5, etc.)",
        );
      }
      return value;
    })
    .default(1),
}).min(1); // At least one field must be provided

//  Get Questions Schema
export const getQuestionsSchema = Joi.object({
  bankId: Joi.number().integer().required(),
});

// CSV upload validation
export const uploadQuestionsSchema = Joi.object({
  bankId: Joi.number().integer().required(),
}).unknown(true); // Allow other fields (multer adds file details)
