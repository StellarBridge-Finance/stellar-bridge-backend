import { Injectable } from '@nestjs/common';
import { StellarService } from '../../services/stellar.service';
import { CreateEscrowDto } from './escrow.dto';

@Injectable()
export class EscrowService {
  constructor(private stellar: StellarService) {}

  async create(dto: CreateEscrowDto) {
    const txHash = await this.stellar.createEscrow(
      dto.depositor,
      dto.beneficiary,
      BigInt(Math.round(dto.amount * 1e7)),
      dto.currency,
    );
    return { txHash };
  }

  async release(id: string, depositor: string) {
    const txHash = await this.stellar.releaseEscrow(depositor, BigInt(id));
    return { txHash };
  }

  async refund(id: string, depositor: string) {
    const txHash = await this.stellar.refundEscrow(depositor, BigInt(id));
    return { txHash };
  }

  async get(id: string) {
    return this.stellar.getEscrow(BigInt(id));
  }
}
