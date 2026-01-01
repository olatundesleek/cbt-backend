import Joi from "joi";

// Create a new comprehension
export const createComprehensionSchema = Joi.object({
  title: Joi.string().min(3).required().messages({
    "string.empty": "Title is required",
    "string.min": "Title must be at least 3 characters",
  }),
  content: Joi.string().min(10).required().messages({
    "string.empty": "Content is required",
    "string.min": "Content must be at least 10 characters",
  }),
});

// Update an existing comprehension (fields optional)
export const updateComprehensionSchema = Joi.object({
  title: Joi.string().min(3).messages({
    "string.min": "Title must be at least 3 characters",
  }),
  content: Joi.string().min(10).messages({
    "string.min": "Content must be at least 10 characters",
  }),
})
  .or("title", "content")
  .messages({
    "object.missing": "You must update at least one field: title or content",
  });

// Delete comprehension (param validation)
export const deleteComprehensionSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "number.base": "Comprehension ID must be a number",
    "number.positive": "Comprehension ID must be positive",
    "any.required": "Comprehension ID is required",
  }),
});

// Create / Upload images (description is optional)
export const createImageSchema = Joi.object({
  description: Joi.string().max(255).allow("", null).optional().messages({
    "string.max": "Description cannot be longer than 255 characters",
  }),
}).optional();

// Update an image (optional description, optional file handled by Multer)
export const updateImageSchema = Joi.object({
  description: Joi.string().max(255).allow("", null).optional().messages({
    "string.max": "Description cannot be longer than 255 characters",
  }),
}).optional();

// Delete image (param validation)
export const deleteImageSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "number.base": "Image ID must be a number",
    "number.positive": "Image ID must be positive",
    "any.required": "Image ID is required",
  }),
});

// get bank resources schema
export const getBankResourcesSchema = Joi.object({
  bankId: Joi.number().integer().positive().required().messages({
    "number.base": "Bank ID must be a number",
    "number.positive": "Bank ID must be positive",
    "any.required": "Bank ID is required",
  }),
});
