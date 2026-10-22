var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
export const InputCategory = {
    FERTILIZER: 'fertilizer',
    SEED: 'seed',
    AGROCHEMICAL: 'agrochemical',
};
export const INPUT_CATEGORIES = Object.values(InputCategory);
export const BASE_UNIT = 'kg';
let InputName = class InputName {
    en;
    am;
    om;
};
__decorate([
    Prop({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], InputName.prototype, "en", void 0);
__decorate([
    Prop({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], InputName.prototype, "am", void 0);
__decorate([
    Prop({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], InputName.prototype, "om", void 0);
InputName = __decorate([
    Schema({ _id: false })
], InputName);
export { InputName };
export const InputNameSchema = SchemaFactory.createForClass(InputName);
let Input = class Input {
    code;
    name;
    category;
    baseUnit;
    packSizeKg;
    active;
};
__decorate([
    Prop({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], Input.prototype, "code", void 0);
__decorate([
    Prop({ type: InputNameSchema, required: true }),
    __metadata("design:type", InputName)
], Input.prototype, "name", void 0);
__decorate([
    Prop({ type: String, enum: INPUT_CATEGORIES, required: true }),
    __metadata("design:type", String)
], Input.prototype, "category", void 0);
__decorate([
    Prop({ type: String, required: true, default: BASE_UNIT }),
    __metadata("design:type", Object)
], Input.prototype, "baseUnit", void 0);
__decorate([
    Prop({ type: Number, required: true, min: 1 }),
    __metadata("design:type", Number)
], Input.prototype, "packSizeKg", void 0);
__decorate([
    Prop({ type: Boolean, default: true }),
    __metadata("design:type", Boolean)
], Input.prototype, "active", void 0);
Input = __decorate([
    Schema({ collection: 'inputs', timestamps: true })
], Input);
export { Input };
export const InputSchema = SchemaFactory.createForClass(Input);
InputSchema.index({ code: 1 }, { unique: true });
//# sourceMappingURL=input.schema.js.map