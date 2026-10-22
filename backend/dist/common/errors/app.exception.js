import { HttpException } from '@nestjs/common';
export class AppException extends HttpException {
    code;
    extra;
    constructor(code, message, status = 400, extra) {
        super({ code, message }, status);
        this.code = code;
        this.extra = extra;
    }
}
//# sourceMappingURL=app.exception.js.map