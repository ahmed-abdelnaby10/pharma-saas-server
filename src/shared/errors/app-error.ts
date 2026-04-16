export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;
  public readonly translationKey?: string;
  public readonly translationParams?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode = 500,
    errorCode = "INTERNAL_SERVER_ERROR",
    details?: unknown,
    isOperational = true,
    translationKey?: string,
    translationParams?: Record<string, unknown>,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = isOperational;
    this.translationKey = translationKey;
    this.translationParams = translationParams;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
