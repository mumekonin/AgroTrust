import { HydratedDocument, Types } from 'mongoose';
import { Role } from '../../common/enums/role.enum.js';
import { UserScope } from '../../users/schema/user.schema.js';
export declare const InvitationStatus: {
    readonly PENDING: "pending";
    readonly APPROVED: "approved";
    readonly USED: "used";
    readonly EXPIRED: "expired";
    readonly REVOKED: "revoked";
};
export type InvitationStatus = (typeof InvitationStatus)[keyof typeof InvitationStatus];
export declare class Invitation {
    tokenHash?: string;
    role: Role;
    scope: UserScope;
    email?: string;
    phone?: string;
    createdBy: Types.ObjectId;
    approvedBy?: Types.ObjectId;
    expiresAt: Date;
    usedAt?: Date;
    boundUserId?: Types.ObjectId;
    status: InvitationStatus;
}
export type InvitationDocument = HydratedDocument<Invitation>;
export declare const InvitationSchema: import("mongoose").Schema<Invitation, import("mongoose").Model<Invitation, any, any, any, any, any, Invitation & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Invitation, import("mongoose").Document<unknown, {}, Invitation, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Invitation & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    tokenHash?: import("mongoose").SchemaDefinitionProperty<string | undefined, Invitation, import("mongoose").Document<unknown, {}, Invitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invitation & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    role?: import("mongoose").SchemaDefinitionProperty<Role, Invitation, import("mongoose").Document<unknown, {}, Invitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invitation & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    scope?: import("mongoose").SchemaDefinitionProperty<UserScope, Invitation, import("mongoose").Document<unknown, {}, Invitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invitation & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    email?: import("mongoose").SchemaDefinitionProperty<string | undefined, Invitation, import("mongoose").Document<unknown, {}, Invitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invitation & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    phone?: import("mongoose").SchemaDefinitionProperty<string | undefined, Invitation, import("mongoose").Document<unknown, {}, Invitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invitation & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdBy?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Invitation, import("mongoose").Document<unknown, {}, Invitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invitation & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    approvedBy?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId | undefined, Invitation, import("mongoose").Document<unknown, {}, Invitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invitation & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    expiresAt?: import("mongoose").SchemaDefinitionProperty<Date, Invitation, import("mongoose").Document<unknown, {}, Invitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invitation & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    usedAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, Invitation, import("mongoose").Document<unknown, {}, Invitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invitation & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    boundUserId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId | undefined, Invitation, import("mongoose").Document<unknown, {}, Invitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invitation & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<InvitationStatus, Invitation, import("mongoose").Document<unknown, {}, Invitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invitation & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, Invitation>;
