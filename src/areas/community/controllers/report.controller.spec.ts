import { Test } from '@nestjs/testing';
import { ReportService } from '../services/report.service';
import { ReportController } from './report.controller';

describe('ReportController (F13)', () => {
  let controller: ReportController;
  const service = {
    getProduct: jest.fn(), create: jest.fn(), forConsumer: jest.fn(),
    queue: jest.fn(), updateStatus: jest.fn(), evidenceUrl: jest.fn(),
  };
  const consumer = { session: { user: { id: 3, role: 'consumer' } } } as any;
  const dto = { category: 'spoiled' as const, purchasePlace: 'Campus Store',
    description: 'The food had a strange smell and texture' };

  beforeEach(async () => {
    jest.resetAllMocks();
    const mod = await Test.createTestingModule({
      controllers: [ReportController],
      providers: [{ provide: ReportService, useValue: service }],
    }).compile();
    controller = mod.get(ReportController);
  });

  it('renders a product-specific complaint form', async () => {
    service.getProduct.mockResolvedValue({ id: 5, name: 'Oat Milk' });
    expect((await controller.form(5, consumer)).product.id).toBe(5);
  });

  it('passes report and photo data to the service', async () => {
    const res = { redirect: jest.fn() } as any;
    await controller.create(5, dto, consumer, res);
    expect(service.create).toHaveBeenCalledWith(5, 3, dto, undefined);
    expect(res.redirect).toHaveBeenCalledWith('/community/reports/mine');
  });

  it('loads only personal report history', async () => {
    service.forConsumer.mockResolvedValue([]);
    await controller.mine(consumer);
    expect(service.forConsumer).toHaveBeenCalledWith(3);
  });

  it('shows the queue to authorized staff', async () => {
    service.queue.mockResolvedValue([{ id: 7 }]);
    const data = await controller.queue({ session: { user: { role: 'inspector' } } } as any);
    expect(data.reports).toHaveLength(1);
  });

  it('redirects to a signed private evidence URL', async () => {
    const res = { redirect: jest.fn() } as any;
    service.evidenceUrl.mockResolvedValue('https://private.example/image');
    await controller.evidence(7, consumer, res);
    expect(res.redirect).toHaveBeenCalledWith('https://private.example/image');
  });

  it('updates report status', async () => {
    const res = { redirect: jest.fn() } as any;
    await controller.status(7, { status: 'investigating' },
      { session: { user: { role: 'inspector' } } } as any, res);
    expect(service.updateStatus).toHaveBeenCalledWith(7, 'investigating', 'inspector');
  });
});
