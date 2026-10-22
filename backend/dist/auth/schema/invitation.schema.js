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
import { ALL_ROLES, Role } from '../../common/enums/role.enum.js';
import { UserScope, UserScopeSchema } from '../../users/schema/user.schema.js';
export const InvitationStatus = {
    PENDING: 'pending',
    APPROVED: 'approved',
    USED: 'used',
    EXPIRED: 'expired',
    REVOKED: 'revoked',
};
let Invitation = class Invitation {
    tokenHash;
    role;
    scope;
    email;
    phone;
    createdBy;
    approvedBy;
    expiresAt;
    usedAt;
    boundUserId;
    status;
};
__decorate([
    Prop({ type: String }),
    __metadata("design:type", String)
], Invitation.prototype, "tokenHash", void 0);
__decorate([
    Prop({ type: String, enum: ALL_ROLES, required: true }),
    __metadata("design:type", String)
], Invitation.prototype, "role", void 0);
__decorate([
    Prop({ type: UserScopeSchema, default: () => ({}) }),
    __metadata("design:type", UserScope)
], Invitation.prototype, "scope", void 0);
__decorate([
    Prop({ type: String }),
    __metadata("design:type", String)
], Invitation.prototype, "email", void 0);
__decorate([
    Prop({ type: String }),
    __metadata("design:type", String)
], Invitation.prototype, "phone", void 0);
__decorate([
    Prop({ type: Types.ObjectId, required: true }),
    __metadata("design:type", Types.ObjectId)
], Invitation.prototype, "createdBy", void 0);
__decorate([
    Prop({ type: Types.ObjectId }),
    __metadata("design:type", Types.ObjectId)
], Invitation.prototype, "approvedBy", void 0);
__decorate([
    Prop({ type: Date, required: true }),
    __metadata("design:type", Date)
], Invitation.prototype, "expiresAt", void 0);
__decorate([
    Prop({ type: Date }),
    __metadata("design:type", Date)
], Invitation.prototype, "usedAt", void 0);
__decorate([
    Prop({ type: Types.ObjectId }),
    __metadata("design:type", Types.ObjectId)
], Invitation.prototype, "boundUserId", void 0);
__decorate([
    Prop({
        type: String,
        enum: Object.values(InvitationStatus),
        default: InvitationStatus.PENDING,
    }),
    __metadata("design:type", String)
], Invitation.prototype, "status", void 0);
Invitation = __decorate([
    Schema({ collection: 'invitations', timestamps: true })
], Invitation);
export { Invitation };
export const InvitationSchema = SchemaFactory.createForClass(Invitation);
InvitationSchema.index({ tokenHash: 1 }, { unique: true, sparse: true });
InvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
//# sourceMappingURL=invitation.schema.js.map