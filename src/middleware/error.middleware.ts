import { NextFunction, Request, Response } from "express";
import pino from "pino";

const logger = pino({
  level: process.env.NODE_ENV === "test" ? "silent" : "error"
});

export const notFoundMiddleware = (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "NOT_FOUND",
    message: "Route not found."
  });
};

export const errorMiddleware = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (isJsonParseError(error)) {
    return res.status(400).json({
      success: false,
      error: "VALIDATION_ERROR",
      details: []
    });
  }

  logger.error({ error }, "Unhandled application error");

  return res.status(500).json({
    success: false,
    error: "INTERNAL_SERVER_ERROR",
    message: "Something went wrong."
  });
};

const isJsonParseError = (error: unknown) => {
  return (
    error instanceof SyntaxError &&
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "entity.parse.failed"
  );
};
