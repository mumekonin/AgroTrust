import { HydratedDocument } from 'mongoose';
export declare const InputCategory: {
    readonly FERTILIZER: "fertilizer";
    readonly SEED: "seed";
    readonly AGROCHEMICAL: "agrochemical";
};
export type InputCategory = (typeof InputCategory)[keyof typeof InputCategory];
export declare const INPUT_CATEGORIES: InputCategory[];
export declare const BASE_UNIT = "kg";
export declare class InputName {
    en: string;
    am: string;
    om: string;
}
export declare const InputNameSchema: import("mongoose").Schema<InputName, import("mongoose").Model<InputName, any, any, any, any, any, InputName & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, InputName, import("mongoose").Document<unknown, {}, InputName, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<InputName & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    en?: import("mongoose").SchemaDefinitionProperty<string, InputName, import("mongoose").Document<unknown, {}, InputName, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InputName & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    am?: import("mongoose").SchemaDefinitionProperty<string, InputName, import("mongoose").Document<unknown, {}, InputName, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InputName & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    om?: import("mongoose").SchemaDefinitionProperty<string, InputName, import("mongoose").Document<unknown, {}, InputName, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InputName & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, InputName>;
export declare class Input {
    code: string;
    name: InputName;
    category: InputCategory;
    baseUnit: typeof BASE_UNIT;
    packSizeKg: number;
    active: boolean;
}
export type InputDocument = HydratedDocument<Input>;
export declare const InputSchema: import("mongoose").Schema<Input, import("mongoose").Model<Input, any, any, any, any, any, Input & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Input, import("mongoose").Document<unknown, {}, Input, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Input & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    code?: import("mongoose").SchemaDefinitionProperty<string, Input, import("mongoose").Document<unknown, {}, Input, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Input & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    name?: import("mongoose").SchemaDefinitionProperty<InputName, Input, import("mongoose").Document<unknown, {}, Input, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Input & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    category?: import("mongoose").SchemaDefinitionProperty<InputCategory, Input, import("mongoose").Document<unknown, {}, Input, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Input & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    baseUnit?: import("mongoose").SchemaDefinitionProperty<"kg", Input, import("mongoose").Document<unknown, {}, Input, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Input & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    packSizeKg?: import("mongoose").SchemaDefinitionProperty<number, Input, import("mongoose").Document<unknown, {}, Input, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Input & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    active?: import("mongoose").SchemaDefinitionProperty<boolean, Input, import("mongoose").Document<unknown, {}, Input, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Input & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, Input>;
