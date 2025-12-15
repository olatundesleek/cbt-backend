import Joi from "joi";

export const updateSystemSettingsSchema = Joi.object({
  appName: Joi.string().min(2).max(200).optional(),
  institutionName: Joi.string().min(2).max(200).optional(),
  shortName: Joi.string().max(50).optional(),
  primaryColor: Joi.string().optional(),
  supportEmail: Joi.string().email().optional(),
  systemStatus: Joi.string().valid("ACTIVE", "MAINTENANCE").optional(),
  logo: Joi.alternatives()
    .try(
      Joi.object({
        mimetype: Joi.string().pattern(/^image\//),
        originalname: Joi.string(),
      }).unknown(true)
    )
    .try(Joi.valid("null"))
    .optional(),
  favicon: Joi.alternatives()
    .try(
      Joi.object({
        mimetype: Joi.string().pattern(/^image\//),
        originalname: Joi.string(),
      }).unknown(true)
    )
    .try(Joi.valid("null"))
    .optional(),
  loginBanner: Joi.alternatives()
    .try(
      Joi.object({
        mimetype: Joi.string().pattern(/^image\//),
        originalname: Joi.string(),
      }).unknown(true)
    )
    .try(Joi.valid("null"))
    .optional(),
});
