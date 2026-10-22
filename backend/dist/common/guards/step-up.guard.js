var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppException } from '../errors/app.exception.js';
import { ErrorCode } from '../errors/error-codes.js';
import { IS_PUBLIC, STEP_UP_KEY } from './auth.decorator.js';
let StepUpGuard = class StepUpGuard {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(IS_PUBLIC, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic)
            return true;
        const required = this.reflector.getAllAndOverride(STEP_UP_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!required)
            return true;
        const principal = context.switchToHttp().getRequest().principal;
        if (!principal?.stepUpUntil || principal.stepUpUntil.getTime() <= Date.now()) {
            throw new AppException(ErrorCode.STEP_UP_REQUIRED, 'Confirm your identity to continue', 403);
        }
        return true;
    }
};
StepUpGuard = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [Reflector])
], StepUpGuard);
export { StepUpGuard };
//# sourceMappingURL=step-up.guard.js.map