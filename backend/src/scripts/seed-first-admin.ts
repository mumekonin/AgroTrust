import mongoose from 'mongoose';
import * as argon2 from 'argon2';
import { Role } from '../common/enums/role.enum.js';
import { validateEnv } from '../config/env.schema.js';
import { ARGON2_OPTIONS, pepperSecret } from '../auth/service/credential.service.js';
import { CredentialType, UserCredentialSchema } from '../auth/schema/user-credential.schema.js';
import { PreferredLanguage, User, UserSchema, UserStatus } from '../users/schema/user.schema.js';
import { assertNoNationalAdmin, oneTimePassword, readSeedEmail, readSeedName } from './first-admin.js';

async function main(): Promise<void> {
  const email = readSeedEmail(process.argv);
  const fullName = readSeedName(process.argv);
  const env = validateEnv(process.env);
  await mongoose.connect(env.MONGODB_URI);
  const users = mongoose.model(User.name, UserSchema);
  const credentials = mongoose.model('UserCredential', UserCredentialSchema);
  try {
    const existing = await users.countDocuments({ roles: Role.NATIONAL_ADMIN }).exec();
    assertNoNationalAdmin(existing);
    const taken = await users.exists({ email }).exec();
    if (taken) throw new Error('That email is already used');

    const password = oneTimePassword();
    const hash = await argon2.hash(pepperSecret(password, env.AUTH_PEPPER), ARGON2_OPTIONS);
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const [user] = await users.create(
        [
          {
            email,
            fullName,
            roles: [Role.NATIONAL_ADMIN],
            status: UserStatus.ACTIVE,
            preferredLanguage: PreferredLanguage.EN,
            emailVerifiedAt: new Date(),
            scope: {},
            mfa: { totpEnabled: false, smsFallbackAllowed: false },
          },
        ],
        { session },
      );
      await credentials.create(
        [
          {
            userId: user._id,
            type: CredentialType.PASSWORD,
            hash,
            algo: 'argon2id',
            params: { memoryCost: 65536, timeCost: 3, parallelism: 1 },
            mustChange: true,
            changedAt: new Date(),
          },
        ],
        { session },
      );
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }

    process.stdout.write(`National admin created.\nEmail: ${email}\nOne-time password: ${password}\n`);
    process.stdout.write('Sign in on the staff page, choose a new password, and set up an authenticator.\n');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'The seed failed';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
