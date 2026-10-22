import type { ClientSession, Model } from 'mongoose';
import { Role } from '../../common/enums/role.enum.js';
import type { CreateUserInput } from '../dto/create-user.dto.js';
import { User, UserDocument, UserStatus } from '../schema/user.schema.js';
export interface AuthState {
    userId: string;
    status: UserStatus;
    roles: Role[];
    roleVersion: number;
    scope: UserDocument['scope'];
}
export declare class UsersService {
    private readonly userModel;
    constructor(userModel: Model<User>);
    create(input: CreateUserInput, session?: ClientSession): Promise<UserDocument>;
    findById(id: string): Promise<UserDocument | null>;
    getByIdOrFail(id: string): Promise<UserDocument>;
    findByPhone(phone: string): Promise<UserDocument | null>;
    findByEmail(email: string): Promise<UserDocument | null>;
    findByIdentifier(identifier: string): Promise<UserDocument | null>;
    getAuthState(userId: string): Promise<AuthState | null>;
    setStatus(userId: string, status: UserStatus, session?: ClientSession): Promise<UserDocument>;
    activate(userId: string, session?: ClientSession): Promise<UserDocument>;
    updateRolesAndScope(userId: string, changes: Pick<CreateUserInput, 'roles' | 'scope'>, session?: ClientSession): Promise<UserDocument>;
    bumpRoleVersion(userId: string, session?: ClientSession): Promise<number>;
    markLogin(userId: string): Promise<void>;
    setTotpEnabled(userId: string, enabled: boolean, session?: ClientSession): Promise<void>;
    private requirePhone;
}
