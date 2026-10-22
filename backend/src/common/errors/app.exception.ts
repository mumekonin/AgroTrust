import { HttpException } from '@nestjs/common';
import type { ErrorCode } from './error-codes.js';

export class AppException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    status = 400,
    public readonly extra?: Record<string, unknown>,
  ) {
    super({ code, message }, status);
  }
}