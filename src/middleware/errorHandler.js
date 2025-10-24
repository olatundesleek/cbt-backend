import { error } from "../utils/response.js";

export const errorHandler = (err, req, res, next) => {
  console.error("💥 Error caught:", err);

  // Check for known Prisma or validation errors if needed
  if (err.name === "PrismaClientKnownRequestError") {
    return error(res, "Database error occurred", 400, err.message);
  }

  // Default: return standardized error response
  return error(res, err.message || "Internal server error", err.status || 500);
};
