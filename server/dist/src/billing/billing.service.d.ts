import { PrismaService } from '../common/prisma.service';
export declare class BillingService {
    private prisma;
    constructor(prisma: PrismaService);
    recharge(userId: string, amount: number): Promise<{
        balance: import("@prisma/client/runtime/client").Decimal;
        record: {
            id: string;
            createdAt: Date;
            userId: string;
            type: string;
            description: string | null;
            amount: import("@prisma/client/runtime/client").Decimal;
            relatedTaskId: string | null;
        };
    }>;
    getBalance(userId: string): Promise<{
        balance: import("@prisma/client/runtime/client").Decimal;
    }>;
    getRecords(userId: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        type: string;
        description: string | null;
        amount: import("@prisma/client/runtime/client").Decimal;
        relatedTaskId: string | null;
    }[]>;
}
