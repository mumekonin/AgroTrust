import { createParamDecorator, SetMetadata } from '@nestjs/common';
export const IS_PUBLIC = 'isPublic';
export const ROLES_KEY = 'roles';
export const SCOPED_KEY = 'scoped';
export const STEP_UP_KEY = 'stepUp';
export const Public = () => SetMetadata(IS_PUBLIC, true);
export const Roles = (...roles) => SetMetadata(ROLES_KEY, roles);
export const Scoped = (kind) => SetMetadata(SCOPED_KEY, kind);
export const RequireStepUp = () => SetMetadata(STEP_UP_KEY, true);
export const CurrentPrincipal = createParamDecorator((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.principal;
});
//# sourceMappingURL=auth.decorator.js.map