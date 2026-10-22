import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Principal, type ScopeKind } from './auth.decorator.js';
export declare class ScopeGuard implements CanActivate {
    private readonly reflector;
    constructor(reflector: Reflector);
    canActivate(context: ExecutionContext): boolean;
}
export declare function scopeContains(principal: Principal, kind: ScopeKind, id: string): boolean;
