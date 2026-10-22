import { HydratedDocument, Types } from 'mongoose';
export declare class LoginAttempt {
    identifierHash: string;
    ip: string;
    userId?: Types.ObjectId;
    success: boolean;
    reason: string;
    at: Date;
}
export type LoginAttemptDocument = HydratedDocument<LoginAttempt>;
export declare const LoginAttemptSchema: import("mongoose").Schema<LoginAttempt, import("mongoose").Model<LoginAttempt, any, any, any, any, any, LoginAttempt & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LoginAttempt, import("mongoose").Document<unknown, {}, LoginAttempt, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<LoginAttempt & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    identifierHash?: import("mongoose").SchemaDefinitionProperty<string, LoginAttempt, import("mongoose").Document<unknown, {}, LoginAttempt, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LoginAttempt & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    ip?: import("mongoose").SchemaDefinitionProperty<string, LoginAttempt, import("mongoose").Document<unknown, {}, LoginAttempt, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LoginAttempt & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    userId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId | undefined, LoginAttempt, import("mongoose").Document<unknown, {}, LoginAttempt, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LoginAttempt & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    success?: import("mongoose").SchemaDefinitionProperty<boolean, LoginAttempt, import("mongoose").Document<unknown, {}, LoginAttempt, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LoginAttempt & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    reason?: import("mongoose").SchemaDefinitionProperty<string, LoginAttempt, import("mongoose").Document<unknown, {}, LoginAttempt, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LoginAttempt & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    at?: import("mongoose").SchemaDefinitionProperty<Date, LoginAttempt, import("mongoose").Document<unknown, {}, LoginAttempt, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LoginAttempt & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, LoginAttempt>;
