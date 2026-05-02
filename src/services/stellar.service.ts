import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Contract,
  SorobanRpc,
  TransactionBuilder,
  Networks,
  Keypair,
  Account,
  nativeToScVal,
  Address,
  xdr,
} from '@stellar/stellar-sdk';

@Injectable()
export class StellarService implements OnModuleInit {
  private readonly logger = new Logger(StellarService.name);
  private server: SorobanRpc.Server;
  private adminKeypair: Keypair;
  private payrollContract: Contract;
  private escrowContract: Contract;
  private complianceContract: Contract;
  private networkPassphrase: string;

  constructor(private cfg: ConfigService) {}

  onModuleInit() {
    this.server = new SorobanRpc.Server(this.cfg.getOrThrow('SOROBAN_RPC_URL'));
    this.adminKeypair = Keypair.fromSecret(this.cfg.getOrThrow('ADMIN_SECRET_KEY'));
    this.networkPassphrase =
      this.cfg.get('STELLAR_NETWORK_PASSPHRASE') ?? Networks.TESTNET;
    this.payrollContract = new Contract(this.cfg.getOrThrow('PAYROLL_CONTRACT_ID'));
    this.escrowContract = new Contract(this.cfg.getOrThrow('ESCROW_CONTRACT_ID'));
    this.complianceContract = new Contract(this.cfg.getOrThrow('COMPLIANCE_CONTRACT_ID'));
    this.logger.log('Soroban contracts initialised');
  }

  // ─── helpers ────────────────────────────────────────────────────────────────

  private async buildAndSend(operation: xdr.Operation): Promise<string> {
    const source = await this.server.getAccount(this.adminKeypair.publicKey());
    const tx = new TransactionBuilder(source, {
      fee: '1000000',
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    const simResult = await this.server.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(simResult)) {
      throw new Error(`Simulation failed: ${simResult.error}`);
    }

    const preparedTx = SorobanRpc.assembleTransaction(tx, simResult).build();
    preparedTx.sign(this.adminKeypair);

    const sendResult = await this.server.sendTransaction(preparedTx);
    if (sendResult.status === 'ERROR') {
      throw new Error(`Send failed: ${JSON.stringify(sendResult.errorResult)}`);
    }

    // poll for confirmation
    let getResult = await this.server.getTransaction(sendResult.hash);
    for (let i = 0; i < 10 && getResult.status === 'NOT_FOUND'; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      getResult = await this.server.getTransaction(sendResult.hash);
    }
    if (getResult.status !== 'SUCCESS') {
      throw new Error(`Transaction ${sendResult.hash} did not succeed`);
    }
    return sendResult.hash;
  }

  private async simulate<T>(operation: xdr.Operation): Promise<T> {
    const source = new Account(this.adminKeypair.publicKey(), '0');
    const tx = new TransactionBuilder(source, {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    const result = await this.server.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(result)) {
      throw new Error(`Simulation failed: ${result.error}`);
    }
    const retval = (result as SorobanRpc.Api.SimulateTransactionSuccessResponse).result?.retval;
    return retval as unknown as T;
  }

  // ─── Payroll Contract ────────────────────────────────────────────────────────

  async createPayroll(
    employer: string,
    recipients: { address: string; amount: bigint; currency: string }[],
    currency: string,
    totalAmount: bigint,
  ): Promise<string> {
    const recipientsVal = nativeToScVal(
      recipients.map((r) => ({
        address: new Address(r.address),
        amount: r.amount,
        currency: r.currency,
      })),
    );
    const op = this.payrollContract.call(
      'create_payroll',
      new Address(employer).toScVal(),
      recipientsVal,
      nativeToScVal(currency, { type: 'symbol' }),
      nativeToScVal(totalAmount, { type: 'i128' }),
    );
    return this.buildAndSend(op);
  }

  async approvePayroll(id: bigint): Promise<string> {
    const op = this.payrollContract.call(
      'approve_payroll',
      new Address(this.adminKeypair.publicKey()).toScVal(),
      nativeToScVal(id, { type: 'u64' }),
    );
    return this.buildAndSend(op);
  }

  async executePayroll(id: bigint): Promise<string> {
    const op = this.payrollContract.call(
      'execute_payroll',
      new Address(this.adminKeypair.publicKey()).toScVal(),
      nativeToScVal(id, { type: 'u64' }),
    );
    return this.buildAndSend(op);
  }

  async getPayrollStatus(id: bigint): Promise<unknown> {
    const op = this.payrollContract.call(
      'get_status',
      nativeToScVal(id, { type: 'u64' }),
    );
    return this.simulate(op);
  }

  // ─── Escrow Contract ─────────────────────────────────────────────────────────

  async createEscrow(
    depositor: string,
    beneficiary: string,
    amount: bigint,
    currency: string,
  ): Promise<string> {
    const op = this.escrowContract.call(
      'create_escrow',
      new Address(depositor).toScVal(),
      new Address(beneficiary).toScVal(),
      nativeToScVal(amount, { type: 'i128' }),
      nativeToScVal(currency, { type: 'symbol' }),
    );
    return this.buildAndSend(op);
  }

  async releaseEscrow(depositor: string, id: bigint): Promise<string> {
    const op = this.escrowContract.call(
      'release',
      new Address(depositor).toScVal(),
      nativeToScVal(id, { type: 'u64' }),
    );
    return this.buildAndSend(op);
  }

  async refundEscrow(depositor: string, id: bigint): Promise<string> {
    const op = this.escrowContract.call(
      'refund',
      new Address(depositor).toScVal(),
      nativeToScVal(id, { type: 'u64' }),
    );
    return this.buildAndSend(op);
  }

  async getEscrow(id: bigint): Promise<unknown> {
    const op = this.escrowContract.call(
      'get_escrow',
      nativeToScVal(id, { type: 'u64' }),
    );
    return this.simulate(op);
  }

  // ─── Compliance Contract ─────────────────────────────────────────────────────

  async whitelistAddress(user: string): Promise<string> {
    const op = this.complianceContract.call(
      'whitelist',
      new Address(this.adminKeypair.publicKey()).toScVal(),
      new Address(user).toScVal(),
    );
    return this.buildAndSend(op);
  }

  async revokeAddress(user: string): Promise<string> {
    const op = this.complianceContract.call(
      'revoke',
      new Address(this.adminKeypair.publicKey()).toScVal(),
      new Address(user).toScVal(),
    );
    return this.buildAndSend(op);
  }

  async isAllowed(user: string): Promise<boolean> {
    const op = this.complianceContract.call(
      'is_allowed',
      new Address(user).toScVal(),
    );
    const result = await this.simulate<xdr.ScVal>(op);
    return result?.switch()?.name === 'scvBool' && result.b();
  }

  async getComplianceStatus(user: string): Promise<unknown> {
    const op = this.complianceContract.call(
      'get_status',
      new Address(user).toScVal(),
    );
    return this.simulate(op);
  }
}
