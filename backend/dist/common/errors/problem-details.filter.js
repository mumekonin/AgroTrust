var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ProblemDetailsFilter_1;
import { Catch, HttpException, HttpStatus, Logger, } from '@nestjs/common';
import { AppException } from './app.exception.js';
import { ErrorCode } from './error-codes.js';
const STATUS_CODE_MAP = {
    400: ErrorCode.VALIDATION_FAILED,
    401: ErrorCode.UNAUTHENTICATED,
    403: ErrorCode.FORBIDDEN,
    404: ErrorCode.NOT_FOUND,
    409: ErrorCode.CONFLICT,
    429: ErrorCode.TOO_MANY_REQUESTS,
};
let ProblemDetailsFilter = ProblemDetailsFilter_1 = class ProblemDetailsFilter {
    logger = new Logger(ProblemDetailsFilter_1.name);
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const req = ctx.getRequest();
        const res = ctx.getResponse();
        const requestId = req.id;
        const problem = this.toProblem(exception, req.originalUrl, requestId);
        if (problem.status >= 500) {
            this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
        }
        res.status(problem.status).type('application/problem+json').json(problem);
    }
    toProblem(exception, instance, requestId) {
        if (exception instanceof AppException) {
            const status = exception.getStatus();
            const body = exception.getResponse();
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
            const message = typeof body === 'object' && body !== null && 'message' in body
                ? body.message
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
        if (typeof exception === 'object' &&
            exception !== null &&
            exception.code === 11000) {
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
};
ProblemDetailsFilter = ProblemDetailsFilter_1 = __decorate([
    Catch()
], ProblemDetailsFilter);
export { ProblemDetailsFilter };
//# sourceMappingURL=problem-details.filter.js.map