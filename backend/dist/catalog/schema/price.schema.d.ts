import { HydratedDocument, Types } from 'mongoose';
export declare class Price {
    inputId: Types.ObjectId;
    seasonId: Types.ObjectId;
    regionId?: Types.ObjectId;
    unitPriceSantimPerKg: number;
    subsidySantimPerKg: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
    setBy: Types.ObjectId;
    approvedBy?: Types.ObjectId;
    reason: string;
}
export type PriceDocument = HydratedDocument<Price>;
export declare const PriceSchema: import("mongoose").Schema<Price, import("mongoose").Model<Price, any, any, any, any, any, Price & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Price, import("mongoose").Document<unknown, {}, Price, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Price & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    inputId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Price, import("mongoose").Document<unknown, {}, Price, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Price & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    seasonId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Price, import("mongoose").Document<unknown, {}, Price, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Price & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    regionId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId | undefined, Price, import("mongoose").Document<unknown, {}, Price, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Price & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    unitPriceSantimPerKg?: import("mongoose").SchemaDefinitionProperty<number, Price, import("mongoose").Document<unknown, {}, Price, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Price & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    subsidySantimPerKg?: import("mongoose").SchemaDefinitionProperty<number, Price, import("mongoose").Document<unknown, {}, Price, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Price & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    effectiveFrom?: import("mongoose").SchemaDefinitionProperty<Date, Price, import("mongoose").Document<unknown, {}, Price, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Price & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    effectiveTo?: import("mongoose").SchemaDefinitionProperty<Date | undefined, Price, import("mongoose").Document<unknown, {}, Price, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Price & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    setBy?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Price, import("mongoose").Document<unknown, {}, Price, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Price & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    approvedBy?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId | undefined, Price, import("mongoose").Document<unknown, {}, Price, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Price & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    reason?: import("mongoose").SchemaDefinitionProperty<string, Price, import("mongoose").Document<unknown, {}, Price, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Price & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, Price>;
