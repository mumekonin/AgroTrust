import { HydratedDocument, Types } from 'mongoose';
import { Role } from '../../common/enums/role.enum.js';
export declare const UserStatus: {
    readonly INVITED: "invited";
    readonly PENDING_ACTIVATION: "pending_activation";
    readonly ACTIVE: "active";
    readonly LOCKED: "locked";
    readonly SUSPENDED: "suspended";
    readonly DEACTIVATED: "deactivated";
};
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];
export declare const PreferredLanguage: {
    readonly EN: "en";
    readonly AM: "am";
    readonly OM: "om";
};
export type PreferredLanguage = (typeof PreferredLanguage)[keyof typeof PreferredLanguage];
export declare class UserScope {
    regionIds: Types.ObjectId[];
    woredaIds: Types.ObjectId[];
    localCenterIds: Types.ObjectId[];
    distributorId?: Types.ObjectId;
}
export declare const UserScopeSchema: import("mongoose").Schema<UserScope, import("mongoose").Model<UserScope, any, any, any, any, any, UserScope & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, UserScope, import("mongoose").Document<unknown, {}, UserScope, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<UserScope & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    regionIds?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId[], UserScope, import("mongoose").Document<unknown, {}, UserScope, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserScope & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    woredaIds?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId[], UserScope, import("mongoose").Document<unknown, {}, UserScope, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserScope & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    localCenterIds?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId[], UserScope, import("mongoose").Document<unknown, {}, UserScope, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserScope & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    distributorId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId | undefined, UserScope, import("mongoose").Document<unknown, {}, UserScope, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserScope & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, UserScope>;
export declare class UserMfa {
    totpEnabled: boolean;
    smsFallbackAllowed: boolean;
}
export declare const UserMfaSchema: import("mongoose").Schema<UserMfa, import("mongoose").Model<UserMfa, any, any, any, any, any, UserMfa & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, UserMfa, import("mongoose").Document<unknown, {}, UserMfa, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<UserMfa & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    totpEnabled?: import("mongoose").SchemaDefinitionProperty<boolean, UserMfa, import("mongoose").Document<unknown, {}, UserMfa, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserMfa & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    smsFallbackAllowed?: import("mongoose").SchemaDefinitionProperty<boolean, UserMfa, import("mongoose").Document<unknown, {}, UserMfa, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserMfa & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, UserMfa>;
export declare class User {
    phone?: string;
    email?: string;
    fullName: string;
    roles: Role[];
    scope: UserScope;
    roleVersion: number;
    status: UserStatus;
    preferredLanguage: PreferredLanguage;
    phoneVerifiedAt?: Date;
    emailVerifiedAt?: Date;
    lastLoginAt?: Date;
    lastAuthAt?: Date;
    mfa: UserMfa;
}
export type UserDocument = HydratedDocument<User>;
export declare const UserSchema: import("mongoose").Schema<User, import("mongoose").Model<User, any, any, any, any, any, User & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, User, import("mongoose").Document<unknown, {}, User, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<User & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    phone?: import("mongoose").SchemaDefinitionProperty<string | undefined, User, import("mongoose").Document<unknown, {}, User, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<User & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    email?: import("mongoose").SchemaDefinitionProperty<string | undefined, User, import("mongoose").Document<unknown, {}, User, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<User & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    fullName?: import("mongoose").SchemaDefinitionProperty<string, User, import("mongoose").Document<unknown, {}, User, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<User & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    roles?: import("mongoose").SchemaDefinitionProperty<Role[], User, import("mongoose").Document<unknown, {}, User, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<User & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    scope?: import("mongoose").SchemaDefinitionProperty<UserScope, User, import("mongoose").Document<unknown, {}, User, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<User & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    roleVersion?: import("mongoose").SchemaDefinitionProperty<number, User, import("mongoose").Document<unknown, {}, User, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<User & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<UserStatus, User, import("mongoose").Document<unknown, {}, User, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<User & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    preferredLanguage?: import("mongoose").SchemaDefinitionProperty<PreferredLanguage, User, import("mongoose").Document<unknown, {}, User, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<User & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    phoneVerifiedAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, User, import("mongoose").Document<unknown, {}, User, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<User & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    emailVerifiedAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, User, import("mongoose").Document<unknown, {}, User, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<User & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    lastLoginAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, User, import("mongoose").Document<unknown, {}, User, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<User & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    lastAuthAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, User, import("mongoose").Document<unknown, {}, User, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<User & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    mfa?: import("mongoose").SchemaDefinitionProperty<UserMfa, User, import("mongoose").Document<unknown, {}, User, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<User & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, User>;
