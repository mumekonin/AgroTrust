import { HydratedDocument, Types } from 'mongoose';
export declare const GeoType: {
    readonly REGION: "region";
    readonly ZONE: "zone";
    readonly WOREDA: "woreda";
    readonly KEBELE: "kebele";
};
export type GeoType = (typeof GeoType)[keyof typeof GeoType];
export declare const GEO_TYPES: GeoType[];
export declare function expectedParentType(type: GeoType): GeoType | null;
export declare class GeoName {
    en: string;
    am: string;
    om: string;
}
export declare const GeoNameSchema: import("mongoose").Schema<GeoName, import("mongoose").Model<GeoName, any, any, any, any, any, GeoName & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, GeoName, import("mongoose").Document<unknown, {}, GeoName, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<GeoName & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    en?: import("mongoose").SchemaDefinitionProperty<string, GeoName, import("mongoose").Document<unknown, {}, GeoName, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<GeoName & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    am?: import("mongoose").SchemaDefinitionProperty<string, GeoName, import("mongoose").Document<unknown, {}, GeoName, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<GeoName & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    om?: import("mongoose").SchemaDefinitionProperty<string, GeoName, import("mongoose").Document<unknown, {}, GeoName, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<GeoName & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, GeoName>;
export declare class GeoUnit {
    type: GeoType;
    code: string;
    name: GeoName;
    parentId?: Types.ObjectId;
    path: Types.ObjectId[];
}
export type GeoUnitDocument = HydratedDocument<GeoUnit>;
export declare const GeoUnitSchema: import("mongoose").Schema<GeoUnit, import("mongoose").Model<GeoUnit, any, any, any, any, any, GeoUnit & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, GeoUnit, import("mongoose").Document<unknown, {}, GeoUnit, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<GeoUnit & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    type?: import("mongoose").SchemaDefinitionProperty<GeoType, GeoUnit, import("mongoose").Document<unknown, {}, GeoUnit, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<GeoUnit & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    code?: import("mongoose").SchemaDefinitionProperty<string, GeoUnit, import("mongoose").Document<unknown, {}, GeoUnit, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<GeoUnit & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    name?: import("mongoose").SchemaDefinitionProperty<GeoName, GeoUnit, import("mongoose").Document<unknown, {}, GeoUnit, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<GeoUnit & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    parentId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId | undefined, GeoUnit, import("mongoose").Document<unknown, {}, GeoUnit, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<GeoUnit & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    path?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId[], GeoUnit, import("mongoose").Document<unknown, {}, GeoUnit, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<GeoUnit & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, GeoUnit>;
