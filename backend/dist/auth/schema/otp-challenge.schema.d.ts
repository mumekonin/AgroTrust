import { HydratedDocument, Types } from 'mongoose';
export declare const OtpPurpose: {
    readonly LOGIN_NEW_DEVICE: "login_new_device";
    readonly ACTIVATION: "activation";
    readonly PIN_RESET: "pin_reset";
    readonly PASSWORD_RESET: "password_reset";
    readonly PHONE_CHANGE: "phone_change";
    readonly ASSISTED_REQUEST: "assisted_request";
    readonly STEP_UP: "step_up";
    readonly SMS_FALLBACK: "sms_fallback";
    readonly LOGIN_MFA: "login_mfa";
    readonly INVITATION: "invitation";
    readonly MFA_ENROLL: "mfa_enroll";
};
export type OtpPurpose = (typeof OtpPurpose)[keyof typeof OtpPurpose];
export declare class OtpChallenge {
    userId?: Types.ObjectId;
    phone?: string;
    purpose: OtpPurpose;
    codeHash: string;
    payloadHash?: string;
    attempts: number;
    maxAttempts: number;
    resendCount: number;
    expiresAt: Date;
    consumedAt?: Date;
    createdAt?: Date;
}
export type OtpChallengeDocument = HydratedDocument<OtpChallenge>;
export declare const OtpChallengeSchema: import("mongoose").Schema<OtpChallenge, import("mongoose").Model<OtpChallenge, any, any, any, any, any, OtpChallenge & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, OtpChallenge, import("mongoose").Document<unknown, {}, OtpChallenge, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<OtpChallenge & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    userId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId | undefined, OtpChallenge, import("mongoose").Document<unknown, {}, OtpChallenge, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OtpChallenge & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    phone?: import("mongoose").SchemaDefinitionProperty<string | undefined, OtpChallenge, import("mongoose").Document<unknown, {}, OtpChallenge, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OtpChallenge & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    purpose?: import("mongoose").SchemaDefinitionProperty<OtpPurpose, OtpChallenge, import("mongoose").Document<unknown, {}, OtpChallenge, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OtpChallenge & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    codeHash?: import("mongoose").SchemaDefinitionProperty<string, OtpChallenge, import("mongoose").Document<unknown, {}, OtpChallenge, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OtpChallenge & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    payloadHash?: import("mongoose").SchemaDefinitionProperty<string | undefined, OtpChallenge, import("mongoose").Document<unknown, {}, OtpChallenge, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OtpChallenge & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    attempts?: import("mongoose").SchemaDefinitionProperty<number, OtpChallenge, import("mongoose").Document<unknown, {}, OtpChallenge, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OtpChallenge & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    maxAttempts?: import("mongoose").SchemaDefinitionProperty<number, OtpChallenge, import("mongoose").Document<unknown, {}, OtpChallenge, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OtpChallenge & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    resendCount?: import("mongoose").SchemaDefinitionProperty<number, OtpChallenge, import("mongoose").Document<unknown, {}, OtpChallenge, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OtpChallenge & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    expiresAt?: import("mongoose").SchemaDefinitionProperty<Date, OtpChallenge, import("mongoose").Document<unknown, {}, OtpChallenge, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OtpChallenge & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    consumedAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, OtpChallenge, import("mongoose").Document<unknown, {}, OtpChallenge, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OtpChallenge & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, OtpChallenge, import("mongoose").Document<unknown, {}, OtpChallenge, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OtpChallenge & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, OtpChallenge>;
