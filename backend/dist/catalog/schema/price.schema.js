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
import { Types } from 'mongoose';
let Price = class Price {
    inputId;
    seasonId;
    regionId;
    unitPriceSantimPerKg;
    subsidySantimPerKg;
    effectiveFrom;
    effectiveTo;
    setBy;
    approvedBy;
    reason;
};
__decorate([
    Prop({ type: Types.ObjectId, required: true }),
    __metadata("design:type", Types.ObjectId)
], Price.prototype, "inputId", void 0);
__decorate([
    Prop({ type: Types.ObjectId, required: true }),
    __metadata("design:type", Types.ObjectId)
], Price.prototype, "seasonId", void 0);
__decorate([
    Prop({ type: Types.ObjectId }),
    __metadata("design:type", Types.ObjectId)
], Price.prototype, "regionId", void 0);
__decorate([
    Prop({ type: Number, required: true, min: 0 }),
    __metadata("design:type", Number)
], Price.prototype, "unitPriceSantimPerKg", void 0);
__decorate([
    Prop({ type: Number, required: true, min: 0 }),
    __metadata("design:type", Number)
], Price.prototype, "subsidySantimPerKg", void 0);
__decorate([
    Prop({ type: Date, required: true }),
    __metadata("design:type", Date)
], Price.prototype, "effectiveFrom", void 0);
__decorate([
    Prop({ type: Date }),
    __metadata("design:type", Date)
], Price.prototype, "effectiveTo", void 0);
__decorate([
    Prop({ type: Types.ObjectId, required: true }),
    __metadata("design:type", Types.ObjectId)
], Price.prototype, "setBy", void 0);
__decorate([
    Prop({ type: Types.ObjectId }),
    __metadata("design:type", Types.ObjectId)
], Price.prototype, "approvedBy", void 0);
__decorate([
    Prop({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], Price.prototype, "reason", void 0);
Price = __decorate([
    Schema({ collection: 'prices', timestamps: true })
], Price);
export { Price };
export const PriceSchema = SchemaFactory.createForClass(Price);
PriceSchema.index({ inputId: 1, seasonId: 1, regionId: 1, effectiveFrom: -1 });
//# sourceMappingURL=price.schema.js.map