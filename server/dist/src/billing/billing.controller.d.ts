import { BillingService } from './billing.service';
export declare class BillingController {
    private billingService;
    constructor(billingService: BillingService);
    recharge(req: any, body: {
        amount: number;
    }): Promise<{
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
    getBalance(req: any): Promise<{
        balance: import("@prisma/client/runtime/client").Decimal;
    }>;
    getRecords(req: any): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        type: string;
        description: string | null;
        amount: import("@prisma/client/runtime/client").Decimal;
        relatedTaskId: string | null;
    }[]>;
}
