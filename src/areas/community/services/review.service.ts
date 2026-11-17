import {
  BadRequestException, ConflictException, ForbiddenException,
  Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FoodProduct } from '../../food-catalog/models/food-product.entity';
import { User } from '../../identity/models/user.entity';
import { FoodReview } from '../models/food-review.entity';
import { CreateReviewDto } from '../models/dto/create-review.dto';
import { CredibilityCalculator } from './credibility-calculator';

@Injectable()
export class ReviewService {
  private readonly credibility = new CredibilityCalculator();

  constructor(
    @InjectRepository(FoodReview)
    private readonly reviewRepo: Repository<FoodReview>,
    @InjectRepository(FoodProduct)
    private readonly productRepo: Repository<FoodProduct>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // F11: On-demand aggregates stay correct after create, edit or removal.
  // Hidden reviews are excluded. Overall score != food quality score.
  async forProduct(productId: number) {
    const product = await this.requireProduct(productId);
    const reviews = await this.reviewRepo.find({
      where: { productId, visibility: 'visible' },
      relations: ['author'],
      order: { createdAt: 'DESC' },
    });
    const totalWeight = reviews.reduce((total, item) => total + item.credibilityWeight, 0);
    const weightedScore = reviews.reduce(
      (total, item) => total + item.rating * item.credibilityWeight, 0,
    );
    return {
      product, reviews,
      averageRating: totalWeight > 0 ? (weightedScore / totalWeight).toFixed(1) : null,
    };
  }

  // F11: DB also enforces one review per product and user.
  async create(productId: number, userId: number, dto: CreateReviewDto) {
    await this.requireProduct(productId);
    this.checkComment(dto.comment);
    const existing = await this.reviewRepo.findOne({ where: { productId, userId } });
    if (existing) throw new ConflictException('You have already reviewed this product');
    const author = await this.userRepo.findOne({ where: { id: userId } });
    if (!author) throw new NotFoundException('Consumer account not found');

    const ageDays = Math.floor(
      (Date.now() - new Date(author.createdAt).getTime()) / 86400000,
    );
    const credibilityWeight = this.credibility.calculate(ageDays);
    // There is no verified purchase/batch evidence service in this sprint.
    const review = this.reviewRepo.create({
      productId, userId, ...this.reviewFields(dto), credibilityWeight,
      visibility: 'visible',
    });
    return this.reviewRepo.save(review);
  }

  // F11: Only the author can change an existing review.
  async update(reviewId: number, userId: number, dto: CreateReviewDto) {
    const review = await this.requireOwnedReview(reviewId, userId);
    this.checkComment(dto.comment);
    Object.assign(review, this.reviewFields(dto));
    return this.reviewRepo.save(review);
  }

  // F11: Deleting a review immediately removes it from derived aggregates.
  async remove(reviewId: number, userId: number) {
    const review = await this.requireOwnedReview(reviewId, userId);
    await this.reviewRepo.remove(review);
    return review.productId;
  }

  async reply(reviewId: number, message: string, user: { id: number; role: string }) {
    const review = await this.reviewRepo.findOne({
      where: { id: reviewId }, relations: ['product'],
    });
    if (!review) throw new NotFoundException('Review not found');
    if (user.role !== 'admin' &&
      (user.role !== 'manufacturer' || review.product.manufacturerId !== user.id)) {
      throw new ForbiddenException('You cannot reply to this review');
    }
    if (!message?.trim() || message.trim().length < 2) {
      throw new BadRequestException('Response is too short');
    }
    review.manufacturerReply = message.trim();
    review.repliedAt = new Date().toISOString();
    return this.reviewRepo.save(review);
  }

  private reviewFields(dto: CreateReviewDto) {
    const values = [
      dto.tasteRating, dto.labelAccuracyRating,
      dto.packagingRating, dto.purchaseExperienceRating,
    ];
    if (values.some((rating) => !Number.isInteger(rating) || rating < 1 || rating > 5)) {
      throw new BadRequestException('Ratings must be whole numbers from 1 to 5');
    }
    return {
      tasteRating: dto.tasteRating,
      labelAccuracyRating: dto.labelAccuracyRating,
      packagingRating: dto.packagingRating,
      purchaseExperienceRating: dto.purchaseExperienceRating,
      rating: Math.round(values.reduce((sum, n) => sum + n, 0) / 4),
      title: dto.title?.trim() || '',
      comment: dto.comment.trim(),
    };
  }

  private checkComment(comment: string) {
    if (!comment?.trim() || comment.trim().length < 10) {
      throw new BadRequestException('Write at least 10 characters in your review');
    }
  }

  private async requireOwnedReview(reviewId: number, userId: number) {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) throw new ForbiddenException('This is not your review');
    return review;
  }

  private async requireProduct(id: number) {
    const product = await this.productRepo.findOne({
      where: { id, status: 'active' },
    });
    if (!product) throw new NotFoundException('Food product not found');
    return product;
  }
}
