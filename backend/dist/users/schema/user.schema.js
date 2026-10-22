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
import { ALL_ROLES } from '../../common/enums/role.enum.js';
export const UserStatus = {
    INVITED: 'invited',
    PENDING_ACTIVATION: 'pending_activation',
    ACTIVE: 'active',
    LOCKED: 'locked',
    SUSPENDED: 'suspended',
    DEACTIVATED: 'deactivated',
};
export const PreferredLanguage = {
    EN: 'en',
    AM: 'am',
    OM: 'om',
};
let UserScope = class UserScope {
    regionIds;
    woredaIds;
    localCenterIds;
    distributorId;
};
__decorate([
    Prop({ type: [Types.ObjectId], default: [] }),
    __metadata("design:type", Array)
], UserScope.prototype, "regionIds", void 0);
__decorate([
    Prop({ type: [Types.ObjectId], default: [] }),
    __metadata("design:type", Array)
], UserScope.prototype, "woredaIds", void 0);
__decorate([
    Prop({ type: [Types.ObjectId], default: [] }),
    __metadata("design:type", Array)
], UserScope.prototype, "localCenterIds", void 0);
__decorate([
    Prop({ type: Types.ObjectId }),
    __metadata("design:type", Types.ObjectId)
], UserScope.prototype, "distributorId", void 0);
UserScope = __decorate([
    Schema({ _id: false })
], UserScope);
export { UserScope };
export const UserScopeSchema = SchemaFactory.createForClass(UserScope);
let UserMfa = class UserMfa {
    totpEnabled;
    smsFallbackAllowed;
};
__decorate([
    Prop({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], UserMfa.prototype, "totpEnabled", void 0);
__decorate([
    Prop({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], UserMfa.prototype, "smsFallbackAllowed", void 0);
UserMfa = __decorate([
    Schema({ _id: false })
], UserMfa);
export { UserMfa };
export const UserMfaSchema = SchemaFactory.createForClass(UserMfa);
let User = class User {
    phone;
    email;
    fullName;
    roles;
    scope;
    roleVersion;
    status;
    preferredLanguage;
    phoneVerifiedAt;
    emailVerifiedAt;
    lastLoginAt;
    lastAuthAt;
    mfa;
};
__decorate([
    Prop({ type: String, trim: true }),
    __metadata("design:type", String)
], User.prototype, "phone", void 0);
__decorate([
    Prop({ type: String, trim: true, lowercase: true }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    Prop({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], User.prototype, "fullName", void 0);
__decorate([
    Prop({ type: [String], enum: ALL_ROLES, required: true }),
    __metadata("design:type", Array)
], User.prototype, "roles", void 0);
__decorate([
    Prop({ type: UserScopeSchema, default: () => ({}) }),
    __metadata("design:type", UserScope)
], User.prototype, "scope", void 0);
__decorate([
    Prop({ type: Number, default: 1 }),
    __metadata("design:type", Number)
], User.prototype, "roleVersion", void 0);
__decorate([
    Prop({
        type: String,
        enum: Object.values(UserStatus),
        default: UserStatus.PENDING_ACTIVATION,
    }),
    __metadata("design:type", String)
], User.prototype, "status", void 0);
__decorate([
    Prop({
        type: String,
        enum: Object.values(PreferredLanguage),
        default: PreferredLanguage.EN,
    }),
    __metadata("design:type", String)
], User.prototype, "preferredLanguage", void 0);
__decorate([
    Prop({ type: Date }),
    __metadata("design:type", Date)
], User.prototype, "phoneVerifiedAt", void 0);
__decorate([
    Prop({ type: Date }),
    __metadata("design:type", Date)
], User.prototype, "emailVerifiedAt", void 0);
__decorate([
    Prop({ type: Date }),
    __metadata("design:type", Date)
], User.prototype, "lastLoginAt", void 0);
__decorate([
    Prop({ type: Date }),
    __metadata("design:type", Date)
], User.prototype, "lastAuthAt", void 0);
__decorate([
    Prop({ type: UserMfaSchema, default: () => ({}) }),
    __metadata("design:type", UserMfa)
], User.prototype, "mfa", void 0);
User = __decorate([
    Schema({ collection: 'users', timestamps: true })
], User);
export { User };
export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ phone: 1 }, { unique: true, sparse: true });
UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ roles: 1, status: 1 });
//# sourceMappingURL=user.schema.js.map