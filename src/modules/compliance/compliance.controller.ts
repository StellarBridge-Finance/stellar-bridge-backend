import { Controller, Get, Post, Param, Delete } from '@nestjs/common';
import { ComplianceService } from './compliance.service';

@Controller('compliance')
export class ComplianceController {
  constructor(private svc: ComplianceService) {}

  @Get(':address')
  checkKyc(@Param('address') address: string) {
    return this.svc.checkKyc(address);
  }

  @Post(':address/whitelist')
  whitelist(@Param('address') address: string) {
    return this.svc.whitelist(address);
  }

  @Delete(':address/whitelist')
  revoke(@Param('address') address: string) {
    return this.svc.revoke(address);
  }
}
