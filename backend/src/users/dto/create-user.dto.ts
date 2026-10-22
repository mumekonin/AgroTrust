import type { Types } from 'mongoose';
import type { Role } from '../../common/enums/role.enum.js';
import type { PreferredLanguage, UserStatus } from '../schema/user.schema.js';

export interface CreateUserInput {
  fullName: string;
  roles: Role[];
  phone?: string;
  email?: string;
  status?: UserStatus;
  preferredLanguage?: PreferredLanguage;
  scope?: {
    regionIds?: Types.ObjectId[];
    woredaIds?: Types.ObjectId[];
    localCenterIds?: Types.ObjectId[];
    distributorId?: Types.ObjectId;
  };
  phoneVerified?: boolean;
  emailVerified?: boolean;
}