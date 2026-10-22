import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module.js';
import { AuthSession, AuthSessionSchema } from './schema/auth-session.schema.js';
import { RefreshToken, RefreshTokenSchema } from './schema/refresh-token.schema.js';
import { UserCredential, UserCredentialSchema } from './schema/user-credential.schema.js';
import { CredentialService } from './service/credential.service.js';
import { SessionService } from './service/session.service.js';
import { TokenService } from './service/token.service.js';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: UserCredential.name, schema: UserCredentialSchema },
      { name: AuthSession.name, schema: AuthSessionSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
  ],
  providers: [CredentialService, TokenService, SessionService],
  exports: [CredentialService, TokenService, SessionService],
})
export class AuthModule {}