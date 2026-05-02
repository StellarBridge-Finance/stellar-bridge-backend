import { Test } from '@nestjs/testing';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';

const mockSvc = {
  create: jest.fn(),
  approve: jest.fn(),
  execute: jest.fn(),
  getStatus: jest.fn(),
};

const dto = {
  employer: 'GABC',
  currency: 'USDC',
  totalAmount: 100,
  recipients: [{ address: 'GDEF', amount: 100, currency: 'USDC' }],
};

describe('PayrollController', () => {
  let ctrl: PayrollController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      controllers: [PayrollController],
      providers: [{ provide: PayrollService, useValue: mockSvc }],
    }).compile();
    ctrl = mod.get(PayrollController);
  });

  it('create() delegates to service', async () => {
    mockSvc.create.mockResolvedValue({ txHash: 'h1' });
    expect(await ctrl.create(dto)).toEqual({ txHash: 'h1' });
    expect(mockSvc.create).toHaveBeenCalledWith(dto);
  });

  it('approve() delegates to service', async () => {
    mockSvc.approve.mockResolvedValue({ txHash: 'h2' });
    expect(await ctrl.approve('1')).toEqual({ txHash: 'h2' });
    expect(mockSvc.approve).toHaveBeenCalledWith('1');
  });

  it('execute() delegates to service', async () => {
    mockSvc.execute.mockResolvedValue({ txHash: 'h3' });
    expect(await ctrl.execute('1')).toEqual({ txHash: 'h3' });
    expect(mockSvc.execute).toHaveBeenCalledWith('1');
  });

  it('getStatus() delegates to service', async () => {
    mockSvc.getStatus.mockResolvedValue({ status: 'Executed' });
    expect(await ctrl.getStatus('1')).toEqual({ status: 'Executed' });
    expect(mockSvc.getStatus).toHaveBeenCalledWith('1');
  });
});
