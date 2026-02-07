import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma.service';
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    register(email: string, password: string, nickname?: string): Promise<{
        id: string;
        email: string;
        nickname: string | null;
    }>;
    login(email: string, password: string): Promise<{
        access_token: string;
        user: {
            id: string;
            email: string;
            nickname: string | null;
        };
    }>;
    getProfile(userId: string): Promise<{
        id: string;
        email: string;
        nickname: string | null;
        balance: import("@prisma/client/runtime/client").Decimal;
        createdAt: Date;
    }>;
}
