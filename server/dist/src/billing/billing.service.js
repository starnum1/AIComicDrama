"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma.service");
let BillingService = class BillingService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async recharge(userId, amount) {
        if (amount <= 0) {
            throw new common_1.BadRequestException('充值金额必须大于0');
        }
        const [user, record] = await this.prisma.$transaction(async (tx) => {
            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: {
                    balance: { increment: amount },
                },
                select: { id: true, balance: true },
            });
            const billingRecord = await tx.billingRecord.create({
                data: {
                    userId,
                    type: 'recharge',
                    amount,
                    description: `充值 ¥${amount}`,
                },
            });
            return [updatedUser, billingRecord];
        });
        return {
            balance: user.balance,
            record,
        };
    }
    async getBalance(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { balance: true },
        });
        if (!user)
            throw new common_1.NotFoundException('用户不存在');
        return { balance: user.balance };
    }
    async getRecords(userId) {
        return this.prisma.billingRecord.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    }
};
exports.BillingService = BillingService;
exports.BillingService = BillingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BillingService);
//# sourceMappingURL=billing.service.js.map