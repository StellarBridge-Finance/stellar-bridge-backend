import { Module } from '@nestjs/common';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';
import { StellarService } from '../../services/stellar.service';

@Module({
  controllers: [ComplianceController],
  providers: [ComplianceService, StellarService],
  exports: [ComplianceService],
})
export class ComplianceModule {}
