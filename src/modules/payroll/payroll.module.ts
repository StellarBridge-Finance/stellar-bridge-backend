import { Module } from '@nestjs/common';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { StellarService } from '../../services/stellar.service';

@Module({
  controllers: [PayrollController],
  providers: [PayrollService, StellarService],
})
export class PayrollModule {}
