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
export const GeoType = {
    REGION: 'region',
    ZONE: 'zone',
    WOREDA: 'woreda',
    KEBELE: 'kebele',
};
export const GEO_TYPES = Object.values(GeoType);
export function expectedParentType(type) {
    if (type === GeoType.ZONE)
        return GeoType.REGION;
    if (type === GeoType.WOREDA)
        return GeoType.ZONE;
    if (type === GeoType.KEBELE)
        return GeoType.WOREDA;
    return null;
}
let GeoName = class GeoName {
    en;
    am;
    om;
};
__decorate([
    Prop({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], GeoName.prototype, "en", void 0);
__decorate([
    Prop({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], GeoName.prototype, "am", void 0);
__decorate([
    Prop({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], GeoName.prototype, "om", void 0);
GeoName = __decorate([
    Schema({ _id: false })
], GeoName);
export { GeoName };
export const GeoNameSchema = SchemaFactory.createForClass(GeoName);
let GeoUnit = class GeoUnit {
    type;
    code;
    name;
    parentId;
    path;
};
__decorate([
    Prop({ type: String, enum: GEO_TYPES, required: true }),
    __metadata("design:type", String)
], GeoUnit.prototype, "type", void 0);
__decorate([
    Prop({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], GeoUnit.prototype, "code", void 0);
__decorate([
    Prop({ type: GeoNameSchema, required: true }),
    __metadata("design:type", GeoName)
], GeoUnit.prototype, "name", void 0);
__decorate([
    Prop({ type: Types.ObjectId }),
    __metadata("design:type", Types.ObjectId)
], GeoUnit.prototype, "parentId", void 0);
__decorate([
    Prop({ type: [Types.ObjectId], default: [] }),
    __metadata("design:type", Array)
], GeoUnit.prototype, "path", void 0);
GeoUnit = __decorate([
    Schema({ collection: 'geo_units', timestamps: true })
], GeoUnit);
export { GeoUnit };
export const GeoUnitSchema = SchemaFactory.createForClass(GeoUnit);
GeoUnitSchema.index({ code: 1 }, { unique: true });
GeoUnitSchema.index({ parentId: 1 });
GeoUnitSchema.index({ path: 1 });
//# sourceMappingURL=geo-unit.schema.js.map