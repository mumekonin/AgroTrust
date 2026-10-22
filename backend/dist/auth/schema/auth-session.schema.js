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
let AuthSession = class AuthSession {
    sid;
    userId;
    role;
    family;
    deviceId;
    deviceLabel;
    userAgent;
    ip;
    lastSeenAt;
    absoluteExpiresAt;
    stepUpUntil;
    authMethod;
    revokedAt;
    revokedReason;
};
__decorate([
    Prop({ type: String, required: true }),
    __metadata("design:type", String)
], AuthSession.prototype, "sid", void 0);
__decorate([
    Prop({ type: Types.ObjectId, required: true }),
    __metadata("design:type", Types.ObjectId)
], AuthSession.prototype, "userId", void 0);
__decorate([
    Prop({ type: String, required: true }),
    __metadata("design:type", String)
], AuthSession.prototype, "role", void 0);
__decorate([
    Prop({ type: String, required: true }),
    __metadata("design:type", String)
], AuthSession.prototype, "family", void 0);
__decorate([
    Prop({ type: String, required: true }),
    __metadata("design:type", String)
], AuthSession.prototype, "deviceId", void 0);
__decorate([
    Prop({ type: String }),
    __metadata("design:type", String)
], AuthSession.prototype, "deviceLabel", void 0);
__decorate([
    Prop({ type: String }),
    __metadata("design:type", String)
], AuthSession.prototype, "userAgent", void 0);
__decorate([
    Prop({ type: String }),
    __metadata("design:type", String)
], AuthSession.prototype, "ip", void 0);
__decorate([
    Prop({ type: Date, required: true }),
    __metadata("design:type", Date)
], AuthSession.prototype, "lastSeenAt", void 0);
__decorate([
    Prop({ type: Date, required: true }),
    __metadata("design:type", Date)
], AuthSession.prototype, "absoluteExpiresAt", void 0);
__decorate([
    Prop({ type: Date }),
    __metadata("design:type", Date)
], AuthSession.prototype, "stepUpUntil", void 0);
__decorate([
    Prop({ type: String, required: true }),
    __metadata("design:type", String)
], AuthSession.prototype, "authMethod", void 0);
__decorate([
    Prop({ type: Date }),
    __metadata("design:type", Date)
], AuthSession.prototype, "revokedAt", void 0);
__decorate([
    Prop({ type: String }),
    __metadata("design:type", String)
], AuthSession.prototype, "revokedReason", void 0);
AuthSession = __decorate([
    Schema({ collection: 'sessions', timestamps: true })
], AuthSession);
export { AuthSession };
export const AuthSessionSchema = SchemaFactory.createForClass(AuthSession);
AuthSessionSchema.index({ sid: 1 }, { unique: true });
AuthSessionSchema.index({ userId: 1, revokedAt: 1 });
AuthSessionSchema.index({ absoluteExpiresAt: 1 }, { expireAfterSeconds: 7 * 86_400 });
//# sourceMappingURL=auth-session.schema.js.map