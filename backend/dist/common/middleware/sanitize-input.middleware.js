var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable } from '@nestjs/common';
let SanitizeInputMiddleware = class SanitizeInputMiddleware {
    use(req, _res, next) {
        if (req.body) {
            req.body = this.sanitize(req.body);
        }
        if (req.query) {
            req.query = this.sanitize(req.query);
        }
        if (req.params) {
            req.params = this.sanitize(req.params);
        }
        next();
    }
    sanitize(obj) {
        if (typeof obj === 'string') {
            return obj.trim().replace(/<[^>]*>/g, '');
        }
        if (Array.isArray(obj)) {
            return obj.map((item) => this.sanitize(item));
        }
        if (obj !== null && typeof obj === 'object') {
            return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, this.sanitize(value)]));
        }
        return obj;
    }
};
SanitizeInputMiddleware = __decorate([
    Injectable()
], SanitizeInputMiddleware);
export { SanitizeInputMiddleware };
//# sourceMappingURL=sanitize-input.middleware.js.map