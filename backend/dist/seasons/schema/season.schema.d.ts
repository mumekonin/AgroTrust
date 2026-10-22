import { HydratedDocument } from 'mongoose';
export declare const SeasonStatus: {
    readonly DRAFT: "draft";
    readonly OPEN: "open";
    readonly CLOSED: "closed";
};
export type SeasonStatus = (typeof SeasonStatus)[keyof typeof SeasonStatus];
export declare const SEASON_STATUSES: SeasonStatus[];
export declare const PriorityPolicy: {
    readonly FCFS: "FCFS";
    readonly SMALLEST_LAND_FIRST: "SMALLEST_LAND_FIRST";
};
export type PriorityPolicy = (typeof PriorityPolicy)[keyof typeof PriorityPolicy];
export declare const PRIORITY_POLICIES: PriorityPolicy[];
export interface SeasonWindow {
    startsAt: Date;
    endsAt: Date;
    requestsOpenAt: Date;
    requestsCloseAt: Date;
    requisitionCutoffAt: Date;
}
export declare function seasonWindowError(window: SeasonWindow): string | null;
export declare class Season {
    code: string;
    name: string;
    startsAt: Date;
    endsAt: Date;
    requestsOpenAt: Date;
    requestsCloseAt: Date;
    requisitionCutoffAt: Date;
    paymentWindowDays: number;
    pickupWindowDays: number;
    priorityPolicy: PriorityPolicy;
    status: SeasonStatus;
}
export type SeasonDocument = HydratedDocument<Season>;
export declare const SeasonSchema: import("mongoose").Schema<Season, import("mongoose").Model<Season, any, any, any, any, any, Season & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Season, import("mongoose").Document<unknown, {}, Season, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Season & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    code?: import("mongoose").SchemaDefinitionProperty<string, Season, import("mongoose").Document<unknown, {}, Season, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Season & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    name?: import("mongoose").SchemaDefinitionProperty<string, Season, import("mongoose").Document<unknown, {}, Season, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Season & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    startsAt?: import("mongoose").SchemaDefinitionProperty<Date, Season, import("mongoose").Document<unknown, {}, Season, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Season & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    endsAt?: import("mongoose").SchemaDefinitionProperty<Date, Season, import("mongoose").Document<unknown, {}, Season, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Season & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    requestsOpenAt?: import("mongoose").SchemaDefinitionProperty<Date, Season, import("mongoose").Document<unknown, {}, Season, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Season & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    requestsCloseAt?: import("mongoose").SchemaDefinitionProperty<Date, Season, import("mongoose").Document<unknown, {}, Season, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Season & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    requisitionCutoffAt?: import("mongoose").SchemaDefinitionProperty<Date, Season, import("mongoose").Document<unknown, {}, Season, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Season & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    paymentWindowDays?: import("mongoose").SchemaDefinitionProperty<number, Season, import("mongoose").Document<unknown, {}, Season, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Season & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    pickupWindowDays?: import("mongoose").SchemaDefinitionProperty<number, Season, import("mongoose").Document<unknown, {}, Season, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Season & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    priorityPolicy?: import("mongoose").SchemaDefinitionProperty<PriorityPolicy, Season, import("mongoose").Document<unknown, {}, Season, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Season & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<SeasonStatus, Season, import("mongoose").Document<unknown, {}, Season, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Season & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, Season>;
