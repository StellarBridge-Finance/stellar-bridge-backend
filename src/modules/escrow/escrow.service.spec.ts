import { Test } from '@nestjs/testing';
import { EscrowService } from './escrow.service';
import { StellarService } from '../../services/stellar.service';

const mockStellar = {
  createEscrow: jest.fn(),
  releaseEscrow: jest.fn(),
  refundEscrow: jest.fn(),
  getEscrow: jest.fn(),
};

const dto = { depositor: 'GABC', beneficiary: 'GDEF', amount: 100, currency: 'USDC' };

describe('EscrowService', () => {
  let svc: EscrowService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      providers: [
        EscrowService,
        { provide: StellarService, useValue: mockStellar },
      ],
    }).compile();
    svc = mod.get(EscrowService);
  });

  it('create() calls stellar.createEscrow with stroops', async () => {
    mockStellar.createEscrow.mockResolvedValue('hash1');
    expect(await svc.create(dto)).toEqual({ txHash: 'hash1' });
    expect(mockStellar.createEscrow).toHaveBeenCalledWith(
      'GABC', 'GDEF', BigInt(1000000000), 'USDC',
    );
  });

  it('release() calls stellar.releaseEscrow', async () => {
    mockStellar.releaseEscrow.mockResolvedValue('hash2');
    expect(await svc.release('1', 'GABC')).toEqual({ txHash: 'hash2' });
    expect(mockStellar.releaseEscrow).toHaveBeenCalledWith('GABC', BigInt(1));
  });

  it('refund() calls stellar.refundEscrow', async () => {
    mockStellar.refundEscrow.mockResolvedValue('hash3');
    expect(await svc.refund('1', 'GABC')).toEqual({ txHash: 'hash3' });
    expect(mockStellar.refundEscrow).toHaveBeenCalledWith('GABC', BigInt(1));
  });

  it('get() returns escrow state', async () => {
    mockStellar.getEscrow.mockResolvedValue({ released: false });
    expect(await svc.get('1')).toEqual({ released: false });
    expect(mockStellar.getEscrow).toHaveBeenCalledWith(BigInt(1));
  });
});
