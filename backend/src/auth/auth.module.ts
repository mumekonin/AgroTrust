import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { ScopeGuard } from '../common/guards/scope.guard.js';
import { StepUpGuard } from '../common/guards/step-up.guard.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController, InvitationController } from './controller/auth.controller.js';
import { AuthSession, AuthSessionSchema } from './schema/auth-session.schema.js';
import { Invitation, InvitationSchema } from './schema/invitation.schema.js';
import { LoginAttempt, LoginAttemptSchema } from './schema/login-attempt.schema.js';
import { OtpChallenge, OtpChallengeSchema } from './schema/otp-challenge.schema.js';
import { RefreshToken, RefreshTokenSchema } from './schema/refresh-token.schema.js';
import { TrustedDevice, TrustedDeviceSchema } from './schema/trusted-device.schema.js';
import { UserCredential, UserCredentialSchema } from './schema/user-credential.schema.js';
import { AuthService } from './service/auth.service.js';
import { CredentialService } from './service/credential.service.js';
import { DeviceService } from './service/device.service.js';
import { InvitationService } from './service/invitation.service.js';
import { LockoutService } from './service/lockout.service.js';
import { OtpService } from './service/otp.service.js';
import { SessionService } from './service/session.service.js';
import { TokenService } from './service/token.service.js';
import { TotpService } from './service/totp.service.js';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: UserCredential.name, schema: UserCredentialSchema },
      { name: AuthSession.name, schema: AuthSessionSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
      { name: LoginAttempt.name, schema: LoginAttemptSchema },
      { name: OtpChallenge.name, schema: OtpChallengeSchema },
      { name: TrustedDevice.name, schema: TrustedDeviceSchema },
      { name: Invitation.name, schema: InvitationSchema },
    ]),
  ],
  controllers: [AuthController, InvitationController],
  providers: [
    CredentialService,
    TokenService,
    SessionService,
    LockoutService,
    DeviceService,
    OtpService,
    TotpService,
    InvitationService,
    AuthService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ScopeGuard },
    { provide: APP_GUARD, useClass: StepUpGuard },
  ],
  exports: [CredentialService, TokenService, SessionService],
})
export class AuthModule {}
