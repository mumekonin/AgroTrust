import { HydratedDocument, Types } from 'mongoose';
export declare class TrustedDevice {
    userId: Types.ObjectId;
    deviceIdHash: string;
    label?: string;
    firstSeenAt: Date;
    lastSeenAt: Date;
    trustedUntil: Date;
    revokedAt?: Date;
}
export type TrustedDeviceDocument = HydratedDocument<TrustedDevice>;
export declare const TrustedDeviceSchema: import("mongoose").Schema<TrustedDevice, import("mongoose").Model<TrustedDevice, any, any, any, any, any, TrustedDevice & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, TrustedDevice, import("mongoose").Document<unknown, {}, TrustedDevice, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<TrustedDevice & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    userId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, TrustedDevice, import("mongoose").Document<unknown, {}, TrustedDevice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<TrustedDevice & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    deviceIdHash?: import("mongoose").SchemaDefinitionProperty<string, TrustedDevice, import("mongoose").Document<unknown, {}, TrustedDevice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<TrustedDevice & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    label?: import("mongoose").SchemaDefinitionProperty<string | undefined, TrustedDevice, import("mongoose").Document<unknown, {}, TrustedDevice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<TrustedDevice & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    firstSeenAt?: import("mongoose").SchemaDefinitionProperty<Date, TrustedDevice, import("mongoose").Document<unknown, {}, TrustedDevice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<TrustedDevice & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    lastSeenAt?: import("mongoose").SchemaDefinitionProperty<Date, TrustedDevice, import("mongoose").Document<unknown, {}, TrustedDevice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<TrustedDevice & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    trustedUntil?: import("mongoose").SchemaDefinitionProperty<Date, TrustedDevice, import("mongoose").Document<unknown, {}, TrustedDevice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<TrustedDevice & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    revokedAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, TrustedDevice, import("mongoose").Document<unknown, {}, TrustedDevice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<TrustedDevice & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, TrustedDevice>;
