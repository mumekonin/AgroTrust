import {
  IsArray,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ALL_ROLES, type Role } from '../../common/enums/role.enum.js';

export class LoginDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  pin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(254)
  identifier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  password?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  deviceId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  deviceLabel?: string;
}

export class RefreshDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  refreshToken?: string;
}

export class VerifyOtpDto {
  @IsString()
  challengeId!: string;

  @IsString()
  @MaxLength(12)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  deviceId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  deviceLabel?: string;
}

export class LoginMfaDto {
  @IsString()
  challengeId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  code?: string;

  @IsOptional()
  @IsIn(['totp', 'sms', 'recovery'])
  method?: 'totp' | 'sms' | 'recovery';

  @IsOptional()
  @IsString()
  @MaxLength(128)
  newPassword?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  deviceId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  deviceLabel?: string;
}

export class StepUpDto {
  @IsOptional()
  @IsString()
  @MaxLength(12)
  pin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  code?: string;
}

export class PinResetRequestDto {
  @IsString()
  @MaxLength(20)
  phone!: string;
}

export class PinResetConfirmDto {
  @IsString()
  @MaxLength(20)
  phone!: string;

  @IsString()
  @MaxLength(12)
  code!: string;

  @IsString()
  @MaxLength(12)
  pin!: string;
}

export class PasswordResetRequestDto {
  @IsString()
  @MaxLength(254)
  email!: string;
}

export class PasswordResetConfirmDto {
  @IsString()
  token!: string;

  @IsString()
  @MaxLength(128)
  code!: string;

  @IsString()
  @MaxLength(128)
  password!: string;
}

export class ChangeSecretDto {
  @IsString()
  @MaxLength(128)
  secret!: string;
}

export class InvitationDto {
  @IsIn(ALL_ROLES)
  role!: Role;

  @IsOptional()
  @IsString()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  regionIds?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  woredaIds?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  localCenterIds?: string[];

  @IsOptional()
  @IsMongoId()
  distributorId?: string;
}

export class AcceptInvitationDto {
  @IsString()
  token!: string;

  @IsString()
  @MaxLength(12)
  code!: string;

  @IsString()
  @MaxLength(128)
  password!: string;
}

export class MfaCodeDto {
  @IsOptional()
  @IsString()
  challengeId?: string;

  @IsString()
  @MaxLength(128)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  deviceId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  deviceLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  newPassword?: string;
}

export class EnrollDto {
  @IsOptional()
  @IsString()
  challengeId?: string;
}

