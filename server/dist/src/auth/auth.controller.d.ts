import { AuthService } from './auth.service';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    register(body: {
        email: string;
        password: string;
        nickname?: string;
    }): Promise<{
        id: string;
        email: string;
        nickname: string | null;
    }>;
    login(body: {
        email: string;
        password: string;
    }): Promise<{
        access_token: string;
        user: {
            id: string;
            email: string;
            nickname: string | null;
        };
    }>;
    profile(req: any): Promise<{
        id: string;
        email: string;
        nickname: string | null;
        balance: import("@prisma/client/runtime/client").Decimal;
        createdAt: Date;
    }>;
}
