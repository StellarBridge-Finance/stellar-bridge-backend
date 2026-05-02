import { Module } from '@nestjs/common';
import { EscrowController } from './escrow.controller';
import { EscrowService } from './escrow.service';
import { StellarService } from '../../services/stellar.service';

@Module({
  controllers: [EscrowController],
  providers: [EscrowService, StellarService],
})
export class EscrowModule {}
