export function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);

    if (error)
      return res.status(400).json({
        success: false,

        error: "Validation error",
        details: error.details[0].message,
      });
    req.body = value;
    next();
  };
}
export function validateParams(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params);
    if (error) return res.status(400).json({ error: error.details[0].message });
    req.params = value;
    next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query);
    if (error)
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: error.details[0].message,
      });
    req.query = value;
    next();
  };
}
