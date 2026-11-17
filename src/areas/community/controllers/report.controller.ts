import {
  Controller, Get, Post, Body, Param, ParseIntPipe, Req, Res,
  Render, UseGuards, UsePipes, ValidationPipe,
  UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { ReportService } from '../services/report.service';
import { EvidenceUpload } from '../services/report-evidence.service';
import { CreateReportDto, UpdateReportStatusDto } from '../models/dto/create-report.dto';
import { AuthenticatedGuard } from '../../../common/guards/authenticated.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@Controller('community')
export class ReportController {
  constructor(private readonly reports: ReportService) {}

  @Get('products/:productId/report')
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles('consumer')
  @Render('areas/community/views/report-form')
  async form(@Param('productId', ParseIntPipe) id: number, @Req() req: Request) {
    const product = await this.reports.getProduct(id);
    return { title: 'Report a product — TrueLabel', product, user: req.session.user };
  }

  @Post('products/:productId/report')
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles('consumer')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 3 * 1024 * 1024 } }))
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(
    @Param('productId', ParseIntPipe) id: number,
    @Body() dto: CreateReportDto,
    @Req() req: Request, @Res() res: Response,
    @UploadedFile() photo?: EvidenceUpload,
  ) {
    await this.reports.create(id, req.session.user.id, dto, photo);
    return res.redirect('/community/reports/mine');
  }

  @Get('reports/mine')
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles('consumer')
  @Render('areas/community/views/my-reports')
  async mine(@Req() req: Request) {
    return {
      title: 'My Reports — TrueLabel', user: req.session.user,
      reports: await this.reports.forConsumer(req.session.user.id),
    };
  }

  @Get('reports/queue')
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles('inspector', 'admin')
  @Render('areas/community/views/report-queue')
  async queue(@Req() req: Request) {
    return {
      title: 'Complaint Queue — TrueLabel', user: req.session.user,
      reports: await this.reports.queue(),
    };
  }

  @Get('reports/:reportId/evidence')
  @UseGuards(AuthenticatedGuard)
  async evidence(
    @Param('reportId', ParseIntPipe) id: number,
    @Req() req: Request, @Res() res: Response,
  ) {
    const url = await this.reports.evidenceUrl(id, req.session.user);
    return res.redirect(url);
  }

  @Post('reports/:reportId/status')
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles('inspector', 'admin')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async status(
    @Param('reportId', ParseIntPipe) id: number,
    @Body() dto: UpdateReportStatusDto, @Req() req: Request, @Res() res: Response,
  ) {
    await this.reports.updateStatus(id, dto.status, req.session.user.role);
    return res.redirect('/community/reports/queue');
  }
}
