import { HttpException } from '@nestjs/common';
import type { ErrorCode } from './error-codes.js';
export declare class AppException extends HttpException {
    readonly code: ErrorCode;
    readonly extra?: Record<string, unknown> | undefined;
    constructor(code: ErrorCode, message: string, status?: number, extra?: Record<string, unknown> | undefined);
}
