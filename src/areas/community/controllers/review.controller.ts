import {
  Controller, Get, Post, Body, Param, ParseIntPipe, Req, Res,
  Render, UseGuards, UsePipes, ValidationPipe,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ReviewService } from '../services/review.service';
import { CreateReviewDto, ReplyToReviewDto } from '../models/dto/create-review.dto';
import { AuthenticatedGuard } from '../../../common/guards/authenticated.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@Controller('community')
export class ReviewController {
  constructor(private readonly reviews: ReviewService) {}

  @Get('products/:productId/reviews')
  @Render('areas/community/views/reviews')
  async view(@Param('productId', ParseIntPipe) id: number, @Req() req: Request) {
    const { product, reviews, averageRating } = await this.reviews.forProduct(id);
    const user = req.session?.user || null;
    const ownReview = user?.role === 'consumer'
      ? reviews.find((review) => review.userId === user.id) : null;
    const canReply = user?.role === 'admin' ||
      (user?.role === 'manufacturer' && user.id === product.manufacturerId);
    return {
      title: 'Reviews for ' + product.name + ' — TrueLabel',
      product, reviews: reviews.map((review) => ({
        id: review.id, rating: review.rating, title: review.title,
        tasteRating: review.tasteRating, labelAccuracyRating: review.labelAccuracyRating,
        packagingRating: review.packagingRating,
        purchaseExperienceRating: review.purchaseExperienceRating,
        credibilityWeight: review.credibilityWeight,
        comment: review.comment, manufacturerReply: review.manufacturerReply,
        authorName: review.author?.name || 'Consumer',
        postedOn: review.createdAt?.toLocaleDateString('en-GB') || '',
        canReply, isMine: user?.role === 'consumer' && user.id === review.userId,
      })),
      averageRating, user, alreadyReviewed: Boolean(ownReview),
      canReview: user?.role === 'consumer' && !ownReview,
    };
  }

  @Post('products/:productId/reviews')
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles('consumer')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(
    @Param('productId', ParseIntPipe) id: number,
    @Body() dto: CreateReviewDto, @Req() req: Request, @Res() res: Response,
  ) {
    await this.reviews.create(id, req.session.user.id, dto);
    return res.redirect('/community/products/' + id + '/reviews');
  }

  @Post('reviews/:reviewId/edit')
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles('consumer')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async update(
    @Param('reviewId', ParseIntPipe) id: number,
    @Body() dto: CreateReviewDto, @Req() req: Request, @Res() res: Response,
  ) {
    const review = await this.reviews.update(id, req.session.user.id, dto);
    return res.redirect('/community/products/' + review.productId + '/reviews');
  }

  @Post('reviews/:reviewId/delete')
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles('consumer')
  async remove(
    @Param('reviewId', ParseIntPipe) id: number,
    @Req() req: Request, @Res() res: Response,
  ) {
    const productId = await this.reviews.remove(id, req.session.user.id);
    return res.redirect('/community/products/' + productId + '/reviews');
  }

  @Post('reviews/:reviewId/reply')
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles('manufacturer', 'admin')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async reply(
    @Param('reviewId', ParseIntPipe) id: number,
    @Body() dto: ReplyToReviewDto, @Req() req: Request, @Res() res: Response,
  ) {
    const review = await this.reviews.reply(id, dto.reply, req.session.user);
    return res.redirect('/community/products/' + review.productId + '/reviews');
  }
}
