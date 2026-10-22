import { HydratedDocument, Types } from 'mongoose';
export declare const CredentialType: {
    readonly PASSWORD: "password";
    readonly PIN: "pin";
    readonly TOTP: "totp";
    readonly RECOVERY_CODES: "recovery_codes";
};
export type CredentialType = (typeof CredentialType)[keyof typeof CredentialType];
export declare class UserCredential {
    userId: Types.ObjectId;
    type: CredentialType;
    hash?: string;
    algo?: string;
    params?: Record<string, number>;
    mustChange: boolean;
    history: string[];
    changedAt?: Date;
    secretEnc?: string;
    confirmedAt?: Date;
    codeHashes: string[];
    usedCount: number;
}
export type UserCredentialDocument = HydratedDocument<UserCredential>;
export declare const UserCredentialSchema: import("mongoose").Schema<UserCredential, import("mongoose").Model<UserCredential, any, any, any, any, any, UserCredential & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, UserCredential, import("mongoose").Document<unknown, {}, UserCredential, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<UserCredential & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    userId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, UserCredential, import("mongoose").Document<unknown, {}, UserCredential, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserCredential & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    type?: import("mongoose").SchemaDefinitionProperty<CredentialType, UserCredential, import("mongoose").Document<unknown, {}, UserCredential, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserCredential & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    hash?: import("mongoose").SchemaDefinitionProperty<string | undefined, UserCredential, import("mongoose").Document<unknown, {}, UserCredential, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserCredential & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    algo?: import("mongoose").SchemaDefinitionProperty<string | undefined, UserCredential, import("mongoose").Document<unknown, {}, UserCredential, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserCredential & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    params?: import("mongoose").SchemaDefinitionProperty<Record<string, number> | undefined, UserCredential, import("mongoose").Document<unknown, {}, UserCredential, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserCredential & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    mustChange?: import("mongoose").SchemaDefinitionProperty<boolean, UserCredential, import("mongoose").Document<unknown, {}, UserCredential, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserCredential & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    history?: import("mongoose").SchemaDefinitionProperty<string[], UserCredential, import("mongoose").Document<unknown, {}, UserCredential, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserCredential & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    changedAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, UserCredential, import("mongoose").Document<unknown, {}, UserCredential, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserCredential & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    secretEnc?: import("mongoose").SchemaDefinitionProperty<string | undefined, UserCredential, import("mongoose").Document<unknown, {}, UserCredential, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserCredential & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    confirmedAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, UserCredential, import("mongoose").Document<unknown, {}, UserCredential, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserCredential & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    codeHashes?: import("mongoose").SchemaDefinitionProperty<string[], UserCredential, import("mongoose").Document<unknown, {}, UserCredential, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserCredential & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    usedCount?: import("mongoose").SchemaDefinitionProperty<number, UserCredential, import("mongoose").Document<unknown, {}, UserCredential, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserCredential & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, UserCredential>;
