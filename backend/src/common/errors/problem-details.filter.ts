import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppException } from './app.exception.js';
import { ErrorCode } from './error-codes.js';

interface Problem {
  type: string;
  title: string;
  status: number;
  code: string;
  detail?: string;
  instance: string;
  requestId?: string;
  errors?: string[];
  [key: string]: unknown;
}

const STATUS_CODE_MAP: Record<number, string> = {
  400: ErrorCode.VALIDATION_FAILED,
  401: ErrorCode.UNAUTHENTICATED,
  403: ErrorCode.FORBIDDEN,
  404: ErrorCode.NOT_FOUND,
  409: ErrorCode.CONFLICT,
  429: ErrorCode.TOO_MANY_REQUESTS,
};

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const requestId = (req as unknown as { id?: string }).id;

    const problem = this.toProblem(exception, req.originalUrl, requestId);

    if (problem.status >= 500) {
      this.logger.error(
        exception instanceof Error ? (exception.stack ?? exception.message) : String(exception),
      );
    }

    res.status(problem.status).type('application/problem+json').json(problem);
  }

  private toProblem(exception: unknown, instance: string, requestId?: string): Problem {
    if (exception instanceof AppException) {
      const status = exception.getStatus();
      const body = exception.getResponse() as { message: string };
      return {
        type: `urn:agrotrust:problem:${exception.code.toLowerCase()}`,
        title: HttpStatus[status] ?? 'Error',
        status,
        code: exception.code,
        detail: body.message,
        instance,
        requestId,
        ...exception.extra,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === 'object' && body !== null && 'message' in body
          ? (body as { message: string | string[] }).message
          : exception.message;
      const isList = Array.isArray(message);
      const code = STATUS_CODE_MAP[status] ?? ErrorCode.HTTP_ERROR;
      return {
        type: `urn:agrotrust:problem:${code.toLowerCase()}`,
        title: HttpStatus[status] ?? 'Error',
        status,
        code,
        detail: isList ? 'Request validation failed' : message,
        errors: isList ? message : undefined,
        instance,
        requestId,
      };
    }

    // MongoDB duplicate key
    if (
      typeof exception === 'object' &&
      exception !== null &&
      (exception as { code?: number }).code === 11000
    ) {
      return {
        type: `urn:agrotrust:problem:${ErrorCode.DUPLICATE_RESOURCE.toLowerCase()}`,
        title: 'Conflict',
        status: 409,
        code: ErrorCode.DUPLICATE_RESOURCE,
        detail: 'A record with the same unique value already exists',
        instance,
        requestId,
      };
    }

    // Unknown error: never leak internals
    return {
      type: `urn:agrotrust:problem:${ErrorCode.INTERNAL_ERROR.toLowerCase()}`,
      title: 'Internal Server Error',
      status: 500,
      code: ErrorCode.INTERNAL_ERROR,
      detail: 'Something went wrong. Please try again later.',
      instance,
      requestId,
    };
  }
}