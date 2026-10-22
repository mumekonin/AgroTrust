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
let TrustedDevice = class TrustedDevice {
    userId;
    deviceIdHash;
    label;
    firstSeenAt;
    lastSeenAt;
    trustedUntil;
    revokedAt;
};
__decorate([
    Prop({ type: Types.ObjectId, required: true }),
    __metadata("design:type", Types.ObjectId)
], TrustedDevice.prototype, "userId", void 0);
__decorate([
    Prop({ type: String, required: true }),
    __metadata("design:type", String)
], TrustedDevice.prototype, "deviceIdHash", void 0);
__decorate([
    Prop({ type: String }),
    __metadata("design:type", String)
], TrustedDevice.prototype, "label", void 0);
__decorate([
    Prop({ type: Date, required: true }),
    __metadata("design:type", Date)
], TrustedDevice.prototype, "firstSeenAt", void 0);
__decorate([
    Prop({ type: Date, required: true }),
    __metadata("design:type", Date)
], TrustedDevice.prototype, "lastSeenAt", void 0);
__decorate([
    Prop({ type: Date, required: true }),
    __metadata("design:type", Date)
], TrustedDevice.prototype, "trustedUntil", void 0);
__decorate([
    Prop({ type: Date }),
    __metadata("design:type", Date)
], TrustedDevice.prototype, "revokedAt", void 0);
TrustedDevice = __decorate([
    Schema({ collection: 'trusted_devices', timestamps: false })
], TrustedDevice);
export { TrustedDevice };
export const TrustedDeviceSchema = SchemaFactory.createForClass(TrustedDevice);
TrustedDeviceSchema.index({ userId: 1, deviceIdHash: 1 }, { unique: true });
//# sourceMappingURL=trusted-device.schema.js.map