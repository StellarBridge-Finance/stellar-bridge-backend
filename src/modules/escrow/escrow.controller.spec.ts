import { Test } from '@nestjs/testing';
import { EscrowController } from './escrow.controller';
import { EscrowService } from './escrow.service';

const mockSvc = {
  create: jest.fn(),
  release: jest.fn(),
  refund: jest.fn(),
  get: jest.fn(),
};

const dto = { depositor: 'GABC', beneficiary: 'GDEF', amount: 100, currency: 'USDC' };

describe('EscrowController', () => {
  let ctrl: EscrowController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      controllers: [EscrowController],
      providers: [{ provide: EscrowService, useValue: mockSvc }],
    }).compile();
    ctrl = mod.get(EscrowController);
  });

  it('create() delegates to service', async () => {
    mockSvc.create.mockResolvedValue({ txHash: 'h1' });
    expect(await ctrl.create(dto)).toEqual({ txHash: 'h1' });
    expect(mockSvc.create).toHaveBeenCalledWith(dto);
  });

  it('release() delegates to service', async () => {
    mockSvc.release.mockResolvedValue({ txHash: 'h2' });
    expect(await ctrl.release('1', 'GABC')).toEqual({ txHash: 'h2' });
    expect(mockSvc.release).toHaveBeenCalledWith('1', 'GABC');
  });

  it('refund() delegates to service', async () => {
    mockSvc.refund.mockResolvedValue({ txHash: 'h3' });
    expect(await ctrl.refund('1', 'GABC')).toEqual({ txHash: 'h3' });
    expect(mockSvc.refund).toHaveBeenCalledWith('1', 'GABC');
  });

  it('get() delegates to service', async () => {
    mockSvc.get.mockResolvedValue({ released: false });
    expect(await ctrl.get('1')).toEqual({ released: false });
    expect(mockSvc.get).toHaveBeenCalledWith('1');
  });
});
