import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { StellarService } from '../../services/stellar.service';

const mockStellar = {
  createPayroll: jest.fn(),
  approvePayroll: jest.fn(),
  executePayroll: jest.fn(),
  getPayrollStatus: jest.fn(),
};

const dto = {
  employer: 'GABC',
  currency: 'USDC',
  totalAmount: 100,
  recipients: [{ address: 'GDEF', amount: 100, currency: 'USDC' }],
};

describe('PayrollService', () => {
  let svc: PayrollService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      providers: [
        PayrollService,
        { provide: StellarService, useValue: mockStellar },
      ],
    }).compile();
    svc = mod.get(PayrollService);
  });

  it('create() calls stellar.createPayroll and returns txHash', async () => {
    mockStellar.createPayroll.mockResolvedValue('hash1');
    expect(await svc.create(dto)).toEqual({ txHash: 'hash1' });
    expect(mockStellar.createPayroll).toHaveBeenCalledWith(
      'GABC',
      [{ address: 'GDEF', amount: BigInt(1000000000), currency: 'USDC' }],
      'USDC',
      BigInt(1000000000),
    );
  });

  it('approve() calls stellar.approvePayroll', async () => {
    mockStellar.approvePayroll.mockResolvedValue('hash2');
    expect(await svc.approve('1')).toEqual({ txHash: 'hash2' });
    expect(mockStellar.approvePayroll).toHaveBeenCalledWith(BigInt(1));
  });

  it('execute() calls stellar.executePayroll when compliance passes', async () => {
    mockStellar.executePayroll.mockResolvedValue('hash3');
    expect(await svc.execute('1')).toEqual({ txHash: 'hash3' });
  });

  it('getStatus() returns contract state', async () => {
    mockStellar.getPayrollStatus.mockResolvedValue({ status: 'Approved' });
    expect(await svc.getStatus('1')).toEqual({ status: 'Approved' });
    expect(mockStellar.getPayrollStatus).toHaveBeenCalledWith(BigInt(1));
  });
});
