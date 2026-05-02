import { Test } from '@nestjs/testing';
import { ComplianceService } from './compliance.service';
import { StellarService } from '../../services/stellar.service';

const mockStellar = {
  isAllowed: jest.fn(),
  getComplianceStatus: jest.fn(),
  whitelistAddress: jest.fn(),
  revokeAddress: jest.fn(),
};

const ADDR = 'GABC123';

describe('ComplianceService', () => {
  let svc: ComplianceService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      providers: [
        ComplianceService,
        { provide: StellarService, useValue: mockStellar },
      ],
    }).compile();
    svc = mod.get(ComplianceService);
  });

  it('checkKyc() returns address, allowed flag and status', async () => {
    mockStellar.isAllowed.mockResolvedValue(true);
    mockStellar.getComplianceStatus.mockResolvedValue('Whitelisted');
    expect(await svc.checkKyc(ADDR)).toEqual({
      address: ADDR,
      allowed: true,
      status: 'Whitelisted',
    });
  });

  it('whitelist() returns txHash', async () => {
    mockStellar.whitelistAddress.mockResolvedValue('hash1');
    expect(await svc.whitelist(ADDR)).toEqual({ txHash: 'hash1' });
    expect(mockStellar.whitelistAddress).toHaveBeenCalledWith(ADDR);
  });

  it('revoke() returns txHash', async () => {
    mockStellar.revokeAddress.mockResolvedValue('hash2');
    expect(await svc.revoke(ADDR)).toEqual({ txHash: 'hash2' });
    expect(mockStellar.revokeAddress).toHaveBeenCalledWith(ADDR);
  });
});
