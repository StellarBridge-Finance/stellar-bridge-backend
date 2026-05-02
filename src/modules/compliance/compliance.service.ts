import { Injectable } from '@nestjs/common';
import { StellarService } from '../../services/stellar.service';

@Injectable()
export class ComplianceService {
  constructor(private stellar: StellarService) {}

  async checkKyc(address: string) {
    const allowed = await this.stellar.isAllowed(address);
    const status = await this.stellar.getComplianceStatus(address);
    return { address, allowed, status };
  }

  async whitelist(address: string) {
    const txHash = await this.stellar.whitelistAddress(address);
    return { txHash };
  }

  async revoke(address: string) {
    const txHash = await this.stellar.revokeAddress(address);
    return { txHash };
  }
}
