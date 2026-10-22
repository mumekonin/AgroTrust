import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SessionService } from '../../auth/service/session.service.js';
import { TokenService } from '../../auth/service/token.service.js';
import { UsersService } from '../../users/service/users.service.js';
export declare class JwtAuthGuard implements CanActivate {
    private readonly reflector;
    private readonly tokens;
    private readonly sessions;
    private readonly users;
    private readonly cache;
    constructor(reflector: Reflector, tokens: TokenService, sessions: SessionService, users: UsersService);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private userState;
}
