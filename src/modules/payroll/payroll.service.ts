import { Injectable, BadRequestException } from '@nestjs/common';
import { StellarService } from '../../services/stellar.service';
import { CreatePayrollDto } from './payroll.dto';

@Injectable()
export class PayrollService {
  constructor(private stellar: StellarService) {}

  async create(dto: CreatePayrollDto) {
    const recipients = dto.recipients.map((r) => ({
      address: r.address,
      amount: BigInt(Math.round(r.amount * 1e7)),
      currency: r.currency,
    }));
    const txHash = await this.stellar.createPayroll(
      dto.employer,
      recipients,
      dto.currency,
      BigInt(Math.round(dto.totalAmount * 1e7)),
    );
    return { txHash };
  }

  async approve(id: string) {
    const txHash = await this.stellar.approvePayroll(BigInt(id));
    return { txHash };
  }

  async execute(id: string) {
    const allowed = await this.checkRecipientsCompliance(id);
    if (!allowed) throw new BadRequestException('One or more recipients failed compliance');
    const txHash = await this.stellar.executePayroll(BigInt(id));
    return { txHash };
  }

  async getStatus(id: string) {
    return this.stellar.getPayrollStatus(BigInt(id));
  }

  // Stub — real impl queries payroll record from DB and checks each recipient
  private async checkRecipientsCompliance(_id: string): Promise<boolean> {
    return true;
  }
}
