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
export const OtpPurpose = {
    LOGIN_NEW_DEVICE: 'login_new_device',
    ACTIVATION: 'activation',
    PIN_RESET: 'pin_reset',
    PASSWORD_RESET: 'password_reset',
    PHONE_CHANGE: 'phone_change',
    ASSISTED_REQUEST: 'assisted_request',
    STEP_UP: 'step_up',
    SMS_FALLBACK: 'sms_fallback',
    LOGIN_MFA: 'login_mfa',
    INVITATION: 'invitation',
    MFA_ENROLL: 'mfa_enroll',
};
let OtpChallenge = class OtpChallenge {
    userId;
    phone;
    purpose;
    codeHash;
    payloadHash;
    attempts;
    maxAttempts;
    resendCount;
    expiresAt;
    consumedAt;
    createdAt;
};
__decorate([
    Prop({ type: Types.ObjectId }),
    __metadata("design:type", Types.ObjectId)
], OtpChallenge.prototype, "userId", void 0);
__decorate([
    Prop({ type: String }),
    __metadata("design:type", String)
], OtpChallenge.prototype, "phone", void 0);
__decorate([
    Prop({ type: String, enum: Object.values(OtpPurpose), required: true }),
    __metadata("design:type", String)
], OtpChallenge.prototype, "purpose", void 0);
__decorate([
    Prop({ type: String, required: true }),
    __metadata("design:type", String)
], OtpChallenge.prototype, "codeHash", void 0);
__decorate([
    Prop({ type: String }),
    __metadata("design:type", String)
], OtpChallenge.prototype, "payloadHash", void 0);
__decorate([
    Prop({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], OtpChallenge.prototype, "attempts", void 0);
__decorate([
    Prop({ type: Number, default: 3 }),
    __metadata("design:type", Number)
], OtpChallenge.prototype, "maxAttempts", void 0);
__decorate([
    Prop({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], OtpChallenge.prototype, "resendCount", void 0);
__decorate([
    Prop({ type: Date, required: true }),
    __metadata("design:type", Date)
], OtpChallenge.prototype, "expiresAt", void 0);
__decorate([
    Prop({ type: Date }),
    __metadata("design:type", Date)
], OtpChallenge.prototype, "consumedAt", void 0);
__decorate([
    Prop({ type: Date }),
    __metadata("design:type", Date)
], OtpChallenge.prototype, "createdAt", void 0);
OtpChallenge = __decorate([
    Schema({ collection: 'otp_challenges', timestamps: true })
], OtpChallenge);
export { OtpChallenge };
export const OtpChallengeSchema = SchemaFactory.createForClass(OtpChallenge);
OtpChallengeSchema.index({ phone: 1, purpose: 1, createdAt: -1 });
OtpChallengeSchema.index({ codeHash: 1 });
OtpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
//# sourceMappingURL=otp-challenge.schema.js.map