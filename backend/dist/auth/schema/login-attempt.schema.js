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
let LoginAttempt = class LoginAttempt {
    identifierHash;
    ip;
    userId;
    success;
    reason;
    at;
};
__decorate([
    Prop({ type: String, required: true }),
    __metadata("design:type", String)
], LoginAttempt.prototype, "identifierHash", void 0);
__decorate([
    Prop({ type: String, required: true }),
    __metadata("design:type", String)
], LoginAttempt.prototype, "ip", void 0);
__decorate([
    Prop({ type: Types.ObjectId }),
    __metadata("design:type", Types.ObjectId)
], LoginAttempt.prototype, "userId", void 0);
__decorate([
    Prop({ type: Boolean, required: true }),
    __metadata("design:type", Boolean)
], LoginAttempt.prototype, "success", void 0);
__decorate([
    Prop({ type: String, required: true }),
    __metadata("design:type", String)
], LoginAttempt.prototype, "reason", void 0);
__decorate([
    Prop({ type: Date, required: true }),
    __metadata("design:type", Date)
], LoginAttempt.prototype, "at", void 0);
LoginAttempt = __decorate([
    Schema({ collection: 'login_attempts', timestamps: false })
], LoginAttempt);
export { LoginAttempt };
export const LoginAttemptSchema = SchemaFactory.createForClass(LoginAttempt);
LoginAttemptSchema.index({ identifierHash: 1, at: -1 });
LoginAttemptSchema.index({ ip: 1, at: -1 });
LoginAttemptSchema.index({ at: 1 }, { expireAfterSeconds: 30 * 86_400 });
//# sourceMappingURL=login-attempt.schema.js.map