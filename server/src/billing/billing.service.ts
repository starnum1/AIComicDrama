import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  /** 充值 */
  async recharge(userId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('充值金额必须大于0');
    }

    const [user, record] = await this.prisma.$transaction(async (tx) => {
      // 更新余额
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          balance: { increment: amount },
        },
        select: { id: true, balance: true },
      });

      // 创建充值记录
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

  /** 查询余额 */
  async getBalance(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    if (!user) throw new NotFoundException('用户不存在');

    return { balance: user.balance };
  }

  /** 消费记录 */
  async getRecords(userId: string) {
    return this.prisma.billingRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
