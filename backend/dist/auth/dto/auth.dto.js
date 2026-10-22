var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsArray, IsIn, IsMongoId, IsOptional, IsString, MaxLength, MinLength, } from 'class-validator';
import { ALL_ROLES } from '../../common/enums/role.enum.js';
export class LoginDto {
    phone;
    pin;
    identifier;
    password;
    deviceId;
    deviceLabel;
}
__decorate([
    IsOptional(),
    IsString(),
    MaxLength(20),
    __metadata("design:type", String)
], LoginDto.prototype, "phone", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MaxLength(32),
    __metadata("design:type", String)
], LoginDto.prototype, "pin", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MaxLength(254),
    __metadata("design:type", String)
], LoginDto.prototype, "identifier", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MaxLength(128),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);
__decorate([
    IsString(),
    MinLength(1),
    MaxLength(200),
    __metadata("design:type", String)
], LoginDto.prototype, "deviceId", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MaxLength(80),
    __metadata("design:type", String)
], LoginDto.prototype, "deviceLabel", void 0);
export class RefreshDto {
    refreshToken;
}
__decorate([
    IsOptional(),
    IsString(),
    MaxLength(512),
    __metadata("design:type", String)
], RefreshDto.prototype, "refreshToken", void 0);
export class VerifyOtpDto {
    challengeId;
    code;
    deviceId;
    deviceLabel;
}
__decorate([
    IsString(),
    __metadata("design:type", String)
], VerifyOtpDto.prototype, "challengeId", void 0);
__decorate([
    IsString(),
    MaxLength(12),
    __metadata("design:type", String)
], VerifyOtpDto.prototype, "code", void 0);
__decorate([
    IsString(),
    MinLength(1),
    MaxLength(200),
    __metadata("design:type", String)
], VerifyOtpDto.prototype, "deviceId", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MaxLength(80),
    __metadata("design:type", String)
], VerifyOtpDto.prototype, "deviceLabel", void 0);
export class LoginMfaDto {
    challengeId;
    code;
    method;
    newPassword;
    deviceId;
    deviceLabel;
}
__decorate([
    IsString(),
    __metadata("design:type", String)
], LoginMfaDto.prototype, "challengeId", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MaxLength(128),
    __metadata("design:type", String)
], LoginMfaDto.prototype, "code", void 0);
__decorate([
    IsOptional(),
    IsIn(['totp', 'sms', 'recovery']),
    __metadata("design:type", String)
], LoginMfaDto.prototype, "method", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MaxLength(128),
    __metadata("design:type", String)
], LoginMfaDto.prototype, "newPassword", void 0);
__decorate([
    IsString(),
    MinLength(1),
    MaxLength(200),
    __metadata("design:type", String)
], LoginMfaDto.prototype, "deviceId", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MaxLength(80),
    __metadata("design:type", String)
], LoginMfaDto.prototype, "deviceLabel", void 0);
export class StepUpDto {
    pin;
    password;
    code;
}
__decorate([
    IsOptional(),
    IsString(),
    MaxLength(12),
    __metadata("design:type", String)
], StepUpDto.prototype, "pin", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MaxLength(128),
    __metadata("design:type", String)
], StepUpDto.prototype, "password", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MaxLength(128),
    __metadata("design:type", String)
], StepUpDto.prototype, "code", void 0);
export class PinResetRequestDto {
    phone;
}
__decorate([
    IsString(),
    MaxLength(20),
    __metadata("design:type", String)
], PinResetRequestDto.prototype, "phone", void 0);
export class PinResetConfirmDto {
    phone;
    code;
    pin;
}
__decorate([
    IsString(),
    MaxLength(20),
    __metadata("design:type", String)
], PinResetConfirmDto.prototype, "phone", void 0);
__decorate([
    IsString(),
    MaxLength(12),
    __metadata("design:type", String)
], PinResetConfirmDto.prototype, "code", void 0);
__decorate([
    IsString(),
    MaxLength(12),
    __metadata("design:type", String)
], PinResetConfirmDto.prototype, "pin", void 0);
export class PasswordResetRequestDto {
    email;
}
__decorate([
    IsString(),
    MaxLength(254),
    __metadata("design:type", String)
], PasswordResetRequestDto.prototype, "email", void 0);
export class PasswordResetConfirmDto {
    token;
    code;
    password;
}
__decorate([
    IsString(),
    __metadata("design:type", String)
], PasswordResetConfirmDto.prototype, "token", void 0);
__decorate([
    IsString(),
    MaxLength(128),
    __metadata("design:type", String)
], PasswordResetConfirmDto.prototype, "code", void 0);
__decorate([
    IsString(),
    MaxLength(128),
    __metadata("design:type", String)
], PasswordResetConfirmDto.prototype, "password", void 0);
export class ChangeSecretDto {
    secret;
}
__decorate([
    IsString(),
    MaxLength(128),
    __metadata("design:type", String)
], ChangeSecretDto.prototype, "secret", void 0);
export class InvitationDto {
    role;
    email;
    phone;
    regionIds;
    woredaIds;
    localCenterIds;
    distributorId;
}
__decorate([
    IsIn(ALL_ROLES),
    __metadata("design:type", String)
], InvitationDto.prototype, "role", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MaxLength(254),
    __metadata("design:type", String)
], InvitationDto.prototype, "email", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MaxLength(20),
    __metadata("design:type", String)
], InvitationDto.prototype, "phone", void 0);
__decorate([
    IsOptional(),
    IsArray(),
    IsMongoId({ each: true }),
    __metadata("design:type", Array)
], InvitationDto.prototype, "regionIds", void 0);
__decorate([
    IsOptional(),
    IsArray(),
    IsMongoId({ each: true }),
    __metadata("design:type", Array)
], InvitationDto.prototype, "woredaIds", void 0);
__decorate([
    IsOptional(),
    IsArray(),
    IsMongoId({ each: true }),
    __metadata("design:type", Array)
], InvitationDto.prototype, "localCenterIds", void 0);
__decorate([
    IsOptional(),
    IsMongoId(),
    __metadata("design:type", String)
], InvitationDto.prototype, "distributorId", void 0);
export class AcceptInvitationDto {
    token;
    code;
    password;
}
__decorate([
    IsString(),
    __metadata("design:type", String)
], AcceptInvitationDto.prototype, "token", void 0);
__decorate([
    IsString(),
    MaxLength(12),
    __metadata("design:type", String)
], AcceptInvitationDto.prototype, "code", void 0);
__decorate([
    IsString(),
    MaxLength(128),
    __metadata("design:type", String)
], AcceptInvitationDto.prototype, "password", void 0);
export class MfaCodeDto {
    challengeId;
    code;
    deviceId;
    deviceLabel;
}
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], MfaCodeDto.prototype, "challengeId", void 0);
__decorate([
    IsString(),
    MaxLength(128),
    __metadata("design:type", String)
], MfaCodeDto.prototype, "code", void 0);
__decorate([
    IsString(),
    MinLength(1),
    MaxLength(200),
    __metadata("design:type", String)
], MfaCodeDto.prototype, "deviceId", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MaxLength(80),
    __metadata("design:type", String)
], MfaCodeDto.prototype, "deviceLabel", void 0);
export class EnrollDto {
    challengeId;
}
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], EnrollDto.prototype, "challengeId", void 0);
//# sourceMappingURL=auth.dto.js.map