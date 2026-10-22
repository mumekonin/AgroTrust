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
let RefreshToken = class RefreshToken {
    sid;
    family;
    tokenHash;
    expiresAt;
    usedAt;
    replacedBy;
};
__decorate([
    Prop({ type: String, required: true }),
    __metadata("design:type", String)
], RefreshToken.prototype, "sid", void 0);
__decorate([
    Prop({ type: String, required: true }),
    __metadata("design:type", String)
], RefreshToken.prototype, "family", void 0);
__decorate([
    Prop({ type: String, required: true }),
    __metadata("design:type", String)
], RefreshToken.prototype, "tokenHash", void 0);
__decorate([
    Prop({ type: Date, required: true }),
    __metadata("design:type", Date)
], RefreshToken.prototype, "expiresAt", void 0);
__decorate([
    Prop({ type: Date }),
    __metadata("design:type", Date)
], RefreshToken.prototype, "usedAt", void 0);
__decorate([
    Prop({ type: Types.ObjectId }),
    __metadata("design:type", Types.ObjectId)
], RefreshToken.prototype, "replacedBy", void 0);
RefreshToken = __decorate([
    Schema({ collection: 'refresh_tokens', timestamps: true })
], RefreshToken);
export { RefreshToken };
export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
RefreshTokenSchema.index({ tokenHash: 1 }, { unique: true });
RefreshTokenSchema.index({ family: 1 });
RefreshTokenSchema.index({ sid: 1 });
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86_400 });
//# sourceMappingURL=refresh-token.schema.js.map