import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const InputCategory = {
  FERTILIZER: 'fertilizer',
  SEED: 'seed',
  AGROCHEMICAL: 'agrochemical',
} as const;

export type InputCategory = (typeof InputCategory)[keyof typeof InputCategory];

export const INPUT_CATEGORIES: InputCategory[] = Object.values(InputCategory);

export const BASE_UNIT = 'kg';

@Schema({ _id: false })
export class InputName {
  @Prop({ type: String, required: true, trim: true })
  en: string;

  @Prop({ type: String, required: true, trim: true })
  am: string;

  @Prop({ type: String, required: true, trim: true })
  om: string;
}
export const InputNameSchema = SchemaFactory.createForClass(InputName);

@Schema({ collection: 'inputs', timestamps: true })
export class Input {
  @Prop({ type: String, required: true, trim: true })
  code: string;

  @Prop({ type: InputNameSchema, required: true })
  name: InputName;

  @Prop({ type: String, enum: INPUT_CATEGORIES, required: true })
  category: InputCategory;

  @Prop({ type: String, required: true, default: BASE_UNIT })
  baseUnit: typeof BASE_UNIT;

  @Prop({ type: Number, required: true, min: 1 })
  packSizeKg: number;

  @Prop({ type: Boolean, default: true })
  active: boolean;
}

export type InputDocument = HydratedDocument<Input>;
export const InputSchema = SchemaFactory.createForClass(Input);

InputSchema.index({ code: 1 }, { unique: true });
