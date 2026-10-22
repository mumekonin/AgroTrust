import { HydratedDocument, Types } from 'mongoose';
export declare class AuthSession {
    sid: string;
    userId: Types.ObjectId;
    role: string;
    family: string;
    deviceId: string;
    deviceLabel?: string;
    userAgent?: string;
    ip?: string;
    lastSeenAt: Date;
    absoluteExpiresAt: Date;
    stepUpUntil?: Date;
    authMethod: string;
    revokedAt?: Date;
    revokedReason?: string;
}
export type AuthSessionDocument = HydratedDocument<AuthSession>;
export declare const AuthSessionSchema: import("mongoose").Schema<AuthSession, import("mongoose").Model<AuthSession, any, any, any, any, any, AuthSession & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, AuthSession, import("mongoose").Document<unknown, {}, AuthSession, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<AuthSession & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    sid?: import("mongoose").SchemaDefinitionProperty<string, AuthSession, import("mongoose").Document<unknown, {}, AuthSession, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AuthSession & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    userId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, AuthSession, import("mongoose").Document<unknown, {}, AuthSession, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AuthSession & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    role?: import("mongoose").SchemaDefinitionProperty<string, AuthSession, import("mongoose").Document<unknown, {}, AuthSession, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AuthSession & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    family?: import("mongoose").SchemaDefinitionProperty<string, AuthSession, import("mongoose").Document<unknown, {}, AuthSession, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AuthSession & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    deviceId?: import("mongoose").SchemaDefinitionProperty<string, AuthSession, import("mongoose").Document<unknown, {}, AuthSession, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AuthSession & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    deviceLabel?: import("mongoose").SchemaDefinitionProperty<string | undefined, AuthSession, import("mongoose").Document<unknown, {}, AuthSession, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AuthSession & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    userAgent?: import("mongoose").SchemaDefinitionProperty<string | undefined, AuthSession, import("mongoose").Document<unknown, {}, AuthSession, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AuthSession & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    ip?: import("mongoose").SchemaDefinitionProperty<string | undefined, AuthSession, import("mongoose").Document<unknown, {}, AuthSession, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AuthSession & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    lastSeenAt?: import("mongoose").SchemaDefinitionProperty<Date, AuthSession, import("mongoose").Document<unknown, {}, AuthSession, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AuthSession & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    absoluteExpiresAt?: import("mongoose").SchemaDefinitionProperty<Date, AuthSession, import("mongoose").Document<unknown, {}, AuthSession, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AuthSession & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    stepUpUntil?: import("mongoose").SchemaDefinitionProperty<Date | undefined, AuthSession, import("mongoose").Document<unknown, {}, AuthSession, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AuthSession & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    authMethod?: import("mongoose").SchemaDefinitionProperty<string, AuthSession, import("mongoose").Document<unknown, {}, AuthSession, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AuthSession & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    revokedAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, AuthSession, import("mongoose").Document<unknown, {}, AuthSession, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AuthSession & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    revokedReason?: import("mongoose").SchemaDefinitionProperty<string | undefined, AuthSession, import("mongoose").Document<unknown, {}, AuthSession, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AuthSession & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, AuthSession>;
