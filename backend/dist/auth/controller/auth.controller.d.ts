import type { Request, Response } from 'express';
import { LoginDto, RefreshDto } from '../dto/auth.dto.js';
import { type MfaRequiredResponse, toAccessSessionResponse } from '../response/auth.response.js';
import { AuthService } from '../service/auth.service.js';
type CookieRequest = Request & {
    cookies?: Record<string, string | undefined>;
};
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
    login(dto: LoginDto, req: CookieRequest, res: Response): Promise<ReturnType<typeof toAccessSessionResponse> | MfaRequiredResponse>;
    refresh(dto: RefreshDto, req: CookieRequest, res: Response): Promise<import("../response/auth.response.js").AccessSessionResponse>;
    logout(req: Request, res: Response): Promise<void>;
    logoutAll(req: Request, res: Response): Promise<void>;
}
export {};
