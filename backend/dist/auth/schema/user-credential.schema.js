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
export const CredentialType = {
    PASSWORD: 'password',
    PIN: 'pin',
    TOTP: 'totp',
    RECOVERY_CODES: 'recovery_codes',
};
let UserCredential = class UserCredential {
    userId;
    type;
    hash;
    algo;
    params;
    mustChange;
    history;
    changedAt;
    secretEnc;
    confirmedAt;
    codeHashes;
    usedCount;
};
__decorate([
    Prop({ type: Types.ObjectId, required: true }),
    __metadata("design:type", Types.ObjectId)
], UserCredential.prototype, "userId", void 0);
__decorate([
    Prop({ type: String, enum: Object.values(CredentialType), required: true }),
    __metadata("design:type", String)
], UserCredential.prototype, "type", void 0);
__decorate([
    Prop({ type: String }),
    __metadata("design:type", String)
], UserCredential.prototype, "hash", void 0);
__decorate([
    Prop({ type: String }),
    __metadata("design:type", String)
], UserCredential.prototype, "algo", void 0);
__decorate([
    Prop({ type: Object }),
    __metadata("design:type", Object)
], UserCredential.prototype, "params", void 0);
__decorate([
    Prop({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], UserCredential.prototype, "mustChange", void 0);
__decorate([
    Prop({ type: [String], default: [], select: false }),
    __metadata("design:type", Array)
], UserCredential.prototype, "history", void 0);
__decorate([
    Prop({ type: Date }),
    __metadata("design:type", Date)
], UserCredential.prototype, "changedAt", void 0);
__decorate([
    Prop({ type: String, select: false }),
    __metadata("design:type", String)
], UserCredential.prototype, "secretEnc", void 0);
__decorate([
    Prop({ type: Date }),
    __metadata("design:type", Date)
], UserCredential.prototype, "confirmedAt", void 0);
__decorate([
    Prop({ type: [String], default: [], select: false }),
    __metadata("design:type", Array)
], UserCredential.prototype, "codeHashes", void 0);
__decorate([
    Prop({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], UserCredential.prototype, "usedCount", void 0);
UserCredential = __decorate([
    Schema({ collection: 'credentials', timestamps: true })
], UserCredential);
export { UserCredential };
export const UserCredentialSchema = SchemaFactory.createForClass(UserCredential);
UserCredentialSchema.index({ userId: 1, type: 1 }, { unique: true });
//# sourceMappingURL=user-credential.schema.js.map