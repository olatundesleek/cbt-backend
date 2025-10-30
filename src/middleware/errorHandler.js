import { error } from "../utils/response.js";

export const errorHandler = (err, req, res, next) => {
  console.error("💥 Error caught:", err);

  if (res.headersSent) return next(err);

  // Prisma known errors
  if (err.name === "PrismaClientKnownRequestError") {
    let message = "A database error occurred.";

    switch (err.code) {
      case "P2002":
        message = "Duplicate entry — a record with this value already exists.";
        break;
      case "P2003":
        message =
          "Invalid reference — one of the linked records does not exist.";
        break;
      case "P2025":
        message = "Record not found — unable to complete this action.";
        break;
      default:
        message = "An unexpected database error occurred.";
    }

    return error(res, message, null, 400);
  }

  // Prisma validation errors (for example, wrong data types)
  if (err.name === "PrismaClientValidationError") {
    return error(
      res,
      "Invalid data format or missing required fields.",
      null,
      400
    );
  }

  // Fallback: general error
  return error(
    res,
    err.message || "Internal server error",
    process.env.NODE_ENV === "development" ? err.stack : null,
    err.status || 500
  );
};
