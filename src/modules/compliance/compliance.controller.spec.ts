import { Test } from '@nestjs/testing';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';

const mockSvc = {
  checkKyc: jest.fn(),
  whitelist: jest.fn(),
  revoke: jest.fn(),
};

const ADDR = 'GABC123';

describe('ComplianceController', () => {
  let ctrl: ComplianceController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      controllers: [ComplianceController],
      providers: [{ provide: ComplianceService, useValue: mockSvc }],
    }).compile();
    ctrl = mod.get(ComplianceController);
  });

  it('checkKyc() delegates to service', async () => {
    mockSvc.checkKyc.mockResolvedValue({ address: ADDR, allowed: true, status: 'Whitelisted' });
    expect(await ctrl.checkKyc(ADDR)).toEqual({ address: ADDR, allowed: true, status: 'Whitelisted' });
    expect(mockSvc.checkKyc).toHaveBeenCalledWith(ADDR);
  });

  it('whitelist() delegates to service', async () => {
    mockSvc.whitelist.mockResolvedValue({ txHash: 'h1' });
    expect(await ctrl.whitelist(ADDR)).toEqual({ txHash: 'h1' });
    expect(mockSvc.whitelist).toHaveBeenCalledWith(ADDR);
  });

  it('revoke() delegates to service', async () => {
    mockSvc.revoke.mockResolvedValue({ txHash: 'h2' });
    expect(await ctrl.revoke(ADDR)).toEqual({ txHash: 'h2' });
    expect(mockSvc.revoke).toHaveBeenCalledWith(ADDR);
  });
});
