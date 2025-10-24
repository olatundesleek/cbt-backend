// utils/response.js

export const success = (
  res,
  message = "Success",
  data = null,
  status = 200
) => {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
};

export const error = (
  res,
  message = "An error occurred",
  status = 500,
  details = null
) => {
  return res.status(status).json({
    success: false,
    message,
    details,
  });
};
