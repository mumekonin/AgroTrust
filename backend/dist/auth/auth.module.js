var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './controller/auth.controller.js';
import { AuthSession, AuthSessionSchema, } from './schema/auth-session.schema.js';
import { LoginAttempt, LoginAttemptSchema, } from './schema/login-attempt.schema.js';
import { RefreshToken, RefreshTokenSchema, } from './schema/refresh-token.schema.js';
import { UserCredential, UserCredentialSchema, } from './schema/user-credential.schema.js';
import { AuthService } from './service/auth.service.js';
import { CredentialService } from './service/credential.service.js';
import { LockoutService } from './service/lockout.service.js';
import { SessionService } from './service/session.service.js';
import { TokenService } from './service/token.service.js';
let AuthModule = class AuthModule {
};
AuthModule = __decorate([
    Module({
        imports: [
            UsersModule,
            MongooseModule.forFeature([
                { name: UserCredential.name, schema: UserCredentialSchema },
                { name: AuthSession.name, schema: AuthSessionSchema },
                { name: RefreshToken.name, schema: RefreshTokenSchema },
                { name: LoginAttempt.name, schema: LoginAttemptSchema },
            ]),
        ],
        controllers: [AuthController],
        providers: [
            CredentialService,
            TokenService,
            SessionService,
            LockoutService,
            AuthService,
        ],
        exports: [CredentialService, TokenService, SessionService],
    })
], AuthModule);
export { AuthModule };
//# sourceMappingURL=auth.module.js.map