import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { BillingService } from './billing.service';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Post('recharge')
  async recharge(@Req() req: any, @Body() body: { amount: number }) {
    return this.billingService.recharge(req.user.sub, body.amount);
  }

  @Get('balance')
  async getBalance(@Req() req: any) {
    return this.billingService.getBalance(req.user.sub);
  }

  @Get('records')
  async getRecords(@Req() req: any) {
    return this.billingService.getRecords(req.user.sub);
  }
}
