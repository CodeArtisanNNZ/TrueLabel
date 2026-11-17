import { Test } from '@nestjs/testing';
import { ReviewService } from '../services/review.service';
import { ReviewController } from './review.controller';

describe('ReviewController (F11)', () => {
  let controller: ReviewController;
  const service = { forProduct: jest.fn(), create: jest.fn(), update: jest.fn(),
    remove: jest.fn(), reply: jest.fn() };
  const consumer = { session: { user: { id: 3, role: 'consumer' } } } as any;
  const dto = { tasteRating: 5, labelAccuracyRating: 4, packagingRating: 4,
    purchaseExperienceRating: 3, comment: 'Good food for breakfast' };

  beforeEach(async () => {
    jest.resetAllMocks();
    const mod = await Test.createTestingModule({
      controllers: [ReviewController],
      providers: [{ provide: ReviewService, useValue: service }],
    }).compile();
    controller = mod.get(ReviewController);
  });

  it('renders ratings and hides the submission form for previous authors', async () => {
    service.forProduct.mockResolvedValue({
      product: { id: 5, name: 'Oat Milk', manufacturerId: 20 },
      averageRating: '4.0',
      reviews: [{ id: 2, userId: 3, rating: 4, author: { name: 'Sam' } }],
    });
    const model = await controller.view(5, consumer);
    expect(model.reviews[0].authorName).toBe('Sam');
    expect(model.canReview).toBe(false);
  });

  it('sends a new review to the service', async () => {
    const res = { redirect: jest.fn() } as any;
    await controller.create(5, dto, consumer, res);
    expect(service.create).toHaveBeenCalledWith(5, 3, dto);
  });

  it('updates and deletes reviews owned by the consumer', async () => {
    service.update.mockResolvedValue({ productId: 5 });
    service.remove.mockResolvedValue(5);
    const res = { redirect: jest.fn() } as any;
    await controller.update(2, dto, consumer, res);
    await controller.remove(2, consumer, res);
    expect(service.update).toHaveBeenCalledWith(2, 3, dto);
    expect(service.remove).toHaveBeenCalledWith(2, 3);
    expect(res.redirect).toHaveBeenCalledWith('/community/products/5/reviews');
  });

  it('sends manufacturer replies to the service', async () => {
    service.reply.mockResolvedValue({ productId: 5 });
    const res = { redirect: jest.fn() } as any;
    await controller.reply(2, { reply: 'Thank you' },
      { session: { user: { id: 20, role: 'manufacturer' } } } as any, res);
    expect(service.reply).toHaveBeenCalledWith(2, 'Thank you', expect.any(Object));
  });
});
