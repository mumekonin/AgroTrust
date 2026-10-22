import { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
export declare class ProblemDetailsFilter implements ExceptionFilter {
    private readonly logger;
    catch(exception: unknown, host: ArgumentsHost): void;
    private toProblem;
}
