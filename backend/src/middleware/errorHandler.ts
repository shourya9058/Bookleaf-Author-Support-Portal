import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = typeof err.statusCode === "number" ? err.statusCode : 500;
  if (statusCode >= 500) {
    console.error("Internal Server Error:", err);
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Validation Error",
      errors: err.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  // Handle common Prisma errors
  if (err?.code === "P2002") {
    res.status(409).json({
      success: false,
      message: "A record with this unique value already exists.",
    });
    return;
  }

  if (err?.code === "P2025") {
    res.status(404).json({
      success: false,
      message: "Requested record was not found.",
    });
    return;
  }

  const message =
    statusCode === 500 && process.env.NODE_ENV === "production"
      ? "An unexpected internal server error occurred"
      : err.message || "An unexpected error occurred";

  res.status(statusCode).json({
    success: false,
    message,
  });
}
